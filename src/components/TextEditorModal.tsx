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
  List
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
  customAttributes?: { key: string; value: string }[];
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
  title = "Editor Interattivo Testo & Grafica Stampa",
  initialText = "Giulia & Riccardo 26.09.2026",
  initialFont = "Get Show",
  initialColor = "#38bdf8",
  initialFontSize = 32,
  initialLetterSpacing = 0,
  backgroundUrl = "",
  svgUrl = "",
  customAttributes = [],
  onSave
}: TextEditorModalProps) {
  const [text, setText] = useState(initialText);
  const [font, setFont] = useState(initialFont);
  const [color, setColor] = useState(initialColor);
  const [fontSize, setFontSize] = useState(initialFontSize);
  const [letterSpacing, setLetterSpacing] = useState(initialLetterSpacing);
  const [align, setAlign] = useState<"left" | "center" | "right">("center");
  const [posX, setPosX] = useState(50);
  const [posY, setPosY] = useState(55);
  const [isSaving, setIsSaving] = useState(false);
  const [availableFonts, setAvailableFonts] = useState(DEFAULT_FONTS);
  const [showAttributes, setShowAttributes] = useState(false);

  useEffect(() => {
    setText(initialText || "Giulia & Riccardo 26.09.2026");
    setFont(initialFont || "Get Show");
    setColor(initialColor || "#38bdf8");
    setFontSize(initialFontSize || 32);
    setLetterSpacing(initialLetterSpacing || 0);
  }, [initialText, initialFont, initialColor, initialFontSize, initialLetterSpacing, open]);

  // Carica i font installati o disponibili via /api/fonts
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
        {/* INTESTAZIONE MODAL CON MATITA GIALLA */}
        <div className="p-4 bg-amber-500 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-600 rounded-xl text-white shadow-inner">
              <Pencil className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg tracking-tight">{title}</h3>
              <p className="text-xs text-amber-100 font-medium">
                Parametri Product Personalizer rilevati: Font, Testo, Colore, Spazi e Dimensione.
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

        {/* CORPO EDITOR */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-gray-50">
          
          {/* CANVAS DI ANTEPRIMA GRAFICA (7 COLONNE) */}
          <div className="lg:col-span-7 flex flex-col items-center justify-between space-y-3">
            <div className="w-full bg-white p-3 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between text-xs font-bold text-gray-700">
              <span className="flex items-center gap-1.5 text-amber-700">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Anteprima Vettoriale Live
              </span>
              <span className="font-mono text-gray-500 text-[11px]">
                Font: <strong>{font}</strong> | {fontSize}px | {color}
              </span>
            </div>

            {/* BOX ANTEPRIMA STAMPA CON SFONDO DALL'ORDINE E SCRITTA RENDERIZZATA */}
            <div className="w-full h-[390px] bg-white rounded-2xl border-2 border-dashed border-amber-300 shadow-inner relative overflow-hidden flex items-center justify-center p-4 group">
              {backgroundUrl ? (
                <img 
                  src={backgroundUrl} 
                  alt="Anteprima Ordine Personalizzato" 
                  className="absolute inset-0 w-full h-full object-contain p-2 opacity-50 select-none pointer-events-none"
                />
              ) : svgUrl ? (
                <img 
                  src={svgUrl} 
                  alt="SVG Grafica" 
                  className="absolute inset-0 w-full h-full object-contain p-2 opacity-40 select-none pointer-events-none"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-tr from-gray-50 to-amber-50/30 flex items-center justify-center text-gray-300 text-xs font-mono select-none">
                  [Area di Stampa DTF Product Personalizer]
                </div>
              )}

              {/* TESTO RENDERTIZZATO LIVE */}
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
                {text || <span className="italic text-gray-300">[Inserisci Testo]</span>}
              </div>
            </div>

            {/* CONTROLLI POSIZIONAMENTO RAPIDO X/Y */}
            <div className="w-full bg-white p-3 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between gap-3 text-xs">
              <span className="font-bold text-gray-600 flex items-center gap-1">
                <Move className="w-3.5 h-3.5 text-amber-600" />
                Posizione Live:
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setPosX(50); setPosY(55); }}
                  className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold rounded-lg border border-amber-200 transition-all text-[11px]"
                >
                  Centra Tutto
                </button>
                <button onClick={() => setPosY(prev => Math.max(10, prev - 5))} className="px-2 py-1 bg-gray-100 hover:bg-gray-200 font-bold rounded-lg text-gray-700">↑</button>
                <button onClick={() => setPosY(prev => Math.min(90, prev + 5))} className="px-2 py-1 bg-gray-100 hover:bg-gray-200 font-bold rounded-lg text-gray-700">↓</button>
                <button onClick={() => setPosX(prev => Math.max(10, prev - 5))} className="px-2 py-1 bg-gray-100 hover:bg-gray-200 font-bold rounded-lg text-gray-700">←</button>
                <button onClick={() => setPosX(prev => Math.min(90, prev + 5))} className="px-2 py-1 bg-gray-100 hover:bg-gray-200 font-bold rounded-lg text-gray-700">→</button>
              </div>
            </div>

          </div>

          {/* PANNELLO CONTROLLI ED EDITOR (5 COLONNE) */}
          <div className="lg:col-span-5 space-y-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
            
            <div className="space-y-4">
              
              {/* 1. INPUT TESTO PERSONALIZZATO */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-gray-800 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Type className="w-4 h-4 text-amber-600" />
                    Testo dell'Ordine (Il Tuo Testo)
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

              {/* 2. SELETTORE FONT (SCEGLI IL FONT) */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-gray-800 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Type className="w-4 h-4 text-amber-600" />
                    Font Rilevato Dall'Ordine
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

              {/* 3. DIMENSIONE FONT (_FONT SIZE IL TUO TESTO) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-gray-800 flex items-center gap-1.5">
                    <ZoomIn className="w-4 h-4 text-amber-600" />
                    Dimensione Testo (_font size)
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

              {/* 4. COLORE DEL FONT (SCEGLI IL COLORE) */}
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
                    title="Seleziona colore personalizzato"
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

              {/* 5. ATTRIBUTI DETTAGLIATI PRODOTTO PERSONALIZER */}
              {customAttributes.length > 0 && (
                <div className="pt-2 border-t border-gray-100">
                  <button
                    onClick={() => setShowAttributes(!showAttributes)}
                    className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
                  >
                    <List className="w-3.5 h-3.5" />
                    {showAttributes ? "Nascondi tutti gli attributi dell'ordine" : `Mostra tutti i ${customAttributes.length} attributi dell'ordine`}
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

            </div>

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
                <span>{isSaving ? "Aggiornamento..." : "Rigenera & Salva Grafica"}</span>
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
