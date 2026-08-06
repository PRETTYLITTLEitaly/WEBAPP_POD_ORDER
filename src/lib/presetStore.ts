export interface PrintPreset {
  id: string;
  name: string;
  rollWidthMm: number;
  marginTopMm: number;
  marginBottomMm: number;
  marginSidesMm: number;
  labelGapMm: number;
  isDefault?: boolean;
}

export interface ProductGraphicPreset {
  id: string;
  name: string;
  supportW: number;
  supportH: number;
  maxGraphicW: number;
  maxGraphicH: number;
}

export const DEFAULT_PRESETS: PrintPreset[] = [
  {
    id: "preset-300-default",
    name: "Bobina 300mm Standard",
    rollWidthMm: 300,
    marginTopMm: 5,
    marginBottomMm: 5,
    marginSidesMm: 3,
    labelGapMm: 5,
    isDefault: true
  },
  {
    id: "preset-600-wide",
    name: "Bobina 600mm Margine Ampio",
    rollWidthMm: 600,
    marginTopMm: 10,
    marginBottomMm: 10,
    marginSidesMm: 10,
    labelGapMm: 5,
    isDefault: false
  }
];

export const DEFAULT_PRODUCT_GRAPHIC_PRESETS: ProductGraphicPreset[] = [
  { id: "profumatore", name: "PROFUMATORE", supportW: 110, supportH: 130, maxGraphicW: 80, maxGraphicH: 100 },
  { id: "mini-profumatore", name: "MINI PROFUMATORE", supportW: 75, supportH: 80, maxGraphicW: 55, maxGraphicH: 65 },
  { id: "candela-450", name: "CANDELA 450", supportW: 110, supportH: 80, maxGraphicW: 85, maxGraphicH: 60 },
  { id: "candela-250", name: "CANDELA 250", supportW: 75, supportH: 80, maxGraphicW: 55, maxGraphicH: 60 },
  { id: "lampada", name: "LAMPADA", supportW: 155, supportH: 150, maxGraphicW: 120, maxGraphicH: 120 },
  { id: "vaso", name: "VASO", supportW: 180, supportH: 240, maxGraphicW: 140, maxGraphicH: 180 }
];

const PRESETS_KEY = "app_print_presets_list";
const PRODUCT_GRAPHIC_PRESETS_KEY = "app_product_graphic_presets";

export function getPresets(): PrintPreset[] {
  if (typeof window === "undefined") return DEFAULT_PRESETS;
  const saved = localStorage.getItem(PRESETS_KEY);
  if (!saved) {
    localStorage.setItem(PRESETS_KEY, JSON.stringify(DEFAULT_PRESETS));
    return DEFAULT_PRESETS;
  }
  try {
    const list: PrintPreset[] = JSON.parse(saved);
    if (!list || !list.length) {
      localStorage.setItem(PRESETS_KEY, JSON.stringify(DEFAULT_PRESETS));
      return DEFAULT_PRESETS;
    }
    return list;
  } catch (e) {
    console.error(e);
    return DEFAULT_PRESETS;
  }
}

