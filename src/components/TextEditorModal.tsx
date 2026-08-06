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
  Scissors,
  Package,
  Sun,
  Moon,
  Pipette,
  Upload,
  AlertCircle
} from "lucide-react";
import { getProductGraphicPresets, ProductGraphicPreset, getColorPresets, resolveColorHex, extractTextFontAndColorFromAttrs } from "@/lib/presetStore";

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
    width?: number;
    height?: number;
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

const fitGraphicInProductMaxDimensions = (graphicAspect: number, maxW: number, maxH: number) => {
  if (!graphicAspect || graphicAspect <= 0) {
    return { w: maxW, h: maxH };
  }

  const maxAspect = maxW / maxH;
  let targetW: number;
  let targetH: number;

  if (graphicAspect >= maxAspect) {
    // Grafica larga ma bassa -> rispetta la larghezza massima maxW
    targetW = maxW;
    targetH = Math.round((maxW / graphicAspect) * 10) / 10;
  } else {
    // Grafica alta ma stretta -> rispetta l'altezza massima maxH
    targetH = maxH;
    targetW = Math.round((maxH * graphicAspect) * 10) / 10;
  }

  return {
    w: Math.max(1, targetW),
    h: Math.max(1, targetH)
  };
};

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
  const [savedItemIndices, setSavedItemIndices] = useState<number[]>([]);

  // Text Editor States
  const [text, setText] = useState(initialText);
  const [font, setFont] = useState(initialFont);
  const [color, setColor] = useState(initialColor);
  const [fontSize, setFontSize] = useState(initialFontSize);
  const [letterSpacing, setLetterSpacing] = useState(initialLetterSpacing);
  const [lineHeight, setLineHeight] = useState(1.25);
  const [strokeWidth, setStrokeWidth] = useState(0);
  const [align, setAlign] = useState<"left" | "center" | "right">("center");
  const [posX, setPosX] = useState(50);
  const [posY, setPosY] = useState(55);

  // Product & Size states
  const [selectedProductIdx, setSelectedProductIdx] = useState(0);
  const [graphicWidth, setGraphicWidth] = useState(80);
  const [graphicHeight, setGraphicHeight] = useState(100);
  const [aspectRatio, setAspectRatio] = useState(0.8);
  const [textBBox, setTextBBox] = useState({ x: 900, y: 980, w: 200, h: 40 });
  const isUpdatingFromMmInput = useRef(false);

  const [productPresets, setProductPresets] = useState<ProductGraphicPreset[]>([]);

  useEffect(() => {
    if (open) {
      setProductPresets(getProductGraphicPresets());
    }
  }, [open]);

  const selectProductPreset = (idx: number) => {
    setSelectedProductIdx(idx);
    const presetsList = productPresets.length > 0 ? productPresets : getProductGraphicPresets();
    const preset = presetsList[idx] || presetsList[0];
    if (preset) {
      const fitted = fitGraphicInProductMaxDimensions(aspectRatio, preset.maxGraphicW, preset.maxGraphicH);
      setGraphicWidth(fitted.w);
      setGraphicHeight(fitted.h);
    }
  };

  const detectPresetIndex = () => {
    for (const item of lineItems || []) {
      const t = (item.title || "").toLowerCase();
      if (t.includes("mini") && t.includes("profumatore")) return 1;
      if (t.includes("profumatore")) return 0;
      if (t.includes("candela") && t.includes("450")) return 2;
      if (t.includes("candela") && t.includes("250")) return 3;
      if (t.includes("lampada")) return 4;
      if (t.includes("vaso")) return 5;
    }
    return 0;
  };
  
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

  // Per-item state map to preserve user edits across item switches in multi-item orders
  const [itemsState, setItemsState] = useState<Record<number, {
    text: string;
    font: string;
    color: string;
    fontSize: number;
    letterSpacing: number;
    lineHeight: number;
    strokeWidth: number;
    graphicWidth: number;
    graphicHeight: number;
    processedImageUrl: string | null;
    isRemoveBgApplied: boolean;
    isVectorized: boolean;
    vectorSvgContent: string | null;
    currentImageUrl: string;
    activeTab: "text" | "image";
  }>>({});
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  useEffect(() => {
    setText(initialText);
    setFont(initialFont || "Get Show");
    setColor(resolveColorHex(initialColor || "#000000"));
    setFontSize(initialFontSize || 32);
    setLetterSpacing(initialLetterSpacing || 0);
    
    let savedLH = 1.25;
    let savedSW = 0;
    const lhAttr = customAttributes?.find(a => a.key === "_pod_line_height" || a.key === "Interlinea")?.value;
    const swAttr = customAttributes?.find(a => a.key === "_pod_stroke_width" || a.key === "Spessore")?.value;
    if (lhAttr && parseFloat(lhAttr)) savedLH = parseFloat(lhAttr);
    if (swAttr && parseFloat(swAttr)) savedSW = parseFloat(swAttr);

    setLineHeight(savedLH);
    setStrokeWidth(savedSW);

    setCurrentImageUrl(uploadedImageUrl || backgroundUrl || svgUrl);
    setProcessedImageUrl(null);
    setIsRemoveBgApplied(false);
    setIsVectorized(false);
    setVectorSvgContent(null);
    setSelectedItemIdx(0);

    const presetIdx = detectPresetIndex();
    setSelectedProductIdx(presetIdx);

    // Get width and height from order metafields or attributes if possible
    let savedW = 80;
    let savedH = 100;
    const wAttr = customAttributes?.find(a => a.key === "_pod_width" || a.key === "Larghezza")?.value;
    const hAttr = customAttributes?.find(a => a.key === "_pod_height" || a.key === "Altezza")?.value;
    if (wAttr && parseFloat(wAttr)) savedW = parseFloat(wAttr);
    if (hAttr && parseFloat(hAttr)) savedH = parseFloat(hAttr);

    setGraphicWidth(savedW);
    setGraphicHeight(savedH);
    setAspectRatio(savedW / savedH);

    let loadedState: Record<number, any> = {};
    let loadedSavedIndices: number[] = [];

    if (orderId && typeof window !== "undefined") {
      const storageKey = `pod_saved_order_editor_${orderId}`;
      const cached = localStorage.getItem(storageKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed.itemsState) loadedState = parsed.itemsState;
          if (parsed.savedItemIndices) loadedSavedIndices = parsed.savedItemIndices;
        } catch (e) {
          console.error("Errore caricamento stato editor locale:", e);
        }
      }
    }

    setItemsState(loadedState);
    setSavedItemIndices(loadedSavedIndices);
    setSaveNotice(null);

    if (loadedState[0]) {
      const s = loadedState[0];
      setText(s.text);
      setFont(s.font);
      setColor(s.color);
      setFontSize(s.fontSize);
      setLetterSpacing(s.letterSpacing);
      setLineHeight(s.lineHeight);
      setStrokeWidth(s.strokeWidth);
      setGraphicWidth(s.graphicWidth);
      setGraphicHeight(s.graphicHeight);
      setProcessedImageUrl(s.processedImageUrl);
      setIsRemoveBgApplied(s.isRemoveBgApplied);
      setIsVectorized(s.isVectorized);
      setVectorSvgContent(s.vectorSvgContent);
      setCurrentImageUrl(s.currentImageUrl);
      setActiveTab(s.activeTab);
    } else if (lineItems && lineItems.length > 0 && lineItems[0]) {
      const item = lineItems[0];
      setText(item.initialText !== undefined ? item.initialText : initialText);
      setFont(item.initialFont || initialFont || "Get Show");
      setColor(resolveColorHex(item.initialColor || initialColor || "#000000"));
      setFontSize(item.initialFontSize || initialFontSize || 32);
      const imgUrl = item.uploadedImageUrl || item.backgroundUrl || item.svgUrl || item.displayImage;
      setCurrentImageUrl(imgUrl || "");
    } else {
      if ((uploadedImageUrl || backgroundUrl || svgUrl) && !initialText) {
        setActiveTab("image");
      } else {
        setActiveTab("text");
      }
    }
  }, [open, initialText, initialFont, initialColor, initialFontSize, initialLetterSpacing, backgroundUrl, uploadedImageUrl, svgUrl, customAttributes, lineItems, orderId]);

  const handleSelectLineItem = (idx: number) => {
    if (idx === selectedItemIdx) return;

    // Preserva lo stato modificato dell'articolo corrente nel dizionario prima dello switch
    setItemsState(prev => ({
      ...prev,
      [selectedItemIdx]: {
        text,
        font,
        color,
        fontSize,
        letterSpacing,
        lineHeight,
        strokeWidth,
        graphicWidth,
        graphicHeight,
        processedImageUrl,
        isRemoveBgApplied,
        isVectorized,
        vectorSvgContent,
        currentImageUrl,
        activeTab
      }
    }));

    setSelectedItemIdx(idx);
    const item = lineItems[idx];
    if (!item) return;

    // Se l'articolo ha già modifiche salvate localmente, ricarica esattamente quelle
    if (itemsState[idx]) {
      const s = itemsState[idx];
      setText(s.text);
      setFont(s.font);
      setColor(s.color);
      setFontSize(s.fontSize);
      setLetterSpacing(s.letterSpacing);
      setLineHeight(s.lineHeight);
      setStrokeWidth(s.strokeWidth);
      setGraphicWidth(s.graphicWidth);
      setGraphicHeight(s.graphicHeight);
      setProcessedImageUrl(s.processedImageUrl);
      setIsRemoveBgApplied(s.isRemoveBgApplied);
      setIsVectorized(s.isVectorized);
      setVectorSvgContent(s.vectorSvgContent);
      setCurrentImageUrl(s.currentImageUrl);
      setActiveTab(s.activeTab);
    } else {
      setText(item.initialText !== undefined ? item.initialText : "");
      setFont(item.initialFont || "Get Show");
      setColor(resolveColorHex(item.initialColor || "#000000"));
      setFontSize(item.initialFontSize || 32);

      const imgUrl = item.uploadedImageUrl || item.backgroundUrl || item.svgUrl || item.displayImage;
      setCurrentImageUrl(imgUrl || "");
      setProcessedImageUrl(null);
      setIsRemoveBgApplied(false);
      setIsVectorized(false);
      setVectorSvgContent(null);
    }
  };

  // Helper to generate a tight fitting SVG for text to keep the bounds accurate
  const generateTightSvgFromText = (txt: string, fontName: string, fontColor: string, size: number, spacing: number, lHeight: number, sWidth: number): string => {
    const lines = txt.split("\n");
    const hexColor = fontColor.startsWith("#") ? fontColor : "#000000";

    let textElements = "";
    lines.forEach((line, idx) => {
      textElements += `\n    <tspan x="1000" dy="${idx === 0 ? "0" : `${lHeight}em`}" text-anchor="middle">${escapeXml(line)}</tspan>`;
    });

    const resolvedFontFamily = availableFonts.find(f => {
      const normF = f.name.toLowerCase().replace(/[^a-z0-9]/g, "");
      const normSelected = fontName.toLowerCase().replace(/[^a-z0-9]/g, "");
      return normF.includes(normSelected) || normSelected.includes(normF);
    })?.family || `'${fontName}', sans-serif`;

    const strokeAttributes = sWidth > 0 ? `stroke="${hexColor}" stroke-width="${sWidth}" stroke-linejoin="round"` : "";

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${textBBox.x} ${textBBox.y} ${textBBox.w} ${textBBox.h}" width="100%" height="100%">
      <rect x="${textBBox.x}" y="${textBBox.y}" width="${textBBox.w}" height="${textBBox.h}" fill="none" />
      <text x="1000" y="1000" font-family="${resolvedFontFamily}" font-size="${size}px" fill="${hexColor}" font-weight="600" letter-spacing="${spacing}" ${strokeAttributes}>${textElements}</text>
    </svg>`;
  };

  const escapeXml = (unsafe: string): string => {
    return (unsafe || "").replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
        default: return c;
      }
    });
  };

  // Helper to calculate exact text dimensions in mm based on font size
  const getTextDimensionsMm = (txt: string, size: number, spacing: number) => {
    const scaleFactor = 0.32; // 1px = 0.32mm scale factor
    const h = textBBox.h * scaleFactor;
    const w = textBBox.w * scaleFactor;
    return {
      w: Math.max(5, Math.round(w * 10) / 10),
      h: Math.max(5, Math.round(h * 10) / 10)
    };
  };

  // 1. Monitor text tab aspect ratio and dynamic mm sizing changes using exact SVG bbox measurement
  useEffect(() => {
    if (activeTab === "text" && text) {
      const measureText = () => {
        const textNode = document.getElementById("text-measurer-node") as SVGTextElement | null;
        if (textNode) {
          const bbox = textNode.getBBox();
          if (bbox && bbox.width > 0 && bbox.height > 0) {
            // Apply slight horizontal padding to text to prevent edge clipping (e.g. +4px)
            const paddedBBox = {
              x: bbox.x - 2,
              y: bbox.y - 1,
              w: bbox.width + 4,
              h: bbox.height + 2
            };
            setTextBBox(paddedBBox);

            const textAspect = paddedBBox.w / paddedBBox.h;
            setAspectRatio(textAspect);

            // Auto-dimensioning dinamico: adatta esattamente le dimensioni max memorizzate nelle impostazioni
            const presetsList = productPresets.length > 0 ? productPresets : getProductGraphicPresets();
            const currentPreset = presetsList[selectedProductIdx] || presetsList[0];
            if (currentPreset) {
              const fitted = fitGraphicInProductMaxDimensions(textAspect, currentPreset.maxGraphicW, currentPreset.maxGraphicH);
              setGraphicWidth(fitted.w);
              setGraphicHeight(fitted.h);
            }
          }
        }
      };

      if (typeof document !== "undefined" && (document as any).fonts) {
        (document as any).fonts.ready.then(measureText);
      } else {
        setTimeout(measureText, 50);
      }
    }
  }, [text, font, fontSize, letterSpacing, lineHeight, strokeWidth, activeTab, selectedProductIdx, productPresets]);

  // 2. Monitor image tab aspect ratio changes
  useEffect(() => {
    if (activeTab === "image") {
      const src = processedImageUrl || currentImageUrl;
      if (src) {
        const img = new Image();
        img.src = src;
        img.onload = () => {
          const w = img.naturalWidth || img.width;
          const h = img.naturalHeight || img.height;
          if (w && h) {
            const aspect = w / h;
            setAspectRatio(aspect);

            // Auto fit graphic into current preset boundaries on image load
            const presetsList = productPresets.length > 0 ? productPresets : getProductGraphicPresets();
            const preset = presetsList[selectedProductIdx] || presetsList[0];
            if (preset) {
              const fitted = fitGraphicInProductMaxDimensions(aspect, preset.maxGraphicW, preset.maxGraphicH);
              setGraphicWidth(fitted.w);
              setGraphicHeight(fitted.h);
            }
          }
        };
      }
    }
  }, [currentImageUrl, processedImageUrl, activeTab, selectedProductIdx]);

  // Handlers for manual input adjustments preserving ratio
  const handleWidthChange = (w: number) => {
    setGraphicWidth(w);
    if (aspectRatio && aspectRatio > 0) {
      const h = Math.round((w / aspectRatio) * 10) / 10;
      setGraphicHeight(h);
    }
  };

  const handleHeightChange = (h: number) => {
    setGraphicHeight(h);
    if (aspectRatio && aspectRatio > 0) {
      const w = Math.round((h * aspectRatio) * 10) / 10;
      setGraphicWidth(w);
    }
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
  const handleConfirmSave = async (closeModalAfter = false) => {
    setIsSaving(true);

    let finalGraphicToSave = "";
    if (activeTab === "text" && text) {
      const tightSvg = generateTightSvgFromText(text, font, color, fontSize, letterSpacing, lineHeight, strokeWidth);
      finalGraphicToSave = `data:image/svg+xml;utf8,${encodeURIComponent(tightSvg)}`;
    } else {
      finalGraphicToSave = vectorSvgContent
        ? `data:image/svg+xml;utf8,${encodeURIComponent(vectorSvgContent)}`
        : (processedImageUrl || currentImageUrl);
    }

    if (orderId && finalGraphicToSave) {
      try {
        await fetch("/api/orders/save-graphic", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId,
            store,
            editedImageUrl: finalGraphicToSave,
            textData: { text, font, fontSize, color, letterSpacing, lineHeight, strokeWidth },
            width: graphicWidth,
            height: graphicHeight,
            itemIndex: selectedItemIdx
          })
        });
      } catch (e) {
        console.error("Errore salvataggio metafield ordine:", e);
      }
    }

    // Aggiunge l'indice del prodotto salvato e aggiorna il dizionario di stato
    const updatedSaved = Array.from(new Set([...savedItemIndices, selectedItemIdx]));
    setSavedItemIndices(updatedSaved);

    const updatedState = {
      ...itemsState,
      [selectedItemIdx]: {
        text,
        font,
        color,
        fontSize,
        letterSpacing,
        lineHeight,
        strokeWidth,
        graphicWidth,
        graphicHeight,
        processedImageUrl,
        isRemoveBgApplied,
        isVectorized,
        vectorSvgContent,
        currentImageUrl,
        activeTab
      }
    };
    setItemsState(updatedState);

    if (orderId && typeof window !== "undefined") {
      const storageKey = `pod_saved_order_editor_${orderId}`;
      localStorage.setItem(storageKey, JSON.stringify({
        itemsState: updatedState,
        savedItemIndices: updatedSaved
      }));
    }

    setIsSaving(false);

    // Mostra banner di notifica di conferma salvataggio senza uscire
    setSaveNotice(`✓ Grafica per il Prodotto #${selectedItemIdx + 1} salvata con successo!`);
    setTimeout(() => setSaveNotice(null), 3500);

    const totalCount = lineItems.length || 1;

    // Chiudi il modale e notifica il parent SOLO se richiesto esplicitamente o se c'è un solo prodotto
    if (closeModalAfter || (totalCount <= 1)) {
      if (onSave) {
        onSave({
          text,
          font,
          fontSize,
          color,
          letterSpacing,
          x: posX,
          y: posY,
          processedGraphicUrl: finalGraphicToSave,
          width: graphicWidth,
          height: graphicHeight
        });
      }
      onClose();
    }
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

      {/* Hidden measuring SVG element for exact bbox calculation */}
      {activeTab === "text" && text && (
        <div 
          style={{ position: "absolute", visibility: "hidden", pointerEvents: "none", top: -9999, left: -9999 }}
        >
          <svg width="2000" height="2000">
            <text
              id="text-measurer-node"
              x="1000"
              y="1000"
              stroke={strokeWidth > 0 ? color : "none"}
              strokeWidth={strokeWidth > 0 ? strokeWidth : undefined}
              strokeLinejoin={strokeWidth > 0 ? "round" : undefined}
              style={{
                fontFamily: availableFonts.find(f => {
                  const normF = f.name.toLowerCase().replace(/[^a-z0-9]/g, "");
                  const normSelected = font.toLowerCase().replace(/[^a-z0-9]/g, "");
                  return normF.includes(normSelected) || normSelected.includes(normF);
                })?.family || `'${font}', sans-serif`,
                fontSize: `${fontSize}px`,
                letterSpacing: `${letterSpacing}px`,
                fontWeight: "600",
                lineHeight: `${lineHeight}`
              }}
            >
              {text.split("\n").map((line, idx) => (
                <tspan key={idx} x="1000" dy={idx === 0 ? "0" : `${lineHeight}em`} textAnchor="middle">
                  {line}
                </tspan>
              ))}
            </text>
          </svg>
        </div>
      )}

      <div 
        className="bg-white rounded-3xl shadow-2xl w-[98vw] max-w-[98vw] h-[94vh] max-h-[94vh] flex flex-col overflow-hidden border border-gray-100"
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
            onClick={() => {
              const totalCount = lineItems.length || 1;
              if (totalCount > 1 && savedItemIndices.length > 0 && savedItemIndices.length < totalCount) {
                const confirmExit = confirm(
                  `Hai salvato le grafiche per ${savedItemIndices.length} di ${totalCount} prodotti dell'ordine.\n\nLe grafiche già salvate rimangono registrate e valide per la stampa.\n\nVuoi chiudere l'editor adesso?`
                );
                if (!confirmExit) return;
              }
              onClose();
            }}
            className="p-1.5 hover:bg-amber-600 rounded-full transition-all text-amber-100 hover:text-white"
            title="Chiudi"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BANNER DI NOTIFICA SALVATAGGIO SINGOLO PRODOTTO */}
        {saveNotice && (
          <div className="bg-emerald-600 text-white px-6 py-2.5 text-xs font-extrabold flex items-center justify-between shadow-md animate-in slide-in-from-top duration-200 shrink-0">
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4 stroke-[3]" />
              {saveNotice}
            </span>
            <button 
              type="button"
              onClick={() => setSaveNotice(null)} 
              className="text-emerald-200 hover:text-white text-xs font-bold px-2 py-0.5 rounded bg-emerald-700/50"
            >
              ✕
            </button>
          </div>
        )}

        {/* CONTROLLO MULTI-ARTICOLI CON ICONE ANTEPRIMA E BORDO VERDE AL SALVATAGGIO */}
        {lineItems.length > 1 && (
          <div className="bg-amber-50/90 px-6 py-3 border-b border-amber-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2 text-xs font-extrabold text-amber-900 shrink-0">
              <Package className="w-4 h-4 text-amber-600" />
              <span>Ordine Multi-Prodotto ({lineItems.length} articoli):</span>
              <span className="text-[11px] font-bold text-amber-800 bg-amber-200/70 px-2 py-0.5 rounded-full">
                {savedItemIndices.length} di {lineItems.length} completati
              </span>
            </div>

            {/* CARDS ICONE PRODOTTI CON ANTEPRIMA, SPUNTA VERDE E BORDO VERDE AL SALVATAGGIO */}
            <div className="flex items-center gap-2.5 overflow-x-auto py-1 max-w-full">
              {lineItems.map((item, idx) => {
                const isSelected = selectedItemIdx === idx;
                const isSaved = savedItemIndices.includes(idx);
                const displayImg = item.displayImage || item.backgroundUrl || item.uploadedImageUrl || item.svgUrl;

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectLineItem(idx)}
                    className={`relative flex items-center gap-2 p-1.5 pr-3 rounded-2xl border transition-all duration-200 text-left shrink-0 cursor-pointer ${
                      isSaved
                        ? isSelected
                          ? "border-2 border-green-600 bg-green-100/90 shadow-md scale-102"
                          : "border-2 border-green-500 bg-green-50/90 hover:bg-green-100/80"
                        : isSelected
                          ? "border-2 border-indigo-600 bg-white shadow-md ring-2 ring-indigo-500/20 scale-102"
                          : "border-amber-200 bg-white hover:bg-amber-100/50"
                    }`}
                    title={`Seleziona Prodotto #${idx + 1}: ${item.title || 'Articolo'}`}
                  >
                    {/* THUMBNAIL CON IMMAGINE E ANTEPRIMA */}
                    <div className={`w-10 h-10 rounded-xl overflow-hidden bg-white border flex items-center justify-center p-0.5 shrink-0 ${isSaved ? 'border-green-400' : 'border-gray-200'}`}>
                      {displayImg ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={displayImg} alt={item.title} className="max-w-full max-h-full object-contain" />
                      ) : (
                        <Package className="w-5 h-5 text-gray-400" />
                      )}
                    </div>

                    <div className="flex flex-col min-w-0">
                      <span className={`text-[10px] font-extrabold truncate max-w-[110px] ${isSaved ? 'text-green-900' : isSelected ? 'text-indigo-900' : 'text-gray-700'}`}>
                        #{idx + 1} {item.title || 'Articolo'}
                      </span>
                      <span className={`text-[9px] font-semibold ${isSaved ? 'text-green-700 font-extrabold' : 'text-gray-400'}`}>
                        {isSaved ? '✓ Salvato' : `Qtà: ${item.quantity || 1}`}
                      </span>
                    </div>

                    {/* OVERLAY SPUNTA VERDE QUANDO SALVATO */}
                    {isSaved && (
                      <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-green-600 text-white rounded-full flex items-center justify-center shadow-md ring-2 ring-white">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* CORPO EDITOR SPLITATO IN 3 PANNELLI EQUILIBRATI (GRID GRID-COLS-3): 1. MOCKUP (1/3) | 2. SIMULATORE DTF (1/3) | 3. CONTROLLI ED EDITOR (1/3) */}
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-3 gap-4 bg-gray-50 items-start">
          
          {/* PANNELLO 1: ANTEPRIMA PRODOTTO ORIGINALE MOCKUP (SINISTRA - 1/3) */}
          <div className="flex flex-col space-y-3 min-w-0">
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
              {(() => {
                const activeItem = lineItems[selectedItemIdx];
                const activeMockupUrl = activeItem
                  ? (activeItem.backgroundUrl || activeItem.displayImage || activeItem.svgUrl)
                  : (backgroundUrl || svgUrl);

                return activeMockupUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img 
                    src={activeMockupUrl} 
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
                );
              })()}

            </div>

            {/* ANTEPRIMA TESTO GENERATO (SOTTO IL MOCKUP) */}
            {activeTab === "text" && text && (
              <div className="w-full bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-1.5">
                <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-wide">Testo Generato (Anteprima Font e Colore)</span>
                <div 
                  className="w-full p-4 rounded-xl border border-dashed border-gray-200 flex items-center justify-center min-h-[60px]"
                  style={{ backgroundColor: canvasBgColor }}
                >
                  <div 
                    style={{
                      fontFamily: availableFonts.find(f => {
                        const normF = f.name.toLowerCase().replace(/[^a-z0-9]/g, "");
                        const normSelected = font.toLowerCase().replace(/[^a-z0-9]/g, "");
                        return normF.includes(normSelected) || normSelected.includes(normF);
                      })?.family || `'${font}', cursive, sans-serif`,
                      fontSize: "22px",
                      color: color,
                      letterSpacing: `${letterSpacing}px`,
                      textAlign: "center",
                      lineHeight: `${lineHeight}`,
                      whiteSpace: "pre-wrap",
                      WebkitTextStroke: strokeWidth > 0 ? `${strokeWidth * 0.35}px ${color}` : undefined
                    }}
                    className="font-semibold select-none text-center"
                  >
                    {text}
                  </div>
                </div>
              </div>
            )}

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

          {/* PANNELLO 2 (CENTRO): SIMULATORE PELLICOLA DTF & DIMENSIONAMENTO REALE (CENTRO - 1/3) */}
          <div className="flex flex-col space-y-4 min-w-0">
            
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
              className="w-full h-[380px] rounded-2xl border border-gray-200 shadow-inner relative overflow-hidden flex items-center justify-center p-3 bg-gray-150"
            >
              {/* Box Prodotto con Dimensioni e Proporzioni Reali */}
              {(() => {
                const presetsList = productPresets.length > 0 ? productPresets : getProductGraphicPresets();
                const preset = presetsList[selectedProductIdx] || presetsList[0] || { name: "PRODOTTO", supportW: 110, supportH: 130 };
                const maxScreenW = 380;
                const maxScreenH = 340;
                const productAspect = preset.supportW / preset.supportH;
                
                let screenW = maxScreenW;
                let screenH = screenW / productAspect;
                if (screenH > maxScreenH) {
                  screenH = maxScreenH;
                  screenW = screenH * productAspect;
                }

                const mmToPxRatio = screenW / preset.supportW;
                const graphicScreenW = graphicWidth * mmToPxRatio;
                const graphicScreenH = graphicHeight * mmToPxRatio;

                return (
                  <div
                    style={{ 
                      width: `${screenW}px`, 
                      height: `${screenH}px`,
                      backgroundColor: canvasBgColor
                    }}
                    className="relative border-2 border-indigo-400/80 rounded-lg shadow-md flex items-center justify-center overflow-hidden transition-colors duration-300"
                  >
                    {/* Badge Prodotto Bounding Box */}
                    <span className="absolute top-1 left-1.5 text-[8px] font-extrabold text-indigo-800 bg-indigo-50 px-1 py-0.2 rounded border border-indigo-200 select-none z-10 opacity-75">
                      {preset.name} ({preset.supportW}x{preset.supportH} mm)
                    </span>

                    {/* Contorno della Grafica / Testo (Bounding Box) */}
                    <div
                      style={{ 
                        width: `${graphicScreenW}px`, 
                        height: `${graphicScreenH}px`
                      }}
                      className="border border-dashed border-rose-500/70 relative flex items-center justify-center p-0.5 group"
                    >
                      {/* Bounding box sizes label */}
                      <span className="absolute -bottom-4 right-0 text-[7px] font-bold font-mono text-rose-600 bg-rose-50 px-1 rounded select-none opacity-0 group-hover:opacity-100 transition-opacity">
                        {graphicWidth} x {graphicHeight} mm
                      </span>

                      {activeTab === "image" ? (
                        vectorSvgContent ? (
                          <div 
                            className="w-full h-full flex items-center justify-center overflow-hidden"
                            style={{ color }}
                            dangerouslySetInnerHTML={{ __html: vectorSvgContent }}
                          />
                        ) : processedImageUrl ? (
                          <img 
                            src={processedImageUrl} 
                            alt="Immagine senza sfondo" 
                            className="w-full h-full object-contain"
                          />
                        ) : currentImageUrl ? (
                          <img 
                            src={currentImageUrl} 
                            alt="Anteprima Ordine" 
                            className="w-full h-full object-contain opacity-60 pointer-events-none"
                          />
                        ) : (
                          <div className="text-gray-300 text-[9px] font-mono select-none">
                            [Nessuna Grafica]
                          </div>
                        )
                      ) : (
                        text ? (
                          <div 
                            className="w-full h-full flex items-center justify-center overflow-hidden text-center"
                            dangerouslySetInnerHTML={{
                              __html: generateTightSvgFromText(text, font, color, fontSize, letterSpacing, lineHeight, strokeWidth)
                            }}
                          />
                        ) : (
                          <div className="text-gray-300 text-[9px] font-mono select-none">
                            [Nessun Testo]
                          </div>
                        )
                      )}
                    </div>
                  </div>
                );
              })()}
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

            {/* SEZIONE GESTIONE PRODOTTO & DIMENSIONI REAL-TIME */}
            <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-2xl space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-gray-700">
                <span className="flex items-center gap-1.5 text-indigo-700">
                  <Package className="w-4 h-4 text-indigo-500" />
                  Dimensionamento Reale (mm)
                </span>
                <span className="text-[10px] text-gray-400 font-normal">Seleziona il supporto di destinazione</span>
              </div>

              {/* SELETTORE PRODOTTO PRESET - COMPATTO & MINIMALE */}
              <div className="grid grid-cols-3 gap-1.5">
                {(productPresets.length > 0 ? productPresets : getProductGraphicPresets()).map((p, idx) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => selectProductPreset(idx)}
                    className={`py-1.5 px-2 border rounded-xl transition-all text-center leading-tight flex flex-col justify-center gap-0.5 h-10 ${
                      selectedProductIdx === idx
                        ? "border-indigo-600 bg-indigo-50 text-indigo-900 shadow-xs"
                        : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <span className="truncate w-full text-[9px] font-extrabold uppercase tracking-wide">{p.name}</span>
                    <span className="font-mono text-[8px] text-gray-400 font-bold">{p.supportW}x{p.supportH} mm</span>
                  </button>
                ))}
              </div>

              {/* GESTIONE LARGHEZZA / ALTEZZA GRAFICA */}
              {(() => {
                const presetsList = productPresets.length > 0 ? productPresets : getProductGraphicPresets();
                const activeP = presetsList[selectedProductIdx] || presetsList[0];
                return (
                  <>
                    <div className="grid grid-cols-2 gap-3 items-end pt-0.5">
                      <div className="space-y-1">
                        <label className="text-[10px] font-extrabold text-gray-600">Larghezza Grafica (mm)</label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.1"
                            min="1"
                            max={activeP.supportW * 1.5}
                            value={graphicWidth}
                            onChange={e => handleWidthChange(parseFloat(e.target.value) || 0)}
                            className="w-full pl-3 pr-8 py-1.5 border border-gray-300 rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <span className="absolute right-3 top-2 text-[10px] font-bold text-gray-400">mm</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-extrabold text-gray-600">Altezza Grafica (mm)</label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.1"
                            min="1"
                            max={activeP.supportH * 1.5}
                            value={graphicHeight}
                            onChange={e => handleHeightChange(parseFloat(e.target.value) || 0)}
                            className="w-full pl-3 pr-8 py-1.5 border border-gray-300 rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <span className="absolute right-3 top-2 text-[10px] font-bold text-gray-400">mm</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* AVVISO DI FUORI BORDO */}
                    {(graphicWidth > activeP.supportW || graphicHeight > activeP.supportH) && (
                      <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-1.5 text-rose-800 text-[10px] leading-relaxed">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5 animate-pulse" />
                        <div>
                          <span className="font-extrabold">Attenzione: Fuori bordo!</span> La grafica supera le dimensioni del supporto selezionato ({activeP.supportW}x{activeP.supportH} mm).
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
          </div>

          </div>

          {/* PANNELLO 3 (DESTRA): CONTROLLI TESTO, FONT, COLORI & SALVATAGGIO (DESTRA - 1/3) */}
          <div className="flex flex-col space-y-4 min-w-0">
            <div className="w-full space-y-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between h-full">
            
            {/* SCHEDA 1: TESTO & FONT */}
            {activeTab === "text" && (() => {
              const currentLineItem = lineItems[selectedItemIdx] || {};
              const currentAttrs = currentLineItem.customAttributes || customAttributes || [];

              const extracted = extractTextFontAndColorFromAttrs(currentAttrs);
              const rawFontAttr = extracted.rawFont || currentLineItem.rawFont || extracted.font || currentLineItem.initialFont || initialFont;
              const rawColorAttr = extracted.colorName || currentLineItem.initialColor || initialColor;

              return (
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

                  {/* 2. SELETTORE FONT CON EVIDENZIAZIONE SCELTA CLIENTE */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <label className="text-xs font-extrabold text-gray-800 flex items-center gap-1.5">
                        <Type className="w-4 h-4 text-amber-600" />
                        Tipo di Carattere (Font)
                      </label>
                      {rawFontAttr && (
                        <span className="text-[11px] font-black text-indigo-900 bg-indigo-100 px-2.5 py-1 rounded-lg border border-indigo-300 shadow-2xs flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          Scelta Cliente: <span className="underline font-black text-xs uppercase">{rawFontAttr}</span>
                        </span>
                      )}
                    </div>
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
                    
                    {font && !availableFonts.some(f => f.name.toLowerCase() === font.toLowerCase()) && 
                      !["outfit", "dancing script", "montserrat"].includes(font.toLowerCase()) && (
                        <div className="mt-1.5 p-2 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-1.5 text-amber-800 text-[10px] leading-relaxed">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-extrabold">Font non installato sul server!</span> Il PDF di stampa userà il font di default (Helvetica). Per risolvere, scarica il font sul tuo computer e caricalo in <a href="/settings/fonts" target="_blank" className="underline font-bold text-indigo-700 hover:text-indigo-900">Impostazioni &gt; Font</a>.
                          </div>
                        </div>
                    )}
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
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setFontSize(prev => Math.max(8, prev - 1))}
                        className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-amber-100 text-gray-700 hover:text-amber-800 font-extrabold text-sm flex items-center justify-center border border-gray-200 transition-all shrink-0 select-none active:scale-95"
                        title="Diminuisci dimensione"
                      >
                        -
                      </button>
                      <input 
                        type="range"
                        min={12}
                        max={120}
                        value={fontSize}
                        onChange={e => setFontSize(parseInt(e.target.value, 10))}
                        className="flex-1 accent-amber-600 cursor-pointer"
                      />
                      <button
                        type="button"
                        onClick={() => setFontSize(prev => Math.min(200, prev + 1))}
                        className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-amber-100 text-gray-700 hover:text-amber-800 font-extrabold text-sm flex items-center justify-center border border-gray-200 transition-all shrink-0 select-none active:scale-95"
                        title="Aumenta dimensione"
                      >
                        +
                      </button>
                      <input 
                        type="number"
                        min={8}
                        max={200}
                        value={fontSize}
                        onChange={e => setFontSize(parseInt(e.target.value, 10) || 12)}
                        className="w-14 px-1.5 py-1 border border-gray-300 rounded-lg text-xs font-mono font-bold text-center"
                      />
                    </div>
                  </div>

                  {/* 4. COLORE DEL FONT CON EVIDENZIAZIONE SCELTA CLIENTE */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <label className="text-xs font-extrabold text-gray-800 flex items-center gap-1.5">
                        <Palette className="w-4 h-4 text-amber-600" />
                        Colore Scritta
                        {(() => {
                          const matchedPreset = getColorPresets().find(c => c.hex.toLowerCase() === color.toLowerCase());
                          return matchedPreset ? (
                            <span className="text-[11px] font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 ml-1">
                              {matchedPreset.name}
                            </span>
                          ) : (
                            <span className="text-[11px] font-mono font-extrabold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md border border-gray-200 ml-1">
                              {color}
                            </span>
                          );
                        })()}
                      </label>
                      {rawColorAttr && (
                        <span className="text-[11px] font-black text-amber-950 bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-300 shadow-2xs flex items-center gap-1.5">
                          <span 
                            className="w-3.5 h-3.5 rounded-full border border-black/30 shadow-xs shrink-0" 
                            style={{ backgroundColor: resolveColorHex(rawColorAttr) }} 
                          />
                          Scelta Cliente: <span className="underline font-black text-xs uppercase">{rawColorAttr}</span> ({resolveColorHex(rawColorAttr)})
                        </span>
                      )}
                    </div>
                    <div className="flex items-start gap-2">
                      <input 
                        type="color"
                        value={color}
                        onChange={e => setColor(e.target.value)}
                        className="w-9 h-9 rounded-lg border border-gray-300 cursor-pointer p-0.5 bg-white shrink-0 mt-0.5"
                        title="Seleziona colore personalizzato"
                      />
                      <div className="flex flex-wrap items-center gap-1.5 p-2 bg-gray-50 rounded-xl border border-gray-200 max-h-36 overflow-y-auto flex-1">
                        {getColorPresets().map(c => (
                          <button
                            key={c.id || c.name}
                            type="button"
                            onClick={() => setColor(c.hex)}
                            className={`w-6 h-6 rounded-full border transition-all shrink-0 cursor-pointer relative group ${
                              color.toLowerCase() === c.hex.toLowerCase() ? "scale-125 border-amber-600 ring-2 ring-amber-400 z-10" : "border-gray-300 hover:scale-110"
                            }`}
                            style={{ backgroundColor: c.hex }}
                            title={`${c.name} (${c.hex})`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 5. INTERLINEA E SPESSORE */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* INTERLINEA */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-extrabold text-gray-800 flex items-center gap-1.5">
                          <List className="w-4 h-4 text-amber-600" />
                          Interlinea
                        </label>
                        <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                          {lineHeight}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setLineHeight(prev => Number(Math.max(0.8, prev - 0.05).toFixed(2)))}
                          className="w-6 h-6 rounded-lg bg-gray-100 hover:bg-amber-100 text-gray-700 hover:text-amber-800 font-extrabold text-xs flex items-center justify-center border border-gray-200 transition-all shrink-0 select-none active:scale-95"
                          title="Diminuisci interlinea"
                        >
                          -
                        </button>
                        <input 
                          type="range"
                          min={0.8}
                          max={2.5}
                          step={0.05}
                          value={lineHeight}
                          onChange={e => setLineHeight(parseFloat(e.target.value))}
                          className="w-full accent-amber-600 cursor-pointer min-w-0"
                        />
                        <button
                          type="button"
                          onClick={() => setLineHeight(prev => Number(Math.min(2.5, prev + 0.05).toFixed(2)))}
                          className="w-6 h-6 rounded-lg bg-gray-100 hover:bg-amber-100 text-gray-700 hover:text-amber-800 font-extrabold text-xs flex items-center justify-center border border-gray-200 transition-all shrink-0 select-none active:scale-95"
                          title="Aumenta interlinea"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* SPESSORE SCRITTA */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-extrabold text-gray-800 flex items-center gap-1.5">
                          <Type className="w-4 h-4 text-amber-600" />
                          Spessore Scritta
                        </label>
                        <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                          +{strokeWidth} px
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setStrokeWidth(prev => Math.max(0, prev - 0.5))}
                          className="w-6 h-6 rounded-lg bg-gray-100 hover:bg-amber-100 text-gray-700 hover:text-amber-800 font-extrabold text-xs flex items-center justify-center border border-gray-200 transition-all shrink-0 select-none active:scale-95"
                          title="Diminuisci spessore"
                        >
                          -
                        </button>
                        <input 
                          type="range"
                          min={0}
                          max={8}
                          step={0.5}
                          value={strokeWidth}
                          onChange={e => setStrokeWidth(parseFloat(e.target.value))}
                          className="w-full accent-amber-600 cursor-pointer min-w-0"
                        />
                        <button
                          type="button"
                          onClick={() => setStrokeWidth(prev => Math.min(8, prev + 0.5))}
                          className="w-6 h-6 rounded-lg bg-gray-100 hover:bg-amber-100 text-gray-700 hover:text-amber-800 font-extrabold text-xs flex items-center justify-center border border-gray-200 transition-all shrink-0 select-none active:scale-95"
                          title="Aumenta spessore"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                </div>
              );
            })()}

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
                    {customAttributes.map((attr: any, idx: number) => (
                      <div key={idx} className="flex justify-between gap-2 border-b border-gray-100 pb-0.5">
                        <span className="font-bold text-gray-700">{attr.key}:</span>
                        <span className="text-gray-900 truncate max-w-[200px]">{attr.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* BOTTONI CONFERMA SALVATAGGIO */}
            <div className="pt-4 border-t border-gray-100 flex items-center justify-between gap-2 mt-4 flex-wrap">
              <button
                type="button"
                onClick={() => handleConfirmSave(false)}
                disabled={isSaving}
                className={`px-4 py-2.5 text-xs font-extrabold rounded-xl shadow-md transition-all flex items-center gap-1.5 ${
                  savedItemIndices.includes(selectedItemIdx)
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : "bg-amber-600 hover:bg-amber-700 text-white"
                } disabled:opacity-50`}
              >
                <Save className={`w-4 h-4 ${isSaving ? "animate-spin" : ""}`} />
                <span>
                  {isSaving 
                    ? "Salvataggio..." 
                    : savedItemIndices.includes(selectedItemIdx)
                      ? `✓ Modifica Salvata (Prodotto #${selectedItemIdx + 1})`
                      : lineItems.length > 1
                        ? `💾 Salva Grafica Prodotto #${selectedItemIdx + 1}`
                        : "Conferma Grafica & Salva per Stampa"
                  }
                </span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-2 text-xs font-bold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all"
                >
                  Chiudi
                </button>
                {lineItems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleConfirmSave(true)}
                    disabled={isSaving}
                    className="px-4 py-2.5 text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Concludi & Salva Tutti</span>
                  </button>
                )}
              </div>
            </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
