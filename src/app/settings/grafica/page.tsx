"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { Sliders, Save, CheckCircle, Palette, Plus, Trash2 } from "lucide-react";
import { 
  getProductGraphicPresets, 
  saveProductGraphicPresets, 
  ProductGraphicPreset,
  getColorPresets,
  saveColorPresets,
  ColorPreset
} from "@/lib/presetStore";

export default function ImpostazioneGraficaPage() {
  const [productGraphicPresets, setProductGraphicPresets] = useState<ProductGraphicPreset[]>([]);
  const [colorPresets, setColorPresets] = useState<ColorPreset[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setProductGraphicPresets(getProductGraphicPresets());
    setColorPresets(getColorPresets());
  }, []);

  const handleSave = () => {
    saveProductGraphicPresets(productGraphicPresets);
    saveColorPresets(colorPresets);
    setMessage("Impostazioni grafiche e mappatura colori salvate con successo!");
    setTimeout(() => setMessage(null), 3000);
  };

  const handleAddColor = () => {
    const newColor: ColorPreset = {
      id: `color-${Date.now()}`,
      name: "Nuovo Colore",
      hex: "#3b82f6"
    };
    setColorPresets(prev => [...prev, newColor]);
  };

  const handleUpdateColor = (index: number, field: "name" | "hex", value: string) => {
    setColorPresets(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleDeleteColor = (index: number) => {
    setColorPresets(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-5xl space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
              <Sliders className="w-6 h-6 text-indigo-600" />
              Impostazione Grafica, Prodotti &amp; Mappatura Colori
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Imposta i parametri di dimensione massima dei prodotti e gestisci la tabella dei colori del tuo configuratore Shopify per l&apos;abbinamento automatico.
            </p>
          </div>
          
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-extrabold text-xs shadow-md transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            Salva Tutte le Impostazioni
          </button>
        </div>

        {message && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2 shadow-xs">
            <CheckCircle className="w-5 h-5 text-green-600" />
            {message}
          </div>
        )}

        {/* SEZIONE 1: GRIGLIA PRODOTTI */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
          <div className="border-b border-gray-100 pb-3">
            <h2 className="font-extrabold text-base text-gray-900 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-indigo-600" />
              Dimensioni Massime Grafiche per Supporto (mm)
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Il programma dimensionerà automaticamente ogni nuova grafica (testo o immagine) rispettando la regola proporzionale.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {productGraphicPresets.map((p, idx) => (
              <div key={p.id} className="bg-gray-50 rounded-2xl border border-gray-200 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-gray-200/60 pb-2">
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
                        className="w-full pl-3 pr-8 py-1.5 border border-gray-300 rounded-xl text-xs font-mono font-bold text-gray-900 focus:ring-2 focus:ring-indigo-500 bg-white"
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
                        className="w-full pl-3 pr-8 py-1.5 border border-gray-300 rounded-xl text-xs font-mono font-bold text-gray-900 focus:ring-2 focus:ring-indigo-500 bg-white"
                      />
                      <span className="absolute right-3 top-2 text-[10px] font-bold text-gray-400">mm</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SEZIONE 2: PALETTE & MAPPATURA AUTOMATICA COLORI TESTO */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h2 className="font-extrabold text-base text-gray-900 flex items-center gap-2">
                <Palette className="w-5 h-5 text-indigo-600" />
                Mappatura Automatica Colori Testo Ordine (Shopify &rarr; DTF)
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Associa il nome del colore del tuo configuratore Shopify (es. &quot;Verde Scuro&quot;, &quot;Rosa Fluo&quot;, &quot;Celeste&quot;) al relativo codice colore HEX per la stampa. L&apos;editor abbinerà automaticamente il colore corretto all&apos;arrivo di ogni ordine!
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddColor}
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Aggiungi Colore
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[500px] overflow-y-auto pr-1">
            {colorPresets.map((c, idx) => (
              <div key={c.id || idx} className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between gap-2 shadow-2xs">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <input
                    type="color"
                    value={c.hex}
                    onChange={e => handleUpdateColor(idx, "hex", e.target.value)}
                    className="w-8 h-8 rounded-lg border border-gray-300 cursor-pointer p-0.5 bg-white shrink-0"
                  />
                  <div className="flex flex-col flex-1 min-w-0 space-y-1">
                    <input
                      type="text"
                      value={c.name}
                      onChange={e => handleUpdateColor(idx, "name", e.target.value)}
                      placeholder="Nome Colore"
                      className="px-2 py-1 text-xs font-bold text-gray-900 border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 bg-white"
                    />
                    <span className="text-[10px] font-mono text-gray-500 font-bold px-1">{c.hex.toUpperCase()}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteColor(idx)}
                  className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                  title="Elimina colore"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-extrabold text-xs shadow-md transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            Salva Impostazioni Grafiche &amp; Mappatura Colori
          </button>
        </div>

      </div>
    </div>
  );
}

