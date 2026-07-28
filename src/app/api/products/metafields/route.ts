import { NextRequest, NextResponse } from "next/server";
import { shopifyFetch } from "@/lib/shopify";

export const dynamic = "force-dynamic";

// GET /api/products/metafields — Paginazione automatica per recuperare TUTTI i 600+ prodotti, collezioni e file da Shopify
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

    // 1. Query Prodotti con paginazione e Collezioni per singolo prodotto
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
              }
            }
            featuredImage {
              url
              altText
            }
            metafield_pod_svg_url: metafield(namespace: "custom", key: "pod_svg_url") { id value }
            metafield_pod_svg: metafield(namespace: "pod", key: "svg") { id value reference { ... on GenericFile { id url } } }
            metafield_pod_height: metafield(namespace: "pod", key: "height") { id value }
            metafield_pod_width: metafield(namespace: "pod", key: "width") { id value }
            metafield_colore_stick: metafield(namespace: "custom", key: "colore_stick") { id value }
            metafield_colore_base: metafield(namespace: "custom", key: "colore_base") { id value }
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

    // 2. Query File generici da Shopify
    const filesQuery = `#graphql
      query getFiles($first: Int!, $after: String) {
        files(first: $first, after: $after) {
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

    while (hasNextFilePage && filePageCount < 3) {
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

    // 3. Query Collezioni Shopify
    const collectionsQuery = `#graphql
      query getCollections {
        collections(first: 250) {
          nodes {
            id
            title
            handle
            productsCount
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
    const collections = collectionsRes.data?.collections?.nodes || [];
    const metaDefs = metaDefsRes.data?.metafieldDefinitions?.nodes || [];

    // Se è stata selezionata una Collezione specifica, filtriamo i prodotti associati
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

    // Estraggo tutti i Tag e Tipi di prodotto unici
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

    // Mappa dei file SVG (da Shopify Files e dai prodotti)
    const svgFilesMap = new Map<string, { id: string; url: string; filename: string }>();

    allRawFiles.forEach((f: any) => {
      if (!f || !f.url) return;
      const cleanUrl = f.url.split("?")[0];
      const filename = cleanUrl.split("/").pop() || f.id;
      svgFilesMap.set(f.id, { id: f.id, url: f.url, filename });
    });

    allRawProducts.forEach((p: any) => {
      const ref = p.metafield_pod_svg?.reference;
      if (ref && ref.id && ref.url) {
        const cleanUrl = ref.url.split("?")[0];
        const filename = cleanUrl.split("/").pop() || ref.id;
        svgFilesMap.set(ref.id, { id: ref.id, url: ref.url, filename });
      }
    });

    const svgFiles = Array.from(svgFilesMap.values());

    // Opzioni colore dalle definizioni
    let coloreStickChoices: string[] = [];
    let coloreBaseChoices: string[] = [];

    metaDefs.forEach((def: any) => {
      if (def.namespace === "custom" && def.key === "colore_stick") {
        const choiceVal = def.validations?.find((v: any) => v.name === "choices");
        if (choiceVal?.value) {
          try { coloreStickChoices = JSON.parse(choiceVal.value); } catch (e) {}
        }
      }
      if (def.namespace === "custom" && def.key === "colore_base") {
        const choiceVal = def.validations?.find((v: any) => v.name === "choices");
        if (choiceVal?.value) {
          try { coloreBaseChoices = JSON.parse(choiceVal.value); } catch (e) {}
        }
      }
    });

    const products = rawProducts.map((p: any) => {
      const svgUrl = p.metafield_pod_svg_url?.value || "";
      const svgFileId = p.metafield_pod_svg?.reference?.id || p.metafield_pod_svg?.value || "";
      const svgFileUrl = p.metafield_pod_svg?.reference?.url || "";
      const height = p.metafield_pod_height?.value || "";
      const width = p.metafield_pod_width?.value || "";
      const coloreStick = p.metafield_colore_stick?.value || "";
      const coloreBase = p.metafield_colore_base?.value || "";

      const isComplete = Boolean(svgUrl && (svgFileId || svgFileUrl) && height && width && coloreStick && coloreBase);
      const isPartial = Boolean(svgUrl || svgFileId || svgFileUrl || height || width || coloreStick || coloreBase);

      const productCollections = (p.collections?.nodes || []).map((c: any) => c.title);

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
          colore_base: coloreBase
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
      coloreBaseChoices
    });
  } catch (error: any) {
    console.error("Errore recupero metafield prodotti:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/products/metafields — Aggiorna i metafield di un prodotto su Shopify via GraphQL
export async function POST(req: NextRequest) {
  try {
    const { store, productId, metafields } = await req.json();

    if (!productId || !metafields) {
      return NextResponse.json({ success: false, error: "Parametri mancanti." }, { status: 400 });
    }

    const metafieldsInput: any[] = [];

    // 1. custom.pod_svg_url
    if (metafields.pod_svg_url !== undefined) {
      metafieldsInput.push({
        ownerId: productId,
        namespace: "custom",
        key: "pod_svg_url",
        type: "single_line_text_field",
        value: String(metafields.pod_svg_url || "")
      });
    }

    // 2. pod.svg (file_reference)
    if (metafields.pod_svg_file_id !== undefined && metafields.pod_svg_file_id) {
      metafieldsInput.push({
        ownerId: productId,
        namespace: "pod",
        key: "svg",
        type: "file_reference",
        value: String(metafields.pod_svg_file_id)
      });
    }

    // 3. pod.height
    if (metafields.pod_height !== undefined) {
      metafieldsInput.push({
        ownerId: productId,
        namespace: "pod",
        key: "height",
        type: "single_line_text_field",
        value: String(metafields.pod_height || "")
      });
    }

    // 4. pod.width
    if (metafields.pod_width !== undefined) {
      metafieldsInput.push({
        ownerId: productId,
        namespace: "pod",
        key: "width",
        type: "single_line_text_field",
        value: String(metafields.pod_width || "")
      });
    }

    // 5. custom.colore_stick
    if (metafields.colore_stick !== undefined) {
      metafieldsInput.push({
        ownerId: productId,
        namespace: "custom",
        key: "colore_stick",
        type: "single_line_text_field",
        value: String(metafields.colore_stick || "")
      });
    }

    // 6. custom.colore_base
    if (metafields.colore_base !== undefined) {
      metafieldsInput.push({
        ownerId: productId,
        namespace: "custom",
        key: "colore_base",
        type: "single_line_text_field",
        value: String(metafields.colore_base || "")
      });
    }

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

    return NextResponse.json({
      success: true,
      metafields: res.data?.metafieldsSet?.metafields
    });
  } catch (error: any) {
    console.error("Errore salvataggio metafield:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
