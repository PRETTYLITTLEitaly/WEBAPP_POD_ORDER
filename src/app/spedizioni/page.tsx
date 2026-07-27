import { getSendcloudIssues } from "@/lib/sendcloud";
import { AlertTriangle, ExternalLink } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SpedizioniPage() {
  const data = await getSendcloudIssues();
  const parcels = data.parcels || [];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white uppercase flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-red-600" />
          Spedizioni con Problemi
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Elenco delle spedizioni in eccezione o con problemi di consegna recuperate da Sendcloud.
        </p>
      </div>

      {data.error && parcels.length === 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-900/20">
          <p className="text-sm font-medium text-red-800 dark:text-red-200">
            {data.error}
          </p>
        </div>
      )}

      {!data.error && parcels.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900/50">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
            <svg className="h-8 w-8 text-green-600 dark:text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">Nessun problema rilevato</h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Tutte le spedizioni stanno procedendo regolarmente.</p>
        </div>
      )}

      {parcels.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Ordine</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Tracking</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Corriere</th>
                  <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Problema</th>
                  <th scope="col" className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Azione</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800 bg-white dark:bg-gray-900">
                {parcels.map((parcel: any) => (
                  <tr key={parcel.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                      {parcel.orderNumber || "-"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-mono text-gray-500 dark:text-gray-400">
                      {parcel.trackingNumber || "N/D"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {parcel.carrier || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/10 dark:bg-red-900/20 dark:text-red-400 dark:ring-red-500/20">
                        {parcel.statusMessage || "Errore sconosciuto"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                      {parcel.trackingUrl ? (
                        <a
                          href={parcel.trackingUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                        >
                          Traccia <ExternalLink className="w-4 h-4" />
                        </a>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
