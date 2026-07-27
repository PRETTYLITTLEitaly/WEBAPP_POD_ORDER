import { shopifyFetch, B2B_SHOP } from "@/lib/shopify";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import FulfillButton from "./FulfillButton";

export default async function OrderDetail({ params }: { params: Promise<{ store: string, id: string }> }) {
  const { store, id } = await params;
  if (store !== "b2b" && store !== "b2c") redirect("/");

  const orderGid = `gid://shopify/Order/${id}`;
  const query = `#graphql
    query getOrderDetails($id: ID!) {
      order(id: $id) {
        id
        name
        createdAt
        displayFulfillmentStatus
        totalPriceSet { shopMoney { amount currencyCode } }
        customer { firstName lastName email }
        shippingAddress { address1 city province country zip }
        tags
        printed: metafield(namespace: "pod", key: "printed") { value }
        lineItems(first: 50) {
          nodes {
            id
            title
            quantity
            customAttributes { key value }
            image { url }
            product {
              pod_svg: metafield(namespace: "pod", key: "svg") { reference { ... on GenericFile { url } ... on MediaImage { image { url } } } }
            }
            variant {
              pod_svg: metafield(namespace: "pod", key: "svg") { reference { ... on GenericFile { url } ... on MediaImage { image { url } } } }
            }
          }
        }
      }
    }
  `;

  let order = null;
  try {
    const res = await shopifyFetch({ store: store as "b2b" | "b2c", query, variables: { id: orderGid } });
    order = res.data?.order;
  } catch (error) {
    console.error(error);
  }

  if (!order) {
    return (
      <div className="p-8 text-center text-red-500 font-semibold bg-red-50 dark:bg-red-900/20 rounded-xl">
        Errore: Ordine non trovato o token non valido.
      </div>
    );
  }

  const isB2B = store === "b2b";
  const isFulfilled = order.displayFulfillmentStatus === "FULFILLED";
  const customerName = order.customer ? `${order.customer.firstName} ${order.customer.lastName}` : "N/D";
  const address = order.shippingAddress;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/orders/${store}`} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Ordine {order.name}
            </h1>
            <p className="text-sm text-gray-500">
              {new Date(order.createdAt).toLocaleString()}
            </p>
          </div>
        </div>

        {isB2B && !isFulfilled && (
          <FulfillButton orderId={id} />
        )}
        {isFulfilled && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 rounded-md font-medium text-sm">
            <CheckCircle2 className="w-4 h-4" />
            Evaso
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-900 shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl overflow-hidden backdrop-blur-xl p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Articoli</h2>
            <div className="divide-y divide-gray-200 dark:divide-gray-800">
              {order.lineItems.nodes.map((item: any) => {
                const podSvg = item.product?.pod_svg?.reference?.url || item.product?.pod_svg?.reference?.image?.url || item.variant?.pod_svg?.reference?.url || item.variant?.pod_svg?.reference?.image?.url;
                
                // Estrarre anteprima generata dall'app Product Personalizer
                const customPreviewAttr = item.customAttributes?.find((attr: any) => 
                  typeof attr.value === "string" && attr.value.startsWith("http") && (
                    attr.key.toLowerCase().includes("vedi") || 
                    attr.key.toLowerCase().includes("preview") || 
                    attr.key.toLowerCase().includes("immagine") || 
                    attr.key.toLowerCase().includes("grafica") || 
                    attr.key.toLowerCase().includes("_pplr") || 
                    attr.key.toLowerCase().includes("design")
                  )
                ) || item.customAttributes?.find((attr: any) => typeof attr.value === "string" && attr.value.startsWith("http"));

                const personalizerPreviewUrl = customPreviewAttr?.value;
                const displayImage = personalizerPreviewUrl || podSvg || item.image?.url || "https://via.placeholder.com/80";
                
                return (
                  <div key={item.id} className="py-4 flex gap-4">
                    <div className="flex-shrink-0 w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden ring-1 ring-black/5 relative group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={displayImage} 
                        alt={item.title} 
                        className="w-full h-full object-contain p-1"
                      />
                      {personalizerPreviewUrl && (
                        <a 
                          href={personalizerPreviewUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity"
                        >
                          Apri Anteprima ↗
                        </a>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">{item.title}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Quantità: {item.quantity}</p>
                      {item.customAttributes?.length > 0 && (
                        <div className="mt-2 text-sm text-gray-600 dark:text-gray-300 space-y-1 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                          {item.customAttributes.map((attr: any) => {
                            const isUrl = typeof attr.value === "string" && attr.value.startsWith("http");
                            return (
                              <div key={attr.key} className="flex flex-wrap items-center gap-1.5 text-xs">
                                <span className="font-bold text-gray-700 dark:text-gray-300">{attr.key}:</span>
                                {isUrl ? (
                                  <a 
                                    href={attr.value} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 underline"
                                  >
                                    Apri Grafica Personalizzata Product Personalizer ↗
                                  </a>
                                ) : (
                                  <span>{attr.value}</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-900 shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl p-6 backdrop-blur-xl">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Cliente</h2>
            <p className="text-gray-700 dark:text-gray-300 font-medium">{customerName}</p>
            {order.customer?.email && <p className="text-sm text-gray-500 mt-1">{order.customer.email}</p>}
          </div>

          <div className="bg-white dark:bg-gray-900 shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl p-6 backdrop-blur-xl">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Spedizione</h2>
            {address ? (
              <div className="text-gray-700 dark:text-gray-300 space-y-1">
                <p>{address.address1}</p>
                <p>{address.city} {address.province} {address.zip}</p>
                <p>{address.country}</p>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Nessun indirizzo specificato</p>
            )}
          </div>

          <div className="bg-white dark:bg-gray-900 shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl p-6 backdrop-blur-xl">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Riepilogo</h2>
            <div className="flex justify-between items-center text-lg font-semibold">
              <span className="text-gray-700 dark:text-gray-300">Totale</span>
              <span className="text-indigo-600 dark:text-indigo-400">
                {order.totalPriceSet?.shopMoney?.amount} {order.totalPriceSet?.shopMoney?.currencyCode}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
