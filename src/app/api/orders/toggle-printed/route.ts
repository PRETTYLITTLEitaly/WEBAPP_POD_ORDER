import { NextRequest, NextResponse } from "next/server";
import { shopifyFetch } from "@/lib/shopify";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { orderId, store, isPrinted } = await req.json();

    if (!orderId) {
      return NextResponse.json({ success: false, error: "ID Ordine mancante." }, { status: 400 });
    }

    const currentStore = store === "b2b" ? "b2b" : "b2c";

    if (isPrinted) {
      // 1. Aggiungi tag POD_STAMPATO
      const tagMutation = `#graphql
        mutation tagsAdd($id: ID!, $tags: [String!]!) {
          tagsAdd(id: $id, tags: $tags) {
            userErrors { field message }
          }
        }
      `;
      await shopifyFetch({
        store: currentStore,
        query: tagMutation,
        variables: { id: orderId, tags: ["POD_STAMPATO"] }
      });

      // 2. Imposta metafield pod.status = "printed"
      const metafieldMutation = `#graphql
        mutation setOrderMetafield($metafields: [MetafieldsSetInput!]!) {
          metafieldsSet(metafields: $metafields) {
            userErrors { field message }
          }
        }
      `;
      await shopifyFetch({
        store: currentStore,
        query: metafieldMutation,
        variables: {
          metafields: [{
            ownerId: orderId,
            namespace: "pod",
            key: "status",
            type: "single_line_text_field",
            value: "printed"
          }]
        }
      });
    } else {
      // 1. Rimuovi tag POD_STAMPATO
      const tagRemoveMutation = `#graphql
        mutation tagsRemove($id: ID!, $tags: [String!]!) {
          tagsRemove(id: $id, tags: $tags) {
            userErrors { field message }
          }
        }
      `;
      await shopifyFetch({
        store: currentStore,
        query: tagRemoveMutation,
        variables: { id: orderId, tags: ["POD_STAMPATO"] }
      });

      // 2. Imposta metafield pod.status = "unprinted"
      const metafieldMutation = `#graphql
        mutation setOrderMetafield($metafields: [MetafieldsSetInput!]!) {
          metafieldsSet(metafields: $metafields) {
            userErrors { field message }
          }
        }
      `;
      await shopifyFetch({
        store: currentStore,
        query: metafieldMutation,
        variables: {
          metafields: [{
            ownerId: orderId,
            namespace: "pod",
            key: "status",
            type: "single_line_text_field",
            value: "unprinted"
          }]
        }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Errore toggle stampato:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
