import fs from "fs";

// Normalizza stringhe per opzioni e valori (minuscolo, rimozione spazi extra, uniformità unità di misura)
function normalizeStr(str) {
  if (!str) return "";
  return str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "")
    .replace(/(\d+)\s*ml\b/g, "$1ml")
    .replace(/(\d+)\s*gr?\b/g, "$1g")
    .replace(/(\d+)\s*g\b/g, "$1g");
}

// Genera una chiave univoca per le varianti basata su selectedOptions normalizzate
function getVariantOptionKey(selectedOptions) {
  if (!selectedOptions || selectedOptions.length === 0) return "default";
  return selectedOptions
    .map(o => `${normalizeStr(o.name)}:${normalizeStr(o.value)}`)
    .sort()
    .join("|");
}

// Applica arrotondamento prezzo
function applyRounding(price, rounding) {
  if (rounding === "NONE" || !rounding) return price;
  const intPart = Math.floor(price);
  if (rounding === "0.90") return intPart + 0.90;
  if (rounding === "0.50") return intPart + 0.50;
  if (rounding === "1.00") return Math.ceil(price);
  return price;
}

// Motore Risoluzione Regole Prezzo
function resolvePrice(b2cProduct, b2cVariant, priceRules) {
  const matchingRules = [];

  for (const rule of priceRules) {
    if (!rule.active) continue;

    let scopeMatch = false;
    let specificityWeight = 0; // PRODUCT > COLLECTION/TAG > PRODUCT_TYPE/VENDOR > ALL

    if (rule.scopeType === "ALL") {
      scopeMatch = true;
      specificityWeight = 1;
    } else if (rule.scopeType === "PRODUCT_TYPE" && rule.scopeValue) {
      if (normalizeStr(b2cProduct.productType).includes(normalizeStr(rule.scopeValue))) {
        scopeMatch = true;
        specificityWeight = 2;
      }
    } else if (rule.scopeType === "VENDOR" && rule.scopeValue) {
      if (normalizeStr(b2cProduct.vendor) === normalizeStr(rule.scopeValue)) {
        scopeMatch = true;
        specificityWeight = 2;
      }
    } else if (rule.scopeType === "TAG" && rule.scopeValue) {
      if ((b2cProduct.tags || []).some(t => normalizeStr(t) === normalizeStr(rule.scopeValue))) {
        scopeMatch = true;
        specificityWeight = 3;
      }
    } else if (rule.scopeType === "PRODUCT" && rule.scopeValue) {
      if (normalizeStr(b2cProduct.handle) === normalizeStr(rule.scopeValue)) {
        scopeMatch = true;
        specificityWeight = 4;
      }
    }

    if (!scopeMatch) continue;

    // Verifica Condizioni Opzione (AND)
    let optionsMatch = true;
    const conds = rule.optionConditions || [];
    for (const cond of conds) {
      const varOpt = (b2cVariant.selectedOptions || []).find(
        o => normalizeStr(o.name) === normalizeStr(cond.option)
      );
      if (!varOpt || normalizeStr(varOpt.value) !== normalizeStr(cond.value)) {
        optionsMatch = false;
        break;
      }
    }

    if (optionsMatch) {
      matchingRules.push({
        rule,
        priority: rule.priority || 0,
        specificity: specificityWeight,
        conditionCount: conds.length
      });
    }
  }

  if (matchingRules.length === 0) {
    return {
      price: parseFloat(b2cVariant.price || "0"),
      ruleName: null,
      needsManualPrice: true
    };
  }

  // Ordina per: Priority DESC -> Specificity DESC -> ConditionCount DESC
  matchingRules.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    if (b.specificity !== a.specificity) return b.specificity - a.specificity;
    return b.conditionCount - a.conditionCount;
  });

  const win = matchingRules[0].rule;
  const rawPrice = parseFloat(b2cVariant.price || "0");
  let calcPrice = rawPrice;

  if (win.priceType === "FIXED") {
    calcPrice = parseFloat(win.priceValue);
  } else if (win.priceType === "PERCENT_OF_B2C") {
    calcPrice = rawPrice * (parseFloat(win.priceValue) / 100);
  } else if (win.priceType === "COEFFICIENT") {
    calcPrice = rawPrice * parseFloat(win.priceValue);
  }

  calcPrice = applyRounding(calcPrice, win.rounding);

  return {
    price: calcPrice,
    ruleName: win.name,
    needsManualPrice: false
  };
}

