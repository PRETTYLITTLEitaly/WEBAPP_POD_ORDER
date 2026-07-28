import { NextRequest, NextResponse } from "next/server";
import { shopifyFetch } from "@/lib/shopify";

export const dynamic = "force-dynamic";

// GET /api/products/metafields — Paginazione per TUTTI i 600+ prodotti, collezioni (con flag Automatica vs Manuale) e file SVG reali
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const store = (searchParams.get("store") as "b2b" | "b2c") || "b2c";
    const searchQuery = searchParams.get("query") || "";
    const selectedCollection = searchParams.get("collection") || "";
    const selectedTag = searchParams.get("tag") || "";
    const selectedType = searchParams.get("product_type") || "";

    const queryParts: string[] = [];
    if (searchQuery.trim()) {
      queryParts.push(`title:*${searchQuery.trim()}*`);
    }
    if (selectedTag.trim()) {
      queryParts.push(`tag:${selectedTag.trim()}`);
    }
    if (selectedType.trim()) {
      queryParts.push(`product_type:"${selectedType.trim()}"`);
    }

    const shopifySearchString = queryParts.join(" AND ");

    // 1. Query Prodotti con paginazione, i 7 Metafield e info ruleSet Collezioni
    const productsQuery = `#graphql
      query getProducts($first: Int!, $after: String, $query: String) {
        products(first: $first, after: $after, query: $query, sortKey: TITLE) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            id
            title
            handle
            productType
            tags
            collections(first: 10) {
              nodes {
                id
                title
                ruleSet {
                  rules {
                    column
                  }
                }
              }
            }
            featuredImage {
              url
              altText
            }
            metafield_pod_svg_url: metafield(namespace: "custom", key: "pod_svg_url") { id value }
            metafield_pod_svg: metafield(namespace: "pod", key: "svg") { id value reference { ... on GenericFile { id url } ... on MediaImage { id image { url } } } }
            metafield_pod_height: metafield(namespace: "pod", key: "height") { id value }
            metafield_pod_width: metafield(namespace: "pod", key: "width") { id value }
            metafield_colore_stick: metafield(namespace: "custom", key: "colore_stick") { id value }
            metafield_colore_base: metafield(namespace: "custom", key: "colore_base") { id value }
            metafield_colore_cavo: metafield(namespace: "custom", key: "colore_cavo") { id value }
          }
        }
      }
    `;

    let allRawProducts: any[] = [];
    let hasNextProductPage = true;
    let afterProductCursor: string | null = null;
    let productPageCount = 0;

    while (hasNextProductPage && productPageCount < 8) {
      productPageCount++;

      const vars: any = { first: 250, after: afterProductCursor };
      if (shopifySearchString.trim()) {
        vars.query = shopifySearchString.trim();
      }

      const pRes = await shopifyFetch({
        store,
        query: productsQuery,
        variables: vars
      });

      const pData = pRes.data?.products;
      const nodes = pData?.nodes || [];
      allRawProducts.push(...nodes);

      hasNextProductPage = Boolean(pData?.pageInfo?.hasNextPage);
      afterProductCursor = pData?.pageInfo?.endCursor || null;
    }

    // 2. Query specifica per SOLI File .SVG (esclude .otf, .woff2, ecc.)
    const filesQuery = `#graphql
      query getFiles($first: Int!, $after: String) {
        files(first: $first, after: $after, query: "filename:*.svg OR filename:*.SVG") {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            id
            createdAt
            ... on GenericFile {
              id
              url
              mimeType
              alt
            }
            ... on MediaImage {
              id
              image {
                url
              }
            }
          }
        }
      }
    `;

    let allRawFiles: any[] = [];
    let hasNextFilePage = true;
    let afterFileCursor: string | null = null;
    let filePageCount = 0;

    while (hasNextFilePage && filePageCount < 4) {
      filePageCount++;
      const fRes: any = await shopifyFetch({
        store,
        query: filesQuery,
        variables: {
          first: 250,
          after: afterFileCursor
        }
      }).catch(() => null);

      if (!fRes) break;

      const fData: any = fRes.data?.files;
      const nodes = fData?.nodes || [];
      allRawFiles.push(...nodes);

      hasNextFilePage = Boolean(fData?.pageInfo?.hasNextPage);
      afterFileCursor = fData?.pageInfo?.endCursor || null;
    }

    // 3. Query Collezioni Shopify con flag ruleSet per distinguere Automatiche da Manuali
    const collectionsQuery = `#graphql
      query getCollections {
        collections(first: 250) {
          nodes {
            id
            title
            handle
            productsCount
            ruleSet {
              rules {
                column
              }
            }
          }
        }
      }
    `;

    // 4. Query Definizioni Metafield
    const metaDefsQuery = `#graphql
      query getMetafieldDefs {
        metafieldDefinitions(first: 100, ownerType: PRODUCT) {
          nodes {
            namespace
            key
            name
            type {
              name
            }
            validations {
              name
              value
            }
          }
        }
      }
    `;

    const [collectionsRes, metaDefsRes] = await Promise.all([
      shopifyFetch({ store, query: collectionsQuery }).catch(() => ({ data: { collections: { nodes: [] } } })),
      shopifyFetch({ store, query: metaDefsQuery }).catch(() => ({ data: { metafieldDefinitions: { nodes: [] } } }))
    ]);

    let rawProducts = allRawProducts;
    const collectionsRaw = collectionsRes.data?.collections?.nodes || [];
    const metaDefs = metaDefsRes.data?.metafieldDefinitions?.nodes || [];

    const collections = collectionsRaw.map((c: any) => ({
      id: c.id,
      title: c.title,
      handle: c.handle,
      productsCount: c.productsCount,
      isAutomated: Boolean(c.ruleSet !== null && (c.ruleSet?.rules?.length || 0) > 0)
    }));

    if (selectedCollection.trim()) {
      try {
        const collectionProductsQuery = `#graphql
          query getCollectionProducts($id: ID!) {
            collection(id: $id) {
              products(first: 250) {
                nodes {
                  id
                }
              }
            }
          }
        `;
        const colProdRes = await shopifyFetch({ store, query: collectionProductsQuery, variables: { id: selectedCollection } });
        const colProductIds = new Set((colProdRes.data?.collection?.products?.nodes || []).map((p: any) => p.id));
        rawProducts = rawProducts.filter((p: any) => colProductIds.has(p.id));
      } catch (e) {
        console.error("Errore filtro collezione:", e);
      }
    }

    const allTagsSet = new Set<string>();
    const allTypesSet = new Set<string>();
    allRawProducts.forEach((p: any) => {
      if (Array.isArray(p.tags)) {
        p.tags.forEach((t: string) => allTagsSet.add(t));
      }
      if (p.productType) {
        allTypesSet.add(p.productType);
      }
    });

    const svgFilesMap = new Map<string, { id: string; url: string; filename: string }>();

    allRawFiles.forEach((f: any) => {
      if (!f) return;
      const url = f.url || f.image?.url;
      if (!url) return;

      const cleanUrl = url.split("?")[0];
      const filename = cleanUrl.split("/").pop() || f.id;

      if (filename.toLowerCase().endsWith(".svg")) {
        svgFilesMap.set(f.id, { id: f.id, url, filename });
      }
    });

    allRawProducts.forEach((p: any) => {
      const ref = p.metafield_pod_svg?.reference;
      if (ref && ref.id) {
        const url = ref.url || ref.image?.url;
        if (url) {
          const cleanUrl = url.split("?")[0];
          const filename = cleanUrl.split("/").pop() || ref.id;
          if (filename.toLowerCase().endsWith(".svg")) {
            svgFilesMap.set(ref.id, { id: ref.id, url, filename });
          }
        }
      }
    });

    const svgFiles = Array.from(svgFilesMap.values());

    let coloreStickChoices: string[] = [];
    let coloreBaseChoices: string[] = [];
    let coloreCavoChoices: string[] = [];

    metaDefs.forEach((def: any) => {
      if (def.namespace === "custom" && def.key === "colore_stick") {
        const choiceVal = def.validations?.find((v: any) => v.name === "choices");
        if (choiceVal?.value) { try { coloreStickChoices = JSON.parse(choiceVal.value); } catch (e) {} }
      }
      if (def.namespace === "custom" && def.key === "colore_base") {
        const choiceVal = def.validations?.find((v: any) => v.name === "choices");
        if (choiceVal?.value) { try { coloreBaseChoices = JSON.parse(choiceVal.value); } catch (e) {} }
      }
      if (def.namespace === "custom" && def.key === "colore_cavo") {
        const choiceVal = def.validations?.find((v: any) => v.name === "choices");
        if (choiceVal?.value) { try { coloreCavoChoices = JSON.parse(choiceVal.value); } catch (e) {} }
      }
    });

    const products = rawProducts.map((p: any) => {
      const svgUrl = p.metafield_pod_svg_url?.value || "";
      const svgFileId = p.metafield_pod_svg?.reference?.id || p.metafield_pod_svg?.value || "";
      const svgFileUrl = p.metafield_pod_svg?.reference?.url || p.metafield_pod_svg?.reference?.image?.url || "";
      const height = p.metafield_pod_height?.value || "";
      const width = p.metafield_pod_width?.value || "";
      const coloreStick = p.metafield_colore_stick?.value || "";
      const coloreBase = p.metafield_colore_base?.value || "";
      const coloreCavo = p.metafield_colore_cavo?.value || "";

      const isComplete = Boolean(svgUrl && (svgFileId || svgFileUrl) && height && width && coloreStick && coloreBase && coloreCavo);
      const isPartial = Boolean(svgUrl || svgFileId || svgFileUrl || height || width || coloreStick || coloreBase || coloreCavo);

      const productCollections = (p.collections?.nodes || []).map((c: any) => ({
        id: c.id,
        title: c.title,
        isAutomated: Boolean(c.ruleSet !== null && (c.ruleSet?.rules?.length || 0) > 0)
      }));

      return {
        id: p.id,
        title: p.title,
        handle: p.handle,
        productType: p.productType || "",
        tags: p.tags || [],
        collections: productCollections,
        imageUrl: p.featuredImage?.url || null,
        imageAlt: p.featuredImage?.altText || p.title,
        metafields: {
          pod_svg_url: svgUrl,
          pod_svg_file_id: svgFileId,
          pod_svg_file_url: svgFileUrl,
          pod_height: height,
          pod_width: width,
          colore_stick: coloreStick,
          colore_base: coloreBase,
          colore_cavo: coloreCavo
        },
        status: isComplete ? "complete" : isPartial ? "partial" : "missing"
      };
    });

    return NextResponse.json({
      success: true,
      products,
      totalCount: products.length,
      files: svgFiles,
      allFilesCount: svgFiles.length,
      collections,
      tags: Array.from(allTagsSet).sort(),
      productTypes: Array.from(allTypesSet).sort(),
      coloreStickChoices,
      coloreBaseChoices,
      coloreCavoChoices
    });
  } catch (error: any) {
    console.error("Errore recupero metafield prodotti:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/products/metafields — Aggiorna metafield, tag e collezioni del prodotto su Shopify
export async function POST(req: NextRequest) {
  try {
    const { store, productId, metafields, tags, addCollectionIds, removeCollectionIds } = await req.json();

    if (!productId) {
      return NextResponse.json({ success: false, error: "ID Prodotto mancante." }, { status: 400 });
    }

    if (Array.isArray(tags)) {
      const productUpdateMutation = `#graphql
        mutation updateProductTags($input: ProductInput!) {
          productUpdate(input: $input) {
            product { id tags }
            userErrors { field message }
          }
        }
      `;
      await shopifyFetch({
        store: store || "b2c",
        query: productUpdateMutation,
        variables: { input: { id: productId, tags } }
      });
    }

    if (Array.isArray(addCollectionIds) && addCollectionIds.length > 0) {
      for (const colId of addCollectionIds) {
        const colAddMutation = `#graphql
          mutation addCollectionProducts($id: ID!, $productIds: [ID!]!) {
            collectionAddProducts(id: $id, productIds: $productIds) {
              userErrors { field message }
            }
          }
        `;
        await shopifyFetch({
          store: store || "b2c",
          query: colAddMutation,
          variables: { id: colId, productIds: [productId] }
        });
      }
    }

    if (Array.isArray(removeCollectionIds) && removeCollectionIds.length > 0) {
      for (const colId of removeCollectionIds) {
        const colRemoveMutation = `#graphql
          mutation removeCollectionProducts($id: ID!, $productIds: [ID!]!) {
            collectionRemoveProducts(id: $id, productIds: $productIds) {
              userErrors { field message }
            }
          }
        `;
        await shopifyFetch({
          store: store || "b2c",
          query: colRemoveMutation,
          variables: { id: colId, productIds: [productId] }
        });
      }
    }

    if (metafields) {
      const metaDefsQuery = `#graphql
        query getMetafieldDefs {
          metafieldDefinitions(first: 100, ownerType: PRODUCT) {
            nodes {
              namespace
              key
              type {
                name
              }
            }
          }
        }
      `;

      const metaDefsRes: any = await shopifyFetch({ store: store || "b2c", query: metaDefsQuery }).catch(() => ({ data: { metafieldDefinitions: { nodes: [] } } }));
      const metaDefs = metaDefsRes.data?.metafieldDefinitions?.nodes || [];

      const getType = (namespace: string, key: string, fallback: string) => {
        const found = metaDefs.find((d: any) => d.namespace === namespace && d.key === key);
        return found?.type?.name || fallback;
      };

      const metafieldsInput: any[] = [];

      const addMetafield = (namespace: string, key: string, value: string, defaultType: string) => {
        const valStr = String(value || "").trim();
        if (!valStr) return;

        const targetType = getType(namespace, key, defaultType);

        metafieldsInput.push({
          ownerId: productId,
          namespace,
          key,
          type: targetType,
          value: valStr
        });
      };

      addMetafield("custom", "pod_svg_url", metafields.pod_svg_url, "single_line_text_field");
      if (metafields.pod_svg_file_id && String(metafields.pod_svg_file_id).trim()) {
        addMetafield("pod", "svg", metafields.pod_svg_file_id, "file_reference");
      }
      addMetafield("pod", "height", metafields.pod_height, "number_decimal");
      addMetafield("pod", "width", metafields.pod_width, "number_decimal");
      addMetafield("custom", "colore_stick", metafields.colore_stick, "single_line_text_field");
      addMetafield("custom", "colore_base", metafields.colore_base, "single_line_text_field");
      addMetafield("custom", "colore_cavo", metafields.colore_cavo, "single_line_text_field");

      if (metafieldsInput.length > 0) {
        const mutation = `#graphql
          mutation setMetafields($metafields: [MetafieldsSetInput!]!) {
            metafieldsSet(metafields: $metafields) {
              metafields {
                id
                namespace
                key
                value
              }
              userErrors {
                field
                message
              }
            }
          }
        `;

        const res = await shopifyFetch({
          store: store || "b2c",
          query: mutation,
          variables: { metafields: metafieldsInput }
        });

        const userErrors = res.data?.metafieldsSet?.userErrors || [];
        if (userErrors.length > 0) {
          return NextResponse.json({
            success: false,
            error: userErrors.map((e: any) => e.message).join(", ")
          }, { status: 400 });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Errore salvataggio prodotto/metafield:", error);
    let errorMsg = error.message || "Errore sconosciuto.";
    if (errorMsg.includes("ACCESS_DENIED") || errorMsg.includes("write_products")) {
      errorMsg = "Permessi Shopify insufficienti: Attiva 'write_products' nella tua App Personalizzata.";
    }
    return NextResponse.json({ success: false, error: errorMsg }, { status: 400 });
  }
}
