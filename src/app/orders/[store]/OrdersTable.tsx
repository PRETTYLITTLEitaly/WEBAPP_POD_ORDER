"use client";

import { useState } from "react";
import Link from "next/link";

export default function OrdersTable({ initialOrders, store }: { initialOrders: any[], store: string }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const toggleAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelected(initialOrders.map(o => o.id));
    } else {
      setSelected([]);
    }
  };

  const toggleOne = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleGeneratePdf = async () => {
    setLoading(true);
    // Placeholder - la logica PDF vera verrà gestita chiamando una API
    alert(`Integrazione PDF avviata per gli ordini: ${selected.join(", ")}`);
    setLoading(false);
  };

  return (
    <div className="bg-white dark:bg-gray-900 shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl overflow-hidden backdrop-blur-xl">
      {selected.length > 0 && (
        <div className="bg-indigo-50 dark:bg-indigo-900/30 px-4 py-3 flex items-center justify-between border-b border-indigo-100 dark:border-indigo-800/50">
          <span className="text-sm text-indigo-700 dark:text-indigo-300 font-medium">
            {selected.length} ordini selezionati
          </span>
          <div className="flex gap-3">
            <button 
              onClick={() => alert('Funzione Documenti Trasporto: Da definire (Vedi piano)')}
              className="text-sm px-3 py-1.5 rounded-md text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 shadow-sm"
            >
              Documenti di Trasporto
            </button>
            <button 
              onClick={handleGeneratePdf}
              disabled={loading}
              className="text-sm px-3 py-1.5 rounded-md text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm disabled:opacity-50"
            >
              {loading ? "Generazione..." : "Genera Stampa (PDF)"}
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
          <thead className="bg-gray-50 dark:bg-gray-800/50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <input 
                  type="checkbox" 
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  onChange={toggleAll}
                  checked={initialOrders.length > 0 && selected.length === initialOrders.length}
                />
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ordine</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Totale</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tag</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stato</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
            {initialOrders.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-500">
                  Nessun ordine trovato.
                </td>
              </tr>
            ) : initialOrders.map((order) => {
              const orderNum = order.name;
              const date = new Date(order.createdAt).toLocaleDateString();
              const isSelected = selected.includes(order.id);
              const isEvaso = order.displayFulfillmentStatus === "FULFILLED";
              
              return (
                <tr key={order.id} className={isSelected ? "bg-indigo-50/50 dark:bg-indigo-900/20" : "hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input 
                      type="checkbox" 
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      checked={isSelected}
                      onChange={() => toggleOne(order.id)}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-600 dark:text-indigo-400">
                    <Link href={`/orders/${store}/${order.id.split('/').pop()}`}>
                      {orderNum}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                    {order.customer ? `${order.customer.firstName} ${order.customer.lastName}` : "N/D"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {order.totalPriceSet?.shopMoney?.amount} {order.totalPriceSet?.shopMoney?.currencyCode}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {order.tags?.map((t: string) => (
                      <span key={t} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 mr-1">
                        {t}
                      </span>
                    ))}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isEvaso ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'}`}>
                      {isEvaso ? "Evaso" : "Inevaso"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