async function runStep1Report() {
  console.log("=================================================");
  console.log("     AVVIO REPORT DI ALLINEAMENTO IN SOLA LETTURA ");
  console.log("=================================================");

  const b2cShop = process.env.NEXT_PUBLIC_B2C_SHOP || "prettylittle-it.myshopify.com";
  const b2cToken = process.env.SHOPIFY_B2C_TOKEN;
  const b2bShop = process.env.NEXT_PUBLIC_B2B_SHOP || "wholesale-prettylittle-it.myshopify.com";
  const b2bToken = process.env.SHOPIFY_B2B_TOKEN;

  if (!b2cToken || !b2bToken) {
    console.error("Token mancanti in environment!");
    process.exit(1);
  }

  // Regole Prezzo Iniziali (06/10/2026)
  const initialPriceRules = [
    { name: "Profumatore 150ml", priority: 10, active: true, scopeType: "PRODUCT_TYPE", scopeValue: "Profumatore", optionConditions: [{ option: "Formato", value: "150ml" }], priceType: "FIXED", priceValue: 19.00, rounding: "NONE" },
    { name: "Profumatore 300ml", priority: 10, active: true, scopeType: "PRODUCT_TYPE", scopeValue: "Profumatore", optionConditions: [{ option: "Formato", value: "300ml" }], priceType: "FIXED", priceValue: 24.00, rounding: "NONE" },
    { name: "Mini profumatore mini-profumatore-50ml", priority: 20, active: true, scopeType: "PRODUCT", scopeValue: "mini-profumatore-50ml", optionConditions: [], priceType: "FIXED", priceValue: 14.00, rounding: "NONE" },
    { name: "Candela 220g", priority: 10, active: true, scopeType: "PRODUCT_TYPE", scopeValue: "Candela", optionConditions: [{ option: "Formato", value: "220g" }], priceType: "FIXED", priceValue: 10.00, rounding: "NONE" },
    { name: "Candela 450g", priority: 10, active: true, scopeType: "PRODUCT_TYPE", scopeValue: "Candela", optionConditions: [{ option: "Formato", value: "450g" }], priceType: "FIXED", priceValue: 19.00, rounding: "NONE" },
    { name: "Vaso", priority: 10, active: true, scopeType: "PRODUCT_TYPE", scopeValue: "Vaso", optionConditions: [], priceType: "FIXED", priceValue: 24.00, rounding: "NONE" },
    { name: "Lampada", priority: 10, active: true, scopeType: "PRODUCT_TYPE", scopeValue: "Lampada", optionConditions: [], priceType: "FIXED", priceValue: 28.00, rounding: "NONE" },
    { name: "Accessori cestello-vaso", priority: 20, active: true, scopeType: "PRODUCT", scopeValue: "cestello-vaso", optionConditions: [], priceType: "FIXED", priceValue: 5.00, rounding: "NONE" },
    { name: "Accessori kit-sua", priority: 20, active: true, scopeType: "PRODUCT", scopeValue: "kit-sua", optionConditions: [], priceType: "FIXED", priceValue: 5.00, rounding: "NONE" },
    { name: "Accessori box-cerimonia", priority: 20, active: true, scopeType: "PRODUCT", scopeValue: "box-cerimonia", optionConditions: [], priceType: "FIXED", priceValue: 4.88, rounding: "NONE" }
  ];

  async function fetchAllProducts(shop, token) {
    let hasNext = true;
    let after = null;
    const products = [];
    while (hasNext) {
      const query = `#graphql
        query getProds($after: String) {
          products(first: 250, after: $after) {
            pageInfo { hasNextPage endCursor }
            nodes {
              id
              title
              handle
              status
              vendor
              productType
              tags
              options { name values }
              metafield_pod_svg: metafield(namespace: "pod", key: "svg") { value reference { ... on GenericFile { url } } }
              metafield_pod_url: metafield(namespace: "custom", key: "pod_svg_url") { value }
              metafield_pod_w: metafield(namespace: "pod", key: "width") { value }
              metafield_pod_h: metafield(namespace: "pod", key: "height") { value }
              variants(first: 100) {
                nodes {
                  id
                  title
                  sku
                  price
                  compareAtPrice
                  selectedOptions { name value }
                }
              }
            }
          }
        }
      `;
      const res = await fetch(`https://${shop}/admin/api/2026-07/graphql.json`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token },
        body: JSON.stringify({ query, variables: { after } })
      });
      const data = await res.json();
      const nodes = data.data?.products?.nodes || [];
      products.push(...nodes);
      hasNext = data.data?.products?.pageInfo?.hasNextPage || false;
      after = data.data?.products?.pageInfo?.endCursor || null;
    }
    return products;
  }

  console.log("Lettura prodotti da B2C Master...");
  const b2cProducts = await fetchAllProducts(b2cShop, b2cToken);
  console.log(`Trovati ${b2cProducts.length} prodotti nel B2C.`);

  console.log("Lettura prodotti da B2B Copia...");
  const b2bProducts = await fetchAllProducts(b2bShop, b2bToken);
  console.log(`Trovati ${b2bProducts.length} prodotti nel B2B.`);

  const b2bProductMap = new Map();
  b2bProducts.forEach(p => b2bProductMap.set(p.handle, p));

  const excludedNoB2c = [];
  const matchedProducts = [];
  const toCreateProducts = [];
  const b2bHandlesInB2c = new Set();

  // 1. Analisi Prodotti B2C
  for (const b2cProd of b2cProducts) {
    if ((b2cProd.tags || []).includes("no-b2b")) {
      excludedNoB2c.push(b2cProd);
      continue;
    }

    const b2bProd = b2bProductMap.get(b2cProd.handle);

    if (b2bProd) {
      b2bHandlesInB2c.add(b2cProd.handle);

      // Mappatura Varianti
      const b2bVariantMap = new Map();
      b2bProd.variants.nodes.forEach(v => {
        const key = getVariantOptionKey(v.selectedOptions);
        b2bVariantMap.set(key, v);
      });

      const matchedVariants = [];
      const toCreateVariants = [];
      const b2bMatchedKeys = new Set();

      for (const b2cVar of b2cProd.variants.nodes) {
        const key = getVariantOptionKey(b2cVar.selectedOptions);
        const b2bVar = b2bVariantMap.get(key);
        if (b2bVar) {
          b2bMatchedKeys.add(key);
          const skuMatch = b2cVar.sku && b2bVar.sku ? (normalizeStr(b2cVar.sku) === normalizeStr(b2bVar.sku)) : "N/A";
          matchedVariants.push({ b2cVar, b2bVar, skuMatch });
        } else {
          // Variante da creare nel prodotto abbinato -> Calcola Prezzo Regola
          const priceRes = resolvePrice(b2cProd, b2cVar, initialPriceRules);
          toCreateVariants.push({ b2cVar, priceRes });
        }
      }

      const orphanB2bVariants = b2bProd.variants.nodes.filter(
        v => !b2bMatchedKeys.has(getVariantOptionKey(v.selectedOptions))
      );

      // Differenze POD
      const b2cPod = {
        svg: b2cProd.metafield_pod_svg?.reference?.url || b2cProd.metafield_pod_svg?.value || null,
        url: b2cProd.metafield_pod_url?.value || null,
        w: b2cProd.metafield_pod_w?.value || null,
        h: b2cProd.metafield_pod_h?.value || null,
      };
      const b2bPod = {
        svg: b2bProd.metafield_pod_svg?.reference?.url || b2bProd.metafield_pod_svg?.value || null,
        url: b2bProd.metafield_pod_url?.value || null,
        w: b2bProd.metafield_pod_w?.value || null,
        h: b2bProd.metafield_pod_h?.value || null,
      };

      const hasPodDiff = JSON.stringify(b2cPod) !== JSON.stringify(b2bPod);
      const hasStatusDiff = b2cProd.status !== b2bProd.status;

      matchedProducts.push({
        b2cProd,
        b2bProd,
        matchedVariants,
        toCreateVariants,
        orphanB2bVariants,
        hasPodDiff,
        b2cPod,
        b2bPod,
        hasStatusDiff
      });
    } else {
      // Prodotto da creare in B2B -> Calcola Prezzo Regola per ogni variante
      const variantsWithPrice = b2cProd.variants.nodes.map(b2cVar => {
        const priceRes = resolvePrice(b2cProd, b2cVar, initialPriceRules);
        return { b2cVar, priceRes };
      });

      toCreateProducts.push({ b2cProd, variantsWithPrice });
    }
  }

  // Prodotti Orfani Solo-B2B
  const orphanB2bProducts = b2bProducts.filter(p => !b2bHandlesInB2c.has(p.handle));

  // Generazione Report Dettagliato
  let reportText = "";
  reportText += `=================================================================\n`;
  reportText += `       REPORT DI ALLINEAMENTO B2C -> B2B (SOLA LETTURA / DRY-RUN) \n`;
  reportText += `       Data esecuzione: ${new Date().toISOString()}\n`;
  reportText += `=================================================================\n\n`;

  reportText += `--- SINTESI GENERALE PRODOTTI ---\n`;
  reportText += `Prodotti B2C Totali Scansionati: ${b2cProducts.length}\n`;
  reportText += `  - Esclusi da Sync (Tag "no-b2b"): ${excludedNoB2c.length}\n`;
  reportText += `  - Prodotti ABBINATI (Presenti sia in B2C che B2B per Handle): ${matchedProducts.length}\n`;
  reportText += `  - Prodotti DA CREARE in B2B (Esistono in B2C ma non in B2B): ${toCreateProducts.length}\n`;
  reportText += `  - Prodotti ORFANI solo in B2B (Mai toccati né cancellati): ${orphanB2bProducts.length}\n\n`;

  reportText += `=================================================================\n`;
  reportText += `a) ELENCO PRODOTTI DA CREARE IN B2B (${toCreateProducts.length})\n`;
  reportText += `=================================================================\n`;
  toCreateProducts.forEach((item, idx) => {
    reportText += `${idx + 1}. [${item.b2cProd.handle}] "${item.b2cProd.title}" (Type: "${item.b2cProd.productType}", Varianti: ${item.variantsWithPrice.length})\n`;
  });

  reportText += `\n=================================================================\n`;
  reportText += `b) DETTAGLIO VARIANTI E CAMPI PER PRODOTTI ABBINATI (${matchedProducts.length})\n`;
  reportText += `=================================================================\n`;
  let totalMatchedVars = 0;
  let totalToCreateVarsInMatched = 0;
  let totalOrphanVarsInMatched = 0;

  matchedProducts.forEach(m => {
    totalMatchedVars += m.matchedVariants.length;
    totalToCreateVarsInMatched += m.toCreateVariants.length;
    totalOrphanVarsInMatched += m.orphanB2bVariants.length;
  });

  reportText += `Totale Varianti Abbinate per Opzioni: ${totalMatchedVars}\n`;
  reportText += `Totale Varianti Nuove da Creare nei Prodotti Abbinati: ${totalToCreateVarsInMatched}\n`;
  reportText += `Totale Varianti Orfane solo in B2B (Preservate): ${totalOrphanVarsInMatched}\n\n`;

  reportText += `=================================================================\n`;
  reportText += `c) DIFFERENZE POD ED DIFFERENZE DI STATO (ACTIVE/DRAFT)\n`;
  reportText += `=================================================================\n`;
  const podDiffs = matchedProducts.filter(m => m.hasPodDiff);
  const statusDiffs = matchedProducts.filter(m => m.hasStatusDiff);

  reportText += `Prodotti Abbinati con Differenze POD (B2C vs B2B): ${podDiffs.length}\n`;
  podDiffs.slice(0, 10).forEach(p => {
    reportText += `  - [${p.b2cProd.handle}] B2C SVG: ${p.b2cPod.svg || p.b2cPod.url || "Nessuno"} | B2B SVG: ${p.b2bPod.svg || p.b2bPod.url || "Nessuno"}\n`;
  });
  if (podDiffs.length > 10) reportText += `  ... e altri ${podDiffs.length - 10} prodotti.\n`;

  reportText += `\nProdotti Abbinati con Differenze di Stato (B2C vs B2B): ${statusDiffs.length}\n`;
  statusDiffs.slice(0, 10).forEach(p => {
    reportText += `  - [${p.b2cProd.handle}] Stato B2C: ${p.b2cProd.status} vs Stato B2B: ${p.b2bProd.status}\n`;
  });

  reportText += `\n=================================================================\n`;
  reportText += `d) COPERTURA REGOLE PREZZO SULLE NUOVE VARIANTI B2B\n`;
  reportText += `=================================================================\n`;
  let totalNewVariants = 0;
  let coveredNewVariants = 0;
  let undefinedNewVariants = 0;
  const undefinedVariantsList = [];

  // Analisi varianti nuove in prodotti da creare
  toCreateProducts.forEach(p => {
    p.variantsWithPrice.forEach(v => {
      totalNewVariants++;
      if (v.priceRes.needsManualPrice) {
        undefinedNewVariants++;
        undefinedVariantsList.push({ handle: p.b2cProd.handle, title: p.b2cProd.title, type: p.b2cProd.productType, varTitle: v.b2cVar.title, b2cPrice: v.b2cVar.price });
      } else {
        coveredNewVariants++;
      }
    });
  });

  // Analisi varianti nuove in prodotti abbinati
  matchedProducts.forEach(p => {
    p.toCreateVariants.forEach(v => {
      totalNewVariants++;
      if (v.priceRes.needsManualPrice) {
        undefinedNewVariants++;
        undefinedVariantsList.push({ handle: p.b2cProd.handle, title: p.b2cProd.title, type: p.b2cProd.productType, varTitle: v.b2cVar.title, b2cPrice: v.b2cVar.price });
      } else {
        coveredNewVariants++;
      }
    });
  });

  reportText += `Totale Nuove Varianti da Creare nel B2B: ${totalNewVariants}\n`;
  reportText += `Varianti con Regola Prezzo Applicata: ${coveredNewVariants} (${((coveredNewVariants / (totalNewVariants || 1)) * 100).toFixed(1)}%)\n`;
  reportText += `Varianti Senza Regola (Lista "Prezzi da definire", Prezzo B2C segnaposto, DRAFT): ${undefinedNewVariants}\n\n`;

  if (undefinedVariantsList.length > 0) {
    reportText += `Esempi di Varianti senza Regola Prezzo Trovata (Primi 15):\n`;
    undefinedVariantsList.slice(0, 15).forEach((item, idx) => {
      reportText += `  ${idx + 1}. [${item.handle}] (Type: "${item.type}") - Variante: "${item.varTitle}" (Prezzo B2C: €${item.b2cPrice})\n`;
    });
  }

  reportText += `\n=================================================================\n`;
  reportText += `e) VERIFICA REGOLE INIZIALI VS DATI REALI B2C\n`;
  reportText += `=================================================================\n`;
  reportText += `1. Verifiche Tipo Prodotto B2C:\n`;
  const allB2cTypes = new Set(b2cProducts.map(p => p.productType).filter(Boolean));
  reportText += `   Tipi Prodotto Reali in B2C: ${JSON.stringify(Array.from(allB2cTypes))}\n`;

  reportText += `\n2. Verifiche Handle Specifici del Listino:\n`;
  const checkHandles = ["mini-profumatore-50ml", "cestello-vaso", "kit-sua", "box-cerimonia"];
  checkHandles.forEach(h => {
    const exists = b2cProducts.some(p => p.handle === h);
    reportText += `   - Handle "${h}": ${exists ? "ESISTE NEL B2C" : "NON TROVATO IN B2C (Da verificare nome handle)"}\n`;
  });

  fs.writeFileSync("./step1-alignment-report.txt", reportText);
  console.log(reportText);
  console.log("\nReport salvato in ./step1-alignment-report.txt!");
}

runStep1Report().catch(console.error);
