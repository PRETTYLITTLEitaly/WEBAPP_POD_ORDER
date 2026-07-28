"use client";

import { useState, useEffect } from "react";
import { 
  X, 
  Pencil, 
  Type, 
  Palette, 
  Sliders, 
  Save, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  Check, 
  RefreshCw,
  Sparkles,
  Move,
  ZoomIn,
  ZoomOut
} from "lucide-react";

interface TextEditorModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  initialText?: string;
  initialFont?: string;
  initialColor?: string;
  initialFontSize?: number;
  initialLetterSpacing?: number;
  backgroundUrl?: string;
  svgUrl?: string;
  onSave?: (updatedData: {
    text: string;
    font: string;
    fontSize: number;
    color: string;
    letterSpacing: number;
    x: number;
    y: number;
  }) => void;
}

const DEFAULT_FONTS = [
  { name: "Outfit", family: "Outfit, sans-serif" },
  { name: "Dancing Script", family: "'Dancing Script', cursive" },
  { name: "Great Vibes", family: "'Great Vibes', cursive" },
  { name: "Montserrat", family: "Montserrat, sans-serif" },
  { name: "Playfair Display", family: "'Playfair Display', serif" },
  { name: "Roboto", family: "Roboto, sans-serif" },
  { name: "Pacifico", family: "Pacifico, cursive" },
  { name: "Satisfy", family: "Satisfy, cursive" }
];

const PRESET_COLORS = [
  "#000000", "#ffffff", "#dc2626", "#d97706", "#059669", "#2563eb", 
  "#7c3aed", "#db2777", "#475569", "#78350f", "#ca8a04", "#0284c7"
];

