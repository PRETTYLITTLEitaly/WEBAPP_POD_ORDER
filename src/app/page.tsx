import Link from "next/link";
import { PackageOpen, Truck, AlertTriangle } from "lucide-react";
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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-4xl">
          Benvenuto nel Centro Operativo
        </h1>
        <p className="mt-4 text-lg text-gray-500 dark:text-gray-400">
          Monitora e gestisci gli ordini in attesa di stampa ed evasione.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Card B2B */}
        <Link href="/orders/b2b" className="group block">
          <div className="relative rounded-2xl border border-gray-200 bg-white/50 dark:bg-gray-900/50 p-8 shadow-sm backdrop-blur-xl transition-all duration-300 hover:shadow-xl hover:border-indigo-500/30 dark:border-gray-800 hover:-translate-y-1 overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 transition-opacity group-hover:opacity-20">
              <PackageOpen className="w-24 h-24 text-indigo-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Store B2B</h2>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black bg-gradient-to-br from-indigo-500 to-purple-600 bg-clip-text text-transparent">
                {b2bCount}
              </span>
              <span className="text-gray-500 font-medium">da evadere</span>
            </div>
            <div className="mt-6 inline-flex items-center text-sm font-semibold text-indigo-600 dark:text-indigo-400">
              Gestisci ordini <span aria-hidden="true" className="ml-1 transition-transform group-hover:translate-x-1">&rarr;</span>
            </div>
          </div>
        </Link>

        {/* Card B2C */}
        <Link href="/orders/b2c" className="group block">
          <div className="relative rounded-2xl border border-gray-200 bg-white/50 dark:bg-gray-900/50 p-8 shadow-sm backdrop-blur-xl transition-all duration-300 hover:shadow-xl hover:border-emerald-500/30 dark:border-gray-800 hover:-translate-y-1 overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 transition-opacity group-hover:opacity-20">
              <Truck className="w-24 h-24 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Store B2C</h2>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black bg-gradient-to-br from-emerald-500 to-teal-600 bg-clip-text text-transparent">
                {b2cCount}
              </span>
              <span className="text-gray-500 font-medium">da evadere</span>
            </div>
            <div className="mt-6 inline-flex items-center text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              Gestisci ordini <span aria-hidden="true" className="ml-1 transition-transform group-hover:translate-x-1">&rarr;</span>
            </div>
          </div>
        </Link>

        {/* Card Spedizioni Sendcloud */}
        <Link href={issuesCount > 0 ? "/spedizioni" : "#"} className="group block h-full">
          <div className={`relative h-full rounded-2xl border bg-white/50 dark:bg-gray-900/50 p-8 shadow-sm backdrop-blur-xl transition-all duration-300 hover:shadow-xl hover:-translate-y-1 overflow-hidden ${
            issuesCount > 0 
              ? "border-red-200 dark:border-red-900/50 hover:border-red-500/30" 
              : "border-gray-200 dark:border-gray-800 hover:border-gray-300"
          }`}>
            <div className="absolute top-0 right-0 p-4 opacity-10 transition-opacity group-hover:opacity-20">
              <AlertTriangle className={`w-24 h-24 ${issuesCount > 0 ? 'text-red-600' : 'text-gray-400'}`} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Spedizioni con problemi</h2>
            <div className="flex items-baseline gap-2">
              {issuesCount > 0 ? (
                <>
                  <span className="text-5xl font-black bg-gradient-to-br from-red-500 to-orange-600 bg-clip-text text-transparent">
                    {issuesCount}
                  </span>
                  <span className="text-gray-500 font-medium">problemi rilevati</span>
                </>
              ) : (
                <span className="text-xl font-semibold text-gray-500 dark:text-gray-400 mt-4">
                  Nessun problema rilevato
                </span>
              )}
            </div>
            
            {issuesCount > 0 && (
              <div className="mt-6 inline-flex items-center text-sm font-semibold text-red-600 dark:text-red-400">
                Visualizza dettagli <span aria-hidden="true" className="ml-1 transition-transform group-hover:translate-x-1">&rarr;</span>
              </div>
            )}
          </div>
        </Link>
      </div>
    </div>
  );
}
