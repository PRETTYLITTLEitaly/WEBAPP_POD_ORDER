import { shopifyFetch } from "@/lib/shopify";

export const dynamic = "force-dynamic";

export default async function ReportPage() {
  const query = `#graphql
    query getProductionOrders {
      orders(first: 250, query: "status:open fulfillment_status:unfulfilled", sortKey: CREATED_AT, reverse: true) {
        nodes {
          tags
          lineItems(first: 50) {
            nodes {
              title
              quantity
              variant {
                id
                title
                pod_svg: metafield(namespace: "pod", key: "svg") { reference { ... on GenericFile { url } } }
                custom_url: metafield(namespace: "custom", key: "pod_svg_url") { value }
              }
              product {
                pod_svg: metafield(namespace: "pod", key: "svg") { reference { ... on GenericFile { url } } }
                custom_url: metafield(namespace: "custom", key: "pod_svg_url") { value }
              }
            }
          }
        }
      }
    }
  `;

  let b2bOrders: any[] = [];
  let b2cOrders: any[] = [];

  try {
    const [b2bRes, b2cRes] = await Promise.allSettled([
      shopifyFetch({ store: "b2b", query }),
      shopifyFetch({ store: "b2c", query })
    ]);

    if (b2bRes.status === "fulfilled") b2bOrders = b2bRes.value.data?.orders?.nodes || [];
    if (b2cRes.status === "fulfilled") b2cOrders = b2cRes.value.data?.orders?.nodes || [];
  } catch (error) {
    console.error("Errore fetch ordini per produzione:", error);
  }

  const isPOD = (item: any, orderTags: string[]) => {
    const isZepto = orderTags?.includes("product-personalizer");
    const p = item.product;
    const v = item.variant;
    const hasPodMeta = !!(p?.pod_svg?.reference?.url || p?.custom_url?.value || v?.pod_svg?.reference?.url || v?.custom_url?.value);
    return isZepto || hasPodMeta;
  };

  const productionMap = new Map<string, {
    title: string;
    variantTitle: string;
    total: number;
    b2b: number;
    b2c: number;
  }>();

  const processOrders = (orders: any[], storeType: "b2b" | "b2c") => {
    for (const order of orders) {
      const orderTags = order.tags || [];
      const lineItems = order.lineItems?.nodes || [];
      
      for (const item of lineItems) {
        if (!isPOD(item, orderTags)) continue;

        const variantId = item.variant?.id || item.title;
        const key = variantId;

        if (!productionMap.has(key)) {
          productionMap.set(key, {
            title: item.title,
            variantTitle: item.variant?.title && item.variant.title !== "Default Title" ? item.variant.title : "",
            total: 0,
            b2b: 0,
            b2c: 0,
          });
        }

        const entry = productionMap.get(key)!;
        entry.total += item.quantity;
        if (storeType === "b2b") entry.b2b += item.quantity;
        if (storeType === "b2c") entry.b2c += item.quantity;
      }
    }
  };

  processOrders(b2bOrders, "b2b");
  processOrders(b2cOrders, "b2c");

  const aggregatedList = Array.from(productionMap.values()).sort((a, b) => b.total - a.total);

  return (
    <div className="space-y-6">
      <div className="pb-4">
        <h1 className="text-[28px] leading-9 font-semibold text-gray-900">
          Report Produzione
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Totale aggregato dei prodotti stampati (POD) da produrre tra B2B e B2C.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-[#f4f6f8]">
              <tr>
                <th scope="col" className="px-4 py-2.5 text-left font-semibold text-gray-700">Prodotto</th>
                <th scope="col" className="px-4 py-2.5 text-center font-semibold text-gray-700">Totale</th>
                <th scope="col" className="px-4 py-2.5 text-center font-semibold text-gray-700">B2B</th>
                <th scope="col" className="px-4 py-2.5 text-center font-semibold text-gray-700">B2C</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {aggregatedList.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    Nessun prodotto POD da produrre al momento.
                  </td>
                </tr>
              ) : (
                aggregatedList.map((item, index) => (
                  <tr key={index} className="transition-colors hover:bg-[#f4f6f8]">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{item.title}</div>
                      {item.variantTitle && (
                        <div className="text-sm text-gray-600">{item.variantTitle}</div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-center">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-gray-100 text-sm font-bold text-gray-900">
                        {item.total}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-center text-sm font-medium text-gray-900">
                      {item.b2b}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-center text-sm font-medium text-gray-900">
                      {item.b2c}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
