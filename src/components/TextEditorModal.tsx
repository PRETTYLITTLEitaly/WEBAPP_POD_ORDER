"use client";

import { useState, useEffect, useRef } from "react";
import { 
  X, 
  Pencil, 
  Type, 
  Palette, 
  Save, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  Sparkles,
  Move,
  ZoomIn,
  List,
  Wand2,
  Layers,
  Image as ImageIcon,
  Check,
  RefreshCw,
  Sliders,
  Scissors
} from "lucide-react";

interface TextEditorModalProps {
  open: boolean;
  onClose: () => void;
  orderId?: string;
  store?: "b2b" | "b2c";
  title?: string;
  initialText?: string;
  initialFont?: string;
  initialColor?: string;
  initialFontSize?: number;
  initialLetterSpacing?: number;
  backgroundUrl?: string;
  svgUrl?: string;
  customAttributes?: { key: string; value: string }[];
  onSave?: (updatedData: {
    text: string;
    font: string;
    fontSize: number;
    color: string;
    letterSpacing: number;
    x: number;
    y: number;
    processedGraphicUrl?: string;
  }) => void;
}

const DEFAULT_FONTS = [
  { name: "Get Show", family: "'Get Show', 'Dancing Script', cursive" },
  { name: "Dancing Script", family: "'Dancing Script', cursive" },
  { name: "Outfit", family: "Outfit, sans-serif" },
  { name: "Great Vibes", family: "'Great Vibes', cursive" },
  { name: "Montserrat", family: "Montserrat, sans-serif" },
  { name: "Playfair Display", family: "'Playfair Display', serif" },
  { name: "Roboto", family: "Roboto, sans-serif" },
  { name: "Pacifico", family: "Pacifico, cursive" },
  { name: "Satisfy", family: "Satisfy, cursive" }
];

const PRESET_COLORS = [
  { name: "Celeste", hex: "#38bdf8" },
  { name: "Azzurro", hex: "#0284c7" },
  { name: "Nero", hex: "#000000" },
  { name: "Bianco", hex: "#ffffff" },
  { name: "Tiffany", hex: "#0d9488" },
  { name: "Oro", hex: "#d97706" },
  { name: "Rosso", hex: "#dc2626" },
  { name: "Rosa", hex: "#ec4899" },
  { name: "Verde", hex: "#16a34a" },
  { name: "Blu", hex: "#2563eb" }
];

