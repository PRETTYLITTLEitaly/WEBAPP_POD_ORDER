import Link from "next/link";
import { Package, Truck, AlertCircle } from "lucide-react";
import { shopifyFetch } from "@/lib/shopify";
import { getSendcloudIssues } from "@/lib/sendcloud";

async function getCounts() {
  const query = `#graphql
    query getUnfulfilledCount {
      orders(first: 250, query: "status:open fulfillment_status:unfulfilled") {
        nodes { id }
      }
    }
  `;

  try {
    const [b2bRes, b2cRes] = await Promise.allSettled([
      shopifyFetch({ store: "b2b", query }),
      shopifyFetch({ store: "b2c", query })
    ]);

    const b2bCount = b2bRes.status === "fulfilled" ? b2bRes.value.data?.orders?.nodes?.length || 0 : 0;
    const b2cCount = b2cRes.status === "fulfilled" ? b2cRes.value.data?.orders?.nodes?.length || 0 : 0;
    return { b2bCount, b2cCount };
  } catch (error) {
    console.error(error);
    return { b2bCount: 0, b2cCount: 0 };
  }
}

export default async function Home() {
  const { b2bCount, b2cCount } = await getCounts();
  const sendcloudData = await getSendcloudIssues();
  const issuesCount = sendcloudData.count;

  return (
    <div className="space-y-6">
      {/* Header Polaris */}
      <div className="pb-4">
        <h1 className="text-[28px] leading-9 font-semibold text-gray-900">
          Panoramica Operativa
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Monitora lo stato degli ordini e delle spedizioni in attesa di lavorazione.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Card B2B */}
        <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-200 overflow-hidden flex flex-col">
          <div className="p-5 flex-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Package className="w-5 h-5 text-gray-700" />
              </div>
              <h2 className="text-base font-semibold text-gray-900">Ordini B2B</h2>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-semibold text-gray-900">
                {b2bCount}
              </span>
              <span className="text-sm font-medium text-gray-500">da evadere</span>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3 border-t border-gray-200">
            <Link href="/orders/b2b" className="text-sm font-medium text-[#303030] hover:underline flex items-center justify-between">
              Gestisci ordini B2B
              <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        </div>

        {/* Card B2C */}
        <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-200 overflow-hidden flex flex-col">
          <div className="p-5 flex-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Truck className="w-5 h-5 text-gray-700" />
              </div>
              <h2 className="text-base font-semibold text-gray-900">Ordini B2C</h2>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-semibold text-gray-900">
                {b2cCount}
              </span>
              <span className="text-sm font-medium text-gray-500">da evadere</span>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3 border-t border-gray-200">
            <Link href="/orders/b2c" className="text-sm font-medium text-[#303030] hover:underline flex items-center justify-between">
              Gestisci ordini B2C
              <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        </div>

        {/* Card Spedizioni */}
        <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-200 overflow-hidden flex flex-col">
          <div className="p-5 flex-1">
            <div className="flex items-center gap-2 mb-4">
              <div className={`p-2 rounded-lg ${issuesCount > 0 ? 'bg-[#fed3d1]' : 'bg-gray-100'}`}>
                <AlertCircle className={`w-5 h-5 ${issuesCount > 0 ? 'text-[#8e1f1c]' : 'text-gray-700'}`} />
              </div>
              <h2 className="text-base font-semibold text-gray-900">Spedizioni Sendcloud</h2>
            </div>
            
            {issuesCount > 0 ? (
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-semibold text-[#8e1f1c]">
                  {issuesCount}
                </span>
                <span className="text-sm font-medium text-gray-500">problemi rilevati</span>
              </div>
            ) : (
              <div className="mt-4">
                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold bg-[#e4f1ed] text-[#0b5c46]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0b5c46] mr-1.5"></span>
                  Nessun problema
                </span>
              </div>
            )}
          </div>
          
          {issuesCount > 0 ? (
             <div className="bg-[#fff4f4] px-5 py-3 border-t border-[#fed3d1]">
              <Link href="/spedizioni" className="text-sm font-medium text-[#8e1f1c] hover:underline flex items-center justify-between">
                Verifica spedizioni
                <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          ) : (
            <div className="bg-gray-50 px-5 py-3 border-t border-gray-200">
              <Link href="/spedizioni" className="text-sm font-medium text-gray-600 hover:text-gray-900 hover:underline flex items-center justify-between">
                Vai a Spedizioni
                <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
