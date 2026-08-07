"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useRef } from "react";
import { Type, Upload, Trash2, CheckCircle2, AlertCircle, RefreshCw, Sliders, Save, Search, FileSpreadsheet, ChevronDown, ChevronUp, X, Sparkles, HelpCircle } from "lucide-react";
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

interface CsvPreviewMatch {
  fontId: string;
  fontName: string;
  filename: string;
  proposedShopifyName: string;
  originalCsvShopifyName: string;
  originalCsvTargetFont: string;
  similarityScore: number;
}

// Algoritmo di Normalizzazione e Similitudine Stringhe Font (Fuzzy Match per punteggiatura, punti, virgole, trattini)
function cleanFontString(str: string): string {
  return (str || "").toLowerCase()
    .replace(/\.(ttf|otf|woff|woff2)$/i, "")
    .replace(/[^a-z0-9]/g, "");
}

function calculateSimilarity(s1: string, s2: string): number {
  const norm1 = cleanFontString(s1);
  const norm2 = cleanFontString(s2);

  if (!norm1 || !norm2) return 0;
  if (norm1 === norm2) return 1.0;
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    const minLen = Math.min(norm1.length, norm2.length);
    const maxLen = Math.max(norm1.length, norm2.length);
    return 0.8 + (minLen / maxLen) * 0.18;
  }

  const m = norm1.length;
  const n = norm2.length;
  const d: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) d[i][0] = i;
  for (let j = 0; j <= n; j++) d[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = norm1[i - 1] === norm2[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + cost
      );
    }
  }

  const dist = d[m][n];
  const maxLen = Math.max(m, n);
  return Math.max(0, (maxLen - dist) / maxLen);
}