export function savePresets(presets: PrintPreset[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
}

export function getDefaultPreset(): PrintPreset {
  const list = getPresets();
  return list.find(p => p.isDefault) || list[0] || DEFAULT_PRESETS[0];
}

export function getProductGraphicPresets(): ProductGraphicPreset[] {
  if (typeof window === "undefined") return DEFAULT_PRODUCT_GRAPHIC_PRESETS;
  const saved = localStorage.getItem(PRODUCT_GRAPHIC_PRESETS_KEY);
  if (!saved) {
    localStorage.setItem(PRODUCT_GRAPHIC_PRESETS_KEY, JSON.stringify(DEFAULT_PRODUCT_GRAPHIC_PRESETS));
    return DEFAULT_PRODUCT_GRAPHIC_PRESETS;
  }
  try {
    const list: ProductGraphicPreset[] = JSON.parse(saved);
    if (!list || !list.length) return DEFAULT_PRODUCT_GRAPHIC_PRESETS;
    return list;
  } catch (e) {
    return DEFAULT_PRODUCT_GRAPHIC_PRESETS;
  }
}

export function saveProductGraphicPresets(presets: ProductGraphicPreset[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PRODUCT_GRAPHIC_PRESETS_KEY, JSON.stringify(presets));
}

export interface ColorPreset {
  id: string;
  name: string;
  hex: string;
}

export const DEFAULT_COLOR_PRESETS: ColorPreset[] = [
  { id: "nero", name: "Nero", hex: "#000000" },
  { id: "bianco", name: "Bianco", hex: "#ffffff" },
  { id: "arancio", name: "Arancio", hex: "#ff6b00" },
  { id: "arancio-chiaro", name: "Arancio Chiaro", hex: "#ff9900" },
  { id: "blu", name: "Blu", hex: "#3162d4" },
  { id: "blu-scuro", name: "Blu Scuro", hex: "#000e9b" },
  { id: "melenzana", name: "Melenzana", hex: "#910be3" },
  { id: "viola", name: "Viola", hex: "#6f00fc" },
  { id: "lilla", name: "Lilla", hex: "#d48cff" },
  { id: "rosso", name: "Rosso", hex: "#c92222" },
  { id: "verde-scuro", name: "Verde Scuro", hex: "#1c9100" },
  { id: "verde", name: "Verde", hex: "#4ad331" },
  { id: "verde-erba", name: "Verde Erba", hex: "#8bde70" },
  { id: "magenta", name: "Magenta", hex: "#f50081" },
  { id: "rosa", name: "Rosa", hex: "#f5b5f2" },
  { id: "verde-acqua", name: "Verde Acqua", hex: "#33e8b4" },
  { id: "celeste", name: "Celeste", hex: "#73ebf5" },
  { id: "giallo", name: "Giallo", hex: "#fff500" },
  { id: "giallo-stone", name: "Giallo Stone", hex: "#fcff5c" },
  { id: "marrone", name: "Marrone", hex: "#633b00" },
  { id: "beige", name: "Beige", hex: "#f7e0b5" },
  { id: "rosa-fluo", name: "Rosa Fluo", hex: "#ff30c5" },
  { id: "verde-fluo", name: "Verde Fluo", hex: "#00ff58" }
];

const COLOR_PRESETS_KEY = "app_color_presets_list";

export function getColorPresets(): ColorPreset[] {
  if (typeof window === "undefined") return DEFAULT_COLOR_PRESETS;
  const saved = localStorage.getItem(COLOR_PRESETS_KEY);
  if (!saved) {
    localStorage.setItem(COLOR_PRESETS_KEY, JSON.stringify(DEFAULT_COLOR_PRESETS));
    return DEFAULT_COLOR_PRESETS;
  }
  try {
    const list: ColorPreset[] = JSON.parse(saved);
    if (!list || !list.length) return DEFAULT_COLOR_PRESETS;
    return list;
  } catch (e) {
    return DEFAULT_COLOR_PRESETS;
  }
}

export function saveColorPresets(presets: ColorPreset[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(COLOR_PRESETS_KEY, JSON.stringify(presets));
}

// Risolve automaticamente un nome colore da Shopify (es. "Rosso", "Verde Scuro", "Celeste") al rispettivo codice HEX
export function resolveColorHex(inputColorNameOrHex: string): string {
  if (!inputColorNameOrHex) return "#000000";

  const trimmed = inputColorNameOrHex.trim();

  // Se è già un codice HEX valido (es: #c92222 o c92222)
  if (trimmed.startsWith("#")) {
    return trimmed;
  }
  if (/^[0-9A-Fa-f]{6}$/.test(trimmed)) {
    return `#${trimmed}`;
  }

  // Cerca la corrispondenza con la lista colori configurata (nome exact o normalized)
  const presets = getColorPresets();
  const normInput = trimmed.toLowerCase().replace(/[^a-z0-9]/g, "");

  const match = presets.find(p => {
    const normP = p.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    return normP === normInput || normP.includes(normInput) || normInput.includes(normP);
  });

  if (match) {
    return match.hex;
  }

  // Fallback se non trovato
  return "#000000";
}

// Estrattore di precisione per il Font e il Colore del Testo dagli attributi dell'ordine
export function extractTextFontAndColorFromAttrs(attrs: any[]) {
  if (!attrs || !Array.isArray(attrs)) return { font: null, color: null, colorName: null };

  let foundFont: string | null = null;
  let foundColorName: string | null = null;

  // 1. Cerca il colore specifico del testo: "Scegli il colore", "Colore testo", "Colore scritta", "Colore font"
  const specificColorAttr = attrs.find((a: any) => {
    const k = (a.key || "").toLowerCase();
    return (k.includes("scegli") && k.includes("color")) || 
           k.includes("colore testo") || 
           k.includes("colore scritta") || 
           k.includes("colore font") ||
           k.includes("colore_testo") ||
           k.includes("colore_scritta");
  });

  if (specificColorAttr && specificColorAttr.value) {
    foundColorName = String(specificColorAttr.value).trim();
  }

  // 2. Cerca l'attributo Font: prioritariamente "Scegli il font", "Scegli font", "Tipo di carattere"
  const specificFontAttr = attrs.find((a: any) => {
    const k = (a.key || "").toLowerCase().trim();
    return (k.includes("scegli") && k.includes("font")) || 
           k === "scegli il font" || 
           k.includes("tipo di carattere") || 
           k.includes("font testo") ||
           k.includes("font_testo");
  }) || attrs.find((a: any) => {
    const k = (a.key || "").toLowerCase().trim();
    return k.includes("font") && !k.includes("colore") && !k.includes("color") && !k.includes("size") && !a.key.startsWith("_");
  });

  if (specificFontAttr && specificFontAttr.value) {
    foundFont = String(specificFontAttr.value).trim();
  }

  // 3. Fallback se ancora non trovato: cerca chiavi che contengono "colore" ma escludi il semplice "Colore:" di prodotto se c'è un'altra opzione
  if (!foundColorName) {
    const fallbackColorAttr = attrs.find((a: any) => {
      const k = (a.key || "").toLowerCase().trim();
      return (k.includes("colore") || k.includes("color")) && k !== "colore";
    }) || attrs.find((a: any) => {
      const k = (a.key || "").toLowerCase().trim();
      return k.includes("colore") || k.includes("color");
    });

    if (fallbackColorAttr && fallbackColorAttr.value) {
      foundColorName = String(fallbackColorAttr.value).trim();
    }
  }

  const resolvedFont = foundFont ? resolveFontName(foundFont) : null;

  return {
    font: resolvedFont,
    rawFont: foundFont,
    colorName: foundColorName,
    color: foundColorName ? resolveColorHex(foundColorName) : null
  };
}

// ----------------------------------------------------
// SYSTEM DELEGA / MAPPATURA FONT (Shopify → Server DTF)
// ----------------------------------------------------

export interface FontMapping {
  id: string;
  shopifyName: string; // Es. "Save", "Get Show", "Cursive"
  targetFont: string;  // Es. "Outfit", "Helvetica", "Dancing Script"
}

export const FONT_MAPPINGS_KEY = "pod_font_mappings_v1";

export const DEFAULT_FONT_MAPPINGS: FontMapping[] = [
  { id: "1", shopifyName: "Save", targetFont: "Outfit" },
  { id: "2", shopifyName: "Get Show", targetFont: "Outfit" },
  { id: "3", shopifyName: "Cursive", targetFont: "Dancing Script" },
  { id: "4", shopifyName: "Handwriting", targetFont: "Dancing Script" }
];

export function getFontMappings(): FontMapping[] {
  if (typeof window === "undefined") return DEFAULT_FONT_MAPPINGS;
  try {
    const raw = localStorage.getItem(FONT_MAPPINGS_KEY);
    if (!raw) return DEFAULT_FONT_MAPPINGS;
    const list = JSON.parse(raw);
    if (!list || !list.length) return DEFAULT_FONT_MAPPINGS;
    return list;
  } catch (e) {
    return DEFAULT_FONT_MAPPINGS;
  }
}

export async function syncFontMappingsFromServer(): Promise<FontMapping[]> {
  if (typeof window === "undefined") return DEFAULT_FONT_MAPPINGS;
  try {
    const res = await fetch("/api/fonts/mappings");
    const data = await res.json();
    if (data.success && Array.isArray(data.mappings) && data.mappings.length > 0) {
      localStorage.setItem(FONT_MAPPINGS_KEY, JSON.stringify(data.mappings));
      return data.mappings;
    }
  } catch (e) {}
  return getFontMappings();
}

export function saveFontMappings(mappings: FontMapping[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(FONT_MAPPINGS_KEY, JSON.stringify(mappings));
  try {
    fetch("/api/fonts/mappings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mappings })
    });
  } catch (e) {}
}

// Risolve automaticamente un nome font da Shopify (es. "Save") al font reale installato sul server DTF (es. "Outfit")
export function resolveFontName(inputShopifyFont: string): string {
  if (!inputShopifyFont) return "Outfit";
  const trimmed = inputShopifyFont.trim();
  const mappings = getFontMappings();
  const normInput = trimmed.toLowerCase().replace(/[^a-z0-9]/g, "");

  const match = mappings.find(m => {
    const normM = m.shopifyName.toLowerCase().replace(/[^a-z0-9]/g, "");
    return normM === normInput || normM.includes(normInput) || normInput.includes(normM);
  });

  if (match) {
    return match.targetFont;
  }

  return trimmed;
}


