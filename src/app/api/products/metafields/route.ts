import { NextRequest, NextResponse } from "next/server";
import { shopifyFetch } from "@/lib/shopify";

export const dynamic = "force-dynamic";

// GET /api/products/metafields — Recupera lista prodotti, immagini, i 6 metafield e i file SVG da Shopify
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const store = (searchParams.get("store") as "b2b" | "b2c") || "b2c";
    const searchQuery = searchParams.get("query") || "";

    // 1. Query prodotti con i 6 metafield ed immagine di copertina
    const productsQuery = `#graphql
      query getProducts($query: String) {
        products(first: 100, query: $query, sortKey: TITLE) {
          nodes {
            id
            title
            handle
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

    // 2. Query file SVG generici caricati su Shopify Files
    const filesQuery = `#graphql
      query getSvgFiles {
        files(first: 100, query: "media_type:GENERIC_FILE") {
          nodes {
            ... on GenericFile {
              id
              url
              filename
            }
          }
        }
      }
    `;

    // 3. Query definizioni metafield per la lista dei colori ammessi
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

    const [productsRes, filesRes, metaDefsRes] = await Promise.all([
      shopifyFetch({ store, query: productsQuery, variables: { query: searchQuery ? `title:*${searchQuery}*` : undefined } }),
      shopifyFetch({ store, query: filesQuery }).catch(() => ({ data: { files: { nodes: [] } } })),
      shopifyFetch({ store, query: metaDefsQuery }).catch(() => ({ data: { metafieldDefinitions: { nodes: [] } } }))
    ]);

    const rawProducts = productsRes.data?.products?.nodes || [];
    const files = filesRes.data?.files?.nodes || [];
    const metaDefs = metaDefsRes.data?.metafieldDefinitions?.nodes || [];

    // Estraiamo le opzioni di colore da custom.colore_stick e custom.colore_base
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

      // Verifica se ha tutti e 6 i metafield configurati
      const isComplete = Boolean(svgUrl && (svgFileId || svgFileUrl) && height && width && coloreStick && coloreBase);
      const isPartial = Boolean(svgUrl || svgFileId || svgFileUrl || height || width || coloreStick || coloreBase);

      return {
        id: p.id,
        title: p.title,
        handle: p.handle,
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
      files,
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