export default function FontLibraryPage() {
  const [fonts, setFonts] = useState<FontItem[]>([]);
  const [mappings, setMappings] = useState<FontMapping[]>([]);
  const [editedAliases, setEditedAliases] = useState<Record<string, string>>({});
  const [fontSearchQuery, setFontSearchQuery] = useState("");
  const [aliasFilter, setAliasFilter] = useState<"all" | "with_alias" | "without_alias">("all");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isSavingMappings, setIsSavingMappings] = useState(false);
  const [previewText, setPreviewText] = useState("Giulia & Riccardo 26.09.2026");
  const [fontSize, setFontSize] = useState(28);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showAdvancedCsv, setShowAdvancedCsv] = useState(false);

  // Popup Modal CSV State
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvMatches, setCsvMatches] = useState<CsvPreviewMatch[]>([]);

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

  const handleSaveAllMappingsToPlatform = async (currentMappings = mappings) => {
    setIsSavingMappings(true);
    setMessage(null);

    try {
      saveFontMappings(currentMappings);
      setMessage({ type: "success", text: "✓ TUTTI I SETTAGGI E MAPPATURE FONT SALVATI CON SUCCESSO IN PIATTAFORMA!" });
      setTimeout(() => setMessage(null), 4500);
    } catch (e: any) {
      setMessage({ type: "error", text: "Errore durante il salvataggio dei settaggi font: " + e.message });
    } finally {
      setIsSavingMappings(false);
    }
  };

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

  // CARICAMENTO CSV CON CALCOLO SIMILITUDINE & APERTURA POPUP DI VERIFICA
  const handleCsvUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
      const csvRows: { shopifyName: string; targetFontRaw: string }[] = [];

      lines.forEach((line, idx) => {
        if (idx === 0 && (line.toLowerCase().includes("shopify") || line.toLowerCase().includes("file") || line.toLowerCase().includes("nome"))) {
          return;
        }

        const parts = line.split(/[,;\t]/).map(p => p.trim().replace(/^["']|["']$/g, ""));
        if (parts.length >= 2) {
          const shopifyName = parts[0];
          let targetFontRaw = parts[1].replace(/\.(ttf|otf|woff|woff2)$/i, "").trim();
          if (shopifyName && targetFontRaw) {
            csvRows.push({ shopifyName, targetFontRaw });
          }
        }
      });

      // Costruisce la lista abbinata per ogni font installato con la migliore similitudine nel CSV
      const previewMatches: CsvPreviewMatch[] = fonts.map(font => {
        const existingAlias = getFontShopifyAlias(font);

        // Trova la riga CSV più simile a questo font
        let bestCsvRow: { shopifyName: string; targetFontRaw: string } | null = null;
        let maxSim = 0;

        csvRows.forEach(row => {
          const simTarget = calculateSimilarity(font.name, row.targetFontRaw);
          const simFile = calculateSimilarity(font.filename, row.targetFontRaw);
          const simShopify = calculateSimilarity(font.name, row.shopifyName);
          const currentSim = Math.max(simTarget, simFile, simShopify);

          if (currentSim > maxSim) {
            maxSim = currentSim;
            bestCsvRow = row;
          }
        });

        const proposedName = maxSim >= 0.35 && bestCsvRow ? (bestCsvRow as any).shopifyName : existingAlias;

        return {
          fontId: font.id,
          fontName: font.name,
          filename: font.filename,
          proposedShopifyName: proposedName || "",
          originalCsvShopifyName: bestCsvRow ? (bestCsvRow as any).shopifyName : "-",
          originalCsvTargetFont: bestCsvRow ? (bestCsvRow as any).targetFontRaw : "-",
          similarityScore: maxSim
        };
      });

      setCsvMatches(previewMatches);
      setShowCsvModal(true);
      if (csvInputRef.current) csvInputRef.current.value = "";
    };
    reader.readAsText(file);
  };

  // CONFERMA ED APPLICAZIONE DEFINITIVA DELLE MAPPATURE DAL POPUP CSV
  const handleApplyCsvMatches = () => {
    const updated = [...mappings];

    csvMatches.forEach(item => {
      if (!item.proposedShopifyName.trim()) return;

      const normF = item.fontName.toLowerCase().replace(/[^a-z0-9]/g, "");
      const normFile = item.filename.toLowerCase().replace(/\.(ttf|otf|woff|woff2)$/i, "").replace(/[^a-z0-9]/g, "");

      const existingIdx = updated.findIndex(m => {
        const normTarget = m.targetFont.toLowerCase().replace(/\.(ttf|otf|woff|woff2)$/i, "").replace(/[^a-z0-9]/g, "");
        return normTarget === normF || normTarget === normFile || (normTarget.length >= 4 && (normF.startsWith(normTarget) || normFile.startsWith(normTarget)));
      });

      if (existingIdx !== -1) {
        updated[existingIdx] = { ...updated[existingIdx], shopifyName: item.proposedShopifyName.trim() };
      } else {
        updated.push({
          id: Date.now().toString() + "_" + Math.random().toString(36).substr(2, 4),
          shopifyName: item.proposedShopifyName.trim(),
          targetFont: item.fontName
        });
      }
    });

    setMappings(updated);
    setShowCsvModal(false);
    handleSaveAllMappingsToPlatform(updated);
  };

  const handleSaveFontCardAlias = (fontName: string, filename: string, newShopifyName: string) => {
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
    handleSaveAllMappingsToPlatform(updated);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFontShopifyAlias = (font: FontItem) => {
    if (editedAliases[font.id] !== undefined) return editedAliases[font.id];

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
    <div className="p-8 space-y-6 max-w-5xl pb-24">
      
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

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => handleSaveAllMappingsToPlatform()}
            disabled={isSavingMappings}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
            title="Salva permanentemente in piattaforma Shopify tutti i settaggi dei font"
          >
            <Save className="w-4 h-4" />
            <span>{isSavingMappings ? "Salvataggio..." : "💾 SALVA SETTAGGI FONT IN PIATTAFORMA"}</span>
          </button>

          <input 
            type="file"
            ref={csvInputRef}
            accept=".csv,.txt"
            onChange={e => e.target.files?.[0] && handleCsvUpload(e.target.files[0])}
            className="hidden"
          />
          <button
            onClick={() => csvInputRef.current?.click()}
            className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2"
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
        <div className={`p-4 rounded-xl border flex items-center gap-3 text-sm font-bold ${
          message.type === "success" 
            ? "bg-emerald-50 border-emerald-300 text-emerald-900 shadow-sm" 
            : "bg-red-50 border-red-200 text-red-800"
        }`}>
          {message.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
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
                  {/* Edizione Nome Shopify Diretta sul Cartellino Font con Tasto Salva */}
                  <div className="space-y-2 shrink-0 md:w-80">
                    <div>
                      <label className="block text-[11px] font-extrabold text-gray-500 uppercase tracking-wider mb-1">
                        Nome Font su Shopify (Alias):
                      </label>
                      <div className="flex items-center gap-2">
                        <input 
                          type="text"
                          value={currentAlias}
                          placeholder='Es: "Save", "Get Show"'
                          onChange={e => {
                            setEditedAliases(prev => ({ ...prev, [font.id]: e.target.value }));
                          }}
                          onKeyDown={e => {
                            if (e.key === "Enter") {
                              handleSaveFontCardAlias(font.name, font.filename, currentAlias);
                            }
                          }}
                          className="w-full px-3 py-1.5 border border-indigo-200 focus:border-indigo-600 rounded-lg text-xs font-extrabold text-indigo-950 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-indigo-50/30"
                        />

                        <button
                          onClick={() => handleSaveFontCardAlias(font.name, font.filename, currentAlias)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-lg shadow-xs transition-all flex items-center gap-1 shrink-0"
                          title="Salva questo nome font in piattaforma"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>Salva</span>
                        </button>
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
                onClick={() => handleSaveAllMappingsToPlatform()}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
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

      {/* POPUP MODAL PER VERIFICA CONFRONTO ED ABBINAMENTO CSV (CON FUZZY SIMILARITY SCORE) */}
      {showCsvModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full border border-gray-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            
            {/* Header Modal */}
            <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
              <div className="space-y-1">
                <h2 className="text-lg font-extrabold flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-400" />
                  Verifica ed Abbinamento Intelligente Font da CSV
                </h2>
                <p className="text-xs text-indigo-200">
                  Abbiamo confrontato i font installati con il CSV calcolando le similitudini (anche per punteggiatura o estensioni diverse).
                </p>
              </div>

              <button
                onClick={() => setShowCsvModal(false)}
                className="p-2 text-indigo-200 hover:text-white hover:bg-white/10 rounded-xl transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content Table */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-2xl text-xs text-indigo-950 flex items-start gap-2.5">
                <HelpCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold">Come funziona:</strong> Controlla nella tabella sottostante ogni nostro font installato affiancato al nome Shopify ricavato dal CSV. Se necessario puoi modificare il testo della colonna centralizzata prima di confermare.
                </div>
              </div>

              <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-100 border-b border-gray-200 text-[11px] font-extrabold text-gray-700 uppercase tracking-wider">
                      <th className="py-3 px-4">Font Installato nel Programma</th>
                      <th className="py-3 px-4">Nome Shopify da Assegnare</th>
                      <th className="py-3 px-4">Riga CSV Trovata & Grado Similitudine</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs">
                    {csvMatches.map((item, idx) => {
                      const simPct = Math.round(item.similarityScore * 100);
                      return (
                        <tr key={item.fontId} className="hover:bg-gray-50/80 transition-colors">
                          
                          {/* Colonna 1: Nostro Font Installato */}
                          <td className="py-3 px-4 space-y-0.5">
                            <div className="font-extrabold text-gray-900 text-sm">{item.fontName}</div>
                            <div className="text-[11px] font-mono text-gray-500">File: {item.filename}</div>
                          </td>

                          {/* Colonna 2: Nome Shopify Proposto ed Editabile */}
                          <td className="py-3 px-4">
                            <input 
                              type="text"
                              value={item.proposedShopifyName}
                              onChange={e => {
                                const val = e.target.value;
                                setCsvMatches(prev => prev.map((m, i) => i === idx ? { ...m, proposedShopifyName: val } : m));
                              }}
                              placeholder='Nessun abbinamento'
                              className="w-full px-3 py-2 border border-indigo-200 focus:border-indigo-600 rounded-xl text-xs font-extrabold text-indigo-950 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-indigo-50/40"
                            />
                          </td>

                          {/* Colonna 3: Riga CSV Originale & Badge Similitudine */}
                          <td className="py-3 px-4 space-y-1">
                            <div className="font-bold text-gray-800 flex items-center gap-1.5">
                              <span>CSV: "{item.originalCsvShopifyName}"</span>
                              <span className="text-gray-400">→</span>
                              <span className="font-mono text-gray-600 text-[11px]">{item.originalCsvTargetFont}</span>
                            </div>

                            <div>
                              {simPct >= 90 ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1">
                                  ✓ Corrispondenza Perfetta ({simPct}%)
                                </span>
                              ) : simPct >= 50 ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 inline-flex items-center gap-1">
                                  ⚡ Simile per Punteggiatura/Nomi ({simPct}%)
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500 border border-gray-200">
                                  Nessuna corrispondenza esatta
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer Modal */}
            <div className="p-6 bg-gray-50 border-t border-gray-200 flex items-center justify-between flex-wrap gap-3">
              <button
                onClick={() => setShowCsvModal(false)}
                className="px-5 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-800 font-extrabold text-xs rounded-xl transition-all"
              >
                Annulla
              </button>

              <button
                onClick={handleApplyCsvMatches}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>💾 CONFERMA ED APPLICA MAPPATURE DAL CSV IN PIATTAFORMA</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
