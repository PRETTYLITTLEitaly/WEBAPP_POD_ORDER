"use client";

import { useState } from "react";
import { Package, X, ExternalLink, ZoomIn } from "lucide-react";

export default function OrderLineItems({ lineItems }: { lineItems: any[] }) {
  const [zoomImage, setZoomImage] = useState<{ url: string; title: string; type: string } | null>(null);

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
                  className="w-24 h-24 bg-gray-50 dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 relative p-1.5 flex flex-col items-center justify-center group shadow-2xs cursor-pointer hover:border-indigo-400 transition-all"
                  title="Clicca per ingrandire la foto del prodotto"
                >
                  <span className="absolute top-1 left-1 bg-gray-900/80 text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded shadow-xs z-10">
                    Prodotto
                  </span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={productImage} 
                    alt={item.title} 
                    className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-200"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity rounded-xl">
                    <ZoomIn className="w-5 h-5 text-white drop-shadow-md" />
                  </div>
                </div>
              )}

              {/* 2. Grafica SVG / Personalizzazione (di fianco a destra) */}
              {customGraphicImage && (
                <div 
                  onClick={() => setZoomImage({ url: customGraphicImage, title: item.title, type: "Grafica SVG" })}
                  className="w-24 h-24 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl overflow-hidden border border-indigo-200 dark:border-indigo-800 relative p-1.5 flex flex-col items-center justify-center group shadow-2xs cursor-pointer hover:border-indigo-500 transition-all"
                  title="Clicca per ingrandire la grafica SVG"
                >
                  <span className="absolute top-1 left-1 bg-indigo-600 text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded shadow-xs z-10">
                    Grafica SVG
                  </span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={customGraphicImage} 
                    alt="Grafica SVG" 
                    className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-200"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white gap-1 transition-opacity rounded-xl">
                    <ZoomIn className="w-5 h-5 text-white drop-shadow-md" />
                  </div>
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

      {/* POPUP MODAL INGRANDIMENTO IMMAGINE NELLA STESSA PAGINA */}
      {zoomImage && (
        <div 
          onClick={() => setZoomImage(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-gray-900 rounded-3xl max-w-4xl w-full p-6 shadow-2xl relative border border-gray-200 dark:border-gray-800 flex flex-col items-center max-h-[90vh] overflow-hidden"
          >
            {/* Header Modal */}
            <div className="w-full flex items-center justify-between pb-4 mb-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-extrabold px-2.5 py-1 rounded-full ${
                  zoomImage.type === "Grafica SVG" ? "bg-indigo-100 text-indigo-800" : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                }`}>
                  {zoomImage.type}
                </span>
                <h3 className="text-base font-bold text-gray-900 dark:text-white truncate max-w-lg">
                  {zoomImage.title}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <a 
                  href={zoomImage.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-all flex items-center gap-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Apri Originale
                </a>
                <button
                  type="button"
                  onClick={() => setZoomImage(null)}
                  className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Immagine Ingrandita */}
            <div className="flex-1 w-full flex items-center justify-center p-2 overflow-auto min-h-[300px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={zoomImage.url} 
                alt={zoomImage.title} 
                className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-md border border-gray-100 dark:border-gray-800"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
