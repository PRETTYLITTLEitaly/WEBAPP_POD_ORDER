"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Package, X } from "lucide-react";

export default function OrderLineItems({ lineItems }: { lineItems: any[] }) {
  const [zoomImage, setZoomImage] = useState<{ url: string; title: string; type: string } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="divide-y divide-gray-200 dark:divide-gray-800">
      {lineItems.map((item: any) => {
        const productImage = item.image?.url || item.variant?.image?.url || item.product?.featuredImage?.url;
        const podSvg = item.product?.pod_svg?.reference?.url || item.product?.pod_svg?.reference?.image?.url || item.variant?.pod_svg?.reference?.url || item.variant?.pod_svg?.reference?.image?.url;
        
        // Estrarre anteprima generata dall'app Product Personalizer
        const customPreviewAttr = item.customAttributes?.find((attr: any) => 
          typeof attr.value === "string" && attr.value.startsWith("http") && (
            attr.key.toLowerCase().includes("vedi") || 
            attr.key.toLowerCase().includes("preview") || 
            attr.key.toLowerCase().includes("immagine") || 
            attr.key.toLowerCase().includes("grafica") || 
            attr.key.toLowerCase().includes("_pplr") || 
            attr.key.toLowerCase().includes("design")
          )
        ) || item.customAttributes?.find((attr: any) => typeof attr.value === "string" && attr.value.startsWith("http"));

        const personalizerPreviewUrl = customPreviewAttr?.value;
        const customGraphicImage = personalizerPreviewUrl || podSvg;
        
        return (
          <div key={item.id} className="py-4 flex gap-4 items-start">
            {/* ANTEPRIME DIANZI E DIETRO (FOTO PRODOTTO ORIGINALE E GRAFICA SVG SIDE-BY-SIDE) */}
            <div className="flex items-center gap-2.5 shrink-0">
              {/* 1. Foto Prodotto Originale (Mockup/Boccetta/Candela) */}
              {productImage && (
                <div 
                  onClick={() => setZoomImage({ url: productImage, title: item.title, type: "Foto Prodotto" })}
                  className="w-24 h-24 bg-gray-50 dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 relative p-1.5 flex flex-col items-center justify-center group shadow-2xs cursor-pointer hover:border-indigo-500 hover:scale-105 transition-all"
                  title="Clicca per aprire la foto a schermo intero"
                >
                  <span className="absolute top-1 left-1 bg-gray-900/80 text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded shadow-xs z-10 select-none">
                    Prodotto
                  </span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={productImage} 
                    alt={item.title} 
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              )}

              {/* 2. Grafica SVG / Personalizzazione (di fianco a destra) */}
              {customGraphicImage && (
                <div 
                  onClick={() => setZoomImage({ url: customGraphicImage, title: item.title, type: "Grafica SVG" })}
                  className="w-24 h-24 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl overflow-hidden border border-indigo-200 dark:border-indigo-800 relative p-1.5 flex flex-col items-center justify-center group shadow-2xs cursor-pointer hover:border-indigo-600 hover:scale-105 transition-all"
                  title="Clicca per aprire la grafica SVG a schermo intero"
                >
                  <span className="absolute top-1 left-1 bg-indigo-600 text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded shadow-xs z-10 select-none">
                    Grafica SVG
                  </span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={customGraphicImage} 
                    alt="Grafica SVG" 
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              )}

              {/* Fallback se non c'è nessuna immagine */}
              {!productImage && !customGraphicImage && (
                <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center p-2 border border-gray-200">
                  <Package className="w-8 h-8 text-gray-400" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">{item.title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Quantità: {item.quantity}</p>
              {item.customAttributes?.length > 0 && (
                <div className="mt-2 text-sm text-gray-600 dark:text-gray-300 space-y-1 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                  {item.customAttributes.map((attr: any) => {
                    const isUrl = typeof attr.value === "string" && attr.value.startsWith("http");
                    return (
                      <div key={attr.key} className="flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="font-bold text-gray-700 dark:text-gray-300">{attr.key}:</span>
                        {isUrl ? (
                          <a 
                            href={attr.value} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 underline"
                          >
                            Vedi Immagine ↗
                          </a>
                        ) : (
                          <span>{attr.value}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* POPUP LIGHTBOX PORTAL AGGANCIATO A DOCUMENT.BODY (ESCE DA QUALSIASI CONTENITORE CSS PARENTE) */}
      {zoomImage && mounted && createPortal(
        <div 
          onClick={() => setZoomImage(null)}
          className="fixed inset-0 z-[999999] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer animate-in fade-in duration-150"
        >
          {/* Pulsante X in alto a destra */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setZoomImage(null);
            }}
            className="fixed top-6 right-6 z-[1000000] text-white bg-black/70 hover:bg-rose-600 p-3 rounded-full transition-colors cursor-pointer shadow-2xl border border-white/20"
            title="Chiudi (oppure clicca ovunque sullo sfondo)"
          >
            <X className="w-7 h-7 text-white" />
          </button>

          {/* Immagine ingrandita a tutto schermo senza riquadri o tagli */}
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="relative flex items-center justify-center max-w-[95vw] max-h-[95vh]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={zoomImage.url} 
              alt={zoomImage.title} 
              className="max-w-[95vw] max-h-[95vh] object-contain rounded-2xl shadow-2xl select-none"
            />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
