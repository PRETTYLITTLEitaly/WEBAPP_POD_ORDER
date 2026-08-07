"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useRef } from "react";
import { Type, Upload, Trash2, CheckCircle2, AlertCircle, RefreshCw, Sliders, Save, Search, FileSpreadsheet, ChevronDown, ChevronUp } from "lucide-react";
import { FontMapping, getFontMappings, saveFontMappings, syncFontMappingsFromServer } from "@/lib/presetStore";

interface FontItem {
  id: string;
  name: string;
  filename: string;
  url: string;
  dataUri?: string;
  format: string;
  sizeBytes: number;
}

export default function FontLibraryPage() {
  const [fonts, setFonts] = useState<FontItem[]>([]);
  const [mappings, setMappings] = useState<FontMapping[]>([]);
  const [fontSearchQuery, setFontSearchQuery] = useState("");
  const [aliasFilter, setAliasFilter] = useState<"all" | "with_alias" | "without_alias">("all");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [previewText, setPreviewText] = useState("Giulia & Riccardo 26.09.2026");
  const [fontSize, setFontSize] = useState(28);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showAdvancedCsv, setShowAdvancedCsv] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const fetchFonts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/fonts");
      const data = await res.json();
      if (data.success) {
        setFonts(data.fonts);
      }
    } catch (e: any) {
      console.error("Errore recupero font:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFonts();
    syncFontMappingsFromServer().then(serverMappings => {
      if (serverMappings && serverMappings.length > 0) {
        setMappings(serverMappings);
      } else {
        setMappings(getFontMappings());
      }
    });
  }, []);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    setMessage(null);

    let successCount = 0;
    let errorMsg = "";

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch("/api/fonts", {
          method: "POST",
          body: formData
        });
        const data = await res.json();

        if (data.success) {
          successCount++;
        } else {
          errorMsg = data.error || "Errore durante il caricamento del font";
        }
      } catch (e: any) {
        errorMsg = e.message;
      }
    }

    setUploading(false);

    if (successCount > 0) {
      setMessage({ type: "success", text: `${successCount} font caricato/i con successo!` });
      fetchFonts();
      if (fileInputRef.current) fileInputRef.current.value = "";
    } else if (errorMsg) {
      setMessage({ type: "error", text: errorMsg });
    }
  };

  const handleDeleteFont = async (filename: string) => {
    if (!confirm(`Sei sicuro di voler eliminare il font "${filename}"?`)) return;

    try {
      const res = await fetch("/api/fonts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename })
      });
      const data = await res.json();

      if (data.success) {
        setMessage({ type: "success", text: `Font "${filename}" eliminato con successo!` });
        fetchFonts();
      } else {
        setMessage({ type: "error", text: data.error });
      }
    } catch (e: any) {
      setMessage({ type: "error", text: e.message });
    }
  };

  const handleCsvUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
      const newMappings: FontMapping[] = [];

      lines.forEach((line, idx) => {
        if (idx === 0 && (line.toLowerCase().includes("shopify") || line.toLowerCase().includes("file") || line.toLowerCase().includes("nome"))) {
          return;
        }

        const parts = line.split(/[,;\t]/).map(p => p.trim().replace(/^["']|["']$/g, ""));
        if (parts.length >= 2) {
          const shopifyName = parts[0];
          let targetFontRaw = parts[1].replace(/\.(ttf|otf|woff|woff2)$/i, "").trim();

          const normTarget = targetFontRaw.toLowerCase().replace(/[^a-z0-9]/g, "");
          const matchedInstalled = fonts.find(f => {
            const normF = f.name.toLowerCase().replace(/[^a-z0-9]/g, "");
            const normFile = f.filename.toLowerCase().replace(/\.(ttf|otf|woff|woff2)$/i, "").replace(/[^a-z0-9]/g, "");
            return normF === normTarget || normFile === normTarget || normF.includes(normTarget) || normTarget.includes(normF);
          });

          const finalTargetFont = matchedInstalled ? matchedInstalled.name : targetFontRaw;

          if (shopifyName && finalTargetFont) {
            newMappings.push({
              id: Date.now().toString() + "_" + idx,
              shopifyName,
              targetFont: finalTargetFont
            });
          }
        }
      });

      if (newMappings.length > 0) {
        const merged = [...mappings];

        newMappings.forEach(newItem => {
          const existsIdx = merged.findIndex(m => m.shopifyName.toLowerCase() === newItem.shopifyName.toLowerCase());
          if (existsIdx !== -1) {
            merged[existsIdx] = newItem;
          } else {
            merged.push(newItem);
          }
        });

        setMappings(merged);
        saveFontMappings(merged);
        setMessage({ type: "success", text: `✓ CSV Importato! ${newMappings.length} nomi Shopify abbinati ai font installati!` });
        setTimeout(() => setMessage(null), 4000);
      }
    };
    reader.readAsText(file);
  };

  const handleUpdateFontAlias = (fontName: string, filename: string, newShopifyName: string) => {
    const normF = fontName.toLowerCase().replace(/[^a-z0-9]/g, "");
    const normFile = filename.toLowerCase().replace(/\.(ttf|otf|woff|woff2)$/i, "").replace(/[^a-z0-9]/g, "");

    const existingIdx = mappings.findIndex(m => {
      const normTarget = m.targetFont.toLowerCase().replace(/\.(ttf|otf|woff|woff2)$/i, "").replace(/[^a-z0-9]/g, "");
      return normTarget === normF || normTarget === normFile || (normTarget.length >= 4 && (normF.startsWith(normTarget) || normFile.startsWith(normTarget)));
    });

    let updated: FontMapping[] = [];
    if (existingIdx !== -1) {
      if (!newShopifyName.trim()) {
        updated = mappings.filter((_, idx) => idx !== existingIdx);
      } else {
        updated = mappings.map((m, idx) => idx === existingIdx ? { ...m, shopifyName: newShopifyName.trim() } : m);
      }
    } else if (newShopifyName.trim()) {
      updated = [
        ...mappings,
        {
          id: Date.now().toString() + "_" + Math.random().toString(36).substr(2, 4),
          shopifyName: newShopifyName.trim(),
          targetFont: fontName
        }
      ];
    }

    setMappings(updated);
    saveFontMappings(updated);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFontShopifyAlias = (font: FontItem) => {
    const normF = font.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    const normFile = font.filename.toLowerCase().replace(/\.(ttf|otf|woff|woff2)$/i, "").replace(/[^a-z0-9]/g, "");

    const match = mappings.find(m => {
      const normTarget = m.targetFont.toLowerCase().replace(/\.(ttf|otf|woff|woff2)$/i, "").replace(/[^a-z0-9]/g, "");
      return normTarget === normF || normTarget === normFile || (normTarget.length >= 4 && (normF.startsWith(normTarget) || normFile.startsWith(normTarget)));
    });

    return match ? match.shopifyName : "";
  };

  const fontsWithAliasCount = fonts.filter(f => !!getFontShopifyAlias(f)).length;
  const fontsWithoutAliasCount = fonts.filter(f => !getFontShopifyAlias(f)).length;

  const filteredInstalledFonts = fonts.filter(font => {
    const alias = getFontShopifyAlias(font);

    if (aliasFilter === "with_alias" && !alias) return false;
    if (aliasFilter === "without_alias" && alias) return false;

    if (fontSearchQuery.trim()) {
      const q = fontSearchQuery.toLowerCase();
      const matchName = font.name.toLowerCase().includes(q);
      const matchFile = font.filename.toLowerCase().includes(q);
      const matchShopify = alias ? alias.toLowerCase().includes(q) : false;
      return matchName || matchFile || matchShopify;
    }

    return true;
  });

  return (
    <div className="p-8 space-y-6 max-w-5xl">
      
      {/* Dynamic @font-face CSS Injection */}
      <style dangerouslySetInnerHTML={{
        __html: fonts.map(font => {
          const spacedName = font.name.replace(/([a-z])([A-Z])/g, '$1 $2');
          const fontSrc = font.dataUri || font.url;
          return `
            @font-face {
              font-family: '${font.name}';
              src: url('${fontSrc}');
              font-weight: normal;
              font-style: normal;
              font-display: block;
            }
            @font-face {
              font-family: '${spacedName}';
              src: url('${fontSrc}');
              font-weight: normal;
              font-style: normal;
              font-display: block;
            }
          `;
        }).join("\n")
      }} />

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Type className="w-6 h-6 text-indigo-600" />
            Libreria Font Personalizzati
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Carica i file dei font e assegna il nome di Shopify per la vettorializzazione automatica delle scritte.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input 
            type="file"
            ref={csvInputRef}
            accept=".csv,.txt"
            onChange={e => e.target.files?.[0] && handleCsvUpload(e.target.files[0])}
            className="hidden"
          />
          <button
            onClick={() => csvInputRef.current?.click()}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2"
            title="Carica un file CSV per abbinare automaticamente i nomi dei font di Shopify ai font installati"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Importa Nomi da CSV</span>
          </button>

          <button
            onClick={fetchFonts}
            className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Aggiorna Elenco Font"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-xl border flex items-center gap-3 text-sm font-medium ${
          message.type === "success" 
            ? "bg-green-50 border-green-200 text-green-800" 
            : "bg-red-50 border-red-200 text-red-800"
        }`}>
          {message.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          )}
          {message.text}
        </div>
      )}

      {/* BOX CARICAMENTO FONT */}
      <div 
        onClick={() => fileInputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => {
          e.preventDefault();
          handleFileUpload(e.dataTransfer.files);
        }}
        className="bg-white border-2 border-dashed border-indigo-200 hover:border-indigo-500 rounded-2xl p-6 text-center cursor-pointer transition-all hover:bg-indigo-50/30 group shadow-sm"
      >
        <input 
          type="file" 
          ref={fileInputRef}
          accept=".ttf,.otf,font/ttf,font/otf"
          multiple
          onChange={e => handleFileUpload(e.target.files)}
          className="hidden"
        />

        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
          <Upload className="w-5 h-5" />
        </div>

        <h3 className="text-sm font-bold text-gray-900 mb-1">
          {uploading ? "Caricamento font in corso..." : "Carica nuovi Font (.TTF / .OTF)"}
        </h3>
        <p className="text-xs text-gray-500 max-w-md mx-auto">
          Trascina qui i tuoi file <strong className="text-gray-700 font-semibold">.ttf</strong> o <strong className="text-gray-700 font-semibold">.otf</strong> per aggiungerli al programma.
        </p>
      </div>

      {/* BARRA TEST ANTEPRIMA TYPOGRAPHY */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
            <Sliders className="w-4 h-4 text-indigo-600" />
            Testatore di Tipografia in Tempo Reale
          </span>
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
            <span>Dimensione: {fontSize}px</span>
            <input 
              type="range"
              min={14}
              max={60}
              value={fontSize}
              onChange={e => setFontSize(parseInt(e.target.value, 10))}
              className="w-28 accent-indigo-600 cursor-pointer"
            />
          </div>
        </div>
        <input 
          type="text"
          value={previewText}
          onChange={e => setPreviewText(e.target.value)}
          placeholder="Scrivi qui un testo di prova..."
          className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
        />
      </div>

      {/* ELENCO DEI FONT CARICATI */}
      <div className="space-y-3">
        {/* BARRA RICERCA FONT E PULSANTI FILTRO */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
              <Type className="w-5 h-5 text-indigo-600" />
              Font Installati ({filteredInstalledFonts.length} / {fonts.length})
            </h2>

            {/* FILTRI PULSANTI */}
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl text-xs font-bold flex-wrap">
              <button
                onClick={() => setAliasFilter("all")}
                className={`px-3 py-1 rounded-lg transition-all ${
                  aliasFilter === "all"
                    ? "bg-white text-gray-900 shadow-xs"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Tutti ({fonts.length})
              </button>

              <button
                onClick={() => setAliasFilter("with_alias")}
                className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                  aliasFilter === "with_alias"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-emerald-700 hover:bg-emerald-50"
                }`}
              >
                <span>Con Nome Shopify</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  aliasFilter === "with_alias" ? "bg-emerald-700 text-white" : "bg-emerald-100 text-emerald-800"
                }`}>
                  {fontsWithAliasCount}
                </span>
              </button>

              <button
                onClick={() => setAliasFilter("without_alias")}
                className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                  aliasFilter === "without_alias"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "text-rose-700 hover:bg-rose-50"
                }`}
              >
                <span>Senza Nome Shopify</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  aliasFilter === "without_alias" ? "bg-rose-700 text-white" : "bg-rose-100 text-rose-800"
                }`}>
                  {fontsWithoutAliasCount}
                </span>
              </button>

              {(aliasFilter !== "all" || fontSearchQuery) && (
                <button
                  onClick={() => {
                    setAliasFilter("all");
                    setFontSearchQuery("");
                  }}
                  className="px-2.5 py-1 text-gray-500 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-all text-[11px] underline"
                  title="Deseleziona tutti i filtri"
                >
                  Reset ✕
                </button>
              )}
            </div>
          </div>

          <div className="relative w-full md:w-72 shrink-0">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input 
              type="text"
              value={fontSearchQuery}
              onChange={e => setFontSearchQuery(e.target.value)}
              placeholder="🔍 Cerca per nome o file..."
              className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-400 text-sm animate-pulse">
            Caricamento libreria font...
          </div>
        ) : filteredInstalledFonts.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500 text-sm">
            {fontSearchQuery ? `Nessun font trovato per "${fontSearchQuery}".` : "Nessun font installato. Carica il tuo primo file .TTF o .OTF in alto!"}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredInstalledFonts.map(font => {
              const currentAlias = getFontShopifyAlias(font);

              return (
                <div 
                  key={font.id}
                  className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:border-gray-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  {/* Edizione Nome Shopify Diretta sul Cartellino Font */}
                  <div className="space-y-2 shrink-0 md:w-72">
                    <div>
                      <label className="block text-[11px] font-extrabold text-gray-500 uppercase tracking-wider mb-1">
                        Nome Font su Shopify (Alias):
                      </label>
                      <div className="relative flex items-center">
                        <input 
                          type="text"
                          defaultValue={currentAlias}
                          placeholder='Es: "Save", "Get Show"'
                          onBlur={e => handleUpdateFontAlias(font.name, font.filename, e.target.value)}
                          onKeyDown={e => {
                            if (e.key === "Enter") {
                              (e.target as HTMLInputElement).blur();
                            }
                          }}
                          className="w-full px-3 py-1.5 border border-indigo-200 focus:border-indigo-600 rounded-lg text-xs font-extrabold text-indigo-950 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-indigo-50/30"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="font-mono font-medium truncate max-w-[180px]">File: {font.filename}</span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-gray-100 text-gray-600 uppercase">
                        {font.format}
                      </span>
                    </div>
                  </div>

                  {/* Live Preview Box */}
                  <div className="flex-1 bg-gray-50/70 p-4 rounded-xl border border-gray-100 overflow-hidden flex items-center min-h-[64px]">
                    <span 
                      style={{ 
                        fontFamily: `'${font.name}', sans-serif`,
                        fontSize: `${fontSize}px`,
                        lineHeight: 1.2
                      }}
                      className="text-gray-900 truncate block w-full"
                    >
                      {previewText || "Anteprima Font"}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="shrink-0 flex items-center justify-end">
                    <button
                      onClick={() => handleDeleteFont(font.filename)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors text-xs font-bold flex items-center gap-1.5"
                      title="Elimina Font"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Elimina</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SEZIONE COMPATTATA RISERVATA PER VISIONE AVANZATA MAPPATURE CSV */}
      <div className="border border-gray-200 rounded-2xl bg-white overflow-hidden shadow-xs">
        <button
          onClick={() => setShowAdvancedCsv(!showAdvancedCsv)}
          className="w-full p-4 text-left font-bold text-xs text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
        >
          <span className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-600" />
            <span>Registro Avanzato Mappature Piattaforma ({mappings.length} abbinamenti attivi)</span>
          </span>
          {showAdvancedCsv ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
        </button>

        {showAdvancedCsv && (
          <div className="p-4 space-y-3 border-t border-gray-200">
            <div className="flex items-center justify-between flex-wrap gap-2 text-xs text-gray-500">
              <p>Tutti gli abbinamenti salvati vengono utilizzati sia dal generatore PDF sia dall'editor interattivo.</p>
              <button
                onClick={() => {
                  saveFontMappings(mappings);
                  setMessage({ type: "success", text: "✓ Mappature salvate in Piattaforma!" });
                  setTimeout(() => setMessage(null), 3000);
                }}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Salva Mappature in Piattaforma</span>
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-[10px] font-extrabold text-gray-600 uppercase tracking-wider">
                    <th className="py-2 px-3">Nome su Shopify</th>
                    <th className="py-2 px-3">Font Installato Server</th>
                    <th className="py-2 px-3 text-right">Azione</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs font-mono">
                  {mappings.map(m => (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="py-1.5 px-3 font-bold text-indigo-900">{m.shopifyName}</td>
                      <td className="py-1.5 px-3 text-gray-800">{m.targetFont}</td>
                      <td className="py-1.5 px-3 text-right">
                        <button
                          onClick={() => {
                            const updated = mappings.filter(item => item.id !== m.id);
                            setMappings(updated);
                            saveFontMappings(updated);
                          }}
                          className="p-1 text-gray-400 hover:text-rose-600 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
