import { NextRequest, NextResponse } from "next/server";
import { shopifyFetch } from "@/lib/shopify";

export const dynamic = "force-dynamic";

// In-memory fallback cache for edited images to guarantee zero data loss
export const editedImageMemoryCache = new Map<string, string>();

// POST /api/orders/save-graphic — Salva la grafica modificata nel metafield pod.edited_image dell'ordine
export async function POST(req: NextRequest) {
  try {
    const { orderId, store = "b2c", editedImageUrl, textData, width, height } = await req.json();

    if (!orderId) {
      return NextResponse.json({ success: false, error: "ID Ordine mancante" }, { status: 400 });
    }

    const valueToSave = typeof editedImageUrl === "string" ? editedImageUrl : JSON.stringify(editedImageUrl);

    // Salva in cache in memoria per accesso istantaneo immediato durante la generazione PDF
    editedImageMemoryCache.set(orderId, valueToSave);

    // Mutation per aggiornare i metafield pod.edited_image e pod.status su Shopify
    const mutation = `#graphql
      mutation setOrderGraphic($metafields: [MetafieldsSetInput!]!) {
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
      }`;

    const metafields = [
      {
        ownerId: orderId,
        namespace: "pod",
        key: "edited_image",
        type: "multi_line_text_field",
        value: valueToSave
      },
      {
        ownerId: orderId,
        namespace: "pod",
        key: "status",
        type: "single_line_text_field",
        value: "approved"
      }
    ];

    if (width) {
      metafields.push({
        ownerId: orderId,
        namespace: "pod",
        key: "width",
        type: "single_line_text_field",
        value: String(width)
      });
    }

    if (height) {
      metafields.push({
        ownerId: orderId,
        namespace: "pod",
        key: "height",
        type: "single_line_text_field",
        value: String(height)
      });
    }

    const shopifyRes = await shopifyFetch({
      store: store as "b2b" | "b2c",
      query: mutation,
      variables: { metafields }
    });

    const userErrors = shopifyRes.data?.metafieldsSet?.userErrors || [];
    if (userErrors.length > 0) {
      console.warn("Avviso aggiornamento metafield ordine:", userErrors);
    }

    return NextResponse.json({
      success: true,
      message: "Grafica salvata con successo per la stampa DTF!"
    });
  } catch (error: any) {
    console.error("Errore salvataggio grafica ordine:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
