"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { Sliders, Save, CheckCircle } from "lucide-react";
import { getProductGraphicPresets, saveProductGraphicPresets, ProductGraphicPreset } from "@/lib/presetStore";

export default function ImpostazioneGraficaPage() {
  const [productGraphicPresets, setProductGraphicPresets] = useState<ProductGraphicPreset[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setProductGraphicPresets(getProductGraphicPresets());
  }, []);

  const handleSave = () => {
    saveProductGraphicPresets(productGraphicPresets);
    setMessage("Impostazioni grafiche salvate con successo!");
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <div className="p-8">
      <div className="max-w-4xl space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
              <Sliders className="w-6 h-6 text-indigo-600" />
              Impostazione Grafica &amp; Dimensioni Massime Prodotti
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Imposta i parametri di dimensione massima per ciascun prodotto. Il programma dimensionerà automaticamente ogni nuova grafica (testo o immagine) rispettando la regola proporzionale: se la grafica è larga ma bassa rispetta la larghezza max; se è alta ma stretta rispetta l&apos;altezza max.
            </p>
          </div>
        </div>

        {message && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2 shadow-xs">
            <CheckCircle className="w-5 h-5 text-green-600" />
            {message}
          </div>
        )}

        {/* GRIGLIA PRODOTTI */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {productGraphicPresets.map((p, idx) => (
            <div key={p.id} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div>
                  <h3 className="font-extrabold text-sm text-gray-900">{p.name}</h3>
                  <span className="text-[11px] font-mono font-bold text-indigo-600">Supporto: {p.supportW}x{p.supportH} mm</span>
                </div>
                <span className="text-[10px] bg-indigo-50 text-indigo-800 font-extrabold px-2 py-0.5 rounded-full border border-indigo-100">
                  Formato #{idx + 1}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[10px] font-extrabold text-gray-700 uppercase mb-1">
                    Larghezza Max (mm)
                  </label>
                  <div className="relative">
                    <input 
                      type="number"
                      min={10}
                      max={p.supportW}
                      value={p.maxGraphicW}
                      onChange={e => {
                        const val = parseFloat(e.target.value) || 0;
                        const updated = [...productGraphicPresets];
                        updated[idx] = { ...updated[idx], maxGraphicW: val };
                        setProductGraphicPresets(updated);
                      }}
                      className="w-full pl-3 pr-8 py-1.5 border border-gray-300 rounded-xl text-xs font-mono font-bold text-gray-900 focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="absolute right-3 top-2 text-[10px] font-bold text-gray-400">mm</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-gray-700 uppercase mb-1">
                    Altezza Max (mm)
                  </label>
                  <div className="relative">
                    <input 
                      type="number"
                      min={10}
                      max={p.supportH}
                      value={p.maxGraphicH}
                      onChange={e => {
                        const val = parseFloat(e.target.value) || 0;
                        const updated = [...productGraphicPresets];
                        updated[idx] = { ...updated[idx], maxGraphicH: val };
                        setProductGraphicPresets(updated);
                      }}
                      className="w-full pl-3 pr-8 py-1.5 border border-gray-300 rounded-xl text-xs font-mono font-bold text-gray-900 focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="absolute right-3 top-2 text-[10px] font-bold text-gray-400">mm</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-extrabold text-xs shadow-md transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            Salva Impostazioni Grafiche Prodotti
          </button>
        </div>

      </div>
    </div>
  );
}