export default function TextEditorModal({
  open,
  onClose,
  title = "Editor Interattivo Testo & Grafica Stampa",
  initialText = "Testo Personalizzato",
  initialFont = "Outfit",
  initialColor = "#000000",
  initialFontSize = 32,
  initialLetterSpacing = 0,
  backgroundUrl = "",
  svgUrl = "",
  onSave
}: TextEditorModalProps) {
  const [text, setText] = useState(initialText);
  const [font, setFont] = useState(initialFont);
  const [color, setColor] = useState(initialColor);
  const [fontSize, setFontSize] = useState(initialFontSize);
  const [letterSpacing, setLetterSpacing] = useState(initialLetterSpacing);
  const [align, setAlign] = useState<"left" | "center" | "right">("center");
  const [posX, setPosX] = useState(50); // % position
  const [posY, setPosY] = useState(50); // % position
  const [isSaving, setIsSaving] = useState(false);
  const [availableFonts, setAvailableFonts] = useState(DEFAULT_FONTS);

  useEffect(() => {
    setText(initialText || "Testo Personalizzato");
    setFont(initialFont || "Outfit");
    setColor(initialColor || "#000000");
    setFontSize(initialFontSize || 32);
    setLetterSpacing(initialLetterSpacing || 0);
  }, [initialText, initialFont, initialColor, initialFontSize, initialLetterSpacing, open]);

  // Carica eventuali font custom caricati nell'app via /api/fonts
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
          setAvailableFonts([...customList, ...DEFAULT_FONTS]);
        }
      } catch (e) {
        console.error("Errore recupero font custom:", e);
      }
    };
    fetchFonts();
  }, [open]);

  if (!open) return null;

  const handleConfirmSave = () => {
    setIsSaving(true);
    if (onSave) {
      onSave({
        text,
        font,
        fontSize,
        color,
        letterSpacing,
        x: posX,
        y: posY
      });
    }
    setTimeout(() => {
      setIsSaving(false);
      onClose();
    }, 400);
  };

  return (
    <div 
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-100"
        onClick={e => e.stopPropagation()}
      >
        {/* INTESTAZIONE MODAL CON MATITA GIALLA/AMBRA */}
        <div className="p-4 bg-amber-500 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-600 rounded-xl text-white shadow-inner">
              <Pencil className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg tracking-tight">{title}</h3>
              <p className="text-xs text-amber-100 font-medium">
                Modifica parole, spazi, dimensione font e colori con anteprima in tempo reale.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-amber-600 rounded-full transition-all text-amber-100 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CORPO EDITOR: ANTEPRIMA VISUALE A SX, CONTROLLI A DX */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-gray-50">
          
          {/* CANVAS DI ANTEPRIMA GRAFICA IN TEMPO REALE (7 COLONNE) */}
          <div className="lg:col-span-7 flex flex-col items-center justify-between space-y-3">
            <div className="w-full bg-white p-3 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between text-xs font-bold text-gray-700">
              <span className="flex items-center gap-1.5 text-amber-700">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Anteprima Vettoriale Live
              </span>
              <span className="font-mono text-gray-400 text-[10px]">
                {fontSize}px | {color} | {font}
              </span>
            </div>

            {/* BOX ANTEPRIMA STAMPA CON CANVAS INTERATTIVO */}
            <div className="w-full h-[380px] bg-white rounded-2xl border-2 border-dashed border-amber-300 shadow-inner relative overflow-hidden flex items-center justify-center p-4 group">
              {/* IMMAGINE DI SFONDO / PRODOTTO SE PRESENTE */}
              {backgroundUrl ? (
                <img 
                  src={backgroundUrl} 
                  alt="Sfondo prodotto" 
                  className="absolute inset-0 w-full h-full object-contain p-2 opacity-40 select-none pointer-events-none"
                />
              ) : svgUrl ? (
                <img 
                  src={svgUrl} 
                  alt="SVG Grafica" 
                  className="absolute inset-0 w-full h-full object-contain p-2 opacity-40 select-none pointer-events-none"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-tr from-gray-50 to-amber-50/30 flex items-center justify-center text-gray-300 text-xs font-mono select-none">
                  [Area di Stampa DTF]
                </div>
              )}

              {/* TESTO RENDERTIZZATO LIVE */}
              <div 
                style={{
                  position: "absolute",
                  left: `${posX}%`,
                  top: `${posY}%`,
                  transform: "translate(-50%, -50%)",
                  fontFamily: availableFonts.find(f => f.name === font)?.family || font,
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
                {text || <span className="italic text-gray-300">[Inserisci Testo]</span>}
              </div>
            </div>

            {/* CONTROLLI DI POSIZIONAMENTO RAPIDO X/Y */}
            <div className="w-full bg-white p-3 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between gap-3 text-xs">
              <span className="font-bold text-gray-600 flex items-center gap-1">
                <Move className="w-3.5 h-3.5 text-amber-600" />
                Posizione Live:
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setPosX(50); setPosY(50); }}
                  className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold rounded-lg border border-amber-200 transition-all text-[11px]"
                >
                  Centra Tutto
                </button>
                <button
                  onClick={() => setPosY(prev => Math.max(10, prev - 5))}
                  className="px-2 py-1 bg-gray-100 hover:bg-gray-200 font-bold rounded-lg text-gray-700"
                  title="Sposta Su"
                >
                  ↑
                </button>
                <button
                  onClick={() => setPosY(prev => Math.min(90, prev + 5))}
                  className="px-2 py-1 bg-gray-100 hover:bg-gray-200 font-bold rounded-lg text-gray-700"
                  title="Sposta Giù"
                >
                  ↓
                </button>
                <button
                  onClick={() => setPosX(prev => Math.max(10, prev - 5))}
                  className="px-2 py-1 bg-gray-100 hover:bg-gray-200 font-bold rounded-lg text-gray-700"
                  title="Sposta Sinistra"
                >
                  ←
                </button>
                <button
                  onClick={() => setPosX(prev => Math.min(90, prev + 5))}
                  className="px-2 py-1 bg-gray-100 hover:bg-gray-200 font-bold rounded-lg text-gray-700"
                  title="Sposta Destra"
                >
                  →
                </button>
              </div>
            </div>

          </div>

          {/* PANNELLO CONTROLLI ED EDITOR (5 COLONNE) */}
          <div className="lg:col-span-5 space-y-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
            
            <div className="space-y-4">
              
              {/* 1. INPUT CAMPO TESTO (CAMBIA PAROLE O SPAZI) */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-gray-800 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Type className="w-4 h-4 text-amber-600" />
                    Testo Personalizzato
                  </span>
                  <span className="text-[10px] text-gray-400 font-normal">Modifica parole e spazi</span>
                </label>
                <textarea
                  rows={3}
                  value={text}
                  onChange={e => setText(e.target.value)}
                  placeholder="Scrivi qui il testo..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 bg-gray-50/50"
                />
              </div>

              {/* 2. SELETTORE FONT FAMILY */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-gray-800 flex items-center gap-1.5">
                  <Type className="w-4 h-4 text-amber-600" />
                  Tipo di Carattere (Font)
                </label>
                <select
                  value={font}
                  onChange={e => setFont(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                >
                  {availableFonts.map(f => (
                    <option key={f.name} value={f.name}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. DIMENSIONE FONT (SLIDER & INPUT NUMERICO) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-gray-800 flex items-center gap-1.5">
                    <ZoomIn className="w-4 h-4 text-amber-600" />
                    Grandezza Testo (Font Size)
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
                  Colore Testo
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  <input 
                    type="color"
                    value={color}
                    onChange={e => setColor(e.target.value)}
                    className="w-9 h-9 rounded-lg border border-gray-300 cursor-pointer p-0.5 bg-white shrink-0"
                    title="Scegli colore personalizzato"
                  />
                  <div className="flex items-center gap-1 flex-wrap">
                    {PRESET_COLORS.map(c => (
                      <button
                        key={c}
                        onClick={() => setColor(c)}
                        className={`w-6 h-6 rounded-full border transition-all ${
                          color === c ? "scale-125 border-amber-600 ring-2 ring-amber-400" : "border-gray-300 hover:scale-110"
                        }`}
                        style={{ backgroundColor: c }}
                        title={c}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* 5. SPAZIATURA LETTERE & ALLINEAMENTO */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-700">Spaziatura Lettere</label>
                  <input 
                    type="number"
                    min={-5}
                    max={20}
                    value={letterSpacing}
                    onChange={e => setLetterSpacing(parseInt(e.target.value, 10) || 0)}
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs font-mono font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-700">Allineamento</label>
                  <div className="flex items-center bg-gray-100 p-0.5 rounded-lg border border-gray-200">
                    <button
                      onClick={() => setAlign("left")}
                      className={`flex-1 py-1 flex items-center justify-center rounded ${align === "left" ? "bg-white text-amber-700 shadow-xs" : "text-gray-500"}`}
                    >
                      <AlignLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setAlign("center")}
                      className={`flex-1 py-1 flex items-center justify-center rounded ${align === "center" ? "bg-white text-amber-700 shadow-xs" : "text-gray-500"}`}
                    >
                      <AlignCenter className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setAlign("right")}
                      className={`flex-1 py-1 flex items-center justify-center rounded ${align === "right" ? "bg-white text-amber-700 shadow-xs" : "text-gray-500"}`}
                    >
                      <AlignRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

            </div>

            {/* BOTTONI DI SALVATAGGIO & ANNULLA */}
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
                <span>{isSaving ? "Aggiornamento..." : "Rigenera & Salva Grafica"}</span>
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
