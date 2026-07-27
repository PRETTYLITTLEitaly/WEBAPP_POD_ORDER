"use server";

import { shopifyFetch } from "@/lib/shopify";
import { revalidatePath } from "next/cache";

export async function fulfillOrder(orderIdWithoutGid: string) {
  const orderGid = `gid://shopify/Order/${orderIdWithoutGid}`;

  try {
    const foResponse = await shopifyFetch({
      store: "b2b",
      query: `#graphql
        query getFulfillmentOrders($id: ID!) {
          order(id: $id) {
            fulfillmentOrders(first: 10) {
              nodes {
                id
                status
                lineItems(first: 50) {
                  nodes {
                    id
                    remainingQuantity
                  }
                }
              }
            }
          }
        }
      `,
      variables: { id: orderGid }
    });

    const fulfillmentOrders = foResponse.data?.order?.fulfillmentOrders?.nodes || [];
    const openFulfillmentOrders = fulfillmentOrders.filter((fo: any) => fo.status === "OPEN" || fo.status === "IN_PROGRESS");

    if (openFulfillmentOrders.length === 0) {
      return { error: "Nessun elemento da evadere trovato per questo ordine." };
    }

    const fulfillmentLines = openFulfillmentOrders.map((fo: any) => {
      return {
        fulfillmentOrderId: fo.id,
        fulfillmentOrderLineItems: fo.lineItems.nodes.map((li: any) => ({
          id: li.id,
          quantity: li.remainingQuantity
        }))
      };
    });

    const fulfillResponse = await shopifyFetch({
      store: "b2b",
      query: `#graphql
        mutation fulfillmentCreateV2($fulfillment: FulfillmentV2Input!) {
          fulfillmentCreateV2(fulfillment: $fulfillment) {
            fulfillment { id status }
            userErrors { field message }
          }
        }
      `,
      variables: {
        fulfillment: {
          lineItemsByFulfillmentOrder: fulfillmentLines,
          notifyCustomer: true
        }
      }
    });

    if (fulfillResponse.data?.fulfillmentCreateV2?.userErrors?.length > 0) {
      return { error: fulfillResponse.data.fulfillmentCreateV2.userErrors[0].message };
    }

    revalidatePath(`/orders/b2b/${orderIdWithoutGid}`);
    revalidatePath(`/orders/b2b`);
    return { success: true };
  } catch (error: any) {
    console.error("Errore evasione:", error);
    return { error: error.message || "Errore sconosciuto" };
  }
}
