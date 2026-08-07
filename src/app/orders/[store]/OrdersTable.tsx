"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Pencil, Sliders, CheckSquare, Eye, FileText, X, Package, XSquare, AlertTriangle } from "lucide-react";
import { getPresets, PrintPreset, resolveColorHex, extractTextFontAndColorFromAttrs, getMandatorySvgCollections } from "@/lib/presetStore";
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
  const [zoomImage, setZoomImage] = useState<{ url: string; title: string; type: string } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  // Filter & Pagination States
  const [searchQuery, setSearchQuery] = useState("");
  const [tagFilter, setTagFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pageSize, setPageSize] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, tagFilter, statusFilter, showOnlySelected, pageSize]);

  // Saved Views States
  const [views, setViews] = useState<SavedView[]>([]);
  const [activeViewId, setActiveViewId] = useState<string>("default");
  const [isSavingView, setIsSavingView] = useState(false);
  const [newViewName, setNewViewName] = useState("");
  
  const getPrintedIdsFromOrders = (ordersList: any[]) => {
    return (ordersList || [])
      .filter((order: any) => {
        const hasTag = (order.tags || []).some((t: string) => t.toLowerCase() === "pod_stampato" || t.toLowerCase() === "stampato");
        const hasMeta = order.pod_status?.value === "printed";
        return hasTag || hasMeta;
      })
      .map((order: any) => order.id);
  };

  const [printedIds, setPrintedIds] = useState<string[]>(() => getPrintedIdsFromOrders(initialOrders));
  const [togglingPrintedId, setTogglingPrintedId] = useState<string | null>(null);

  // Persistent DDT / PDF History IDs state
  const [ddtHistoryIds, setDdtHistoryIds] = useState<string[]>([]);
  // Quick Articles Popup Modal state
  const [selectedArticlesOrder, setSelectedArticlesOrder] = useState<any | null>(null);

  useEffect(() => {
    setPrintedIds(getPrintedIdsFromOrders(initialOrders));

    // Load persistent DDT history from Shopify Shop Metafields
    fetch(`/api/pdf/history?store=${store}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.history)) {
          const ids: string[] = [];
          data.history.forEach((h: any) => {
            if (Array.isArray(h.selectedIds)) {
              ids.push(...h.selectedIds);
            }
          });
          setDdtHistoryIds(Array.from(new Set(ids)));
        }
      })
      .catch((err) => console.error("Error loading persistent DDT history:", err));
  }, [initialOrders, store]);
  
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
    orderId?: string;
    title: string;
    initialText: string;
    initialFont: string;
    initialColor: string;
    initialFontSize: number;
    backgroundUrl: string;
    uploadedImageUrl: string;
    svgUrl: string;
    customAttributes?: any[];
    lineItems?: any[];
  }>({
    open: false,
    orderId: "",
    title: "",
    initialText: "",
    initialFont: "Get Show",
    initialColor: "#38bdf8",
    initialFontSize: 32,
    backgroundUrl: "",
    uploadedImageUrl: "",
    svgUrl: "",
    customAttributes: [],
    lineItems: []
  });

  const handleTogglePrinted = async (orderId: string) => {
    setTogglingPrintedId(orderId);
    const isCurrentlyPrinted = printedIds.includes(orderId);
    const targetPrinted = !isCurrentlyPrinted;

    try {
      const res = await fetch("/api/orders/toggle-printed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          store,
          isPrinted: targetPrinted
        })
      });
      const data = await res.json();
      if (data.success) {
        if (targetPrinted) {
          setPrintedIds(prev => Array.from(new Set([...prev, orderId])));
        } else {
          setPrintedIds(prev => prev.filter(id => id !== orderId));
        }
      } else {
        alert("Errore aggiornamento stato di stampa: " + data.error);
      }
    } catch (e: any) {
      alert("Errore di rete: " + e.message);
    } finally {
      setTogglingPrintedId(null);
    }
  };

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

    // Filtra solo i prodotti che hanno attributi di personalizzazione (esclude prodotti classici non personalizzati)
    const customizedNodes = lineItemsNodes.filter((item: any) => {
      const attrs = item.customAttributes || [];
      if (attrs.length === 0) return false;
      return attrs.some((attr: any) => {
        const k = (attr.key || "").toLowerCase().trim();
        const v = String(attr.value || "").trim();
        if (!v || k.startsWith("_pod_")) return false;
        if (v.startsWith("http")) return true;
        const isSystemKey = k.includes("font") || k.includes("align") || k.includes("scegli") || k.includes("modello") || k.includes("stick") || k.includes("colore") || k.includes("vedi") || k.includes("preview");
        if (!isSystemKey && v.length > 0) {
          const isSimpleOption = ["frase", "iniziale", "ammaccato", "liscio", "nero", "bianco", "azzurro"].includes(v.toLowerCase());
          if (!isSimpleOption) return true;
        }
        if (k.includes("font") || k.includes("colore") || k.includes("color")) return true;
        return false;
      });
    });

    const targetNodes = customizedNodes.length > 0 ? customizedNodes : lineItemsNodes;
    const parsedItems: any[] = [];

    targetNodes.forEach((item: any) => {
      let foundText = "";
      let foundFont = "Get Show";
      let foundColor = "#38bdf8";
      let foundFontSize = 32;
      let foundImage = "";
      let foundUploadedImage = "";
      let foundSvg = "";
      const attrs = [...(item.customAttributes || [])];
      const prodPersonalizzatoVal = item.product?.prodotto_personalizzato?.value || item.variant?.prodotto_personalizzato?.value;
      if (prodPersonalizzatoVal && !attrs.some((a: any) => a.key === "custom.prodotto_personalizzato")) {
        attrs.push({ key: "custom.prodotto_personalizzato", value: prodPersonalizzatoVal });
      }

      const podSvg = item.product?.pod_svg?.reference?.url || item.product?.pod_svg?.reference?.image?.url || item.variant?.pod_svg?.reference?.url || item.variant?.pod_svg?.reference?.image?.url;
      const customPreviewAttr = attrs.find((attr: any) => 
        typeof attr.value === "string" && attr.value.startsWith("http") && (
          attr.key.toLowerCase().includes("vedi") || 
          attr.key.toLowerCase().includes("preview") || 
          attr.key.toLowerCase().includes("immagine") || 
          attr.key.toLowerCase().includes("grafica") || 
          attr.key.toLowerCase().includes("_pplr") || 
          attr.key.toLowerCase().includes("design")
        )
      ) || attrs.find((attr: any) => typeof attr.value === "string" && attr.value.startsWith("http"));

      const personalizerPreviewUrl = customPreviewAttr?.value;
      const displayImage = personalizerPreviewUrl || podSvg || item.variant?.image?.url || item.product?.featuredImage?.url;

      attrs.forEach((attr: any) => {
        const rawKey = attr.key || "";
        const k = rawKey.toLowerCase().trim();
        const v = String(attr.value || "").trim();

        const isSystemKey = rawKey.startsWith("_") || 
          k.includes("font") || 
          k.includes("align") || 
          k.includes("scegli") || 
          k.includes("modello") || 
          k.includes("stick") || 
          k.includes("colore") || 
          k.includes("vedi") || 
          k.includes("preview");

        // 1. Estrazione Testo
        if (!isSystemKey && !v.startsWith("http")) {
          const isSimpleOption = ["frase", "iniziale", "ammaccato", "liscio", "nero", "bianco", "azzurro"].includes(v.toLowerCase());
          if (v && (!isSimpleOption || !foundText)) {
            if (!foundText || v.length > foundText.length) {
              foundText = v;
            }
          }
        }

        // 2. Estrazione Font Name
        if (k.includes("font") && !k.includes("colore") && !k.includes("color") && !rawKey.startsWith("_")) {
          if (v) foundFont = v;
        }

        // 3. Estrazione Font Size
        if (k.includes("font size") || k.includes("_font_size") || k.includes("fontsize")) {
          const parsedSize = parseFloat(v);
          if (!isNaN(parsedSize) && parsedSize > 0) {
            foundFontSize = Math.round(parsedSize);
          }
        }

        // 4. Estrazione Colore
        if (k.includes("colore") || k.includes("color")) {
          foundColor = resolveColorHex(v);
        }

        // 5. URL Immagine / Anteprima / Vedi ora / Carica file
        if (v.startsWith("http")) {
          const isMockup = k.includes("vedi") || k.includes("preview") || k.includes("_pplr");
          if (isMockup) {
            foundImage = v;
          } else if (k.includes("immagine") || k.includes("foto") || k.includes("logo") || k.includes("file") || k.includes("carica")) {
            foundUploadedImage = v;
          } else if (v.endsWith(".svg")) {
            foundSvg = v;
          } else {
            if (!foundImage) {
              foundImage = v;
            } else if (!foundUploadedImage) {
              foundUploadedImage = v;
            }
          }
        }
      });

      const fontAndColor = extractTextFontAndColorFromAttrs(attrs);
      if (fontAndColor.font) foundFont = fontAndColor.font;
      if (fontAndColor.color) foundColor = fontAndColor.color;

      const baseItem = {
        id: item.id,
        title: item.title || "Prodotto Personalizzato",
        variantTitle: item.variant?.title || "",
        quantity: item.quantity || 1,
        displayImage: displayImage || foundImage,
        initialText: foundText || "",
        initialFont: fontAndColor.font || foundFont || "Outfit",
        rawFont: fontAndColor.rawFont || foundFont || "Save",
        initialColor: foundColor || "#000000",
        initialFontSize: foundFontSize || 32,
        backgroundUrl: foundImage || displayImage,
        uploadedImageUrl: foundUploadedImage,
        svgUrl: foundSvg,
        customAttributes: attrs
      };

      const qty = item.quantity || 1;
      if (qty > 1) {
        for (let q = 1; q <= qty; q++) {
          parsedItems.push({
            ...baseItem,
            title: `${baseItem.title} (${q}/${qty})`,
            pieceIndex: q,
            totalPieces: qty,
            uniqueId: `${item.id}_${q}`
          });
        }
      } else {
        parsedItems.push({
          ...baseItem,
          pieceIndex: 1,
          totalPieces: 1,
          uniqueId: item.id
        });
      }
    });

    const firstItem = parsedItems[0] || {};

    setTextEditorModal({
      open: true,
      orderId: order.id,
      title: `Modifica Interattiva Testo & Grafica — Ordine ${order.name}`,
      initialText: firstItem.initialText || "",
      initialFont: firstItem.initialFont || "Get Show",
      initialColor: firstItem.initialColor || "#38bdf8",
      initialFontSize: firstItem.initialFontSize || 32,
      backgroundUrl: firstItem.backgroundUrl || "",
      uploadedImageUrl: firstItem.uploadedImageUrl || "",
      svgUrl: firstItem.svgUrl || "",
      customAttributes: firstItem.customAttributes || [],
      lineItems: parsedItems
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

  const [lastSelectedIdx, setLastSelectedIdx] = useState<number | null>(null);

  const handleCheckboxClick = (e: React.MouseEvent<HTMLInputElement>, orderId: string, idx: number) => {
    e.stopPropagation();
    const isCurrentlySelected = selected.includes(orderId);
    const willBeChecked = !isCurrentlySelected;

    if (e.shiftKey && lastSelectedIdx !== null) {
      const start = Math.min(lastSelectedIdx, idx);
      const end = Math.max(lastSelectedIdx, idx);
      const rangeOrderIds = filteredOrders.slice(start, end + 1).map(o => o.id);

      setSelected(prev => {
        if (willBeChecked) {
          return Array.from(new Set([...prev, ...rangeOrderIds]));
        } else {
          return prev.filter(id => !rangeOrderIds.includes(id));
        }
      });
    } else {
      toggleOne(orderId);
      setLastSelectedIdx(idx);
    }
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

      // Save as printed locally (it is also tagged on Shopify by the route)
      const newPrinted = Array.from(new Set([...printedIds, ...selected]));
      setPrintedIds(newPrinted);

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

      // Salva lo storico in modo persistente su Shopify tramite API
      await fetch("/api/pdf/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ store, historyItem })
      }).catch(err => console.error("Failed to save history to Shopify:", err));

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

            <select
              value={pageSize}
              onChange={(e) => setPageSize(parseInt(e.target.value, 10))}
              className="py-1.5 pl-3 pr-8 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white hover:bg-gray-50 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-bold cursor-pointer"
              title="Seleziona quanti ordini mostrare contemporaneamente per pagina"
            >
              <option value={50}>50 per pagina</option>
              <option value={100}>100 per pagina</option>
              <option value={200}>200 per pagina</option>
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

              <button
                type="button"
                onClick={() => {
                  setSelected([]);
                  setShowOnlySelected(false);
                }}
                className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 font-bold transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer shadow-2xs"
                title="Rimuovi tutte le selezioni delle checkbox"
              >
                <XSquare className="w-3.5 h-3.5 text-gray-500" />
                Deseleziona
              </button>
            </div>
            <div className="flex items-center gap-2 shrink-0 whitespace-nowrap">
              <button 
                onClick={async () => {
                  if (selected.length === 0) return;

                  const selectedIdsAndNames: string[] = [];
                  selected.forEach(id => {
                    selectedIdsAndNames.push(id);
                    const short = id.split('/').pop();
                    if (short) selectedIdsAndNames.push(short);
                    const orderObj = filteredOrders.find(o => o.id === id);
                    if (orderObj && orderObj.name) selectedIdsAndNames.push(orderObj.name);
                  });

                  // 1. Aggiorna lo stato locale per mostrare subito l'icona rossa DDT per tutti gli ordini selezionati
                  setDdtHistoryIds(prev => Array.from(new Set([...prev, ...selectedIdsAndNames])));

                  // 2. Salva lo storico in modo persistente su Shopify tramite API
                  const selectedNames = selected.map(id => {
                    const order = filteredOrders.find(o => o.id === id);
                    return order ? order.name : id.split('/').pop();
                  });

                  const historyItem = {
                    id: Date.now().toString(),
                    date: new Date().toISOString(),
                    orderCount: selected.length,
                    selectedIds: selectedIdsAndNames,
                    selectedNames: selectedNames
                  };

                  await fetch("/api/pdf/history", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ store, historyItem })
                  }).catch(err => console.error("Failed to save DDT history:", err));

                  // 3. Apri l'URL di stampa dei documenti di trasporto su Shopify
                  const selectedOrderIds = selected.map(id => id.split('/').pop()).filter(Boolean);
                  const queryStr = selectedOrderIds.join(' OR ');
                  const shopName = store === "b2b" ? "wholesale-prettylittle-it" : "prettylittle-it";
                  const url = `https://admin.shopify.com/store/${shopName}/orders?query=${encodeURIComponent(queryStr)}`;
                  window.open(url, '_blank');
                }}
                className="text-xs px-3 py-1.5 rounded-lg text-gray-900 bg-white border border-gray-300 hover:bg-gray-50 shadow-sm font-semibold whitespace-nowrap shrink-0 cursor-pointer"
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
                <th scope="col" className="px-3 py-2.5 text-left font-semibold text-gray-700">Ordine</th>
                <th scope="col" className="px-3 py-2.5 text-left font-semibold text-gray-700">Data</th>
                <th scope="col" className="px-3 py-2.5 text-left font-semibold text-gray-700">Cliente</th>
                <th scope="col" className="px-3 py-2.5 text-center font-semibold text-gray-700 w-16">DDT</th>
                <th scope="col" className="px-3 py-2.5 text-center font-semibold text-gray-700 w-20">Tipo</th>
                <th scope="col" className="px-3 py-2.5 text-center font-semibold text-gray-700 w-24">Articoli</th>
                <th scope="col" className="px-3 py-2.5 text-center font-semibold text-gray-700">DTF PRINT</th>
                <th scope="col" className="px-3 py-2.5 text-right font-semibold text-gray-700">Totale</th>
                <th scope="col" className="px-3 py-2.5 text-left font-semibold text-gray-700">Tag</th>
                <th scope="col" className="px-3 py-2.5 text-left font-semibold text-gray-700">Stato</th>
                <th scope="col" className="px-3 py-2.5 text-left font-semibold text-gray-700">Tracking</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {(() => {
                const totalPages = Math.ceil(filteredOrders.length / pageSize) || 1;
                const validCurrentPage = Math.min(currentPage, totalPages);
                const startIndex = (validCurrentPage - 1) * pageSize;
                const endIndex = Math.min(startIndex + pageSize, filteredOrders.length);
                const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

                if (filteredOrders.length === 0) {
                  return (
                    <tr>
                      <td colSpan={11} className="px-6 py-16 text-center">
                        <p className="text-gray-700 font-bold text-base">
                          {initialOrders.length > 0
                            ? `Nessun ordine corrisponde ai filtri attivi (${initialOrders.length} ordini caricati da Shopify)`
                            : "Nessun ordine caricato da Shopify"}
                        </p>
                        <p className="text-gray-500 mt-1 text-sm">
                          {initialOrders.length > 0
                            ? "Ci sono filtri o ricerche attive salvate nel browser che nascondono gli ordini."
                            : "Verifica che ci siano ordini aperti sullo store Shopify."}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery("");
                            setTagFilter("all");
                            setStatusFilter("all");
                            setShowOnlySelected(false);
                            setActiveViewId("default");
                            sessionStorage.removeItem(`ordersState_${store}`);
                          }}
                          className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs shadow-sm transition-all cursor-pointer hover:scale-105 active:scale-95"
                        >
                          🔄 Ripristina e mostra tutti gli ordini ({initialOrders.length})
                        </button>
                      </td>
                    </tr>
                  );
                }

                return paginatedOrders.map((order, idx) => {
                const orderNum = order.name;
                const date = new Date(order.createdAt).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
                const isSelected = selected.includes(order.id);
                const isEvaso = order.displayFulfillmentStatus === "FULFILLED";
                const isPrinted = printedIds.includes(order.id);
                const isStampatoEdEvaso = isPrinted && isEvaso;
                const shortId = order.id ? order.id.split('/').pop() : "";
                const hasDdt = ddtHistoryIds.includes(order.id) || 
                               ddtHistoryIds.includes(order.name) || 
                               (shortId && ddtHistoryIds.includes(shortId)) ||
                               (order.tags || []).some((t: string) => t.toLowerCase().includes("ddt"));
                const trackingUrl = order.fulfillments?.[0]?.trackingInfo?.[0]?.url;
                const trackingNumber = order.fulfillments?.[0]?.trackingInfo?.[0]?.number;
                
                return (
                  <tr 
                    key={order.id} 
                    className={`${
                      isSelected 
                        ? "bg-indigo-50/80" 
                        : isStampatoEdEvaso 
                          ? "bg-gray-100/90 hover:bg-gray-200/60" 
                          : "hover:bg-[#f4f6f8]"
                    } transition-colors cursor-default`}
                  >
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded-[4px] border-gray-400 text-black focus:ring-black cursor-pointer bg-white"
                        checked={isSelected}
                        onClick={(e) => handleCheckboxClick(e, order.id, idx)}
                        onChange={() => {}}
                      />
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap font-semibold text-gray-900 hover:underline">
                      <Link href={`/orders/${store}/${order.id.split('/').pop()}`}>
                        {orderNum}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-gray-600">{date}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-gray-900 max-w-[170px] truncate" title={order.customer ? `${order.customer.firstName || ''} ${order.customer.lastName || ''}` : "Nessun cliente"}>
                      {order.customer ? `${order.customer.firstName || ''} ${order.customer.lastName || ''}` : "Nessun cliente"}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-center">
                      {hasDdt ? (
                        <div 
                          className="inline-flex items-center justify-center gap-1 px-1.5 py-0.5 bg-gray-900 text-white border border-gray-700 rounded-md font-bold text-[10px] shadow-2xs cursor-pointer hover:bg-black transition-colors"
                          title="DDT / Stampa PDF Generato per questo ordine"
                        >
                          <FileText className="w-3.5 h-3.5 text-white shrink-0" />
                          <span className="font-black text-[9px] text-white uppercase tracking-tighter">DDT</span>
                        </div>
                      ) : (
                        <span className="text-gray-300 font-mono text-xs">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-center">
                      {(() => {
                        const orderLineItems = order.lineItems?.nodes || [];
                        const mandatoryCollections = getMandatorySvgCollections();

                        const hasMissingSvgAlert = orderLineItems.some((item: any) => {
                          const podSvg = 
                            item.product?.pod_svg_url_custom?.value || 
                            item.product?.pod_svg_url_pod?.value || 
                            item.product?.custom_url?.value || 
                            item.product?.pod_svg?.reference?.url || 
                            item.product?.pod_svg?.reference?.image?.url || 
                            item.variant?.pod_svg_url_custom?.value || 
                            item.variant?.custom_url?.value || 
                            item.variant?.pod_svg?.reference?.url || 
                            item.variant?.pod_svg?.reference?.image?.url;

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

                          const customGraphicImage = customPreviewAttr?.value || podSvg;
                          const isMissingSvg = !customGraphicImage || customGraphicImage.trim().length === 0;

                          const hasColoreBase = !!(
                            item.product?.colore_base?.value || 
                            item.product?.colore_base_underscore?.value
                          );

                          const productCollections = item.product?.collections?.nodes || [];
                          const titleLower = (item.title || "").toLowerCase();

                          const matchingCol = mandatoryCollections.find(mc => {
                            if (!mc.trim()) return false;
                            const mcLower = mc.toLowerCase().trim();
                            return titleLower.includes(mcLower) || productCollections.some((c: any) => c.title.toLowerCase().includes(mcLower) || mcLower.includes(c.title.toLowerCase()));
                          });

                          const isMandatory = hasColoreBase || !!matchingCol;
                          return isMandatory && isMissingSvg;
                        });

                        const hasPersonalizer = (order.tags || []).some((t: string) => t.toLowerCase() === "product_personalizer" || t.toLowerCase() === "product-personalizer");

                        if (!hasMissingSvgAlert && !hasPersonalizer) {
                          return <span className="text-gray-300 font-mono text-xs">—</span>;
                        }

                        return (
                          <div className="flex items-center justify-center gap-1.5">
                            {/* 1. TRIANGOLO ROSSO ALLARME GRAFICA SVG MANCANTE */}
                            {hasMissingSvgAlert && (
                              <Link
                                href={`/orders/${store}/${order.id.split('/').pop()}`}
                                className="p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg border border-rose-700 shadow-xs transition-all cursor-pointer hover:scale-110 active:scale-95 animate-pulse flex items-center justify-center"
                                title="⚠️ Attenzione: Grafica SVG Mancante per questo ordine! Clicca per verificare gli articoli."
                              >
                                <AlertTriangle className="w-4 h-4 text-white" />
                              </Link>
                            )}

                            {/* 2. OCCHIO ANTEPRIMA PRODUCT PERSONALIZER */}
                            {hasPersonalizer && (
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
                            )}

                            {/* 3. MATITA CONFIGURATORE TESTO */}
                            {hasPersonalizer && (
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
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-center">
                      {(() => {
                        const lineItemsList = order.lineItems?.nodes || [];
                        const totalQty = lineItemsList.reduce((sum: number, i: any) => sum + (i.quantity || 1), 0);
                        return (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedArticlesOrder(order);
                            }}
                            className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 active:scale-95 text-amber-900 border border-amber-300 font-extrabold text-xs rounded-lg inline-flex items-center gap-1 shadow-2xs transition-all hover:scale-105 cursor-pointer"
                            title={`Clicca per vedere tutti gli articoli nell'ordine (${totalQty})`}
                          >
                            📦 {totalQty} {totalQty === 1 ? "art." : "art."}
                          </button>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTogglePrinted(order.id);
                        }}
                        disabled={togglingPrintedId === order.id}
                        className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer shadow-xs ${
                          printedIds.includes(order.id)
                            ? "bg-[#e4f1ed] text-[#0b5c46] hover:bg-[#d5ebe5]"
                            : "bg-[#fff8e1] text-[#b28900] hover:bg-[#ffefc1]"
                        }`}
                        title="Clicca per invertire lo stato di stampa su Shopify"
                      >
                        {togglingPrintedId === order.id ? (
                          <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-1.5 shrink-0"></span>
                        ) : (
                          <span className={`w-1.5 h-1.5 rounded-full mr-1.5 shrink-0 ${
                            printedIds.includes(order.id) ? "bg-[#0b5c46]" : "bg-[#ffc107]"
                          }`}></span>
                        )}
                        {printedIds.includes(order.id) ? "Stampato" : "Da Stampare"}
                      </button>
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
              });
            })()}
            </tbody>
          </table>

          {/* BARRA PAGINAZIONE ORDINI SCORREVOLI */}
          {(() => {
            const totalPages = Math.ceil(filteredOrders.length / pageSize) || 1;
            const validCurrentPage = Math.min(currentPage, totalPages);
            const startIndex = (validCurrentPage - 1) * pageSize;
            const endIndex = Math.min(startIndex + pageSize, filteredOrders.length);

            return (
              <div className="bg-white px-4 py-3 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-semibold text-gray-700">
                <div className="flex items-center gap-2">
                  <span>
                    Mostrati <strong className="text-gray-900 font-mono">{filteredOrders.length > 0 ? startIndex + 1 : 0} - {endIndex}</strong> di <strong className="text-gray-900 font-mono">{filteredOrders.length}</strong> ordini
                  </span>
                  <span className="text-gray-400">|</span>
                  <span>
                    Pagina <strong className="text-indigo-600 font-mono">{validCurrentPage}</strong> di <strong className="text-gray-900 font-mono">{totalPages}</strong>
                  </span>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={validCurrentPage === 1}
                      className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-2xs"
                    >
                      ← Precedente
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === totalPages || Math.abs(p - validCurrentPage) <= 2)
                      .map((page, idx, arr) => {
                        const prevPage = arr[idx - 1];
                        const showEllipsis = prevPage && page - prevPage > 1;
                        return (
                          <span key={page} className="flex items-center gap-1">
                            {showEllipsis && <span className="text-gray-400 font-mono px-1">...</span>}
                            <button
                              type="button"
                              onClick={() => setCurrentPage(page)}
                              className={`w-7 h-7 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                                page === validCurrentPage
                                  ? "bg-indigo-600 text-white shadow-xs"
                                  : "bg-gray-50 text-gray-700 hover:bg-gray-200 border border-gray-300"
                              }`}
                            >
                              {page}
                            </button>
                          </span>
                        );
                      })}

                    <button
                      type="button"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={validCurrentPage === totalPages}
                      className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shadow-2xs"
                    >
                      Successiva →
                    </button>
                  </div>
                )}
              </div>
            );
          })()}
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

      {/* Modal Popup Rapido Articoli dell'Ordine */}
      {selectedArticlesOrder && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setSelectedArticlesOrder(null)}
        >
          <div 
            className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                  <Package className="w-5 h-5 text-indigo-600" />
                  Articoli dell&apos;Ordine {selectedArticlesOrder.name}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Cliente: <span className="font-semibold text-gray-700">{selectedArticlesOrder.customer ? `${selectedArticlesOrder.customer.firstName || ''} ${selectedArticlesOrder.customer.lastName || ''}` : "Nessun cliente"}</span>
                </p>
              </div>
              <button 
                onClick={() => setSelectedArticlesOrder(null)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-full transition-colors"
                title="Chiudi"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4 flex-1 bg-gray-50/50">
              {(selectedArticlesOrder.lineItems?.nodes || []).map((item: any, idx: number) => {
                const productImage = item.variant?.image?.url || item.product?.featuredImage?.url || item.image?.url;
                const podSvg = item.product?.pod_svg?.reference?.url || item.product?.pod_svg?.reference?.image?.url || item.variant?.pod_svg?.reference?.url || item.variant?.pod_svg?.reference?.image?.url;

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
                const customGraphicImage = personalizerPreviewUrl || podSvg;

                const rawPrice = item.originalUnitPriceSet?.shopMoney?.amount || item.variant?.price;
                const price = typeof rawPrice === "object" ? rawPrice?.amount : rawPrice;
                
                return (
                  <div key={item.id || idx} className="p-4 bg-white rounded-2xl border border-gray-200 shadow-xs space-y-3">
                    <div className="flex gap-4 items-start">
                      {/* Product / Personalizer Images Side-by-Side */}
                      <div className="flex items-center gap-2 shrink-0">
                        {/* 1. Foto Prodotto Originale (Mockup/Boccetta) */}
                        {productImage && (
                          <div 
                            onClick={() => setZoomImage({ url: productImage, title: item.title, type: "Foto Prodotto" })}
                            className="w-20 h-20 bg-gray-50 rounded-xl border border-gray-200 flex flex-col items-center justify-center p-1 relative group overflow-hidden shadow-2xs cursor-pointer hover:border-indigo-400 transition-all"
                            title="Clicca per ingrandire la foto del prodotto"
                          >
                            <span className="absolute top-1 left-1 bg-gray-900/80 text-white text-[7px] font-extrabold px-1 py-0.2 rounded z-10">
                              Prodotto
                            </span>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={productImage} alt={item.title} className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform" />
                          </div>
                        )}

                        {/* 2. Grafica SVG / Personalizzata (a destra) */}
                        {customGraphicImage && (
                          <div 
                            onClick={() => setZoomImage({ url: customGraphicImage, title: item.title, type: "Grafica SVG" })}
                            className="w-20 h-20 bg-indigo-50/70 rounded-xl border border-indigo-200 flex flex-col items-center justify-center p-1 relative group overflow-hidden shadow-2xs cursor-pointer hover:border-indigo-500 transition-all"
                            title="Clicca per ingrandire la grafica SVG"
                          >
                            <span className="absolute top-1 left-1 bg-indigo-600 text-white text-[7px] font-extrabold px-1 py-0.2 rounded z-10">
                              Grafica SVG
                            </span>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={customGraphicImage} alt="Grafica SVG" className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform" />
                          </div>
                        )}

                        {!productImage && !customGraphicImage && (
                          <div className="w-20 h-20 bg-gray-100 rounded-xl flex items-center justify-center p-2 border border-gray-200">
                            <Package className="w-6 h-6 text-gray-300" />
                          </div>
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-bold text-gray-900 text-base leading-snug">{item.title}</h4>
                            {item.variant?.title && item.variant.title !== "Default Title" && (
                              <p className="text-xs text-indigo-600 font-semibold mt-0.5">
                                Variante: {item.variant.title}
                              </p>
                            )}
                            {item.variant?.sku && (
                              <p className="text-[11px] text-gray-400 font-mono mt-0.5">
                                SKU: {item.variant.sku}
                              </p>
                            )}
                          </div>

                          {/* Quantity & Price Badge */}
                          <div className="text-right shrink-0">
                            <span className="px-2.5 py-1 bg-amber-100 text-amber-900 font-black text-xs rounded-lg inline-block shadow-2xs">
                              x {item.quantity || 1}
                            </span>
                            {price && (
                              <div className="text-sm font-bold text-gray-900 mt-1">
                                € {price}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Custom Attributes as Soft Purple Pill Badges */}
                        {item.customAttributes && item.customAttributes.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {item.customAttributes.map((attr: any, aIdx: number) => {
                              const isUrl = typeof attr.value === "string" && attr.value.startsWith("http");
                              return isUrl ? (
                                <div key={aIdx} className="w-full bg-indigo-50/80 p-2.5 rounded-xl border border-indigo-100 text-xs">
                                  <span className="font-semibold text-indigo-900 block mb-0.5">{attr.key}:</span>
                                  <a 
                                    href={attr.value} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="font-bold text-indigo-600 hover:text-indigo-800 underline break-all text-[11px]"
                                  >
                                    {attr.value} ↗
                                  </a>
                                </div>
                              ) : (
                                <span key={aIdx} className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg border border-indigo-100 text-xs font-semibold inline-flex items-center shadow-2xs">
                                  {attr.key}: {attr.value}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs font-semibold text-gray-600">
              <span>Totale Articoli nell&apos;Ordine: {(selectedArticlesOrder.lineItems?.nodes || []).reduce((s: number, i: any) => s + (i.quantity || 1), 0)}</span>
              <button
                onClick={() => setSelectedArticlesOrder(null)}
                className="px-5 py-2 bg-gray-900 hover:bg-black text-white rounded-xl font-bold transition-colors shadow-sm"
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
        orderId={textEditorModal.orderId}
        store={store === "b2b" ? "b2b" : "b2c"}
        title={textEditorModal.title}
        initialText={textEditorModal.initialText}
        initialFont={textEditorModal.initialFont}
        initialColor={textEditorModal.initialColor}
        initialFontSize={textEditorModal.initialFontSize}
        backgroundUrl={textEditorModal.backgroundUrl}
        uploadedImageUrl={textEditorModal.uploadedImageUrl}
        svgUrl={textEditorModal.svgUrl}
        customAttributes={textEditorModal.customAttributes}
        lineItems={textEditorModal.lineItems}
        onSave={() => {
          window.location.reload();
        }}
      />
      {/* POPUP LIGHTBOX PORTAL AGGANCIATO A DOCUMENT.BODY (ESCE DA QUALSIASI CONTENITORE CSS PARENTE) */}
      {zoomImage && mounted && createPortal(
        <div 
          onClick={() => setZoomImage(null)}
          className="fixed inset-0 z-[999999] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer animate-in fade-in duration-150"
        >
          {/* Pulsante X in alto a destra */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setZoomImage(null);
            }}
            className="fixed top-6 right-6 z-[1000000] text-white bg-black/70 hover:bg-rose-600 p-3 rounded-full transition-colors cursor-pointer shadow-2xl border border-white/20"
            title="Chiudi (oppure clicca ovunque sullo sfondo)"
          >
            <X className="w-7 h-7 text-white" />
          </button>

          {/* Immagine o Grafica SVG ingrandita a schermo intero (w-[85vw] h-[85vh] per forzare anche gli SVG vettoriali ad espandersi) */}
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="relative flex items-center justify-center w-[85vw] h-[85vh] max-w-[95vw] max-h-[95vh]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={zoomImage.url} 
              alt={zoomImage.title} 
              className="w-full h-full max-w-[95vw] max-h-[95vh] object-contain rounded-2xl shadow-2xl select-none bg-white/5 p-2"
            />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
