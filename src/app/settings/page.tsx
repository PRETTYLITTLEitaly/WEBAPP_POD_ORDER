"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { Settings, Plus, Star, Trash2, Edit3, CheckCircle, Sliders, Save } from "lucide-react";
import { getPresets, savePresets, PrintPreset } from "@/lib/presetStore";

export default function ConfigurazionePage() {
  const [presets, setPresets] = useState<PrintPreset[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [rollWidthMm, setRollWidthMm] = useState(300);
  const [marginTopMm, setMarginTopMm] = useState(5);
  const [marginBottomMm, setMarginBottomMm] = useState(5);
  const [marginSidesMm, setMarginSidesMm] = useState(3);
  const [isDefault, setIsDefault] = useState(false);

  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const list = getPresets();
    setPresets(list);
    const def = list.find(p => p.isDefault) || list[0];
    if (def) {
      loadPresetToForm(def);
    }
  }, []);

  const loadPresetToForm = (preset: PrintPreset) => {
    setEditingId(preset.id);
    setName(preset.name);
    setRollWidthMm(preset.rollWidthMm);
    setMarginTopMm(preset.marginTopMm);
    setMarginBottomMm(preset.marginBottomMm);
    setMarginSidesMm(preset.marginSidesMm);
    setIsDefault(!!preset.isDefault);
  };

  const startNewPresetForm = () => {
    setEditingId(null);
    setName("Nuovo Preset Bobina");
    setRollWidthMm(300);
    setMarginTopMm(5);
    setMarginBottomMm(5);
    setMarginSidesMm(3);
    setIsDefault(presets.length === 0);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    let updatedList = [...presets];

    if (isDefault) {
      updatedList = updatedList.map(p => ({ ...p, isDefault: false }));
    }

    if (editingId) {
      updatedList = updatedList.map(p => {
        if (p.id === editingId) {
          return {
            ...p,
            name: name.trim(),
            rollWidthMm,
            marginTopMm,
            marginBottomMm,
            marginSidesMm,
            isDefault
          };
        }
        return p;
      });
    } else {
      const newId = "preset-" + Date.now();
      const newPreset: PrintPreset = {
        id: newId,
        name: name.trim(),
        rollWidthMm,
        marginTopMm,
        marginBottomMm,
        marginSidesMm,
        labelGapMm: 5,
        isDefault
      };
      updatedList.push(newPreset);
      setEditingId(newId);
    }

    // Assicura che ci sia sempre un default
    if (!updatedList.some(p => p.isDefault) && updatedList.length > 0) {
      updatedList[0].isDefault = true;
    }

    savePresets(updatedList);
    setPresets(updatedList);

    // Salva retrocompatibilità localStorage
    const def = updatedList.find(p => p.isDefault) || updatedList[0];
    if (def) {
      localStorage.setItem("rollWidthMm", def.rollWidthMm.toString());
    }

    setMessage(`Preset "${name}" salvato con successo!`);
    setTimeout(() => setMessage(null), 3000);
  };

  const setDefaultPreset = (id: string) => {
    const updated = presets.map(p => ({
      ...p,
      isDefault: p.id === id
    }));
    savePresets(updated);
    setPresets(updated);

    const target = updated.find(p => p.id === id);
    if (target) {
      loadPresetToForm(target);
      localStorage.setItem("rollWidthMm", target.rollWidthMm.toString());
    }

    setMessage("Preset predefinito impostato!");
    setTimeout(() => setMessage(null), 3000);
  };

  const handleDeletePreset = (id: string) => {
    if (confirm("Vuoi davvero eliminare questo preset?")) {
      const updated = presets.filter(p => p.id !== id);
      if (updated.length > 0 && !updated.some(p => p.isDefault)) {
        updated[0].isDefault = true;
      }
      savePresets(updated);
      setPresets(updated);

      if (updated.length > 0) {
        loadPresetToForm(updated[0]);
      } else {
        startNewPresetForm();
      }
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-4xl space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Settings className="w-6 h-6 text-indigo-600" />
              Configurazione Preset Stampa & Bobina
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Definisci le dimensioni delle bobine e i margini di padding interno (superiore, inferiore e laterali).
            </p>
          </div>
          <button
            onClick={startNewPresetForm}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nuovo Preset
          </button>
        </div>

        {message && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            {message}
          </div>
        )}

        {/* EDITOR FORM CARD INLINE */}
        <form onSubmit={handleSaveForm} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-indigo-600" />
              <h2 className="text-base font-bold text-gray-900">
                {editingId ? `Modifica Preset: ${name}` : "Crea Nuovo Preset"}
              </h2>
            </div>
            {editingId && (
              <span className="text-xs text-gray-400 font-mono">ID: {editingId}</span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Nome del Preset
              </label>
              <input 
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="es. Bobina 300mm Standard"
                className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                Larghezza Bobina (mm)
              </label>
              <input 
                type="number"
                min={100}
                max={2000}
                required
                value={rollWidthMm}
                onChange={e => setRollWidthMm(parseInt(e.target.value, 10) || 300)}
                className="w-full px-3.5 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 font-bold"
              />
            </div>
          </div>

          {/* Margini di Padding Interno */}
          <div className="pt-4 border-t border-gray-100">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
              Margini di Padding Interno (mm)
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Margine Superiore (mm)
                </label>
                <input 
                  type="number"
                  min={0}
                  max={100}
                  required
                  value={marginTopMm}
                  onChange={e => setMarginTopMm(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white font-semibold"
                />
                <span className="text-[11px] text-gray-400 mt-1 block">Padding in testa</span>
              </div>

              <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Margine Inferiore (mm)
                </label>
                <input 
                  type="number"
                  min={0}
                  max={100}
                  required
                  value={marginBottomMm}
                  onChange={e => setMarginBottomMm(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white font-semibold"
                />
                <span className="text-[11px] text-gray-400 mt-1 block">Padding a coda</span>
              </div>

              <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Margini Laterali (mm)
                </label>
                <input 
                  type="number"
                  min={0}
                  max={100}
                  required
                  value={marginSidesMm}
                  onChange={e => setMarginSidesMm(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white font-semibold"
                />
                <span className="text-[11px] text-gray-400 mt-1 block">Padding Sx e Dx</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <input 
                type="checkbox"
                id="isDefaultForm"
                checked={isDefault}
                onChange={e => setIsDefault(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer"
              />
              <label htmlFor="isDefaultForm" className="text-sm font-semibold text-gray-700 cursor-pointer">
                Imposta come Preset Predefinito per tutti i nuovi ordini
              </label>
            </div>

            <button 
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-sm shadow-sm transition-colors"
            >
              <Save className="w-4 h-4" />
              Salva Preset
            </button>
          </div>
        </form>

        {/* LISTA DEI PRESET SALVATI */}
        <div className="space-y-3">
          <h2 className="text-base font-bold text-gray-900">Preset Salvati ({presets.length})</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {presets.map(p => (
              <div 
                key={p.id} 
                className={`bg-white rounded-xl border p-5 shadow-sm transition-all relative flex flex-col justify-between ${
                  p.isDefault ? "border-indigo-500 ring-2 ring-indigo-500/20" : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Sliders className="w-5 h-5 text-indigo-600" />
                      <h3 className="text-base font-bold text-gray-900">{p.name}</h3>
                    </div>
                    {p.isDefault ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800">
                        <Star className="w-3 h-3 fill-indigo-600 text-indigo-600" />
                        Predefinito
                      </span>
                    ) : (
                      <button
                        onClick={() => setDefaultPreset(p.id)}
                        className="text-xs text-gray-400 hover:text-indigo-600 font-semibold"
                      >
                        Imposta come Predefinito
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-gray-100 text-xs">
                    <div>
                      <span className="text-gray-400 block font-medium">Larghezza Bobina</span>
                      <strong className="text-gray-900 text-sm">{p.rollWidthMm} mm</strong>
                    </div>
                    <div>
                      <span className="text-gray-400 block font-medium">Margini Laterali</span>
                      <strong className="text-gray-900 text-sm">{p.marginSidesMm} mm</strong>
                    </div>
                    <div>
                      <span className="text-gray-400 block font-medium">Margine Superiore</span>
                      <strong className="text-gray-900 text-sm">{p.marginTopMm} mm</strong>
                    </div>
                    <div>
                      <span className="text-gray-400 block font-medium">Margine Inferiore</span>
                      <strong className="text-gray-900 text-sm">{p.marginBottomMm} mm</strong>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => loadPresetToForm(p)}
                    className="px-3 py-1.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-xs font-bold flex items-center gap-1"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Modifica
                  </button>
                  {presets.length > 1 && (
                    <button
                      onClick={() => handleDeletePreset(p.id)}
                      className="px-3 py-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors text-xs font-bold flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Elimina
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
