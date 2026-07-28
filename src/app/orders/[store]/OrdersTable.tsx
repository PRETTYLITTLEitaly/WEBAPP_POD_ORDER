"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Pencil, Sliders, CheckSquare, Eye } from "lucide-react";
import { getPresets, PrintPreset } from "@/lib/presetStore";
import TextEditorModal from "@/components/TextEditorModal";

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
  const [showOnlySelected, setShowOnlySelected] = useState(false);

  // Product Personalizer Quick Preview Modal State
  const [pplrModal, setPplrModal] = useState<{
    open: boolean;
    orderName: string;
    items: {
      title: string;
      previewUrl?: string;
      customAttributes?: { key: string; value: string }[];
    }[];
  }>({ open: false, orderName: "", items: [] });

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [tagFilter, setTagFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Saved Views States
  const [views, setViews] = useState<SavedView[]>([]);
  const [activeViewId, setActiveViewId] = useState<string>("default");
  const [isSavingView, setIsSavingView] = useState(false);
  const [newViewName, setNewViewName] = useState("");
  
  const [printedIds, setPrintedIds] = useState<string[]>([]);
  
  // Modal & Editor States
  const [showModal, setShowModal] = useState(false);
  const [generatedPdfBase64, setGeneratedPdfBase64] = useState<string | null>(null);
  const [generatedPdfName, setGeneratedPdfName] = useState<string>("");

  // Roll Width, Margins & Presets States
  const [presets, setPresets] = useState<PrintPreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string>("");
  const [rollWidthMm, setRollWidthMm] = useState<number>(300);
  const [marginTopMm, setMarginTopMm] = useState<number>(5);
  const [marginBottomMm, setMarginBottomMm] = useState<number>(5);
  const [marginSidesMm, setMarginSidesMm] = useState<number>(3);

  const [showLayoutEditor, setShowLayoutEditor] = useState(false);
  const [editorItems, setEditorItems] = useState<any[]>([]);
  const [isEditorLoading, setIsEditorLoading] = useState(false);

  const [textEditorModal, setTextEditorModal] = useState<{
    open: boolean;
    title: string;
    initialText: string;
    initialFont: string;
    initialColor: string;
    initialFontSize: number;
    backgroundUrl: string;
    svgUrl: string;
  }>({
    open: false,
    title: "",
    initialText: "",
    initialFont: "Outfit",
    initialColor: "#000000",
    initialFontSize: 36,
    backgroundUrl: "",
    svgUrl: ""
  });

  const handleOpenPplrModal = (order: any) => {
    const lineItemsNodes = order.lineItems?.nodes || [];
    const parsedItems = lineItemsNodes.map((item: any) => {
      const customAttr = item.customAttributes || [];
      const previewAttr = customAttr.find((attr: any) => 
        typeof attr.value === "string" && (attr.value.startsWith("http://") || attr.value.startsWith("https://") || attr.value.startsWith("//"))
      );

      return {
        title: item.title || "Articolo Personalizzato",
        previewUrl: previewAttr?.value,
        customAttributes: customAttr
      };
    });

    setPplrModal({
      open: true,
      orderName: order.name,
      items: parsedItems
    });
  };

  const handleOpenTextEditor = (order: any) => {
    const lineItemsNodes = order.lineItems?.nodes || [];
    let foundText = "";
    let foundFont = "Get Show";
    let foundColor = "#38bdf8";
    let foundFontSize = 32;
    let foundImage = "";
    let foundSvg = "";
    let customAttributesList: any[] = [];

    lineItemsNodes.forEach((item: any) => {
      const attrs = item.customAttributes || [];
      customAttributesList.push(...attrs);

      attrs.forEach((attr: any) => {
        const k = (attr.key || "").toLowerCase().trim();
        const v = String(attr.value || "").trim();

        // 1. Testo ("Il tuo testo", "Nome Brano", "Testo", "Dedica")
        if (!v.startsWith("http")) {
          if (k.includes("il tuo testo") || k.includes("testo") || k.includes("frase") || k.includes("nome") || k.includes("dedica") || k === "5") {
            if (v && !foundText) foundText = v;
          }

          // 2. Font ("Scegli il font", "Font", "Carattere")
          if (k.includes("scegli il font") || k.includes("font") || k.includes("carattere")) {
            if (v) foundFont = v;
          }

          // 3. Font Size ("_font size Il tuo testo", "_font size", "font_size")
          if (k.includes("font size") || k.includes("_font_size") || k.includes("fontsize")) {
            const parsedSize = parseFloat(v);
            if (!isNaN(parsedSize) && parsedSize > 0) {
              foundFontSize = Math.round(parsedSize);
            }
          }

          // 4. Colore ("Scegli il colore", "Colore testo", "Celeste", "Azzurro", "Bianco", "#...")
          if (k.includes("scegli il colore") || k.includes("colore") || k.includes("color")) {
            if (v.startsWith("#")) {
              foundColor = v;
            } else {
              const lowerColor = v.toLowerCase();
              if (lowerColor.includes("celeste") || lowerColor.includes("azzurro")) foundColor = "#38bdf8";
              else if (lowerColor.includes("tiffany")) foundColor = "#0d9488";
              else if (lowerColor.includes("bianco")) foundColor = "#ffffff";
              else if (lowerColor.includes("nero")) foundColor = "#000000";
              else if (lowerColor.includes("oro") || lowerColor.includes("giallo")) foundColor = "#d97706";
              else if (lowerColor.includes("rosso")) foundColor = "#dc2626";
              else if (lowerColor.includes("rosa")) foundColor = "#ec4899";
              else if (lowerColor.includes("verde")) foundColor = "#16a34a";
              else if (lowerColor.includes("blu")) foundColor = "#2563eb";
            }
          }
        }

        // 5. URL Immagine / Anteprima / Vedi ora
        if (v.startsWith("http")) {
          if (k.includes("vedi") || k.includes("preview") || k.includes("immagine") || k.includes("_pplr")) {
            foundImage = v;
          } else if (v.endsWith(".svg")) {
            foundSvg = v;
          } else if (!foundImage) {
            foundImage = v;
          }
        }
      });
    });

    setTextEditorModal({
      open: true,
      title: `Modifica Interattiva Testo & Grafica — Ordine ${order.name}`,
      initialText: foundText || "Giulia & Riccardo 26.09.2026",
      initialFont: foundFont || "Get Show",
      initialColor: foundColor || "#38bdf8",
      initialFontSize: foundFontSize || 32,
      backgroundUrl: foundImage,
      svgUrl: foundSvg
    });
  };

  useEffect(() => {
    const sessionState = sessionStorage.getItem(`ordersState_${store}`);
    if (sessionState) {
      try {
        const parsed = JSON.parse(sessionState);
        if (parsed.searchQuery !== undefined) setSearchQuery(parsed.searchQuery);
        if (parsed.tagFilter !== undefined) setTagFilter(parsed.tagFilter);
        if (parsed.statusFilter !== undefined) setStatusFilter(parsed.statusFilter);
        if (parsed.activeViewId !== undefined) setActiveViewId(parsed.activeViewId);
        if (parsed.selected !== undefined) setSelected(parsed.selected);
      } catch (e) {
        console.error("Error parsing session state", e);
      }
    }

    const saved = localStorage.getItem(`savedViews_${store}`);
    if (saved) {
      try {
        setViews(JSON.parse(saved));
      } catch (e) {
        console.error("Error parsing saved views", e);
      }
    }
    
    const allPresets = getPresets();
    setPresets(allPresets);
    const defPreset = allPresets.find(p => p.isDefault) || allPresets[0];
    if (defPreset) {
      setSelectedPresetId(defPreset.id);
      setRollWidthMm(defPreset.rollWidthMm);
      setMarginTopMm(defPreset.marginTopMm);
      setMarginBottomMm(defPreset.marginBottomMm);
      setMarginSidesMm(defPreset.marginSidesMm);
    }

    const savedPrinted = localStorage.getItem(`printedOrders_${store}`);
    if (savedPrinted) {
      try {
        setPrintedIds(JSON.parse(savedPrinted));
      } catch (e) {
        console.error("Error parsing printed orders", e);
      }
    }
  }, [store]);

  useEffect(() => {
    const stateToSave = {
      searchQuery,
      tagFilter,
      statusFilter,
      activeViewId,
      selected
    };
    sessionStorage.setItem(`ordersState_${store}`, JSON.stringify(stateToSave));
  }, [searchQuery, tagFilter, statusFilter, activeViewId, selected, store]);

  const allTags = Array.from(new Set(initialOrders.flatMap(o => o.tags || []))).sort() as string[];

  const filteredOrders = initialOrders.filter(order => {
    if (showOnlySelected) {
      return selected.includes(order.id);
    }

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

  const handleGeneratePdf = async (customItemsToUse?: any[]) => {
    setLoading(true);
    try {
      const res = await fetch("/api/pdf/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderIds: selected,
          store,
          binWidthMm: rollWidthMm,
          margins: {
            top: marginTopMm,
            bottom: marginBottomMm,
            sides: marginSidesMm
          },
          customItems: customItemsToUse
        })
      });
      const data = await res.json();
      
      if (!data.success) {
        alert("Errore generazione PDF: " + data.error);
        setLoading(false);
        return;
      }

      // Save as printed in localStorage
      const newPrinted = Array.from(new Set([...printedIds, ...selected]));
      setPrintedIds(newPrinted);
      localStorage.setItem(`printedOrders_${store}`, JSON.stringify(newPrinted));

      // Save to history
      const selectedNames = selected.map(id => {
        const order = filteredOrders.find(o => o.id === id);
        return order ? order.name : id.split('/').pop();
      });

      const historyItem = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        orderCount: selected.length,
        selectedIds: selected,
        selectedNames: selectedNames,
        pdfBase64: data.base64
      };
      const existingHistory = JSON.parse(localStorage.getItem(`pdfHistory_${store}`) || "[]");
      localStorage.setItem(`pdfHistory_${store}`, JSON.stringify([historyItem, ...existingHistory]));

      setGeneratedPdfBase64(data.base64);
      setGeneratedPdfName(`Stampa_${store}_${historyItem.id}.pdf`);
      setShowLayoutEditor(false);
      setShowModal(true);
      
    } catch (e: any) {
      alert("Errore di rete: " + e.message);
    }
    setLoading(false);
  };

  const openManualEditor = async () => {
    setIsEditorLoading(true);
    try {
      const res = await fetch("/api/pdf/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderIds: selected,
          store,
          binWidthMm: rollWidthMm,
          previewMode: true
        })
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.items)) {
        let currentX = 3;
        let currentY = 3;
        let shelfHeight = 0;

        const preparedItems = data.items.map((item: any) => {
          const w = item.widthMm || 80;
          const h = item.heightMm || 100;
          const totalH = h + 10;

          if (currentX + w + 3 > rollWidthMm) {
            currentX = 3;
            currentY += shelfHeight + 3;
            shelfHeight = 0;
          }

          const itemObj = {
            ...item,
            x: Math.round(currentX),
            y: Math.round(currentY),
            rotated: false
          };

          currentX += w + 3;
          shelfHeight = Math.max(shelfHeight, totalH);
          return itemObj;
        });

        setEditorItems(preparedItems);
        setShowLayoutEditor(true);
      } else {
        alert("Impossibile recuperare i dettagli dei prodotti: " + (data.error || "Errore sconosciuto"));
      }
    } catch (e: any) {
      alert("Errore caricamento prodotti: " + e.message);
    }
    setIsEditorLoading(false);
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

  const openPreview = () => {
    if (!generatedPdfBase64) return;
    try {
      const byteCharacters = atob(generatedPdfBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const file = new Blob([byteArray], { type: 'application/pdf' });
      const fileURL = URL.createObjectURL(file);
      window.open(fileURL, "_blank");
    } catch (e) {
      alert("Impossibile aprire l'anteprima: " + e);
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
      {/* Viste Salvate (Tabs Polaris) */}
      <div className="flex items-center gap-1 border-b border-gray-300 pb-px overflow-x-auto">
        <button
          onClick={() => applyView("default")}
          className={`px-3 py-2 text-sm font-medium border-b-[3px] whitespace-nowrap transition-colors ${
            activeViewId === "default" 
              ? "border-[#303030] text-[#303030]" 
              : "border-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-t-lg"
          }`}
        >
          Tutti gli ordini
        </button>
        {views.map(view => (
          <div key={view.id} className="relative group flex items-center">
            <button
              onClick={() => applyView(view.id)}
              className={`px-3 py-2 text-sm font-medium border-b-[3px] whitespace-nowrap transition-colors flex items-center gap-2 ${
                activeViewId === view.id 
                  ? "border-[#303030] text-[#303030]" 
                  : "border-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-t-lg"
              }`}
            >
              {view.name}
              <span 
                onClick={(e) => deleteView(view.id, e)}
                className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-gray-200 rounded-full cursor-pointer text-gray-400 hover:text-gray-600 transition-all"
                title="Elimina vista"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </span>
            </button>
          </div>
        ))}
      </div>

      {/* Pannello Principale: Filtri + Tabella */}
      <div className="bg-white shadow-sm ring-1 ring-gray-200 rounded-xl overflow-hidden">
        
        {/* Barra dei Filtri Polaris */}
        <div className="p-3 border-b border-gray-200 flex flex-wrap gap-3 items-center bg-white">
          <div className="flex-1 min-w-[200px] relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-500 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 transition-colors"
              placeholder="Filtra gli ordini..."
            />
          </div>

          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-1.5 pl-3 pr-8 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white hover:bg-gray-50 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-medium cursor-pointer"
            >
              <option value="all">Stato: Tutti</option>
              <option value="inevaso">Stato: Inevaso</option>
              <option value="evaso">Stato: Evaso</option>
            </select>

            <select
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              className="py-1.5 pl-3 pr-8 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white hover:bg-gray-50 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-medium cursor-pointer"
            >
              <option value="all">Tag: Tutti</option>
              {allTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>

            <div className="flex items-center gap-2 border-l border-gray-200 pl-2">
              {!isSavingView ? (
                <button
                  onClick={() => setIsSavingView(true)}
                  className="py-1.5 px-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 shadow-sm"
                >
                  <span className="flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                    Salva Vista
                  </span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newViewName}
                    onChange={(e) => setNewViewName(e.target.value)}
                    placeholder="Nome vista"
                    className="py-1.5 px-2 w-32 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    autoFocus
                  />
                  <button
                    onClick={saveView}
                    className="py-1.5 px-3 rounded-lg text-sm font-medium text-white bg-[#303030] hover:bg-black shadow-sm"
                  >
                    Salva
                  </button>
                  <button
                    onClick={() => setIsSavingView(false)}
                    className="py-1.5 px-2 text-sm text-gray-500 hover:text-gray-900 font-medium"
                  >
                    Annulla
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Bar (se ci sono ordini selezionati) */}
        {selected.length > 0 && (
          <div className="bg-white px-4 py-2.5 flex items-center justify-between border-b border-gray-200 overflow-x-auto gap-4">
            <div className="flex items-center gap-3 shrink-0 whitespace-nowrap">
              <span className="text-sm font-medium text-gray-700 flex items-center gap-2 whitespace-nowrap">
                <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-900 font-semibold">{selected.length}</span>
                selezionati
              </span>
              {presets.length > 0 ? (
                <div className="flex items-center gap-1.5 shrink-0">
                  <Sliders className="w-4 h-4 text-indigo-600 shrink-0" />
                  <select
                    value={selectedPresetId}
                    onChange={e => {
                      const id = e.target.value;
                      setSelectedPresetId(id);
                      const target = presets.find(p => p.id === id);
                      if (target) {
                        setRollWidthMm(target.rollWidthMm);
                        setMarginTopMm(target.marginTopMm);
                        setMarginBottomMm(target.marginBottomMm);
                        setMarginSidesMm(target.marginSidesMm);
                      }
                    }}
                    className="text-xs bg-indigo-50 text-indigo-800 px-2.5 py-1.5 rounded-md font-bold border border-indigo-200 focus:outline-none max-w-[180px] truncate cursor-pointer"
                  >
                    {presets.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md font-semibold border border-indigo-100 whitespace-nowrap">
                  Bobina: {rollWidthMm} mm
                </span>
              )}
              <button
                onClick={() => setShowOnlySelected(!showOnlySelected)}
                className={`text-xs px-2.5 py-1.5 rounded-lg border font-bold transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                  showOnlySelected
                    ? "bg-amber-500 hover:bg-amber-600 text-white border-amber-600 shadow-sm"
                    : "bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border-indigo-200"
                }`}
                title={showOnlySelected ? "Mostra tutti gli ordini" : "Filtra e mostra solo gli ordini selezionati"}
              >
                <CheckSquare className="w-3.5 h-3.5" />
                {showOnlySelected ? "Mostra Tutti" : `Solo Selezionati (${selected.length})`}
              </button>
            </div>
            <div className="flex items-center gap-2 shrink-0 whitespace-nowrap">
              <button 
                onClick={() => {
                  const selectedOrderIds = selected.map(id => id.split('/').pop()).filter(Boolean);
                  const queryStr = selectedOrderIds.join(' OR ');
                  const shopName = store === "b2b" ? "wholesale-prettylittle-it" : "prettylittle-it";
                  const url = `https://admin.shopify.com/store/${shopName}/orders?query=${encodeURIComponent(queryStr)}`;
                  window.open(url, '_blank');
                }}
                className="text-xs px-3 py-1.5 rounded-lg text-gray-900 bg-white border border-gray-300 hover:bg-gray-50 shadow-sm font-semibold whitespace-nowrap shrink-0"
              >
                Stampa documenti di trasporto
              </button>
              <button
                onClick={openManualEditor}
                disabled={loading || isEditorLoading}
                className="text-xs px-3 py-1.5 rounded-lg text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 shadow-sm font-semibold disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                Modifica Layout (Manuale)
              </button>
              <button 
                onClick={() => handleGeneratePdf()}
                disabled={loading}
                className="text-xs px-3 py-1.5 rounded-lg text-white bg-[#303030] hover:bg-black shadow-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shrink-0"
              >
                {loading ? "Generazione..." : "Genera Stampa PDF (Auto)"}
              </button>
            </div>
          </div>
        )}

        {/* Tabella Ordini (Stile Polaris) */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-[#f4f6f8]">
              <tr>
                <th scope="col" className="px-4 py-2.5 text-left w-10">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded-[4px] border-gray-400 text-black focus:ring-black cursor-pointer bg-white"
                    onChange={toggleAll}
                    checked={filteredOrders.length > 0 && selected.length === filteredOrders.length}
                  />
                </th>
                <th scope="col" className="px-4 py-2.5 text-left font-semibold text-gray-700">Ordine</th>
                <th scope="col" className="px-4 py-2.5 text-left font-semibold text-gray-700">Data</th>
                <th scope="col" className="px-4 py-2.5 text-left font-semibold text-gray-700">Cliente</th>
                <th scope="col" className="px-4 py-2.5 text-center font-semibold text-gray-700">Tipo</th>
                <th scope="col" className="px-4 py-2.5 text-center font-semibold text-gray-700">DTF PRINT</th>
                <th scope="col" className="px-4 py-2.5 text-right font-semibold text-gray-700">Totale</th>
                <th scope="col" className="px-4 py-2.5 text-left font-semibold text-gray-700">Tag</th>
                <th scope="col" className="px-4 py-2.5 text-left font-semibold text-gray-700">Stato</th>
                <th scope="col" className="px-4 py-2.5 text-left font-semibold text-gray-700">Tracking</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center">
                    <p className="text-gray-500 font-medium">Nessun ordine trovato</p>
                    <p className="text-gray-400 mt-1 text-sm">Prova a cambiare o rimuovere i filtri.</p>
                  </td>
                </tr>
              ) : filteredOrders.map((order) => {
                const orderNum = order.name;
                const date = new Date(order.createdAt).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
                const isSelected = selected.includes(order.id);
                const isEvaso = order.displayFulfillmentStatus === "FULFILLED";
                const trackingUrl = order.fulfillments?.[0]?.trackingInfo?.[0]?.url;
                const trackingNumber = order.fulfillments?.[0]?.trackingInfo?.[0]?.number;
                
                return (
                  <tr key={order.id} className={`${isSelected ? "bg-[#f4f6f8]" : "hover:bg-[#f4f6f8]"} transition-colors cursor-default`}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded-[4px] border-gray-400 text-black focus:ring-black cursor-pointer bg-white"
                        checked={isSelected}
                        onChange={() => toggleOne(order.id)}
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-semibold text-gray-900 hover:underline">
                      <Link href={`/orders/${store}/${order.id.split('/').pop()}`}>
                        {orderNum}
                      </Link>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600">{date}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-900">
                      {order.customer ? `${order.customer.firstName || ''} ${order.customer.lastName || ''}` : "Nessun cliente"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      {(order.tags || []).some((t: string) => t.toLowerCase() === "product_personalizer" || t.toLowerCase() === "product-personalizer") && (
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenPplrModal(order);
                            }}
                            className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg border border-indigo-200 shadow-sm transition-colors cursor-pointer"
                            title="Vedi Anteprima Product Personalizer (Occhio)"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenTextEditor(order);
                            }}
                            className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg border border-amber-200 shadow-sm transition-all cursor-pointer hover:scale-110 active:scale-95"
                            title="Apri Editor Interattivo Testo & Font (Matita Gialla)"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      {printedIds.includes(order.id) ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold bg-[#e4f1ed] text-[#0b5c46]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#0b5c46] mr-1.5"></span>
                          Stampato
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold bg-[#fff8e1] text-[#b28900]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#ffc107] mr-1.5"></span>
                          Da Stampare
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-900 text-right">
                      € {order.totalPriceSet?.shopMoney?.amount}
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate">
                      {order.tags?.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {order.tags.map((t: string) => (
                            <span key={t} className="inline-flex items-center px-1.5 py-0.5 rounded-md text-xs font-medium bg-[#e3e5e7] text-[#303030]">
                              {t}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {isEvaso ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold bg-[#e4f1ed] text-[#0b5c46]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#0b5c46] mr-1.5"></span>
                          Evaso
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold bg-[#e3e5e7] text-[#303030]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#8c9196] mr-1.5"></span>
                          Inevaso
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {trackingUrl ? (
                        <a href={trackingUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1 font-medium">
                          {trackingNumber || "Traccia"}
                          <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                        </a>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Modal Fine Generazione */}
      {showModal && generatedPdfBase64 && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">PDF Generato!</h3>
              <p className="text-gray-500 mb-6 text-sm">
                Il file per gli ordini <strong className="text-gray-800">{selected.map(id => filteredOrders.find(o => o.id === id)?.name || id.split('/').pop()).join(', ')}</strong> è pronto per la stampa.
              </p>
              
              <div className="flex flex-col gap-3">
                <button 
                  onClick={openPreview}
                  className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Apri PDF (Anteprima)
                </button>
                
                <a 
                  href={`data:application/pdf;base64,${generatedPdfBase64}`}
                  download={generatedPdfName}
                  className="w-full flex justify-center py-2.5 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Apri su Photoshop (Scarica)
                </a>
              </div>
            </div>
            <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex justify-end">
              <button 
                onClick={() => setShowModal(false)}
                className="text-sm font-medium text-gray-500 hover:text-gray-700"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Layout Editor Manuale */}
      {showLayoutEditor && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 bg-gray-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">Editor Posizionamento Manuale</h3>
                <p className="text-xs text-gray-400">
                  Bobina: {rollWidthMm}mm — Margini (Sup: {marginTopMm}mm, Inf: {marginBottomMm}mm, Lat: {marginSidesMm}mm)
                </p>
              </div>
              <button 
                onClick={() => setShowLayoutEditor(false)}
                className="text-gray-400 hover:text-white font-bold text-lg px-2"
              >
                ✕
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto space-y-6 bg-gray-50">
              {/* Margins Controls Bar */}
              <div className="bg-white p-3 border border-gray-200 rounded-xl flex items-center justify-between gap-4 shadow-sm text-xs">
                <span className="font-bold text-gray-800 flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-indigo-600" />
                  Margini Bobina (Padding Interno):
                </span>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500 font-medium">Sup (mm):</span>
                    <input 
                      type="number" 
                      value={marginTopMm} 
                      onChange={e => setMarginTopMm(parseInt(e.target.value, 10) || 0)}
                      className="w-14 px-1.5 py-0.5 border rounded font-semibold text-center"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500 font-medium">Inf (mm):</span>
                    <input 
                      type="number" 
                      value={marginBottomMm} 
                      onChange={e => setMarginBottomMm(parseInt(e.target.value, 10) || 0)}
                      className="w-14 px-1.5 py-0.5 border rounded font-semibold text-center"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500 font-medium">Lat (mm):</span>
                    <input 
                      type="number" 
                      value={marginSidesMm} 
                      onChange={e => setMarginSidesMm(parseInt(e.target.value, 10) || 0)}
                      className="w-14 px-1.5 py-0.5 border rounded font-semibold text-center"
                    />
                  </div>
                </div>
              </div>

              {/* Sheet Canvas Preview */}
              {(() => {
                const maxItemY = editorItems.reduce((max, item) => {
                  const itemH = (item.rotated ? item.widthMm : item.heightMm) + 15;
                  return Math.max(max, item.y + itemH);
                }, 200);
                const totalRollLengthMm = Math.max(maxItemY + marginBottomMm + marginTopMm, 250);

                return (
                  <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-4 shadow-inner">
                    <div className="text-xs text-gray-500 font-bold uppercase mb-2 flex justify-between">
                      <span>Margine Sinistro (0 mm)</span>
                      <span>Bobina {rollWidthMm} mm × {Math.round(totalRollLengthMm)} mm</span>
                    </div>
                    
                    <div 
                      className="relative border border-indigo-200 bg-indigo-50/20 rounded overflow-hidden shadow-sm" 
                      style={{ 
                        width: "100%", 
                        paddingBottom: `${(totalRollLengthMm / rollWidthMm) * 100}%` 
                      }}
                    >
                      {/* Padding Visual Margins Overlay */}
                      <div 
                        className="absolute border-2 border-dashed border-indigo-300/50 pointer-events-none"
                        style={{
                          left: `${(marginSidesMm / rollWidthMm) * 100}%`,
                          right: `${(marginSidesMm / rollWidthMm) * 100}%`,
                          top: `${(marginTopMm / totalRollLengthMm) * 100}%`,
                          bottom: `${(marginBottomMm / totalRollLengthMm) * 100}%`
                        }}
                      />

                      {editorItems.map((item, idx) => {
                        const itemW = item.rotated ? item.heightMm : item.widthMm;
                        const itemH = item.rotated ? item.widthMm : item.heightMm;
                        return (
                          <div
                            key={item.id}
                            className="absolute border-2 border-indigo-600 bg-white/95 rounded p-1.5 shadow-md flex flex-col justify-between transition-all"
                            style={{
                              left: `${(item.x / rollWidthMm) * 100}%`,
                              top: `${(item.y / totalRollLengthMm) * 100}%`,
                              width: `${(itemW / rollWidthMm) * 100}%`,
                              height: `${(itemH / totalRollLengthMm) * 100}%`
                            }}
                          >
                      <div className="flex items-center justify-between text-[10px] font-bold text-indigo-900">
                        <span className="truncate">{item.orderName}</span>
                        <button
                          onClick={() => {
                            const updated = [...editorItems];
                            updated[idx].rotated = !updated[idx].rotated;
                            setEditorItems(updated);
                          }}
                          className="px-1 py-0.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 rounded text-[9px] font-bold z-10"
                          title="Ruota 90°"
                        >
                          ↻ 90°
                        </button>
                      </div>

                      {/* Graphic Preview */}
                      <div className="flex-1 my-0.5 flex items-center justify-center overflow-hidden pointer-events-none p-1">
                        {item.svgContent ? (
                          <div 
                            dangerouslySetInnerHTML={{ __html: item.svgContent }}
                            className="w-full h-full flex items-center justify-center overflow-hidden [&>svg]:w-full [&>svg]:h-full [&>svg]:max-h-full [&>svg]:object-contain"
                            style={{ transform: item.rotated ? 'rotate(90deg)' : 'none' }}
                          />
                        ) : item.previewUrl || item.imageContent || item.svgUrl ? (
                          <img 
                            src={item.previewUrl || (item.imageContent ? `data:image/png;base64,${item.imageContent}` : item.svgUrl)} 
                            alt={item.orderName}
                            className="max-h-full max-w-full object-contain"
                            style={{ transform: item.rotated ? 'rotate(90deg)' : 'none' }}
                          />
                        ) : (
                          <span className="text-[9px] text-gray-400 italic">[Grafica Stampa]</span>
                        )}
                      </div>

                      <div className="text-[9px] text-gray-600 font-medium text-center">
                        X: {item.x}mm | Y: {item.y}mm
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

              {/* Items List Controls */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-gray-900">Regolazione Coordinate & Rotazione</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {editorItems.map((item, idx) => (
                    <div key={item.id} className="bg-white p-3 border border-gray-200 rounded-lg flex items-center justify-between gap-2 shadow-sm">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-900 truncate">{item.orderName}</p>
                        <p className="text-[11px] text-gray-500">{item.widthMm}x{item.heightMm}mm {item.rotated ? '(Ruotato)' : ''}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col">
                          <span className="text-[9px] text-gray-400 uppercase font-bold">X (mm)</span>
                          <input 
                            type="number" 
                            value={item.x}
                            onChange={e => {
                              const val = parseInt(e.target.value, 10) || 0;
                              const updated = [...editorItems];
                              updated[idx].x = val;
                              setEditorItems(updated);
                            }}
                            className="w-16 px-1.5 py-1 text-xs border border-gray-300 rounded font-semibold"
                          />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] text-gray-400 uppercase font-bold">Y (mm)</span>
                          <input 
                            type="number" 
                            value={item.y}
                            onChange={e => {
                              const val = parseInt(e.target.value, 10) || 0;
                              const updated = [...editorItems];
                              updated[idx].y = val;
                              setEditorItems(updated);
                            }}
                            className="w-16 px-1.5 py-1 text-xs border border-gray-300 rounded font-semibold"
                          />
                        </div>
                        <button
                          onClick={() => {
                            const updated = [...editorItems];
                            updated[idx].rotated = !updated[idx].rotated;
                            setEditorItems(updated);
                          }}
                          className="mt-3 px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs font-bold text-gray-700"
                        >
                          ↻
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowLayoutEditor(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-lg"
              >
                Annulla
              </button>
              <button
                onClick={() => handleGeneratePdf(editorItems)}
                disabled={loading}
                className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm font-bold"
              >
                {loading ? "Generazione in corso..." : "Conferma & Genera PDF"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Popup Anteprima Product Personalizer */}
      {pplrModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Eye className="w-5 h-5 text-indigo-600" />
                  Anteprima Product Personalizer — Ordine {pplrModal.orderName}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Grafica personalizzata generata direttamente dall'app al momento dell'ordine.
                </p>
              </div>
              <button 
                onClick={() => setPplrModal({ open: false, orderName: "", items: [] })}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200 transition-colors font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {pplrModal.items.map((item, idx) => (
                <div key={idx} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-4">
                  <h4 className="font-bold text-sm text-gray-900 border-b border-gray-100 pb-2">{item.title}</h4>
                  
                  {item.previewUrl ? (
                    <div className="space-y-2">
                      <div className="bg-gray-100 rounded-xl p-3 flex items-center justify-center max-h-72 overflow-hidden border border-gray-200">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={item.previewUrl} 
                          alt={item.title} 
                          className="max-h-64 object-contain rounded"
                        />
                      </div>
                      <div className="text-right">
                        <a 
                          href={item.previewUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 underline"
                        >
                          Apri Immagine ad Alta Risoluzione in Nuova Scheda ↗
                        </a>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">Nessun URL d'anteprima immagine trovato nei metafield.</p>
                  )}

                  {item.customAttributes && item.customAttributes.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-3 text-xs space-y-1 border border-gray-100">
                      <span className="font-bold text-gray-500 uppercase tracking-wider block mb-1">Attributi Personalizzati:</span>
                      {item.customAttributes.map((attr, aIdx) => (
                        <div key={aIdx} className="flex flex-wrap items-center gap-1">
                          <span className="font-semibold text-gray-700">{attr.key}:</span>
                          {typeof attr.value === "string" && attr.value.startsWith("http") ? (
                            <a href={attr.value} target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-bold underline truncate max-w-md">
                              {attr.value} ↗
                            </a>
                          ) : (
                            <span className="text-gray-900">{attr.value}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button
                onClick={() => setPplrModal({ open: false, orderName: "", items: [] })}
                className="px-4 py-2 bg-gray-900 hover:bg-black text-white font-bold text-xs rounded-lg shadow-sm transition-colors"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Popup Editor Interattivo Testo & Font (Matita Gialla) */}
      <TextEditorModal
        open={textEditorModal.open}
        onClose={() => setTextEditorModal(prev => ({ ...prev, open: false }))}
        title={textEditorModal.title}
        initialText={textEditorModal.initialText}
        initialFont={textEditorModal.initialFont}
        initialColor={textEditorModal.initialColor}
        initialFontSize={textEditorModal.initialFontSize}
        backgroundUrl={textEditorModal.backgroundUrl}
        svgUrl={textEditorModal.svgUrl}
      />
    </div>
  );
}
