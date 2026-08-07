import { shopifyFetch } from "@/lib/shopify";
import OrdersTable from "./OrdersTable";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function OrdersPage({ params }: { params: Promise<{ store: string }> }) {
  const store = (await params).store;

  if (store !== "b2b" && store !== "b2c") {
    redirect("/");
  }

  const queryPage1 = `#graphql
    query getOrdersPage1 {
      orders(first: 250, sortKey: CREATED_AT, reverse: true) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          id
          name
          createdAt
          displayFulfillmentStatus
          totalPriceSet {
            shopMoney { amount currencyCode }
          }
          tags
          pod_status: metafield(namespace: "pod", key: "status") { id value }
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
          lineItems(first: 10) {
            nodes {
              id
              title
              quantity
              originalUnitPriceSet { shopMoney { amount currencyCode } }
              customAttributes { key value }
              product {
                id
                title
                featuredImage { url altText }
                colore_base: metafield(namespace: "custom", key: "colore_base") { value }
                prodotto_personalizzato: metafield(namespace: "custom", key: "prodotto_personalizzato") { value }
                colore_base_underscore: metafield(namespace: "custom_colore", key: "base") { value }
                pod_svg_url_custom: metafield(namespace: "custom", key: "pod_svg_url") { value }
                pod_svg_url_pod: metafield(namespace: "pod", key: "svg_url") { value }
                pod_svg: metafield(namespace: "pod", key: "svg") { reference { ... on GenericFile { url } ... on MediaImage { image { url } } } }
              }
              variant {
                title
                sku
                image { url altText }
                price
              }
            }
          }
        }
      }
    }
  `;

  const queryPage2 = `#graphql
    query getOrdersPage2($after: String!) {
      orders(first: 250, after: $after, sortKey: CREATED_AT, reverse: true) {
        nodes {
          id
          name
          createdAt
          displayFulfillmentStatus
          totalPriceSet {
            shopMoney { amount currencyCode }
          }
          tags
          pod_status: metafield(namespace: "pod", key: "status") { id value }
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
          lineItems(first: 10) {
            nodes {
              id
              title
              quantity
              originalUnitPriceSet { shopMoney { amount currencyCode } }
              customAttributes { key value }
              product {
                id
                title
                featuredImage { url altText }
                colore_base: metafield(namespace: "custom", key: "colore_base") { value }
                prodotto_personalizzato: metafield(namespace: "custom", key: "prodotto_personalizzato") { value }
                colore_base_underscore: metafield(namespace: "custom_colore", key: "base") { value }
                pod_svg_url_custom: metafield(namespace: "custom", key: "pod_svg_url") { value }
                pod_svg_url_pod: metafield(namespace: "pod", key: "svg_url") { value }
                pod_svg: metafield(namespace: "pod", key: "svg") { reference { ... on GenericFile { url } ... on MediaImage { image { url } } } }
              }
              variant {
                title
                sku
                image { url altText }
                price
              }
            }
          }
        }
      }
    }
  `;

  let orders: any[] = [];
  try {
    const res1 = await shopifyFetch({ store: store as "b2b" | "b2c", query: queryPage1 });
    const nodes1 = res1.data?.orders?.nodes || [];
    const pageInfo = res1.data?.orders?.pageInfo;
    orders = [...nodes1];

    if (pageInfo?.hasNextPage && pageInfo?.endCursor) {
      const res2 = await shopifyFetch({ store: store as "b2b" | "b2c", query: queryPage2, variables: { after: pageInfo.endCursor } });
      const nodes2 = res2.data?.orders?.nodes || [];
      orders = [...orders, ...nodes2];
    }
  } catch (error) {
    console.error("Errore caricamento 500 ordini:", error);
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
