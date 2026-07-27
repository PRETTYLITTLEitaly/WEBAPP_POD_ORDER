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

const PRESETS_KEY = "app_print_presets_list";

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
