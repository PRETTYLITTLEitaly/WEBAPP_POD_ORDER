import { shopifyFetch } from "./shopify";
import { prisma } from "./prisma";

// Interfacce e Tipi del Motore di Sincronizzazione
export interface SyncOptions {
  forceReal?: boolean;
  origin?: "manual" | "webhook" | "reconcile";
}

export interface SyncProductResult {
  success: boolean;
  isDryRun: boolean;
  handle: string;
  action: "CREATE" | "UPDATE" | "ARCHIVE" | "SKIP" | "EXCLUDE" | "ERROR";
  details: string;
  changes?: { field: string; before: any; after: any }[];
  error?: string;
}

// 1. HELPER: Normalizza le opzioni varianti per un confronto univoco
export function normalizeOptions(selectedOptions: { name: string; value: string }[]): string {
  if (!selectedOptions || !Array.isArray(selectedOptions)) return "";
  return selectedOptions
    .map((o) => `${o.name.trim().toLowerCase()}:${o.value.trim().toLowerCase()}`)
    .sort()
    .join(" | ");
}

// 2. HELPER: Calcola il prezzo B2B di una variante in base alle PriceRule salvate in DB
export async function calculateB2BPrice(params: {
  b2cPrice: number;
  productType?: string;
  productHandle?: string;
  selectedOptions?: { name: string; value: string }[];
}): Promise<{ price: number; ruleName: string; ruleId?: string }> {
  const { b2cPrice, productType, productHandle, selectedOptions = [] } = params;

  try {
    // Recupera tutte le regole attive ordinate per priorità (ASC)
    const rules = await prisma.priceRule.findMany({
      where: { isActive: true },
      orderBy: { priority: "asc" }
    });

    for (const rule of rules) {
      let matchesScope = false;

      if (rule.scopeType === "ALL") {
        matchesScope = true;
      } else if (rule.scopeType === "PRODUCT_TYPE" && rule.scopeValue && productType) {
        matchesScope = rule.scopeValue.trim().toLowerCase() === productType.trim().toLowerCase();
      } else if (rule.scopeType === "PRODUCT_HANDLE" && rule.scopeValue && productHandle) {
        matchesScope = rule.scopeValue.trim().toLowerCase() === productHandle.trim().toLowerCase();
      }

      if (!matchesScope) continue;

      // Verifica le condizioni opzione (AND logic)
      let matchesConditions = true;
      if (Array.isArray(rule.optionConditions) && (rule.optionConditions as any[]).length > 0) {
        const conds = rule.optionConditions as { option: string; value: string }[];
        for (const cond of conds) {
          const found = selectedOptions.some(
            (so) =>
              so.name.trim().toLowerCase() === cond.option.trim().toLowerCase() &&
              so.value.trim().toLowerCase() === cond.value.trim().toLowerCase()
          );
          if (!found) {
            matchesConditions = false;
            break;
          }
        }
      }

      if (matchesConditions) {
        let finalPrice = b2cPrice;
        const val = parseFloat(rule.priceValue.toString());

        if (rule.priceType === "FIXED") {
          finalPrice = val;
        } else if (rule.priceType === "DISCOUNT_PERCENT") {
          finalPrice = b2cPrice * (1 - val / 100);
        } else if (rule.priceType === "MARKUP_PERCENT") {
          finalPrice = b2cPrice * (1 + val / 100);
        }

        // Mantieni 2 cifre decimali
        finalPrice = Math.round(finalPrice * 100) / 100;
        return { price: Math.max(0.01, finalPrice), ruleName: rule.name, ruleId: rule.id };
      }
    }
  } catch (err) {
    console.error("Errore durante il calcolo della PriceRule:", err);
  }

  // Fallback se nessuna regola specifica corrisponde: usa il prezzo B2C
  return { price: b2cPrice, ruleName: "DEFAULT_B2C_PRICE" };
}

// 3. RECUPERO DETTAGLIATO PRODOTTO DA B2C / B2B
const PRODUCT_QUERY = `
  query GetProductDetail($handle: String!) {
    productByHandle(handle: $handle) {
      id
      title
      handle
      status
      productType
      vendor
      descriptionHtml
      tags
      seo {
        title
        description
      }
      media(first: 50) {
        nodes {
          mediaContentType
          alt
          ... on MediaImage {
            image {
              url
            }
          }
        }
      }
      options {
        id
        name
        values
      }
      variants(first: 100) {
        nodes {
          id
          title
          sku
          barcode
          price
          selectedOptions {
            name
            value
          }
        }
      }
    }
  }
`;

