"use client";

import { useState, useEffect } from "react";
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
  Scissors,
  Package,
  Sun,
  Moon,
  Pipette,
  Upload
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
  uploadedImageUrl?: string;
  svgUrl?: string;
  customAttributes?: { key: string; value: string }[];
  lineItems?: any[];
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
  uploadedImageUrl = "",
  svgUrl = "",
  customAttributes = [],
  lineItems = [],
  onSave
}: TextEditorModalProps) {
  const [activeTab, setActiveTab] = useState<"text" | "image">("text");
  const [selectedItemIdx, setSelectedItemIdx] = useState(0);

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
  const [currentImageUrl, setCurrentImageUrl] = useState(uploadedImageUrl || backgroundUrl || svgUrl);
  const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(null);
  const [isRemoveBgApplied, setIsRemoveBgApplied] = useState(false);
  const [isVectorized, setIsVectorized] = useState(false);
  const [bgThreshold, setBgThreshold] = useState(240);
  const [vectorSvgContent, setVectorSvgContent] = useState<string | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [availableFonts, setAvailableFonts] = useState(DEFAULT_FONTS);
  const [showAttributes, setShowAttributes] = useState(false);

  // Custom Visualization States
  const [canvasBgColor, setCanvasBgColor] = useState("#ffffff");
  const [isDropperActive, setIsDropperActive] = useState(false);

  useEffect(() => {
    setText(initialText);
    setFont(initialFont || "Get Show");
    setColor(initialColor || "#38bdf8");
    setFontSize(initialFontSize || 32);
    setLetterSpacing(initialLetterSpacing || 0);
    setCurrentImageUrl(uploadedImageUrl || backgroundUrl || svgUrl);
    setProcessedImageUrl(null);
    setIsRemoveBgApplied(false);
    setIsVectorized(false);
    setVectorSvgContent(null);
    setSelectedItemIdx(0);

    if ((uploadedImageUrl || backgroundUrl || svgUrl) && !initialText) {
      setActiveTab("image");
    } else {
      setActiveTab("text");
    }
  }, [initialText, initialFont, initialColor, initialFontSize, initialLetterSpacing, backgroundUrl, uploadedImageUrl, svgUrl, open]);

  // Gestisci cambio di articolo selezionato in ordini multi-prodotto
  const handleSelectLineItem = (idx: number) => {
    setSelectedItemIdx(idx);
    const targetItem = lineItems[idx];
    if (!targetItem) return;

    const attrs = targetItem.customAttributes || [];
    let foundText = "";
    let foundFont = "Get Show";
    let foundColor = "#38bdf8";
    let foundFontSize = 32;
    let foundImage = "";
    let foundUploadedImage = "";

    attrs.forEach((a: any) => {
      const rawKey = a.key || "";
      const k = rawKey.toLowerCase().trim();
      const v = String(a.value || "").trim();

      const isSystemKey = rawKey.startsWith("_") || k.includes("font") || k.includes("align") || k.includes("scegli") || k.includes("modello") || k.includes("stick") || k.includes("colore") || k.includes("vedi");

      if (!isSystemKey && !v.startsWith("http")) {
        const isSimpleOption = ["frase", "iniziale", "ammaccato", "liscio", "nero", "bianco", "azzurro"].includes(v.toLowerCase());
        if (v && (!isSimpleOption || !foundText)) {
          if (!foundText || v.length > foundText.length) foundText = v;
        }
      }
      if (k.includes("font") && !rawKey.startsWith("_")) foundFont = v;
      if (k.includes("font size") || k.includes("_font_size")) {
        const p = parseFloat(v);
        if (!isNaN(p) && p > 0) foundFontSize = Math.round(p);
      }
      if (k.includes("colore") || k.includes("color")) {
        if (v.startsWith("#")) foundColor = v;
        else if (v.toLowerCase().includes("celeste") || v.toLowerCase().includes("azzurro")) foundColor = "#38bdf8";
        else if (v.toLowerCase().includes("tiffany")) foundColor = "#0d9488";
      }
      if (v.startsWith("http")) {
        const isMock = k.includes("vedi") || k.includes("preview") || k.includes("_pplr");
        if (isMock) {
          foundImage = v;
        } else if (k.includes("immagine") || k.includes("foto") || k.includes("logo") || k.includes("file") || k.includes("carica")) {
          foundUploadedImage = v;
        } else {
          if (!foundImage) {
            foundImage = v;
          } else if (!foundUploadedImage) {
            foundUploadedImage = v;
          }
        }
      }
    });

    setText(foundText);
    setFont(foundFont);
    setColor(foundColor);
    setFontSize(foundFontSize);
    setCurrentImageUrl(foundUploadedImage || foundImage || backgroundUrl || svgUrl);
    setProcessedImageUrl(null);
    setVectorSvgContent(null);
  };

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
            family: `'${f.name}', sans-serif`,
            url: f.url,
            dataUri: f.dataUri
          }));

          setAvailableFonts(customList);
        }
      } catch (e) {
        console.error("Errore fetch font:", e);
      }
    };
    fetchFonts();
  }, [open]);

  // COLOR SAMPLER FROM ORIGINAL IMAGE (CONTAGOCCE)
  const sampleColorFromImage = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!isDropperActive) return;
    try {
      const img = e.currentTarget;
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Disegna l'immagine sul canvas
      ctx.drawImage(img, 0, 0);

      // Trova le coordinate del click rispetto alle dimensioni dell'immagine
      const rect = img.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * img.naturalWidth;
      const y = ((e.clientY - rect.top) / rect.height) * img.naturalHeight;

      // Preleva il colore del pixel
      const pixel = ctx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
      const hex = "#" + ("000000" + ((pixel[0] << 16) | (pixel[1] << 8) | pixel[2]).toString(16)).slice(-6);

      setCanvasBgColor(hex);
      setIsDropperActive(false);
    } catch (err) {
      console.error("Errore campionamento colore dal mockup:", err);
      setIsDropperActive(false);
    }
  };

  // SCARICA FILE ORIGINALE CARICATO DAL CLIENTE
  const downloadOriginalFile = async () => {
    if (!uploadedImageUrl) return;
    try {
      const res = await fetch(uploadedImageUrl);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ext = uploadedImageUrl.split("?")[0].split(".").pop() || "png";
      a.download = `ordine_${orderId || "unknown"}_originale.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      window.open(uploadedImageUrl, "_blank");
    }
  };

  // GESTISCI CARICAMENTO FILE ELABORATO ESTERNAMENTE (PNG, JPG, SVG)
  const handleUploadedWorkedFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    const isSvg = file.name.toLowerCase().endsWith(".svg");

    if (isSvg) {
      reader.onload = (event) => {
        const svgContent = event.target?.result as string;
        setVectorSvgContent(svgContent);
        setProcessedImageUrl(null);
        setIsVectorized(true);
        setIsRemoveBgApplied(false);
        setActiveTab("image");
      };
      reader.readAsText(file);
    } else {
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setProcessedImageUrl(dataUrl);
        setVectorSvgContent(null);
        setIsRemoveBgApplied(true);
        setIsVectorized(false);
        setActiveTab("image");
      };
      reader.readAsDataURL(file);
    }
  };

  // STRUMENTO 1: REMOVE BG
  const handleRemoveBackground = () => {
    if (!currentImageUrl) return;
    setIsProcessingImage(true);

    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = currentImageUrl;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setIsProcessingImage(false);
        return;
      }

      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        if (r >= bgThreshold && g >= bgThreshold && b >= bgThreshold) {
          data[i + 3] = 0;
        }
      }

      ctx.putImageData(imgData, 0, 0);
      const resultPng = canvas.toDataURL("image/png");
      setProcessedImageUrl(resultPng);
      setIsRemoveBgApplied(true);
      setIsProcessingImage(false);
    };

    img.onerror = () => {
      alert("Impossibile caricare l'immagine per la rimozione dello sfondo.");
      setIsProcessingImage(false);
    };
  };

  // STRUMENTO 2: VETTORIALIZZA HD MULTI-COLORE
  const handleVectorizeImage = () => {
    const targetSource = processedImageUrl || currentImageUrl;
    if (!targetSource) return;
    setIsProcessingImage(true);

    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = targetSource;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      canvas.width = w;
      canvas.height = h;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setIsProcessingImage(false);
        return;
      }

      ctx.drawImage(img, 0, 0);
      const imgData = ctx.getImageData(0, 0, w, h);
      const data = imgData.data;

      const colorLayers = new Map<string, string[]>();
      const step = w > 1200 || h > 1200 ? 2 : 1;

      for (let y = 0; y < h; y += step) {
        for (let x = 0; x < w; x += step) {
          const idx = (y * w + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const a = data[idx + 3];

          if (a > 30) {
            const qR = Math.round(r / 4) * 4;
            const qG = Math.round(g / 4) * 4;
            const qB = Math.round(b / 4) * 4;
            const hex = `#${((1 << 24) + (qR << 16) + (qG << 8) + qB).toString(16).slice(1)}`;

            if (!colorLayers.has(hex)) {
              colorLayers.set(hex, []);
            }
            colorLayers.get(hex)!.push(`M${x},${y}h${step}v${step}h-${step}z`);
          }
        }
      }

      let combinedPaths = "";
      colorLayers.forEach((pathList, hexColor) => {
        combinedPaths += `<path d="${pathList.join('')}" fill="${hexColor}" shape-rendering="crispEdges" />\n`;
      });

      const generatedSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="100%" height="100%">${combinedPaths}</svg>`;
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

  const fontStyles = availableFonts
    .filter((f: any) => f.url || f.dataUri)
    .map((f: any) => {
      const spacedName = f.name.replace(/([a-z])([A-Z])/g, '$1 $2');
      const fontSrc = f.dataUri || f.url;
      return `
        @font-face {
          font-family: '${f.name}';
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
    })
    .join("\n");

  return (
    <div 
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <style dangerouslySetInnerHTML={{ __html: fontStyles }} />
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
                Editor testo, Remove BG e Vettorializzazione HD per la stampa DTF.
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
              Remove BG & Vectorizer HD
            </button>
          </div>

          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-amber-600 rounded-full transition-all text-amber-100 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTROLLO MULTI-ARTICOLI (SE L'ORDINE CONTIENE PIÙ PRODOTTI) */}
        {lineItems.length > 1 && (
          <div className="bg-amber-50 px-6 py-2.5 border-b border-amber-200 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-extrabold text-amber-900">
              <Package className="w-4 h-4 text-amber-600" />
              <span>Ordine Multi-Articolo ({lineItems.length} prodotti differenti):</span>
            </div>
            <select
              value={selectedItemIdx}
              onChange={e => handleSelectLineItem(parseInt(e.target.value, 10))}
              className="px-3 py-1 bg-white border border-amber-300 rounded-lg text-xs font-bold text-gray-800 shadow-xs focus:ring-2 focus:ring-amber-500"
            >
              {lineItems.map((item, idx) => (
                <option key={idx} value={idx}>
                  Articolo #{idx + 1}: {item.title || "Articolo"} (Qtà: {item.quantity || 1})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* CORPO EDITOR SPLITATO: SX ANTEPRIMA BOTTIGLIA/PRODOTTO, DX PELLICOLA DTF E CONTROLLI */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-gray-50">
          
          {/* COLONNA SINISTRA: ANTEPRIMA PRODOTTO ORIGINALE MOCKUP (5 COLONNE) */}
          <div className="lg:col-span-5 flex flex-col space-y-3">
            <div className="w-full bg-white p-3 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between text-xs font-bold text-gray-700">
              <span className="flex items-center gap-1.5 text-indigo-700">
                <Package className="w-4 h-4 text-indigo-500" />
                1. Anteprima Prodotto Originale
              </span>
              <span className="text-[10px] text-gray-400 font-normal">Mockup di Riferimento</span>
            </div>

            {/* BOX ANTEPRIMA MOCKUP BOTTIGLIA */}
            <div 
              style={{ height: uploadedImageUrl ? "240px" : "380px" }}
              className="w-full bg-white rounded-2xl border border-gray-200 shadow-sm relative overflow-hidden flex flex-col items-center justify-center p-3 group"
            >
              <span className="absolute top-2 left-2 bg-indigo-100 text-indigo-800 text-[9px] font-extrabold px-1.5 py-0.5 rounded shadow-xs z-10">Mockup Prodotto</span>
              {(backgroundUrl || svgUrl) ? (
                <img 
                  src={backgroundUrl || svgUrl} 
                  alt="Anteprima Ordine" 
                  crossOrigin="anonymous"
                  onClick={sampleColorFromImage}
                  className={`max-w-full max-h-full object-contain p-2 select-none transition-all duration-200 ${
                    isDropperActive ? "cursor-crosshair border-4 border-indigo-500 rounded-2xl animate-pulse scale-102" : "pointer-events-auto"
                  }`}
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-tr from-gray-50 to-indigo-50/30 flex items-center justify-center text-gray-300 text-xs font-mono select-none">
                  [Nessun Mockup Prodotto Disponibile]
                </div>
              )}

              {/* TESTO SOPRA L'ANTEPRIMA DEL PRODOTTO (MOCKUP) */}
              {text && activeTab === "text" && (
                <div 
                  style={{
                    position: "absolute",
                    left: `${posX}%`,
                    top: `${posY}%`,
                    transform: "translate(-50%, -50%)",
                    fontFamily: availableFonts.find(f => f.name.toLowerCase() === font.toLowerCase())?.family || `'${font}', cursive, sans-serif`,
                    fontSize: `${fontSize * 0.75}px`, // Scaled down overlay
                    color: color,
                    letterSpacing: `${letterSpacing}px`,
                    textAlign: align,
                    lineHeight: "1.2",
                    whiteSpace: "pre-wrap",
                    textShadow: color === "#ffffff" ? "0 1px 3px rgba(0,0,0,0.8)" : "none"
                  }}
                  className="max-w-[85%] font-semibold tracking-wide select-none pointer-events-none transition-all"
                >
                  {text}
                </div>
              )}
            </div>

            {/* BOX ANTEPRIMA IMMAGINE ORIGINALE CARICATA (Riferimento) */}
            {uploadedImageUrl && (
              <div className="space-y-1.5 w-full">
                <div className="w-full h-[180px] bg-white rounded-2xl border border-gray-200 shadow-sm relative overflow-hidden flex flex-col items-center justify-center p-3 group bg-slate-50/50">
                  <span className="absolute top-2 left-2 bg-purple-100 text-purple-800 text-[9px] font-extrabold px-1.5 py-0.5 rounded shadow-xs z-10">Immagine Originale (Caricata)</span>
                  <img 
                    src={uploadedImageUrl} 
                    alt="Immagine Originale" 
                    crossOrigin="anonymous"
                    className="max-w-full max-h-full object-contain select-none"
                  />
                </div>
                
                {/* TOOLBAR SCARICA E CARICA SOTTO L'IMMAGINE */}
                <div className="flex items-center gap-2 w-full">
                  <button
                    type="button"
                    onClick={downloadOriginalFile}
                    className="flex-1 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-800 text-[10px] font-extrabold rounded-lg flex items-center justify-center gap-1 transition-all"
                    title="Scarica l'immagine originale in alta qualità"
                  >
                    <Upload className="w-3 h-3 rotate-180" />
                    Scarica Originale
                  </button>
                  
                  <label
                    className="flex-1 py-1.5 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-800 text-[10px] font-extrabold rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer text-center"
                    title="Carica un file elaborato esternamente (SVG o PNG)"
                  >
                    <Upload className="w-3 h-3" />
                    Carica Elaborato
                    <input 
                      type="file"
                      accept=".png,.jpg,.jpeg,.svg"
                      onChange={handleUploadedWorkedFile}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* GUIDA CAMPIONAMENTO COLORE */}
            {isDropperActive && (
              <div className="text-center text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 py-2 px-3 rounded-xl animate-pulse">
                🎯 Clicca sulla foto del prodotto sopra per catturare il suo colore!
              </div>
            )}
          </div>

          {/* COLONNA DESTRA: AREA PELLICOLA DTF + PANNELLO CONTROLLI (7 COLONNE) */}
          <div className="lg:col-span-7 flex flex-col space-y-4">
            
            {/* INTESTAZIONE CANALE PELLICOLA E TOOLBAR SFONDO */}
            <div className="w-full bg-white p-3 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between text-xs font-bold text-gray-700">
              <span className="flex items-center gap-1.5 text-amber-700">
                <Sparkles className="w-4 h-4 text-amber-500" />
                2. Pellicola di Stampa DTF (Sfondo Trasparente)
              </span>
              
              {/* TOOLBAR CONTROLLO SFONDO ANTEPRIMA */}
              <div className="flex items-center gap-1.5 bg-gray-100 p-0.5 rounded-lg border border-gray-200">
                <button
                  type="button"
                  onClick={() => { setCanvasBgColor("#ffffff"); setIsDropperActive(false); }}
                  className={`p-1 rounded-md transition-all ${
                    canvasBgColor === "#ffffff" && !isDropperActive ? "bg-white text-amber-600 shadow-xs" : "text-gray-400 hover:text-gray-600"
                  }`}
                  title="Sfondo Bianco (Sole)"
                >
                  <Sun className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => { setCanvasBgColor("#111827"); setIsDropperActive(false); }}
                  className={`p-1 rounded-md transition-all ${
                    canvasBgColor === "#111827" && !isDropperActive ? "bg-white text-amber-600 shadow-xs" : "text-gray-400 hover:text-gray-600"
                  }`}
                  title="Sfondo Nero (Luna)"
                >
                  <Moon className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsDropperActive(!isDropperActive)}
                  className={`p-1 py-0.5 rounded-md transition-all flex items-center gap-1 ${
                    isDropperActive ? "bg-indigo-600 text-white shadow-xs" : "text-gray-400 hover:text-gray-600"
                  }`}
                  title="Campionatore Colore (Contagocce)"
                >
                  <Pipette className="w-3.5 h-3.5" />
                  <span className="text-[9px] font-bold">Campiona</span>
                </button>
                {canvasBgColor !== "#ffffff" && canvasBgColor !== "#111827" && (
                  <span 
                    className="text-[9px] font-mono px-1.5 py-0.5 bg-white rounded border border-gray-300 ml-1 text-gray-700 font-bold"
                    style={{ borderLeftColor: canvasBgColor, borderLeftWidth: 4 }}
                  >
                    {canvasBgColor.toUpperCase()}
                  </span>
                )}
              </div>
            </div>

            {/* CANVAS INTERATTIVO PELLICOLA DTF */}
            <div 
              style={{ backgroundColor: canvasBgColor }}
              className="w-full h-[240px] rounded-2xl border-2 border-dashed border-amber-300 shadow-inner relative overflow-hidden flex items-center justify-center p-4 group transition-colors duration-300"
            >
              {/* RENDERING IMMAGINE VETTORIALIZZATA O CON SFONDO RIMOSSO */}
              {activeTab === "image" ? (
                vectorSvgContent ? (
                  <div 
                    className="w-full h-full flex items-center justify-center text-amber-700 p-2 overflow-hidden"
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
                  <div className="absolute inset-0 bg-transparent flex items-center justify-center text-gray-300 text-xs font-mono select-none">
                    [Area di Stampa Grafica]
                  </div>
                )
              ) : (
                /* SE ABBIAMO ATTIVO IL TESTO, MOSTRIAMO SOLO IL TESTO CENTRATO NELLA PELLICOLA */
                text ? (
                  <div 
                    style={{
                      fontFamily: availableFonts.find(f => f.name.toLowerCase() === font.toLowerCase())?.family || `'${font}', cursive, sans-serif`,
                      fontSize: `${fontSize * 0.9}px`,
                      color: color,
                      letterSpacing: `${letterSpacing}px`,
                      textAlign: "center",
                      lineHeight: "1.2",
                      whiteSpace: "pre-wrap",
                    }}
                    className="font-semibold tracking-wide select-none max-w-[90%] text-center"
                  >
                    {text}
                  </div>
                ) : (
                  <div className="absolute inset-0 bg-transparent flex items-center justify-center text-gray-300 text-xs font-mono select-none">
                    [Area di Stampa Testo]
                  </div>
                )
              )}
            </div>

            {/* CONTROLLI DI POSIZIONAMENTO RAPIDO (SOLO SE TESTO ATTIVO E DISPONIBILE) */}
            {activeTab === "text" && text && (
              <div className="w-full bg-white p-3 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between gap-3 text-xs">
                <span className="font-bold text-gray-600 flex items-center gap-1">
                  <Move className="w-3.5 h-3.5 text-amber-600" />
                  Spostamento Scritta su Mockup (Sinistra):
                </span>
                <div className="flex items-center gap-2">
                  <button onClick={() => { setPosX(50); setPosY(55); }} className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold rounded-lg border border-amber-200 transition-all text-[11px]">Centra</button>
                  <button onClick={() => setPosY(prev => Math.max(10, prev - 5))} className="px-2 py-1 bg-gray-100 hover:bg-gray-200 font-bold rounded-lg text-gray-700">↑</button>
                  <button onClick={() => setPosY(prev => Math.min(90, prev + 5))} className="px-2 py-1 bg-gray-100 hover:bg-gray-200 font-bold rounded-lg text-gray-700">↓</button>
                  <button onClick={() => setPosX(prev => Math.max(10, prev - 5))} className="px-2 py-1 bg-gray-100 hover:bg-gray-200 font-bold rounded-lg text-gray-700">←</button>
                  <button onClick={() => setPosX(prev => Math.min(90, prev + 5))} className="px-2 py-1 bg-gray-100 hover:bg-gray-200 font-bold rounded-lg text-gray-700">→</button>
                </div>
              </div>
            )}

            {/* PANNELLO CONTROLLI ED EDITOR (LARGHEZZA INTERA DESTRA) */}
            <div className="w-full space-y-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
            
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

            {/* SCHEDA 2: REMOVE BG & VETTORIALIZZA IMMAGINE HD */}
            {activeTab === "image" && (
              <div className="space-y-4">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-bold text-amber-900 flex items-center gap-2">
                  <Wand2 className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Strumenti Elaborazione Grafica Foto / Logo (HD)</span>
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

                {/* STRUMENTO 2: VETTORIALIZZA HD MULTI-COLORE */}
                <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-gray-800 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-purple-600" />
                      2. Vettorializza HD Multi-Colore (Vectorizer)
                    </span>
                    {isVectorized && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Check className="w-3 h-3" /> SVG HD Generato
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500">
                    Genera tracciati SVG vettoriali ad alta definizione mantenendo tutti i colori originali invariati.
                  </p>

                  <button
                    onClick={handleVectorizeImage}
                    disabled={isProcessingImage || (!currentImageUrl && !processedImageUrl)}
                    className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>📐 Vettorializza in Alta Definizione (HD)</span>
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
    </div>
  );
}
