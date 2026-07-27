import { getSendcloudIssues } from "@/lib/sendcloud";
import { ExternalLink } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SpedizioniPage() {
  const data = await getSendcloudIssues();
  const parcels = data.parcels || [];

  return (
    <div className="space-y-6">
      <div className="pb-4">
        <h1 className="text-[28px] leading-9 font-semibold text-gray-900">
          Spedizioni con Problemi
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Elenco delle spedizioni in eccezione o con problemi di consegna recuperate da Sendcloud.
        </p>
      </div>

      {data.error && parcels.length === 0 && (
        <div className="rounded-xl border border-[#fed3d1] bg-[#fff4f4] p-4">
          <p className="text-sm font-medium text-[#8e1f1c]">
            {data.error}
          </p>
        </div>
      )}

      {!data.error && parcels.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#e4f1ed]">
            <svg className="h-6 w-6 text-[#0b5c46]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="mt-4 text-base font-semibold text-gray-900">Nessun problema rilevato</h3>
          <p className="mt-1 text-sm text-gray-600">Tutte le spedizioni stanno procedendo regolarmente.</p>
        </div>
      )}

      {parcels.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-[#f4f6f8]">
                <tr>
                  <th scope="col" className="px-4 py-2.5 text-left font-semibold text-gray-700">Ordine</th>
                  <th scope="col" className="px-4 py-2.5 text-left font-semibold text-gray-700">Tracking</th>
                  <th scope="col" className="px-4 py-2.5 text-left font-semibold text-gray-700">Corriere</th>
                  <th scope="col" className="px-4 py-2.5 text-left font-semibold text-gray-700">Problema</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-semibold text-gray-700">Azione</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {parcels.map((parcel: any) => (
                  <tr key={parcel.id} className="transition-colors hover:bg-[#f4f6f8]">
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-gray-900">
                      {parcel.orderNumber || "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-gray-600">
                      {parcel.trackingNumber || "N/D"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-900">
                      {parcel.carrier || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-md bg-[#fff4f4] px-2 py-1 text-xs font-semibold text-[#8e1f1c] ring-1 ring-inset ring-[#fed3d1]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#8e1f1c] mr-1.5"></span>
                        {parcel.statusMessage || "Errore sconosciuto"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      {parcel.trackingUrl ? (
                        <a
                          href={parcel.trackingUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-blue-600 hover:underline font-medium justify-end w-full"
                        >
                          Traccia <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      ) : (
                        <span className="text-gray-400">—</span>
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