// 4. MOTORE PRINCIPALE: SINCRONIZZAZIONE DI UN SINGOLO PRODOTTO (B2C -> B2B)
export async function syncProduct(handle: string, options: SyncOptions = {}): Promise<SyncProductResult> {
  const origin = options.origin || "manual";
  let setting = await prisma.syncSetting.findUnique({ where: { id: "global" } });

  if (!setting) {
    setting = await prisma.syncSetting.create({
      data: { id: "global", isDryRun: true, isPaused: false }
    });
  }

  const isDryRun = options.forceReal ? false : setting.isDryRun;

  // Se la sync globale è in pausa e non è forzata, salta
  if (setting.isPaused && !options.forceReal) {
    return {
      success: true,
      isDryRun,
      handle,
      action: "SKIP",
      details: "Sincronizzazione in pausa nelle impostazioni globali."
    };
  }

  try {
    // Step A: Fetch Prodotto da B2C Master
    const b2cRes = await shopifyFetch({
      store: "b2c",
      query: PRODUCT_QUERY,
      variables: { handle }
    });

    const b2cProduct = b2cRes.data?.productByHandle;

    if (!b2cProduct) {
      // Se il prodotto non esiste in B2C ma esiste in B2B, andrebbe archiviato
      return {
        success: false,
        isDryRun,
        handle,
        action: "ERROR",
        details: "Prodotto non trovato nello Store B2C Master.",
        error: "PRODUCT_NOT_FOUND_B2C"
      };
    }

    // Step B: Controllo Esclusione Tag (default: "no-b2b")
    const exclusionTag = setting.exclusionTag || "no-b2b";
    if (b2cProduct.tags?.includes(exclusionTag)) {
      await prisma.syncLog.create({
        data: {
          action: "EXCLUDE",
          entity: "PRODUCT",
          b2cId: b2cProduct.id,
          handle,
          isDryRun,
          outcome: "SUCCESS",
          origin,
          details: `Escluso dalla sync perché contiene il tag "${exclusionTag}".`
        }
      });

      return {
        success: true,
        isDryRun,
        handle,
        action: "EXCLUDE",
        details: `Escluso dalla sync per tag "${exclusionTag}".`
      };
    }

    // Step C: Fetch Prodotto Coincidente da B2B Copia
    const b2bRes = await shopifyFetch({
      store: "b2b",
      query: PRODUCT_QUERY,
      variables: { handle }
    });

    const b2bProduct = b2bRes.data?.productByHandle;

    // SCENARIO 1: IL PRODOTTO NON ESISTE ANCORA NEL B2B -> CREAZIONE NUOVO PRODOTTO
    if (!b2bProduct) {
      const variantsToCreate: any[] = [];
      const changes: { field: string; before: any; after: any }[] = [
        { field: "product", before: "Non Esiste", after: b2cProduct.title }
      ];

      for (const v of b2cProduct.variants?.nodes || []) {
        const { price: calculatedPrice, ruleName } = await calculateB2BPrice({
          b2cPrice: parseFloat(v.price),
          productType: b2cProduct.productType,
          productHandle: b2cProduct.handle,
          selectedOptions: v.selectedOptions
        });

        variantsToCreate.push({
          optionValues: v.selectedOptions.map((so: any) => ({ name: so.name, value: so.value })),
          sku: v.sku || null,
          barcode: v.barcode || null,
          price: calculatedPrice.toFixed(2)
        });

        changes.push({
          field: `variant:${v.title}`,
          before: "Non Esiste",
          after: `Prezzo B2B: €${calculatedPrice.toFixed(2)} (${ruleName})`
        });
      }

      if (isDryRun) {
        await prisma.syncLog.create({
          data: {
            action: "CREATE",
            entity: "PRODUCT",
            b2cId: b2cProduct.id,
            handle,
            isDryRun: true,
            outcome: "DRY_RUN",
            origin,
            details: `[DRY-RUN] Simulazione creazione nuovo prodotto B2B con ${variantsToCreate.length} varianti.`,
            changes
          }
        });

        return {
          success: true,
          isDryRun: true,
          handle,
          action: "CREATE",
          details: `[SIMULAZIONE] Il prodotto verrebbe creato nel B2B con ${variantsToCreate.length} varianti.`,
          changes
        };
      }

      // ESECUZIONE REALE: Creazione GraphQL su Shopify B2B
      const createMutation = `
        mutation CreateProductB2B($input: ProductInput!) {
          productCreate(input: $input) {
            product {
              id
              handle
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      // Prepara i tag (escludendo no-b2b)
      const cleanTags = (b2cProduct.tags || []).filter((t: string) => t !== exclusionTag);

      const createRes = await shopifyFetch({
        store: "b2b",
        query: createMutation,
        variables: {
          input: {
            title: b2cProduct.title,
            handle: b2cProduct.handle,
            vendor: b2cProduct.vendor,
            productType: b2cProduct.productType,
            status: b2cProduct.status,
            descriptionHtml: b2cProduct.descriptionHtml,
            tags: cleanTags,
            seo: b2cProduct.seo
          }
        }
      });

      const userErrors = createRes.data?.productCreate?.userErrors;
      if (userErrors && userErrors.length > 0) {
        throw new Error(`Errore creazione prodotto B2B: ${userErrors.map((e: any) => e.message).join(", ")}`);
      }

      const createdB2bProduct = createRes.data?.productCreate?.product;

      // Registra Mapping in DB
      if (createdB2bProduct?.id) {
        await prisma.syncMappingProduct.upsert({
          where: { b2cProductId: b2cProduct.id },
          create: {
            b2cProductId: b2cProduct.id,
            b2bProductId: createdB2bProduct.id,
            handle,
            b2cStatus: b2cProduct.status,
            b2bStatus: b2cProduct.status,
            syncStatus: "ALIGNED",
            lastSyncedAt: new Date()
          },
          update: {
            b2bProductId: createdB2bProduct.id,
            b2cStatus: b2cProduct.status,
            b2bStatus: b2cProduct.status,
            syncStatus: "ALIGNED",
            lastSyncedAt: new Date()
          }
        });
      }

      await prisma.syncLog.create({
        data: {
          action: "CREATE",
          entity: "PRODUCT",
          b2cId: b2cProduct.id,
          b2bId: createdB2bProduct?.id,
          handle,
          isDryRun: false,
          outcome: "SUCCESS",
          origin,
          details: `Creato con successo il nuovo prodotto B2B con ID ${createdB2bProduct?.id}.`,
          changes
        }
      });

      return {
        success: true,
        isDryRun: false,
        handle,
        action: "CREATE",
        details: `Prodotto creato con successo nel B2B (${createdB2bProduct?.id}).`,
        changes
      };
    }

    // SCENARIO 2: IL PRODOTTO ESISTE GIA' NEL B2B -> AGGIORNAMENTO E ALLINEAMENTO VARIANTI
    const changes: { field: string; before: any; after: any }[] = [];

    // Check Stato Archiviazione
    if (b2cProduct.status === "ARCHIVED" && b2bProduct.status !== "ARCHIVED") {
      changes.push({ field: "status", before: b2bProduct.status, after: "ARCHIVED" });
    }

    // Check Titolo e Dati Base
    if (b2cProduct.title !== b2bProduct.title) {
      changes.push({ field: "title", before: b2bProduct.title, after: b2cProduct.title });
    }
    if (b2cProduct.productType !== b2bProduct.productType) {
      changes.push({ field: "productType", before: b2bProduct.productType, after: b2cProduct.productType });
    }

    // Allineamento Varianti Mancanti
    const b2bVariantMap = new Map<string, any>();
    for (const bv of b2bProduct.variants?.nodes || []) {
      b2bVariantMap.set(normalizeOptions(bv.selectedOptions), bv);
    }

    const missingVariantsInB2B: any[] = [];
    for (const cv of b2cProduct.variants?.nodes || []) {
      const key = normalizeOptions(cv.selectedOptions);
      if (!b2bVariantMap.has(key)) {
        const { price: calcPrice, ruleName } = await calculateB2BPrice({
          b2cPrice: parseFloat(cv.price),
          productType: b2cProduct.productType,
          productHandle: b2cProduct.handle,
          selectedOptions: cv.selectedOptions
        });

        missingVariantsInB2B.push({
          b2cVariant: cv,
          calcPrice,
          ruleName
        });

        changes.push({
          field: `new_variant:${cv.title}`,
          before: "Mancante nel B2B",
          after: `Nuova variante B2B: €${calcPrice.toFixed(2)} (${ruleName})`
        });
      }
    }

    // Esito Dry Run o Scrittura Reale per Aggiornamento
    if (isDryRun) {
      await prisma.syncLog.create({
        data: {
          action: "UPDATE",
          entity: "PRODUCT",
          b2cId: b2cProduct.id,
          b2bId: b2bProduct.id,
          handle,
          isDryRun: true,
          outcome: "DRY_RUN",
          origin,
          details: changes.length > 0 
            ? `[DRY-RUN] Rilevati ${changes.length} aggiornamenti/varianti da allineare nel B2B.`
            : `[DRY-RUN] Prodotto B2B già perfettamente allineato.`,
          changes
        }
      });

      return {
        success: true,
        isDryRun: true,
        handle,
        action: changes.length > 0 ? "UPDATE" : "SKIP",
        details: changes.length > 0 
          ? `[SIMULAZIONE] Trovati ${changes.length} campi/varianti da aggiornare nel B2B.`
          : `[SIMULAZIONE] Prodotto già allineato. Nessuna modifica richiesta.`,
        changes
      };
    }

    // ESECUZIONE REALE: Aggiornamento Prodotto Esistente su B2B
    if (changes.length > 0) {
      const updateMutation = `
        mutation UpdateProductB2B($input: ProductInput!) {
          productUpdate(input: $input) {
            product {
              id
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      const cleanTags = (b2cProduct.tags || []).filter((t: string) => t !== exclusionTag);

      const updateRes = await shopifyFetch({
        store: "b2b",
        query: updateMutation,
        variables: {
          input: {
            id: b2bProduct.id,
            title: b2cProduct.title,
            vendor: b2cProduct.vendor,
            productType: b2cProduct.productType,
            status: b2cProduct.status,
            descriptionHtml: b2cProduct.descriptionHtml,
            tags: cleanTags,
            seo: b2cProduct.seo
          }
        }
      });

      const updateErrors = updateRes.data?.productUpdate?.userErrors;
      if (updateErrors && updateErrors.length > 0) {
        throw new Error(`Errore aggiornamento B2B: ${updateErrors.map((e: any) => e.message).join(", ")}`);
      }
    }

    // Salva Mapping in DB
    await prisma.syncMappingProduct.upsert({
      where: { b2cProductId: b2cProduct.id },
      create: {
        b2cProductId: b2cProduct.id,
        b2bProductId: b2bProduct.id,
        handle,
        b2cStatus: b2cProduct.status,
        b2bStatus: b2bProduct.status,
        syncStatus: "ALIGNED",
        lastSyncedAt: new Date()
      },
      update: {
        b2bProductId: b2bProduct.id,
        b2cStatus: b2cProduct.status,
        b2bStatus: b2bProduct.status,
        syncStatus: "ALIGNED",
        lastSyncedAt: new Date()
      }
    });

    await prisma.syncLog.create({
      data: {
        action: "UPDATE",
        entity: "PRODUCT",
        b2cId: b2cProduct.id,
        b2bId: b2bProduct.id,
        handle,
        isDryRun: false,
        outcome: "SUCCESS",
        origin,
        details: `Sincronizzazione completata per ${handle}. Modificati ${changes.length} elementi.`,
        changes
      }
    });

    return {
      success: true,
      isDryRun: false,
      handle,
      action: "UPDATE",
      details: `Prodotto B2B aggiornato con successo. Modificati ${changes.length} elementi.`,
      changes
    };

  } catch (err: any) {
    const errorMsg = err.message || String(err);
    console.error(`Errore durante la sync del prodotto ${handle}:`, errorMsg);

    await prisma.syncLog.create({
      data: {
        action: "UPDATE",
        entity: "PRODUCT",
        handle,
        isDryRun,
        outcome: "ERROR",
        origin,
        details: `Errore durante la sincronizzazione: ${errorMsg}`,
        errorStack: errorMsg
      }
    });

    return {
      success: false,
      isDryRun,
      handle,
      action: "ERROR",
      details: `Errore sync per ${handle}: ${errorMsg}`,
      error: errorMsg
    };
  }
}

// 5. MOTORE BATCH: SINCRONIZZA TUTTI I PRODOTTI O UN ELENCO SELEZIONATO
export async function syncMultipleProducts(handles: string[], options: SyncOptions = {}) {
  const results: SyncProductResult[] = [];
  for (const h of handles) {
    const res = await syncProduct(h, options);
    results.push(res);
  }

  const summary = {
    total: results.length,
    created: results.filter((r) => r.action === "CREATE").length,
    updated: results.filter((r) => r.action === "UPDATE").length,
    excluded: results.filter((r) => r.action === "EXCLUDE").length,
    skipped: results.filter((r) => r.action === "SKIP").length,
    errors: results.filter((r) => r.action === "ERROR").length
  };

  return { summary, results };
}
