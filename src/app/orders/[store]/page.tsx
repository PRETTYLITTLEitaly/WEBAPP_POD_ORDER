import { shopifyFetch } from "@/lib/shopify";
import OrdersTable from "./OrdersTable";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function OrdersPage({ params }: { params: Promise<{ store: string }> }) {
  const store = (await params).store;

  if (store !== "b2b" && store !== "b2c") {
    redirect("/");
  }

  const query = `#graphql
    query getOrders {
      orders(first: 250, sortKey: CREATED_AT, reverse: true) {
        nodes {
          id
          name
          createdAt
          displayFulfillmentStatus
          totalPriceSet {
            shopMoney { amount currencyCode }
          }
          tags
          customer {
            firstName
            lastName
          }
          fulfillments {
            trackingInfo {
              number
              url
            }
          }
          lineItems(first: 20) {
            nodes {
              id
              title
              quantity
              customAttributes { key value }
              product {
                pod_svg: metafield(namespace: "pod", key: "svg") { reference { ... on GenericFile { url } } }
                custom_url: metafield(namespace: "custom", key: "pod_svg_url") { value }
              }
              variant {
                pod_svg: metafield(namespace: "pod", key: "svg") { reference { ... on GenericFile { url } } }
                custom_url: metafield(namespace: "custom", key: "pod_svg_url") { value }
              }
            }
          }
        }
      }
    }
  `;

  let orders: any[] = [];
  try {
    const res = await shopifyFetch({ store: store as "b2b" | "b2c", query });
    orders = res.data?.orders?.nodes || [];
  } catch (error) {
    console.error(error);
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white uppercase">
          Ordini {store}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Seleziona gli ordini per procedere alla generazione della stampa.
        </p>
      </div>

      <OrdersTable initialOrders={orders} store={store} />
    </div>
  );
}
