"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface SavedView {
  id: string;
  name: string;
  search: string;
  tag: string;
  status: string;
}

export default function OrdersTable({ initialOrders, store }: { initialOrders: any[], store: string }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [tagFilter, setTagFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all', 'evaso', 'inevaso'

  // Saved Views States
  const [views, setViews] = useState<SavedView[]>([]);
  const [activeViewId, setActiveViewId] = useState<string>("default");
  const [isSavingView, setIsSavingView] = useState(false);
  const [newViewName, setNewViewName] = useState("");

  // Load views from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(`savedViews_${store}`);
    if (saved) {
      try {
        setViews(JSON.parse(saved));
      } catch (e) {
        console.error("Error parsing saved views", e);
      }
    }
  }, [store]);

  // Extract unique tags
  const allTags = Array.from(new Set(initialOrders.flatMap(o => o.tags || []))).sort() as string[];

  // Filter orders
  const filteredOrders = initialOrders.filter(order => {
    const searchLower = searchQuery.toLowerCase();
    const customerName = order.customer ? `${order.customer.firstName || ''} ${order.customer.lastName || ''}`.toLowerCase() : "";
    const matchSearch = order.name.toLowerCase().includes(searchLower) || customerName.includes(searchLower);
    
    const matchTag = tagFilter === "all" || (order.tags || []).includes(tagFilter);
    
    const isEvaso = order.displayFulfillmentStatus === "FULFILLED";
    const matchStatus = statusFilter === "all" || (statusFilter === "evaso" && isEvaso) || (statusFilter === "inevaso" && !isEvaso);
    
    return matchSearch && matchTag && matchStatus;
  });

  const toggleAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelected(filteredOrders.map(o => o.id));
    } else {
      setSelected([]);
    }
  };

  const toggleOne = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleGeneratePdf = async () => {
    setLoading(true);
    alert(`Integrazione PDF avviata per gli ordini: ${selected.join(", ")}`);
    setLoading(false);
  };

  const saveView = () => {
    if (!newViewName.trim()) return;
    const newView: SavedView = {
      id: Date.now().toString(),
      name: newViewName.trim(),
      search: searchQuery,
      tag: tagFilter,
      status: statusFilter
    };
    const updatedViews = [...views, newView];
    setViews(updatedViews);
    localStorage.setItem(`savedViews_${store}`, JSON.stringify(updatedViews));
    setActiveViewId(newView.id);
    setNewViewName("");
    setIsSavingView(false);
  };

  const applyView = (viewId: string) => {
    setActiveViewId(viewId);
    if (viewId === "default") {
      setSearchQuery("");
      setTagFilter("all");
      setStatusFilter("all");
    } else {
      const view = views.find(v => v.id === viewId);
      if (view) {
        setSearchQuery(view.search);
        setTagFilter(view.tag);
        setStatusFilter(view.status);
      }
    }
  };

  const deleteView = (viewId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedViews = views.filter(v => v.id !== viewId);
    setViews(updatedViews);
    localStorage.setItem(`savedViews_${store}`, JSON.stringify(updatedViews));
    if (activeViewId === viewId) {
      applyView("default");
    }
  };

  return (
    <div className="space-y-4">
      {/* Viste Salvate (Tabs) */}
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800 pb-px overflow-x-auto">
        <button
          onClick={() => applyView("default")}
          className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
            activeViewId === "default" 
              ? "border-indigo-500 text-indigo-600 dark:text-indigo-400" 
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
          }`}
        >
          Tutti gli ordini
        </button>
        {views.map(view => (
          <div key={view.id} className="relative group flex items-center">
            <button
              onClick={() => applyView(view.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
                activeViewId === view.id 
                  ? "border-indigo-500 text-indigo-600 dark:text-indigo-400" 
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              {view.name}
              <span 
                onClick={(e) => deleteView(view.id, e)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full cursor-pointer text-gray-400 hover:text-red-500 transition-all"
                title="Elimina vista"
              >
                ×
              </span>
            </button>
          </div>
        ))}
      </div>

      {/* Barra dei Filtri */}
      <div className="bg-white dark:bg-gray-900 p-4 rounded-xl shadow-sm ring-1 ring-gray-900/5 flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Cerca ordine o cliente</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Es. #15122 o Mario Rossi"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Stato Evasione</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="block w-full py-2 pl-3 pr-8 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="all">Tutti gli stati</option>
            <option value="inevaso">Solo Inevasi (Aperti)</option>
            <option value="evaso">Solo Evasi (Completati)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Filtra per Tag</label>
          <select
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            className="block w-full py-2 pl-3 pr-8 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="all">Tutti i tag</option>
            {allTags.map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          {!isSavingView ? (
            <button
              onClick={() => setIsSavingView(true)}
              className="py-2 px-4 border border-gray-300 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm"
            >
              Salva Vista
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newViewName}
                onChange={(e) => setNewViewName(e.target.value)}
                placeholder="Nome vista..."
                className="py-2 px-3 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:ring-indigo-500 bg-white dark:bg-gray-800 dark:text-white"
                autoFocus
              />
              <button
                onClick={saveView}
                className="py-2 px-4 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm"
              >
                Salva
              </button>
              <button
                onClick={() => setIsSavingView(false)}
                className="py-2 px-3 text-sm text-gray-500 hover:text-gray-700"
              >
                Annulla
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabella Ordini */}
      <div className="bg-white dark:bg-gray-900 shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl overflow-hidden backdrop-blur-xl">
        {selected.length > 0 && (
          <div className="bg-indigo-50 dark:bg-indigo-900/30 px-4 py-3 flex items-center justify-between border-b border-indigo-100 dark:border-indigo-800/50">
            <span className="text-sm text-indigo-700 dark:text-indigo-300 font-medium">
              {selected.length} ordini selezionati
            </span>
            <div className="flex gap-3">
              <button 
                onClick={() => {
                  const selectedOrderNames = selected.map(id => {
                    const order = initialOrders.find(o => o.id === id);
                    return order ? order.name.replace('#', '') : '';
                  }).filter(Boolean);
                  const queryStr = selectedOrderNames.join(' OR ');
                  const shopName = store === "b2b" ? "wholesale-prettylittle-it" : "prettylittle-it";
                  const url = `https://admin.shopify.com/store/${shopName}/orders?query=${encodeURIComponent(queryStr)}`;
                  window.open(url, '_blank');
                }}
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
                    checked={filteredOrders.length > 0 && selected.length === filteredOrders.length}
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
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-500">
                    Nessun ordine trovato con questi filtri.
                  </td>
                </tr>
              ) : filteredOrders.map((order) => {
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
    </div>
  );
}
