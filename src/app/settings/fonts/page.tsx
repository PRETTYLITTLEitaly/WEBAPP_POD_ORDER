"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useRef } from "react";
import { Type, Upload, Trash2, CheckCircle2, AlertCircle, RefreshCw, Sliders } from "lucide-react";

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
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [previewText, setPreviewText] = useState("Giulia & Riccardo 26.09.2026");
  const [fontSize, setFontSize] = useState(28);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Type className="w-6 h-6 text-indigo-600" />
            Libreria Font Personalizzati
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Carica i file di font (.TTF o .OTF) per la generazione automatica dei testi stampati.
          </p>
        </div>

        <button
          onClick={fetchFonts}
          className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
          title="Aggiorna Elenco Font"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
        </button>
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
        className="bg-white border-2 border-dashed border-indigo-200 hover:border-indigo-500 rounded-2xl p-8 text-center cursor-pointer transition-all hover:bg-indigo-50/30 group shadow-sm"
      >
        <input 
          type="file" 
          ref={fileInputRef}
          accept=".ttf,.otf,font/ttf,font/otf"
          multiple
          onChange={e => handleFileUpload(e.target.files)}
          className="hidden"
        />

        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
          <Upload className="w-6 h-6" />
        </div>

        <h3 className="text-base font-bold text-gray-900 mb-1">
          {uploading ? "Caricamento font in corso..." : "Carica nuovi Font (.TTF / .OTF)"}
        </h3>
        <p className="text-xs text-gray-500 max-w-md mx-auto">
          Trascina qui i tuoi file di tipo <strong className="text-gray-700 font-semibold">.ttf</strong> o <strong className="text-gray-700 font-semibold">.otf</strong> oppure fai click per selezionarli dal tuo computer.
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
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">Font Installati ({fonts.length})</h2>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-400 text-sm animate-pulse">
            Caricamento libreria font...
          </div>
        ) : fonts.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500 text-sm">
            Nessun font installato. Carica il tuo primo file .TTF o .OTF in alto!
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {fonts.map(font => (
              <div 
                key={font.id}
                className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:border-gray-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Meta Info */}
                <div className="space-y-1 shrink-0 md:w-56">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gray-900 text-base">{font.name}</h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-800">
                      {font.format}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 font-mono truncate">{font.filename}</div>
                  <div className="text-[11px] text-gray-500 font-medium">Dimensione: {formatFileSize(font.sizeBytes)}</div>
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
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