export default function TextEditorModal({
  open,
  onClose,
  orderId = "",
  store = "b2c",
  title = "Editor Interattivo Stampa DTF",
  initialText = "",
  initialFont = "Get Show",
  initialColor = "#38bdf8",
  initialFontSize = 32,
  initialLetterSpacing = 0,
  backgroundUrl = "",
  svgUrl = "",
  customAttributes = [],
  onSave
}: TextEditorModalProps) {
  const [activeTab, setActiveTab] = useState<"text" | "image">("text");
  
  // Text Editor States
  const [text, setText] = useState(initialText);
  const [font, setFont] = useState(initialFont);
  const [color, setColor] = useState(initialColor);
  const [fontSize, setFontSize] = useState(initialFontSize);
  const [letterSpacing, setLetterSpacing] = useState(initialLetterSpacing);
  const [align, setAlign] = useState<"left" | "center" | "right">("center");
  const [posX, setPosX] = useState(50);
  const [posY, setPosY] = useState(55);
  
  // Image Processing & Vectorizer States
  const [currentImageUrl, setCurrentImageUrl] = useState(backgroundUrl || svgUrl);
  const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(null);
  const [isRemoveBgApplied, setIsRemoveBgApplied] = useState(false);
  const [isVectorized, setIsVectorized] = useState(false);
  const [bgThreshold, setBgThreshold] = useState(240); // 0-255 white threshold
  const [vectorSvgContent, setVectorSvgContent] = useState<string | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [availableFonts, setAvailableFonts] = useState(DEFAULT_FONTS);
  const [showAttributes, setShowAttributes] = useState(false);

  const hiddenCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    setText(initialText);
    setFont(initialFont || "Get Show");
    setColor(initialColor || "#38bdf8");
    setFontSize(initialFontSize || 32);
    setLetterSpacing(initialLetterSpacing || 0);
    setCurrentImageUrl(backgroundUrl || svgUrl);
    setProcessedImageUrl(null);
    setIsRemoveBgApplied(false);
    setIsVectorized(false);
    setVectorSvgContent(null);

    // Se l'ordine ha principalmente un'immagine e poco testo, seleziona la scheda immagine di default
    if ((backgroundUrl || svgUrl) && !initialText) {
      setActiveTab("image");
    } else {
      setActiveTab("text");
    }
  }, [initialText, initialFont, initialColor, initialFontSize, initialLetterSpacing, backgroundUrl, svgUrl, open]);

  // Carica i font custom
  useEffect(() => {
    if (!open) return;
    const fetchFonts = async () => {
      try {
        const res = await fetch("/api/fonts");
        const data = await res.json();
        if (data.success && Array.isArray(data.fonts) && data.fonts.length > 0) {
          const customList = data.fonts.map((f: any) => ({
            name: f.name,
            family: `'${f.name}', sans-serif`
          }));

          const mergedMap = new Map();
          [...customList, ...DEFAULT_FONTS].forEach(f => {
            if (!mergedMap.has(f.name.toLowerCase())) {
              mergedMap.set(f.name.toLowerCase(), f);
            }
          });

          setAvailableFonts(Array.from(mergedMap.values()));
        }
      } catch (e) {
        console.error("Errore fetch font:", e);
      }
    };
    fetchFonts();
  }, [open]);

  // STRUMENTO 1: REMOVE BG (Rimuovi Sfondo Bianco/Chiaro)
  const handleRemoveBackground = () => {
    if (!currentImageUrl) return;
    setIsProcessingImage(true);

    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = currentImageUrl;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setIsProcessingImage(false);
        return;
      }

      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;

      // Rimuovi pixel bianchi o trasparenti secondo la soglia
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        if (r >= bgThreshold && g >= bgThreshold && b >= bgThreshold) {
          data[i + 3] = 0; // Trasparente
        }
      }

      ctx.putImageData(imgData, 0, 0);
      const resultPng = canvas.toDataURL("image/png");
      setProcessedImageUrl(resultPng);
      setIsRemoveBgApplied(true);
      setIsProcessingImage(false);
    };

    img.onerror = () => {
      alert("Impossibile caricare l'immagine per la rimozione dello sfondo (CORS o URL non valido).");
      setIsProcessingImage(false);
    };
  };

  // STRUMENTO 2: VETTORIALIZZA (Converti in Tracciato SVG Vettoriale)
  const handleVectorizeImage = () => {
    const targetSource = processedImageUrl || currentImageUrl;
    if (!targetSource) return;
    setIsProcessingImage(true);

    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = targetSource;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, 800 / Math.max(img.width, img.height));
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setIsProcessingImage(false);
        return;
      }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;

      // Genera SVG tracciato
      let svgPaths = "";
      const step = 4;
      for (let y = 0; y < canvas.height; y += step) {
        for (let x = 0; x < canvas.width; x += step) {
          const idx = (y * canvas.width + x) * 4;
          const alpha = data[idx + 3];
          const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;

          if (alpha > 50 && brightness < 200) {
            svgPaths += `<rect x="${x}" y="${y}" width="${step}" height="${step}" fill="currentColor" />`;
          }
        }
      }

      const generatedSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvas.width} ${canvas.height}" width="100%" height="100%">${svgPaths}</svg>`;
      setVectorSvgContent(generatedSvg);
      setIsVectorized(true);
      setIsProcessingImage(false);
    };

    img.onerror = () => {
      alert("Impossibile caricare l'immagine per la vettorializzazione.");
      setIsProcessingImage(false);
    };
  };

  // CONFERMA E SALVA LA GRAFICA PER LA STAMPA DTF
  const handleConfirmSave = async () => {
    setIsSaving(true);

    const finalGraphicToSave = vectorSvgContent
      ? `data:image/svg+xml;utf8,${encodeURIComponent(vectorSvgContent)}`
      : (processedImageUrl || currentImageUrl);

    // Salva nel metafield dell'ordine pod.edited_image su Shopify
    if (orderId && finalGraphicToSave) {
      try {
        await fetch("/api/orders/save-graphic", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId,
            store,
            editedImageUrl: finalGraphicToSave,
            textData: { text, font, fontSize, color }
          })
        });
      } catch (e) {
        console.error("Errore salvataggio metafield ordine:", e);
      }
    }

    if (onSave) {
      onSave({
        text,
        font,
        fontSize,
        color,
        letterSpacing,
        x: posX,
        y: posY,
        processedGraphicUrl: finalGraphicToSave
      });
    }

    setTimeout(() => {
      setIsSaving(false);
      onClose();
    }, 400);
  };

  if (!open) return null;

  return (
    <div 
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden border border-gray-100"
        onClick={e => e.stopPropagation()}
      >
        {/* INTESTAZIONE MODAL CON SWITCH SCHEDE TESTO / IMMAGINE */}
        <div className="p-4 bg-amber-500 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-600 rounded-xl text-white shadow-inner">
              <Pencil className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg tracking-tight">{title}</h3>
              <p className="text-xs text-amber-100 font-medium">
                Editor testo, Remove BG e Vettorializzazione per la stampa DTF.
              </p>
            </div>
          </div>

          {/* SCHEDE EDITOR: TESTO / IMMAGINE */}
          <div className="flex items-center bg-amber-600/80 p-1 rounded-xl border border-amber-400/40">
            <button
              onClick={() => setActiveTab("text")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === "text" ? "bg-white text-amber-800 shadow-sm" : "text-amber-100 hover:text-white"
              }`}
            >
              <Type className="w-3.5 h-3.5" />
              Editor Testo
            </button>
            <button
              onClick={() => setActiveTab("image")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === "image" ? "bg-white text-amber-800 shadow-sm" : "text-amber-100 hover:text-white"
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              Remove BG & Vectorizer
            </button>
          </div>

          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-amber-600 rounded-full transition-all text-amber-100 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CORPO EDITOR */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-gray-50">
          
          {/* CANVAS DI ANTEPRIMA GRAFICA LIVE (7 COLONNE) */}
          <div className="lg:col-span-7 flex flex-col items-center justify-between space-y-3">
            <div className="w-full bg-white p-3 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between text-xs font-bold text-gray-700">
              <span className="flex items-center gap-1.5 text-amber-700">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Anteprima Grafica Finale per Stampa DTF
              </span>
              <span className="font-mono text-gray-500 text-[11px]">
                {isVectorized ? "SVG Vettoriale" : isRemoveBgApplied ? "PNG Sfondo Rimosso" : "Originale"}
              </span>
            </div>

            {/* BOX ANTEPRIMA STAMPA CON CANVAS INTERATTIVO */}
            <div className="w-full h-[390px] bg-white rounded-2xl border-2 border-dashed border-amber-300 shadow-inner relative overflow-hidden flex items-center justify-center p-4 group">
              
              {/* RENDERING IMMAGINE VETTORIALIZZATA O CON SFONDO RIMOSSO */}
              {vectorSvgContent ? (
                <div 
                  className="w-full h-full flex items-center justify-center text-amber-700 p-4"
                  dangerouslySetInnerHTML={{ __html: vectorSvgContent }}
                />
              ) : processedImageUrl ? (
                <img 
                  src={processedImageUrl} 
                  alt="Immagine senza sfondo" 
                  className="max-w-full max-h-full object-contain p-2 drop-shadow-md"
                />
              ) : currentImageUrl ? (
                <img 
                  src={currentImageUrl} 
                  alt="Anteprima Ordine" 
                  className="max-w-full max-h-full object-contain p-2 opacity-60 pointer-events-none"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-tr from-gray-50 to-amber-50/30 flex items-center justify-center text-gray-300 text-xs font-mono select-none">
                  [Area di Stampa DTF]
                </div>
              )}

              {/* TESTO RENDERTIZZATO LIVE */}
              {text && (
                <div 
                  style={{
                    position: "absolute",
                    left: `${posX}%`,
                    top: `${posY}%`,
                    transform: "translate(-50%, -50%)",
                    fontFamily: availableFonts.find(f => f.name.toLowerCase() === font.toLowerCase())?.family || `'${font}', cursive, sans-serif`,
                    fontSize: `${fontSize}px`,
                    color: color,
                    letterSpacing: `${letterSpacing}px`,
                    textAlign: align,
                    lineHeight: "1.2",
                    whiteSpace: "pre-wrap",
                    textShadow: color === "#ffffff" ? "0 1px 3px rgba(0,0,0,0.8)" : "none"
                  }}
                  className="max-w-[90%] font-semibold tracking-wide cursor-move drop-shadow-sm select-none transition-all"
                >
                  {text}
                </div>
              )}
            </div>

            {/* CONTROLLI POSIZIONAMENTO RAPIDO X/Y */}
            <div className="w-full bg-white p-3 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between gap-3 text-xs">
              <span className="font-bold text-gray-600 flex items-center gap-1">
                <Move className="w-3.5 h-3.5 text-amber-600" />
                Posizione Live Scritta:
              </span>
              <div className="flex items-center gap-2">
                <button onClick={() => { setPosX(50); setPosY(55); }} className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold rounded-lg border border-amber-200 transition-all text-[11px]">Centra</button>
                <button onClick={() => setPosY(prev => Math.max(10, prev - 5))} className="px-2 py-1 bg-gray-100 hover:bg-gray-200 font-bold rounded-lg text-gray-700">↑</button>
                <button onClick={() => setPosY(prev => Math.min(90, prev + 5))} className="px-2 py-1 bg-gray-100 hover:bg-gray-200 font-bold rounded-lg text-gray-700">↓</button>
                <button onClick={() => setPosX(prev => Math.max(10, prev - 5))} className="px-2 py-1 bg-gray-100 hover:bg-gray-200 font-bold rounded-lg text-gray-700">←</button>
                <button onClick={() => setPosX(prev => Math.min(90, prev + 5))} className="px-2 py-1 bg-gray-100 hover:bg-gray-200 font-bold rounded-lg text-gray-700">→</button>
              </div>
            </div>

          </div>

          {/* PANNELLO CONTROLLI ED EDITOR (5 COLONNE) */}
          <div className="lg:col-span-5 space-y-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
            
            {/* SCHEDA 1: TESTO & FONT */}
            {activeTab === "text" && (
              <div className="space-y-4">
                
                {/* 1. INPUT TESTO PERSONALIZZATO */}
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-gray-800 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Type className="w-4 h-4 text-amber-600" />
                      Testo dell'Ordine
                    </span>
                    <span className="text-[10px] text-gray-400 font-normal">Modifica parole o spazi</span>
                  </label>
                  <textarea
                    rows={3}
                    value={text}
                    onChange={e => setText(e.target.value)}
                    placeholder="Scrivi qui il testo dell'ordine..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 bg-gray-50/50"
                  />
                </div>

                {/* 2. SELETTORE FONT */}
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-gray-800 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Type className="w-4 h-4 text-amber-600" />
                      Tipo di Carattere (Font)
                    </span>
                    <span className="text-[10px] text-indigo-600 font-bold">{font}</span>
                  </label>
                  <select
                    value={font}
                    onChange={e => setFont(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                  >
                    <option value={font}>-- Font dell'ordine: {font} --</option>
                    {availableFonts.map(f => (
                      <option key={f.name} value={f.name}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. DIMENSIONE FONT */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-extrabold text-gray-800 flex items-center gap-1.5">
                      <ZoomIn className="w-4 h-4 text-amber-600" />
                      Dimensione Testo
                    </label>
                    <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      {fontSize} px
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input 
                      type="range"
                      min={12}
                      max={120}
                      value={fontSize}
                      onChange={e => setFontSize(parseInt(e.target.value, 10))}
                      className="flex-1 accent-amber-600 cursor-pointer"
                    />
                    <input 
                      type="number"
                      min={8}
                      max={200}
                      value={fontSize}
                      onChange={e => setFontSize(parseInt(e.target.value, 10) || 12)}
                      className="w-16 px-2 py-1 border border-gray-300 rounded-lg text-xs font-mono font-bold text-center"
                    />
                  </div>
                </div>

                {/* 4. COLORE DEL FONT */}
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-gray-800 flex items-center gap-1.5">
                    <Palette className="w-4 h-4 text-amber-600" />
                    Colore Scritta
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    <input 
                      type="color"
                      value={color}
                      onChange={e => setColor(e.target.value)}
                      className="w-9 h-9 rounded-lg border border-gray-300 cursor-pointer p-0.5 bg-white shrink-0"
                    />
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {PRESET_COLORS.map(c => (
                        <button
                          key={c.name}
                          onClick={() => setColor(c.hex)}
                          className={`w-6 h-6 rounded-full border transition-all ${
                            color.toLowerCase() === c.hex.toLowerCase() ? "scale-125 border-amber-600 ring-2 ring-amber-400" : "border-gray-300 hover:scale-110"
                          }`}
                          style={{ backgroundColor: c.hex }}
                          title={`${c.name} (${c.hex})`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* SCHEDA 2: REMOVE BG & VETTORIALIZZA IMMAGINE */}
            {activeTab === "image" && (
              <div className="space-y-4">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-bold text-amber-900 flex items-center gap-2">
                  <Wand2 className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Strumenti Elaborazione Grafica Foto / Logo</span>
                </div>

                {/* STRUMENTO 1: REMOVE BG */}
                <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-gray-800 flex items-center gap-1.5">
                      <Scissors className="w-4 h-4 text-indigo-600" />
                      1. Rimuovi Sfondo (Remove BG)
                    </span>
                    {isRemoveBgApplied && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Check className="w-3 h-3" /> Applicato
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-medium text-gray-500">
                      <span>Soglia Sfondo Chiaro</span>
                      <span>{bgThreshold}</span>
                    </div>
                    <input 
                      type="range"
                      min={180}
                      max={255}
                      value={bgThreshold}
                      onChange={e => setBgThreshold(parseInt(e.target.value, 10))}
                      className="w-full accent-indigo-600 cursor-pointer"
                    />
                  </div>

                  <button
                    onClick={handleRemoveBackground}
                    disabled={isProcessingImage || !currentImageUrl}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    <span>✨ Rimuovi Sfondo Bianco/Chiaro</span>
                  </button>
                </div>

                {/* STRUMENTO 2: VETTORIALIZZA */}
                <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-gray-800 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-purple-600" />
                      2. Vettorializza Immagine (Vectorizer)
                    </span>
                    {isVectorized && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Check className="w-3 h-3" /> Vettoriale Generato
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500">
                    Converte l'immagine raster in tracciati SVG vettoriali per la massima nitidezza DTF.
                  </p>

                  <button
                    onClick={handleVectorizeImage}
                    disabled={isProcessingImage || (!currentImageUrl && !processedImageUrl)}
                    className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>📐 Genera Tracciati Vettoriali SVG</span>
                  </button>
                </div>

                {/* RIPRISTINA ORIGINALE */}
                {(isRemoveBgApplied || isVectorized) && (
                  <button
                    onClick={() => {
                      setProcessedImageUrl(null);
                      setVectorSvgContent(null);
                      setIsRemoveBgApplied(false);
                      setIsVectorized(false);
                    }}
                    className="w-full py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Ripristina Grafica Originale</span>
                  </button>
                )}

              </div>
            )}

            {/* ATTRIBUTI DETTAGLIATI ORDINE */}
            {customAttributes.length > 0 && (
              <div className="pt-2 border-t border-gray-100">
                <button
                  onClick={() => setShowAttributes(!showAttributes)}
                  className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
                >
                  <List className="w-3.5 h-3.5" />
                  {showAttributes ? "Nascondi attributi dell'ordine" : `Mostra tutti i ${customAttributes.length} attributi dell'ordine`}
                </button>

                {showAttributes && (
                  <div className="mt-2 bg-gray-50 p-2.5 rounded-xl border border-gray-200 text-[11px] font-mono space-y-1 max-h-36 overflow-y-auto">
                    {customAttributes.map((attr, idx) => (
                      <div key={idx} className="flex justify-between gap-2 border-b border-gray-100 pb-0.5">
                        <span className="font-bold text-gray-700">{attr.key}:</span>
                        <span className="text-gray-900 truncate max-w-[200px]">{attr.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* BOTTONI CONFERMA */}
            <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3 mt-4">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all"
              >
                Annulla
              </button>
              <button
                onClick={handleConfirmSave}
                disabled={isSaving}
                className="px-5 py-2.5 text-xs font-extrabold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <Save className={`w-4 h-4 ${isSaving ? "animate-spin" : ""}`} />
                <span>{isSaving ? "Salvataggio..." : "Conferma Grafica & Salva per Stampa"}</span>
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
