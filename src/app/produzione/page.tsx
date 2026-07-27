"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileDown, Calendar, Printer, Eye, Pencil, Download, X, RefreshCw } from "lucide-react";

interface PdfHistoryItem {
  id: string;
  date: string;
  orderCount: number;
  selectedIds: string[];
  selectedNames?: string[];
  pdfBase64: string;
}

export default function ProduzioneHistoryPage() {
  const [history, setHistory] = useState<PdfHistoryItem[]>([]);
  const [store, setStore] = useState<"b2b" | "b2c">("b2b");
  
  // Popup Quick Preview State
  const [previewItem, setPreviewItem] = useState<PdfHistoryItem | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);

  // Layout Modification Modal State
  const [editingItem, setEditingItem] = useState<PdfHistoryItem | null>(null);
  const [editItems, setEditItems] = useState<any[]>([]);
  const [isRegenerating, setIsRegenerating] = useState(false);

  useEffect(() => {
    loadHistory(store);
  }, [store]);

  const loadHistory = (storeName: string) => {
    const saved = localStorage.getItem(`pdfHistory_${storeName}`);
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    } else {
      setHistory([]);
    }
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleString("it-IT", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    });
  };

  const clearHistory = () => {
    if (confirm("Vuoi davvero cancellare tutto lo storico di questa vista? I PDF non saranno più recuperabili.")) {
      localStorage.removeItem(`pdfHistory_${store}`);
      setHistory([]);
    }
  };

  // Quick Popup Preview (Occhio) - In-Page Modal without redirect
  const handleOpenPopupPreview = (item: PdfHistoryItem) => {
    try {
      const byteCharacters = atob(item.pdfBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const file = new Blob([byteArray], { type: 'application/pdf' });
      const fileURL = URL.createObjectURL(file);
      setPreviewBlobUrl(fileURL);
      setPreviewItem(item);
    } catch (e) {
      alert("Errore caricamento anteprima: " + e);
    }
  };

  // Open Edit Layout Modal (Matita)
  const handleOpenEditLayout = async (item: PdfHistoryItem) => {
    try {
      const savedRollWidth = localStorage.getItem("rollWidthMm");
      const rollWidthMm = savedRollWidth ? parseInt(savedRollWidth, 10) : 300;

      const res = await fetch("/api/pdf/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderIds: item.selectedIds,
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

        const preparedItems = data.items.map((it: any) => {
          const w = it.widthMm || 80;
          const h = it.heightMm || 100;
          const totalH = h + 10;

          if (currentX + w + 3 > rollWidthMm) {
            currentX = 3;
            currentY += shelfHeight + 3;
            shelfHeight = 0;
          }

          const itemObj = {
            ...it,
            x: Math.round(currentX),
            y: Math.round(currentY),
            rotated: false
          };

          currentX += w + 3;
          shelfHeight = Math.max(shelfHeight, totalH);
          return itemObj;
        });

        setEditItems(preparedItems);
        setEditingItem(item);
      } else {
        alert("Impossibile recuperare le grafiche del lotto: " + (data.error || "Errore sconosciuto"));
      }
    } catch (e: any) {
      alert("Errore caricamento grafiche: " + e.message);
    }
  };

  // Regenerate PDF with updated manual layout
  const handleSaveModifiedLayout = async () => {
    if (!editingItem) return;
    setIsRegenerating(true);
    try {
      const savedRollWidth = localStorage.getItem("rollWidthMm");
      const rollWidthMm = savedRollWidth ? parseInt(savedRollWidth, 10) : 300;

      const res = await fetch("/api/pdf/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderIds: editingItem.selectedIds,
          store,
          binWidthMm: rollWidthMm,
          customItems: editItems
        })
      });
      const data = await res.json();

      if (!data.success) {
        alert("Errore generazione PDF: " + data.error);
        setIsRegenerating(false);
        return;
      }

      // Update history in localStorage
      const updatedHistory = history.map(h => {
        if (h.id === editingItem.id) {
          return { ...h, pdfBase64: data.base64, date: new Date().toISOString() };
        }
        return h;
      });

      localStorage.setItem(`pdfHistory_${store}`, JSON.stringify(updatedHistory));
      setHistory(updatedHistory);
      setEditingItem(null);
      alert("Layout modificato e PDF aggiornato con successo!");
    } catch (e: any) {
      alert("Errore: " + e.message);
    }
    setIsRegenerating(false);
  };

  return (
    <div className="min-h-screen bg-[#f4f6f8] p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Printer className="w-6 h-6 text-indigo-600" />
              Storico Produzione PDF
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Visualizza anteprime rapide (Occhio), modifica il layout (Matita) o scarica i file generati.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex bg-gray-200 p-1 rounded-lg">
              <button 
                onClick={() => setStore("b2b")}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${store === "b2b" ? "bg-white shadow-sm text-gray-900" : "text-gray-600 hover:text-gray-900"}`}
              >
                Store B2B
              </button>
              <button 
                onClick={() => setStore("b2c")}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${store === "b2c" ? "bg-white shadow-sm text-gray-900" : "text-gray-600 hover:text-gray-900"}`}
              >
                Store B2C
              </button>
            </div>
            <button 
              onClick={clearHistory}
              disabled={history.length === 0}
              className="px-3 py-1.5 text-sm text-red-600 font-medium hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Svuota Storico
            </button>
          </div>
        </div>

        {/* List */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {history.length === 0 ? (
            <div className="p-12 text-center">
              <Printer className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900">Nessun PDF Generato</h3>
              <p className="text-gray-500 mt-1">Non hai ancora generato alcun PDF per lo store {store.toUpperCase()}.</p>
              <div className="mt-6">
                <Link href={`/orders/${store}`} className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
                  Vai agli ordini per iniziare &rarr;
                </Link>
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {history.map(item => (
                <li key={item.id} className="p-5 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
                      <FileDown className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-[15px] font-bold text-gray-900">
                        Lotto di Stampa {store.toUpperCase()} - {item.orderCount} Ordini
                      </h4>
                      <div className="flex items-center gap-4 mt-1.5 text-sm text-gray-500">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {formatDate(item.date)}
                        </span>
                        <span>
                          <strong className="text-gray-700">Ordini:</strong> {
                            item.selectedNames && item.selectedNames.length > 0
                              ? item.selectedNames.join(', ')
                              : item.selectedIds.map(id => {
                                  const rawId = id.split('/').pop() || id;
                                  return rawId.startsWith('#') ? rawId : `#${rawId}`;
                                }).join(', ')
                          }
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions: Occhio (Anteprima Popup), Matita (Modifica Layout), Scarica */}
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleOpenPopupPreview(item)}
                      className="p-2.5 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-bold"
                      title="Anteprima Rapida (Popup)"
                    >
                      <Eye className="w-4 h-4" />
                      Anteprima
                    </button>

                    <button 
                      onClick={() => handleOpenEditLayout(item)}
                      className="p-2.5 text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-bold"
                      title="Modifica Layout Posizioni"
                    >
                      <Pencil className="w-4 h-4" />
                      Modifica
                    </button>

                    <a 
                      href={`data:application/pdf;base64,${item.pdfBase64}`}
                      download={`Stampa_${store}_${item.id}.pdf`}
                      className="p-2.5 text-white bg-[#303030] hover:bg-black rounded-lg shadow-sm transition-colors flex items-center gap-1.5 text-xs font-bold"
                      title="Scarica File PDF"
                    >
                      <Download className="w-4 h-4" />
                      Scarica
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* POPUP ANTEPRIMA RAPIDA (Occhio) - In-Page Modal senza reindirizzamento */}
      {previewItem && previewBlobUrl && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden">
            <div className="p-4 bg-gray-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold">
                  Anteprima Rapida — Lotto {store.toUpperCase()} ({previewItem.orderCount} Ordini)
                </h3>
              </div>
              <button 
                onClick={() => {
                  setPreviewItem(null);
                  setPreviewBlobUrl(null);
                }}
                className="p-1 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 bg-gray-100 p-2">
              <iframe 
                src={previewBlobUrl} 
                className="w-full h-full rounded-lg border border-gray-300 shadow-inner"
                title="Anteprima PDF"
              />
            </div>
            <div className="p-3 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
              <a
                href={`data:application/pdf;base64,${previewItem.pdfBase64}`}
                download={`Stampa_${store}_${previewItem.id}.pdf`}
                className="px-4 py-2 text-sm font-bold text-white bg-[#303030] hover:bg-black rounded-lg shadow-sm flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Scarica File
              </a>
              <button 
                onClick={() => {
                  setPreviewItem(null);
                  setPreviewBlobUrl(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-lg"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP MODIFICA LAYOUT (Matita) */}
      {editingItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 bg-amber-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Pencil className="w-5 h-5" />
                <h3 className="text-base font-bold">Modifica Layout Posizioni — Lotto {store.toUpperCase()}</h3>
              </div>
              <button 
                onClick={() => setEditingItem(null)}
                className="p-1 hover:bg-amber-700 rounded-lg text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto space-y-6 bg-gray-50">
              {(() => {
                const savedRollWidth = localStorage.getItem("rollWidthMm");
                const rollWidthMm = savedRollWidth ? parseInt(savedRollWidth, 10) : 300;

                const maxItemY = editItems.reduce((max, item) => {
                  const itemH = (item.rotated ? item.widthMm : item.heightMm) + 15;
                  return Math.max(max, item.y + itemH);
                }, 200);
                const totalRollLengthMm = Math.max(maxItemY + 10, 250);

                return (
                  <div className="bg-white border-2 border-dashed border-amber-300 rounded-xl p-4 shadow-inner">
                    <div className="text-xs text-gray-500 font-bold uppercase mb-2 flex justify-between">
                      <span>Margine Sinistro (0 mm)</span>
                      <span>Bobina {rollWidthMm} mm × {Math.round(totalRollLengthMm)} mm</span>
                    </div>
                    
                    <div 
                      className="relative border border-amber-200 bg-amber-50/20 rounded overflow-hidden shadow-sm" 
                      style={{ 
                        width: "100%", 
                        paddingBottom: `${(totalRollLengthMm / rollWidthMm) * 100}%` 
                      }}
                    >
                      {editItems.map((item, idx) => {
                        const itemW = item.rotated ? item.heightMm : item.widthMm;
                        const itemH = item.rotated ? item.widthMm : item.heightMm;
                        return (
                          <div
                            key={item.id}
                            className="absolute border-2 border-amber-600 bg-white/95 rounded p-1.5 shadow-md flex flex-col justify-between transition-all"
                            style={{
                              left: `${(item.x / rollWidthMm) * 100}%`,
                              top: `${(item.y / totalRollLengthMm) * 100}%`,
                              width: `${(itemW / rollWidthMm) * 100}%`,
                              height: `${(itemH / totalRollLengthMm) * 100}%`
                            }}
                          >
                            <div className="flex items-center justify-between text-[10px] font-bold text-amber-950">
                              <span className="truncate">{item.orderName}</span>
                              <button
                                onClick={() => {
                                  const updated = [...editItems];
                                  updated[idx].rotated = !updated[idx].rotated;
                                  setEditItems(updated);
                                }}
                                className="px-1 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded text-[9px] font-bold z-10"
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
                                <span className="text-[9px] text-amber-800/60 italic">[Grafica Stampa]</span>
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

              {/* Items Controls */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-gray-900">Modifica Coordinate & Rotazione</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {editItems.map((item, idx) => (
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
                              const updated = [...editItems];
                              updated[idx].x = val;
                              setEditItems(updated);
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
                              const updated = [...editItems];
                              updated[idx].y = val;
                              setEditItems(updated);
                            }}
                            className="w-16 px-1.5 py-1 text-xs border border-gray-300 rounded font-semibold"
                          />
                        </div>
                        <button
                          onClick={() => {
                            const updated = [...editItems];
                            updated[idx].rotated = !updated[idx].rotated;
                            setEditItems(updated);
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
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-lg"
              >
                Annulla
              </button>
              <button
                onClick={handleSaveModifiedLayout}
                disabled={isRegenerating}
                className="px-5 py-2 text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm flex items-center gap-2"
              >
                {isRegenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Pencil className="w-4 h-4" />}
                {isRegenerating ? "Rigenerazione in corso..." : "Salva & Rigenera PDF"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
