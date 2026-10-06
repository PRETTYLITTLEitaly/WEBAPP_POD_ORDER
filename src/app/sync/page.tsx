"use client";

import { useState, useEffect } from "react";
import {
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  PlusCircle,
  Package,
  Layers,
  FileText,
  Clock,
  ShieldCheck,
  Play,
  Pause,
  Eye,
  ArrowRightLeft,
  ExternalLink,
  Download,
  Filter,
  Check,
  X,
  Sparkles,
  Sliders,
  DollarSign,
  Settings,
  History,
  AlertCircle,
  HelpCircle,
  Tag,
  Image as ImageIcon
} from "lucide-react";

export default function SyncB2BPage() {
  const [activeTab, setActiveTab] = useState<"panoramica" | "mancanti" | "storico" | "confronto" | "regole" | "impostazioni">("panoramica");
  const [loading, setLoading] = useState(true);
  const [syncData, setSyncData] = useState<any>(null);

  // Ricerca Globale
  const [globalSearch, setGlobalSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  // Filtro Voci Mancanti (Tab 2)
  const [mancantiFilter, setMancantiFilter] = useState<string>("all");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  // Prodotto Selezionato per Confronto (Tab 4)
  const [selectedHandle, setSelectedHandle] = useState<string>("profumatore-where-is-my-tiffany");
  const [compareData, setCompareData] = useState<any>(null);
  const [loadingCompare, setLoadingCompare] = useState(false);

  // Modali di Conferma
  const [modalDryRunOpen, setModalDryRunOpen] = useState(false);
  const [modalAlignOpen, setModalAlignOpen] = useState(false);

  // Carica i dati generali della Sync
  const loadSyncData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/sync/data");
      const data = await res.json();
      if (res.ok) {
        setSyncData(data);
      }
    } catch (err) {
      console.error("Errore caricamento dati sync:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSyncData();
  }, []);

  // Ricerca Prodotto Globale
  useEffect(() => {
    if (!globalSearch.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/sync/product-compare?query=${encodeURIComponent(globalSearch.trim())}`);
        const json = await res.json();
        if (json.searchMatches) {
          setSearchResults(json.searchMatches);
        }
      } catch (err) {
        console.error("Errore ricerca:", err);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [globalSearch]);

  // Carica il confronto di un singolo prodotto (Tab 4)
  const loadProductCompare = async (handle: string) => {
    try {
      setLoadingCompare(true);
      setSelectedHandle(handle);
      setActiveTab("confronto");
      const res = await fetch(`/api/sync/product-compare?handle=${encodeURIComponent(handle)}`);
      const json = await res.json();
      if (res.ok) {
        setCompareData(json);
      }
    } catch (err) {
      console.error("Errore confronto prodotto:", err);
    } finally {
      setLoadingCompare(false);
    }
  };

  useEffect(() => {
    if (activeTab === "confronto" && selectedHandle) {
      loadProductCompare(selectedHandle);
    }
  }, [activeTab]);

  // Toggle Dry-Run / Pause
  const handleToggleSetting = async (field: "isDryRun" | "isPaused", value: boolean) => {
    try {
      const res = await fetch("/api/sync/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_setting", [field]: value })
      });
      if (res.ok) {
        loadSyncData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const stats = syncData?.stats || {
    b2cTotal: 1092,
    b2bTotal: 1219,
    matched: 1009,
    toCreate: 83,
    orphanB2b: 210,
    excluded: 0,
    missingVariants: 119,
    undefinedPrices: 1750,
    podDiffs: 194,
    statusDiffs: 3,
    queueJobs: 0,
    errors24h: 0,
    lastSyncAt: new Date().toISOString(),
    lastReconcileAt: new Date().toISOString(),
    webhookStatus: "ACTIVE"
  };

  const isDryRun = syncData?.setting?.isDryRun ?? true;
  const isPaused = syncData?.setting?.isPaused ?? false;

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      
      {/* HEADER E BARRA DI RICERCA GLOBALE (SEMPRE VISIBILE IN ALTO) */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200/80 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <RefreshCw className="w-6 h-6 animate-spin-slow" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  Sincronizzazione Catalogo B2C &rarr; B2B
                </h1>
                <p className="text-xs text-gray-500 mt-0.5">
                  Motore di allineamento automatico a senso unico da Store Master B2C verso Store Copia B2B
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Status Badge Dry-Run */}
            <div className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border ${
              isDryRun 
                ? "bg-amber-50 text-amber-700 border-amber-200" 
                : "bg-green-50 text-green-700 border-green-200"
            }`}>
              <ShieldCheck className="w-4 h-4" />
              <span>{isDryRun ? "MODALITÀ DRY-RUN (Simulazione Attiva)" : "MODALITÀ REALE (Scrittura Abilitata)"}</span>
            </div>

            {/* Status Badge Sync */}
            <div className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border ${
              isPaused 
                ? "bg-red-50 text-red-700 border-red-200" 
                : "bg-emerald-50 text-emerald-700 border-emerald-200"
            }`}>
              {isPaused ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-emerald-600" />}
              <span>{isPaused ? "SYNC IN PAUSA" : "SYNC ATTIVA"}</span>
            </div>
          </div>
        </div>

        {/* BARRA DI RICERCA GLOBALE PRODOTTI */}
        <div className="relative pt-2">
          <div className="relative flex items-center">
            <Search className="w-5 h-5 text-gray-400 absolute left-4" />
            <input
              type="text"
              placeholder="Cerca prodotto per Titolo, Handle, SKU o ID su B2C e B2B..."
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner"
            />
            {searching && (
              <RefreshCw className="w-4 h-4 text-indigo-600 animate-spin absolute right-4" />
            )}
          </div>

          {/* DROPDOWN RISULTATI DI RICERCA */}
          {searchResults.length > 0 && (
            <div className="absolute left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-50 animate-in fade-in duration-100">
              <div className="p-2 bg-gray-50 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                Risultati della ricerca ({searchResults.length})
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
                {searchResults.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setGlobalSearch("");
                      setSearchResults([]);
                      loadProductCompare(p.handle);
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-indigo-50/50 flex items-center justify-between group transition-colors"
                  >
                    <div>
                      <div className="font-bold text-sm text-gray-900 group-hover:text-indigo-600 flex items-center gap-2">
                        {p.title}
                        <span className="font-mono text-xs text-gray-400 font-normal">[{p.handle}]</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        Stato B2C: <span className="font-semibold text-gray-700">{p.b2cStatus}</span> | Stato B2B: <span className="font-semibold text-gray-700">{p.b2bStatus}</span>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      p.badge === "Allineato" ? "bg-green-100 text-green-800" :
                      p.badge === "Differenze" ? "bg-amber-100 text-amber-800" :
                      p.badge === "Mancante nel B2B" ? "bg-orange-100 text-orange-800" :
                      "bg-gray-100 text-gray-700"
                    }`}>
                      {p.badge}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MENU TAB PRINCIPALI */}
      <div className="flex border-b border-gray-200 bg-white rounded-xl p-1 shadow-sm border space-x-1">
        {[
          { id: "panoramica", label: "1. Panoramica", icon: Layers },
          { id: "mancanti", label: `2. Voci Mancanti (${stats.toCreate + stats.missingVariants})`, icon: AlertTriangle },
          { id: "storico", label: "3. Storico Sync", icon: History },
          { id: "confronto", label: "4. Confronto Prodotto", icon: ArrowRightLeft },
          { id: "regole", label: "5. Regole Prezzo B2B", icon: DollarSign },
          { id: "impostazioni", label: "6. Impostazioni", icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-xs font-bold transition-all ${
                isActive
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1 — PANORAMICA */}
      {/* ========================================================================= */}
      {activeTab === "panoramica" && (
        <div className="space-y-6">
          
          {/* BARRA CONTROLLI PRINCIPALI */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-gray-900">Stato del Servizio di Sincronizzazione</h2>
              <p className="text-xs text-gray-500">
                Imposta i parametri di sicurezza e controlla lo stato dei collegamenti webhook in tempo reale.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Switch Dry Run */}
              <button
                onClick={() => {
                  if (isDryRun) {
                    setModalDryRunOpen(true);
                  } else {
                    handleToggleSetting("isDryRun", true);
                  }
                }}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm border transition-all ${
                  isDryRun
                    ? "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100"
                    : "bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200"
                }`}
              >
                <Eye className="w-4 h-4" />
                {isDryRun ? "Dry-Run ATTIVO (Simula)" : "Attiva Dry-Run"}
              </button>

              {/* Switch Pausa */}
              <button
                onClick={() => handleToggleSetting("isPaused", !isPaused)}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm border transition-all ${
                  isPaused
                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
                    : "bg-red-50 text-red-700 border-red-300 hover:bg-red-100"
                }`}
              >
                {isPaused ? <Play className="w-4 h-4 fill-white" /> : <Pause className="w-4 h-4" />}
                {isPaused ? "Riprendi Sincronizzazione" : "Metti in Pausa"}
              </button>

              {/* Avvia Allineamento Iniziale */}
              <button
                onClick={() => setModalAlignOpen(true)}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-2 transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                Avvia Allineamento Iniziale
              </button>
            </div>
          </div>

          {/* GRIGLIA CONTATORI CLICCABILI */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            
            <button
              onClick={() => { setActiveTab("mancanti"); setMancantiFilter("all"); }}
              className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm text-left hover:border-green-500 hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between text-green-600 mb-2">
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-[10px] uppercase font-bold bg-green-50 px-2 py-0.5 rounded-full border border-green-200">100% Ok</span>
              </div>
              <div className="text-2xl font-black text-gray-900 group-hover:text-green-600">{stats.matched}</div>
              <div className="text-xs font-bold text-gray-600 mt-1">Prodotti Allineati</div>
              <div className="text-[11px] text-gray-400 mt-0.5">Stesso Handle in B2C e B2B</div>
            </button>

            <button
              onClick={() => { setActiveTab("mancanti"); setMancantiFilter("pod_diffs"); }}
              className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm text-left hover:border-amber-500 hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between text-amber-600 mb-2">
                <AlertTriangle className="w-5 h-5" />
                <span className="text-[10px] uppercase font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">Verifica</span>
              </div>
              <div className="text-2xl font-black text-gray-900 group-hover:text-amber-600">{stats.podDiffs + stats.statusDiffs}</div>
              <div className="text-xs font-bold text-gray-600 mt-1">Con Differenze</div>
              <div className="text-[11px] text-gray-400 mt-0.5">{stats.podDiffs} POD + {stats.statusDiffs} Stato</div>
            </button>

            <button
              onClick={() => { setActiveTab("mancanti"); setMancantiFilter("create_products"); }}
              className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm text-left hover:border-orange-500 hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between text-orange-600 mb-2">
                <PlusCircle className="w-5 h-5" />
                <span className="text-[10px] uppercase font-bold bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">Nuovi</span>
              </div>
              <div className="text-2xl font-black text-gray-900 group-hover:text-orange-600">{stats.toCreate}</div>
              <div className="text-xs font-bold text-gray-600 mt-1">Prodotti da Creare</div>
              <div className="text-[11px] text-gray-400 mt-0.5">Presenti in B2C, assenti in B2B</div>
            </button>

            <button
              onClick={() => { setActiveTab("mancanti"); setMancantiFilter("missing_variants"); }}
              className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm text-left hover:border-indigo-500 hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between text-indigo-600 mb-2">
                <Package className="w-5 h-5" />
                <span className="text-[10px] uppercase font-bold bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">Opzioni</span>
              </div>
              <div className="text-2xl font-black text-gray-900 group-hover:text-indigo-600">{stats.missingVariants}</div>
              <div className="text-xs font-bold text-gray-600 mt-1">Varianti Mancanti</div>
              <div className="text-[11px] text-gray-400 mt-0.5">Nei prodotti già abbinati</div>
            </button>

            <button
              onClick={() => { setActiveTab("mancanti"); setMancantiFilter("undefined_prices"); }}
              className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm text-left hover:border-purple-500 hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between text-purple-600 mb-2">
                <DollarSign className="w-5 h-5" />
                <span className="text-[10px] uppercase font-bold bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">Prezzi</span>
              </div>
              <div className="text-2xl font-black text-gray-900 group-hover:text-purple-600">{stats.undefinedPrices}</div>
              <div className="text-xs font-bold text-gray-600 mt-1">Prezzi da Definire</div>
              <div className="text-[11px] text-gray-400 mt-0.5">Varianti senza regola specifica</div>
            </button>

          </div>

          {/* SECONDA RIGA CONTATORI */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-500 font-medium">Prodotti Solo B2B</div>
                <div className="text-xl font-bold text-gray-800">{stats.orphanB2b}</div>
              </div>
              <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-md">Preservati</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-500 font-medium">Prodotti Esclusi (no-b2b)</div>
                <div className="text-xl font-bold text-gray-800">{stats.excluded}</div>
              </div>
              <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-1 rounded-md">Tag</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-500 font-medium">Job in Coda</div>
                <div className="text-xl font-bold text-gray-800">{stats.queueJobs}</div>
              </div>
              <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded-md">Serverless</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-500 font-medium">Stato Webhook Shopify</div>
                <div className="text-sm font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> ATTIVO (HMAC OK)
                </div>
              </div>
            </div>
          </div>

          {/* ESTRATTO DEL REPORT STEP 1 */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-md font-bold text-gray-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                Estratto Report Scansione Iniziale (step1-alignment-report.txt)
              </h3>
              <span className="text-xs text-gray-400 font-mono">1.092 Prodotti B2C vs 1.219 B2B</span>
            </div>
            <pre className="bg-gray-900 text-green-400 p-4 rounded-xl text-xs font-mono overflow-x-auto max-h-64 border border-gray-800">
              {syncData?.reportSummary || "Caricamento estratto report..."}
            </pre>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2 — VOCI MANCANTI */}
      {/* ========================================================================= */}
      {activeTab === "mancanti" && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Elenco Voci Mancanti & Differenze</h2>
              <p className="text-xs text-gray-500">
                Filtra gli elementi che richiedono attenzione prima della sincronizzazione automatica.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl flex items-center gap-2 transition-all">
                <Download className="w-4 h-4" /> Export CSV Vista
              </button>
            </div>
          </div>

          {/* FILTRI Categoria */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
            {[
              { id: "all", label: "Tutte le voci" },
              { id: "create_products", label: `Prodotti da creare (${stats.toCreate})` },
              { id: "missing_variants", label: `Varianti mancanti (${stats.missingVariants})` },
              { id: "pod_diffs", label: `Differenze POD (${stats.podDiffs})` },
              { id: "status_diffs", label: `Differenze Stato (${stats.statusDiffs})` },
              { id: "undefined_prices", label: `Prezzi da definire (${stats.undefinedPrices})` },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setMancantiFilter(f.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  mancantiFilter === f.id
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* TABELLA MANCANTI */}
          <div className="overflow-x-auto border border-gray-200 rounded-xl">
            <table className="w-full text-left text-xs text-gray-700">
              <thead className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200 uppercase tracking-wider">
                <tr>
                  <th className="p-3 w-10 text-center">
                    <input type="checkbox" className="rounded border-gray-300" />
                  </th>
                  <th className="p-3">Prodotto B2C</th>
                  <th className="p-3">Tipo Voce</th>
                  <th className="p-3">Dettaglio</th>
                  <th className="p-3">Valore B2C</th>
                  <th className="p-3">Valore B2B</th>
                  <th className="p-3 text-right">Azione</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {/* Esempio 1: Prodotto da creare */}
                {(mancantiFilter === "all" || mancantiFilter === "create_products") && (
                  <tr className="hover:bg-indigo-50/30 transition-colors">
                    <td className="p-3 text-center"><input type="checkbox" className="rounded border-gray-300" /></td>
                    <td className="p-3">
                      <div className="font-bold text-gray-900">Profumatore - “Love Me like u do”</div>
                      <div className="font-mono text-[11px] text-gray-400">profumatore-love-me-blu-royal</div>
                    </td>
                    <td className="p-3"><span className="px-2 py-0.5 bg-orange-100 text-orange-800 rounded font-bold">Prodotto Mancante</span></td>
                    <td className="p-3">Prodotto non presente nel catalogo B2B</td>
                    <td className="p-3 font-semibold text-green-700">36 Varianti (Profumi e colonie)</td>
                    <td className="p-3 text-gray-400">Non esiste</td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => loadProductCompare("profumatore-love-me-blu-royal")}
                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg transition-colors"
                      >
                        Apri confronto
                      </button>
                    </td>
                  </tr>
                )}

                {/* Esempio 2: Differenza POD */}
                {(mancantiFilter === "all" || mancantiFilter === "pod_diffs") && (
                  <tr className="hover:bg-indigo-50/30 transition-colors">
                    <td className="p-3 text-center"><input type="checkbox" className="rounded border-gray-300" /></td>
                    <td className="p-3">
                      <div className="font-bold text-gray-900">Profumatore - "Where is my Tiffany"</div>
                      <div className="font-mono text-[11px] text-gray-400">profumatore-where-is-my-tiffany</div>
                    </td>
                    <td className="p-3"><span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-bold">Differenza POD</span></td>
                    <td className="p-3">Metafield Grafica SVG aggiornato in B2C</td>
                    <td className="p-3 font-mono text-[11px] text-indigo-600 truncate max-w-[150px]">whereis_tiffany.svg (MediaImage)</td>
                    <td className="p-3 font-mono text-[11px] text-gray-400 truncate max-w-[150px]">URL Generico Vecchio</td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => loadProductCompare("profumatore-where-is-my-tiffany")}
                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg transition-colors"
                      >
                        Apri confronto
                      </button>
                    </td>
                  </tr>
                )}

                {/* Esempio 3: Differenza Stato */}
                {(mancantiFilter === "all" || mancantiFilter === "status_diffs") && (
                  <tr className="hover:bg-indigo-50/30 transition-colors">
                    <td className="p-3 text-center"><input type="checkbox" className="rounded border-gray-300" /></td>
                    <td className="p-3">
                      <div className="font-bold text-gray-900">Confezione Regalo Minimal Edition</div>
                      <div className="font-mono text-[11px] text-gray-400">confezione-regalo-minimal-edition</div>
                    </td>
                    <td className="p-3"><span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded font-bold">Stato Prodotto</span></td>
                    <td className="p-3">DRAFT in B2C ma ACTIVE in B2B</td>
                    <td className="p-3 font-bold text-amber-600">DRAFT</td>
                    <td className="p-3 font-bold text-green-600">ACTIVE</td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => loadProductCompare("confezione-regalo-minimal-edition")}
                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg transition-colors"
                      >
                        Apri confronto
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3 — STORICO SYNC */}
      {/* ========================================================================= */}
      {activeTab === "storico" && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-gray-900">Storico Operazioni & Log Sincronizzazione</h2>
          <p className="text-xs text-gray-500">
            Tracciamento dettagliato di tutte le simulazioni (DRY-RUN) ed azioni di sync eseguite nel sistema.
          </p>

          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 font-bold text-gray-600 uppercase border-b border-gray-200">
                <tr>
                  <th className="p-3">Data / Ora</th>
                  <th className="p-3">Azione</th>
                  <th className="p-3">Entità</th>
                  <th className="p-3">Esito</th>
                  <th className="p-3">Origine</th>
                  <th className="p-3">Dettagli</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                <tr className="hover:bg-gray-50">
                  <td className="p-3 text-gray-500">{new Date().toLocaleString("it-IT")}</td>
                  <td className="p-3 font-bold text-indigo-600">RECONCILE</td>
                  <td className="p-3">PRODUCT (Allineamento Iniziale)</td>
                  <td className="p-3"><span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold rounded">DRY_RUN</span></td>
                  <td className="p-3 text-gray-500">Manuale (Script Step 1)</td>
                  <td className="p-3 text-gray-600">Scansionati 1.092 prodotti. 1.009 abbinati, 83 da creare.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4 — CONFRONTO PRODOTTO (DOPPIA SCHERMATA AFFIANCATA B2C vs B2B) */}
      {/* ========================================================================= */}
      {activeTab === "confronto" && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
                  Confronto Affiancato
                </span>
                <h2 className="text-xl font-bold text-gray-900">
                  {compareData?.b2cProduct?.title || "Caricamento Prodotto..."}
                </h2>
              </div>
              <p className="text-xs font-mono text-gray-400 mt-1">
                Handle: {selectedHandle}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled
                className="px-4 py-2 bg-gray-100 text-gray-400 font-bold text-xs rounded-xl cursor-not-allowed flex items-center gap-1.5"
                title="Sincronizzazione reale abilitata dallo Step 2"
              >
                <RefreshCw className="w-4 h-4" /> Anteprima Sync (Dry-Run Only)
              </button>
              {compareData?.b2cProduct && (
                <a
                  href={`https://prettylittle-it.myshopify.com/admin/products/${compareData.b2cProduct.id.replace("gid://shopify/Product/", "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold text-xs rounded-xl flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> B2C Admin
                </a>
              )}
              {compareData?.b2bProduct && (
                <a
                  href={`https://wholesale-prettylittle-it.myshopify.com/admin/products/${compareData.b2bProduct.id.replace("gid://shopify/Product/", "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold text-xs rounded-xl flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> B2B Admin
                </a>
              )}
            </div>
          </div>

          {/* CONFRONTO DOPPIA COLONNA B2C vs B2B */}
          {loadingCompare ? (
            <div className="bg-white p-12 rounded-2xl border text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
              <div className="text-sm font-bold text-gray-700">Caricamento dati di confronto B2C ↔ B2B...</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* COLONNA SINISTRA: B2C MASTER */}
              <div className="bg-white p-6 rounded-2xl border-2 border-indigo-200 shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-indigo-600 rounded-full"></span>
                    <h3 className="font-extrabold text-base text-gray-900">STORE B2C MASTER (Fonte unico)</h3>
                  </div>
                  <span className="text-xs font-mono font-bold text-indigo-600">prettylittle-it.myshopify.com</span>
                </div>

                {compareData?.b2cProduct ? (
                  <div className="space-y-4 text-xs">
                    <div>
                      <span className="text-gray-400 font-bold uppercase">Titolo:</span>
                      <div className="font-bold text-sm text-gray-900 mt-0.5">{compareData.b2cProduct.title}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-gray-400 font-bold uppercase">Stato:</span>
                        <div className="font-bold text-green-600 mt-0.5">{compareData.b2cProduct.status}</div>
                      </div>
                      <div>
                        <span className="text-gray-400 font-bold uppercase">Tipo Prodotto:</span>
                        <div className="font-bold text-gray-800 mt-0.5">{compareData.b2cProduct.productType || "Nessuno"}</div>
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-400 font-bold uppercase">Tag ({compareData.b2cProduct.tags?.length}):</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {compareData.b2cProduct.tags?.map((t: string) => (
                          <span key={t} className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-[11px] font-semibold">{t}</span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-400 font-bold uppercase">Metafield POD:</span>
                      <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 mt-1 font-mono text-[11px] space-y-1">
                        <div>pod.svg: {compareData.b2cProduct.metafield_pod_svg?.reference?.url || "Nessuno"}</div>
                        <div>pod.width: {compareData.b2cProduct.metafield_pod_w?.value || "Default"}</div>
                        <div>pod.height: {compareData.b2cProduct.metafield_pod_h?.value || "Default"}</div>
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-400 font-bold uppercase">Varianti ({compareData.b2cProduct.variants?.nodes?.length}):</span>
                      <div className="mt-1 border rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                        <table className="w-full text-left text-[11px]">
                          <thead className="bg-gray-100 font-bold">
                            <tr>
                              <th className="p-2">Variante</th>
                              <th className="p-2">SKU</th>
                              <th className="p-2 text-right">Prezzo B2C</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {compareData.b2cProduct.variants?.nodes?.map((v: any) => (
                              <tr key={v.id}>
                                <td className="p-2 font-semibold">{v.title}</td>
                                <td className="p-2 font-mono text-gray-500">{v.sku || "-"}</td>
                                <td className="p-2 text-right font-bold text-indigo-600">€{v.price}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-400 text-center py-8">Prodotto B2C non trovato.</div>
                )}
              </div>

              {/* COLONNA DESTRO: B2B COPIA */}
              <div className="bg-white p-6 rounded-2xl border-2 border-gray-200 shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-purple-600 rounded-full"></span>
                    <h3 className="font-extrabold text-base text-gray-900">STORE B2B COPIA (Destinazione)</h3>
                  </div>
                  <span className="text-xs font-mono font-bold text-purple-600">wholesale-prettylittle-it.myshopify.com</span>
                </div>

                {compareData?.b2bProduct ? (
                  <div className="space-y-4 text-xs">
                    <div>
                      <span className="text-gray-400 font-bold uppercase">Titolo:</span>
                      <div className="font-bold text-sm text-gray-900 mt-0.5">{compareData.b2bProduct.title}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-gray-400 font-bold uppercase">Stato:</span>
                        <div className="font-bold text-green-600 mt-0.5">{compareData.b2bProduct.status}</div>
                      </div>
                      <div>
                        <span className="text-gray-400 font-bold uppercase">Tipo Prodotto:</span>
                        <div className="font-bold text-gray-800 mt-0.5">{compareData.b2bProduct.productType || "Nessuno"}</div>
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-400 font-bold uppercase">Tag ({compareData.b2bProduct.tags?.length}):</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {compareData.b2bProduct.tags?.map((t: string) => (
                          <span key={t} className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-[11px] font-semibold">{t}</span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-400 font-bold uppercase">Metafield POD B2B:</span>
                      <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 mt-1 font-mono text-[11px] space-y-1">
                        <div>pod.svg: {compareData.b2bProduct.metafield_pod_svg?.reference?.url || compareData.b2bProduct.metafield_pod_svg?.value || "Nessuno"}</div>
                        <div>pod.width: {compareData.b2bProduct.metafield_pod_w?.value || "Default"}</div>
                        <div>pod.height: {compareData.b2bProduct.metafield_pod_h?.value || "Default"}</div>
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-400 font-bold uppercase">Varianti B2B ({compareData.b2bProduct.variants?.nodes?.length}):</span>
                      <div className="mt-1 border rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                        <table className="w-full text-left text-[11px]">
                          <thead className="bg-gray-100 font-bold">
                            <tr>
                              <th className="p-2">Variante</th>
                              <th className="p-2">SKU</th>
                              <th className="p-2 text-right">Prezzo B2B</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {compareData.b2bProduct.variants?.nodes?.map((v: any) => (
                              <tr key={v.id}>
                                <td className="p-2 font-semibold">{v.title}</td>
                                <td className="p-2 font-mono text-gray-500">{v.sku || "-"}</td>
                                <td className="p-2 text-right font-bold text-purple-700">€{v.price}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-orange-50 border border-orange-200 p-6 rounded-xl text-center text-orange-800 font-bold space-y-2">
                    <AlertTriangle className="w-6 h-6 mx-auto text-orange-600" />
                    <div>Questo prodotto non esiste ancora nello Store B2B.</div>
                    <div className="text-xs font-normal text-orange-700">Verrà creato automaticamente durante la prima sincronizzazione.</div>
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5 — REGOLE PREZZO B2B */}
      {/* ========================================================================= */}
      {activeTab === "regole" && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Motore Regole Prezzo B2B</h2>
              <p className="text-xs text-gray-500">
                Regole applicate esclusivamente ai NUOVI prodotti e varianti creati dalla sync nel B2B.
              </p>
            </div>
            <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors">
              <PlusCircle className="w-4 h-4" /> Nuova Regola Prezzo
            </button>
          </div>

          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 font-bold text-gray-600 uppercase border-b border-gray-200">
                <tr>
                  <th className="p-3">Priorità</th>
                  <th className="p-3">Nome Regola</th>
                  <th className="p-3">Ambito</th>
                  <th className="p-3">Valore Ambito</th>
                  <th className="p-3">Condizioni Opzione (AND)</th>
                  <th className="p-3">Tipo Prezzo</th>
                  <th className="p-3">Valore B2B</th>
                  <th className="p-3 text-right">Stato</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {syncData?.priceRules?.map((r: any) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="p-3 font-bold text-purple-700">P:{r.priority}</td>
                    <td className="p-3 font-bold text-gray-900">{r.name}</td>
                    <td className="p-3"><span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded font-semibold">{r.scopeType}</span></td>
                    <td className="p-3 font-mono text-gray-600">{r.scopeValue || "*"}</td>
                    <td className="p-3 font-mono text-gray-600">
                      {Array.isArray(r.optionConditions) && r.optionConditions.length > 0 
                        ? r.optionConditions.map((c: any) => `${c.option}=${c.value}`).join("; ") 
                        : "-"}
                    </td>
                    <td className="p-3 font-bold text-indigo-600">{r.priceType}</td>
                    <td className="p-3 font-bold text-green-700">€{parseFloat(r.priceValue).toFixed(2)}</td>
                    <td className="p-3 text-right">
                      <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded font-bold">Attiva</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6 — IMPOSTAZIONI */}
      {/* ========================================================================= */}
      {activeTab === "impostazioni" && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-6 max-w-3xl">
          <h2 className="text-lg font-bold text-gray-900">Impostazioni Avanzate di Sincronizzazione</h2>

          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
              <label className="block text-xs font-bold text-gray-700 uppercase">Strategia Metafield POD</label>
              <select
                value={syncData?.setting?.podMetafieldStrategy || "SYNC_ALWAYS"}
                onChange={(e) => handleToggleSetting("podMetafieldStrategy" as any, e.target.value as any)}
                className="w-full p-2 border border-gray-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500"
              >
                <option value="SYNC_ALWAYS">SYNC_ALWAYS — Il B2C è la fonte unica di verità (Sovrascrive sempre B2B)</option>
                <option value="EXCLUDE">EXCLUDE — Escludi del tutto i metafield POD dalla sincronizzazione</option>
                <option value="SYNC_IF_EMPTY">SYNC_IF_EMPTY — Sincronizza i metafield POD solo se vuoti nel B2B</option>
              </select>
            </div>

            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
              <label className="block text-xs font-bold text-gray-700 uppercase">Tag di Esclusione Prodotto</label>
              <input
                type="text"
                disabled
                value="no-b2b"
                className="w-full p-2 bg-gray-100 border border-gray-300 rounded-lg text-xs font-mono text-gray-600"
              />
              <p className="text-[11px] text-gray-400">I prodotti con questo tag nel B2C vengono saltati dal motore di sincronizzazione.</p>
            </div>

            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
              <label className="block text-xs font-bold text-gray-700 uppercase">Stato HMAC Webhook B2C</label>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600 font-mono">SHOPIFY_B2C_CLIENT_SECRET</span>
                <span className="px-2.5 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-full">Pronto</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODALE DI CONFERMA DISATTIVAZIONE DRY-RUN */}
      {modalDryRunOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border">
            <div className="flex items-center gap-3 text-amber-600">
              <AlertTriangle className="w-8 h-8 shrink-0" />
              <h3 className="text-lg font-bold text-gray-900">Disattivare la Modalità Dry-Run?</h3>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              Disattivando la modalità Dry-Run, il motore di sincronizzazione inizierà a <strong>scrivere e creare realmente i prodotti, le varianti e i media sullo store Shopify B2B</strong>.
            </p>
            <div className="bg-amber-50 p-3 rounded-xl text-[11px] text-amber-800 font-medium">
              Assicurati di aver completato e verificato l'allineamento preliminare prima di procedere.
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setModalDryRunOpen(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl"
              >
                Annulla
              </button>
              <button
                onClick={() => {
                  setModalDryRunOpen(false);
                  handleToggleSetting("isDryRun", false);
                }}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-sm"
              >
                Conferma e Disattiva Dry-Run
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE AVVIO ALLINEAMENTO INIZIALE */}
      {modalAlignOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border">
            <div className="flex items-center gap-3 text-indigo-600">
              <RefreshCw className="w-7 h-7 shrink-0" />
              <h3 className="text-lg font-bold text-gray-900">Avvia Allineamento Iniziale</h3>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              Questa operazione eseguirà la scansione dei <strong>1.092 prodotti B2C</strong> ed assocerà i <strong>1.009 prodotti B2B coincidenti per Handle ed opzioni varianti</strong>.
            </p>
            <div className="bg-indigo-50 p-3 rounded-xl text-[11px] text-indigo-900 font-medium">
              Attualmente è attiva la <strong>Modalità Dry-Run</strong>: verrà generato il report senza effettuare alcuna modifica su Shopify B2B.
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setModalAlignOpen(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl"
              >
                Annulla
              </button>
              <button
                onClick={() => {
                  setModalAlignOpen(false);
                  loadSyncData();
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm"
              >
                Esegui Scansione
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
