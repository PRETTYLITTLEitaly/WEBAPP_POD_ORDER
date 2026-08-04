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
