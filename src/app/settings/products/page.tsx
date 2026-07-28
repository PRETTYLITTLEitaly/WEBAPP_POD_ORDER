"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { 
  Package, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Save, 
  FileCode, 
  Link as LinkIcon, 
  Ruler, 
  Palette, 
  RefreshCw, 
  ExternalLink,
  Store,
  Folder,
  Tag as TagIcon
} from "lucide-react";

interface ProductItem {
  id: string;
  title: string;
  handle: string;
  productType: string;
  tags: string[];
  collections?: string[];
  imageUrl: string | null;
  imageAlt: string;
  metafields: {
    pod_svg_url: string;
    pod_svg_file_id: string;
    pod_svg_file_url: string;
    pod_height: string;
    pod_width: string;
    colore_stick: string;
    colore_base: string;
  };
  status: "complete" | "partial" | "missing";
}

interface ShopifyFile {
  id: string;
  url: string;
  filename: string;
}

interface CollectionItem {
  id: string;
  title: string;
  handle: string;
  productsCount?: number;
}

const DEFAULT_COLOR_OPTIONS = [
  "Nero", "Bianco", "Trasparente", "Naturale", "Legno", "Oro", "Argento", 
  "Rosso", "Blu", "Azzurro", "Verde", "Rosa", "Giallo", "Tiffany", "Bordeaux", "Foresta"
];

export default function ProductMetafieldsPage() {
  const [store, setStore] = useState<"b2c" | "b2b">("b2c");
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [shopifyFiles, setShopifyFiles] = useState<ShopifyFile[]>([]);
  const [collections, setCollections] = useState<CollectionItem[]>([]);
  const [tagsList, setTagsList] = useState<string[]>([]);
  const [typesList, setTypesList] = useState<string[]>([]);

  const [coloreStickList, setColoreStickList] = useState<string[]>(DEFAULT_COLOR_OPTIONS);
  const [coloreBaseList, setColoreBaseList] = useState<string[]>(DEFAULT_COLOR_OPTIONS);
  
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  
  // Filtri Shopify
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCollection, setSelectedCollection] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "missing" | "complete">("all");
  
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form local state per ogni prodotto
  const [editedMetafields, setEditedMetafields] = useState<{ [productId: string]: ProductItem["metafields"] }>({});

  const fetchProductsData = async () => {
    setLoading(true);
    try {
      const url = `/api/products/metafields?store=${store}&query=${encodeURIComponent(searchQuery)}&collection=${encodeURIComponent(selectedCollection)}&tag=${encodeURIComponent(selectedTag)}&product_type=${encodeURIComponent(selectedType)}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.success) {
        setProducts(data.products || []);
        setShopifyFiles(data.files || []);
        setCollections(data.collections || []);
        setTagsList(data.tags || []);
        setTypesList(data.productTypes || []);

        if (data.coloreStickChoices?.length > 0) {
          setColoreStickList(Array.from(new Set([...data.coloreStickChoices, ...DEFAULT_COLOR_OPTIONS])));
        }
        if (data.coloreBaseChoices?.length > 0) {
          setColoreBaseList(Array.from(new Set([...data.coloreBaseChoices, ...DEFAULT_COLOR_OPTIONS])));
        }

        // Inizializziamo lo stato dei form
        const initialFormState: { [id: string]: ProductItem["metafields"] } = {};
        (data.products || []).forEach((p: ProductItem) => {
          initialFormState[p.id] = { ...p.metafields };
        });
        setEditedMetafields(initialFormState);
      }
    } catch (e: any) {
      console.error("Errore fetch metafields:", e);
      setMessage({ type: "error", text: "Errore nel caricamento dei dati da Shopify." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductsData();
  }, [store, selectedCollection, selectedTag, selectedType]);

  const handleInputChange = (productId: string, field: keyof ProductItem["metafields"], value: string) => {
    setEditedMetafields(prev => {
      const currentForm = prev[productId] || {
        pod_svg_url: "", pod_svg_file_id: "", pod_svg_file_url: "", pod_height: "", pod_width: "", colore_stick: "", colore_base: ""
      };

      const updated = {
        ...currentForm,
        [field]: value
      };

      // Se viene aggiornato pod_svg_url con un link, popoliamo automaticamente anche pod_svg_file_id se vuoto
      if (field === "pod_svg_url" && value && !updated.pod_svg_file_id) {
        updated.pod_svg_file_id = value;
      }
      // Se viene aggiornato pod_svg_file_id con un file o link, aggiorniamo anche pod_svg_url
      if (field === "pod_svg_file_id" && value) {
        const fileObj = shopifyFiles.find(f => f.id === value);
        if (fileObj && fileObj.url) {
          updated.pod_svg_url = fileObj.url;
        } else if (value.startsWith("http")) {
          updated.pod_svg_url = value;
        }
      }

      return {
        ...prev,
        [productId]: updated
      };
    });
  };

  const handleSaveProductMetafields = async (productId: string) => {
    setSavingId(productId);
    setMessage(null);

    const currentMetafields = editedMetafields[productId];

    try {
      const res = await fetch("/api/products/metafields", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store,
          productId,
          metafields: currentMetafields
        })
      });

      const data = await res.json();

      if (data.success) {
        setMessage({ type: "success", text: "Metafield salvati con successo su Shopify!" });
        fetchProductsData();
      } else {
        setMessage({ type: "error", text: data.error || "Errore durante il salvataggio." });
      }
    } catch (e: any) {
      setMessage({ type: "error", text: e.message });
    } finally {
      setSavingId(null);
    }
  };

  const filteredProducts = products.filter(p => {
    if (filterStatus === "missing" && p.status === "complete") return false;
    if (filterStatus === "complete" && p.status !== "complete") return false;
    return true;
  });

  return (
    <div className="p-8 space-y-6 max-w-7xl">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="w-6 h-6 text-indigo-600" />
            Configuratore Metafield Prodotti & Grafiche SVG
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Imposta rapidamente i 6 metafield di produzione per tutti i prodotti Shopify.
          </p>
        </div>

        {/* Store Selector Switcher */}
        <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200 shrink-0">
          <button
            onClick={() => setStore("b2c")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              store === "b2c"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            Store B2C (Prettylittle.it)
          </button>
          <button
            onClick={() => setStore("b2b")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              store === "b2b"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <Store className="w-3.5 h-3.5 text-purple-600" />
            Store B2B (Wholesale)
          </button>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-xl border flex items-center justify-between text-sm font-semibold ${
          message.type === "success" 
            ? "bg-green-50 border-green-200 text-green-800" 
            : "bg-red-50 border-red-200 text-red-800"
        }`}>
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-xs underline font-bold">Chiudi</button>
        </div>
      )}

      {/* BARRA FILTRI E RICERCA STILE SHOPIFY */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          
          {/* Cerca per Titolo / Nome */}
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            <input 
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") fetchProductsData(); }}
              placeholder="Cerca per titolo..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-gray-50/50"
            />
          </div>

          {/* Filtro Collezione Shopify */}
          <div className="relative">
            <select
              value={selectedCollection}
              onChange={e => setSelectedCollection(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-gray-50/50"
            >
              <option value="">-- Filtra per Collezione --</option>
              {collections.map(col => (
                <option key={col.id} value={col.id}>
                  📁 {col.title} ({col.productsCount ?? "N"} prodotti)
                </option>
              ))}
            </select>
          </div>

          {/* Filtro Tag Shopify */}
          <div className="relative">
            <select
              value={selectedTag}
              onChange={e => setSelectedTag(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-gray-50/50"
            >
              <option value="">-- Filtra per Tag Shopify --</option>
              {tagsList.map(tag => (
                <option key={tag} value={tag}>
                  🏷️ {tag}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro Tipo Prodotto */}
          <div className="relative">
            <select
              value={selectedType}
              onChange={e => setSelectedType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-gray-50/50"
            >
              <option value="">-- Filtra per Tipo Prodotto --</option>
              {typesList.map(t => (
                <option key={t} value={t}>
                  📦 {t}
                </option>
              ))}
            </select>
          </div>

        </div>

        {/* Tab Stato Metafield & Refresh */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-gray-100">
          
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl border border-gray-200 text-xs font-bold shrink-0">
            <button
              onClick={() => setFilterStatus("all")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterStatus === "all" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"
              }`}
            >
              Tutti i Prodotti ({products.length})
            </button>
            <button
              onClick={() => setFilterStatus("missing")}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                filterStatus === "missing" ? "bg-white text-amber-800 shadow-sm" : "text-gray-500 hover:text-amber-700"
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              Metafield Incompleti ({products.filter(p => p.status !== "complete").length})
            </button>
            <button
              onClick={() => setFilterStatus("complete")}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                filterStatus === "complete" ? "bg-white text-green-800 shadow-sm" : "text-gray-500 hover:text-green-700"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
              Completi ({products.filter(p => p.status === "complete").length})
            </button>
          </div>

          <button
            onClick={fetchProductsData}
            className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors shrink-0 flex items-center gap-1 text-xs font-medium"
            title="Ricarica Prodotti"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            <span>Aggiorna Dati</span>
          </button>

        </div>

      </div>

      {/* LISTA SCHEDE PRODOTTI - LAYOUT COMPATTO CON IMMAGINE A SINISTRA */}
      {loading ? (
        <div className="p-16 text-center text-gray-400 font-medium animate-pulse">
          Recupero prodotti, file SVG e collezioni da Shopify in corso...
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-white p-12 text-center text-gray-500 rounded-xl border border-gray-200">
          Nessun prodotto trovato con i filtri selezionati.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredProducts.map(product => {
            const form = editedMetafields[product.id] || product.metafields;
            const isSaving = savingId === product.id;

            return (
              <div 
                key={product.id}
                className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col md:flex-row hover:border-gray-300 transition-all"
              >
                {/* IMMAGINE PRODOTTO A TUTTA ALTEZZA SULLA ESTREMA SINISTRA */}
                <div className="w-full md:w-36 bg-gray-50 border-b md:border-b-0 md:border-r border-gray-200 flex items-center justify-center p-3 shrink-0">
                  {product.imageUrl ? (
                    <img 
                      src={product.imageUrl} 
                      alt={product.imageAlt}
                      className="w-full max-h-36 object-contain"
                    />
                  ) : (
                    <Package className="w-10 h-10 text-gray-300" />
                  )}
                </div>

                {/* AREA CONTENUTO DESTRO (Header + Metafield Compatti) */}
                <div className="flex-1 p-5 space-y-4">
                  
                  {/* INTESTAZIONE SCHEDA CON RECAP COMPLETO COLLEZIONI E TAG */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-gray-100">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-gray-900 text-base">{product.title}</h3>
                        <a 
                          href={`https://admin.shopify.com/store/${store === "b2b" ? "wholesale-prettylittle-it" : "prettylittle-it"}/products/${product.id.split("/").pop()}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-gray-400 hover:text-indigo-600 transition-colors"
                          title="Apri su Shopify Admin"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>

                      {/* RECAP DETTAGLIATO COLLEZIONI & TAG */}
                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        <span className="text-gray-400 font-mono text-[11px]">Handle: {product.handle}</span>

                        {/* Collezioni */}
                        {product.collections && product.collections.length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap">
                            {product.collections.map(col => (
                              <span key={col} className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md font-semibold text-[10px] flex items-center gap-1 border border-purple-100">
                                <Folder className="w-3 h-3 text-purple-500" />
                                {col}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Tipo Prodotto */}
                        {product.productType && (
                          <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-semibold text-[10px] border border-blue-100">
                            📦 {product.productType}
                          </span>
                        )}

                        {/* Tag */}
                        {product.tags && product.tags.length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap">
                            {product.tags.map(tag => (
                              <span key={tag} className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-semibold text-[10px] border border-indigo-100">
                                🏷️ {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Badge Stato & Bottone Salva */}
                    <div className="flex items-center gap-2 shrink-0">
                      {product.status === "complete" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-green-100 text-green-800">
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                          Completo
                        </span>
                      ) : product.status === "partial" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          Parziale
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-100 text-red-800">
                          <XCircle className="w-3.5 h-3.5 text-red-600" />
                          Nessun Metafield
                        </span>
                      )}

                      <button
                        onClick={() => handleSaveProductMetafields(product.id)}
                        disabled={isSaving}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <Save className={`w-3.5 h-3.5 ${isSaving ? "animate-spin" : ""}`} />
                        <span>{isSaving ? "Salvataggio..." : "Salva Metafield"}</span>
                      </button>
                    </div>
                  </div>

                  {/* FORM GRIGLIA METAFIELD COMPATTA (3 COLONNE x 2 RIGHE) */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    
                    {/* 1. custom.pod_svg_url */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-700 flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <LinkIcon className="w-3 h-3 text-indigo-600" />
                          URL Grafica SVG
                        </span>
                        <code className="text-gray-400 font-mono text-[9px]">custom.pod_svg_url</code>
                      </label>
                      <input 
                        type="text"
                        value={form.pod_svg_url || ""}
                        onChange={e => handleInputChange(product.id, "pod_svg_url", e.target.value)}
                        placeholder="https://cdn.shopify.com/.../grafica.svg"
                        className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-gray-50/50"
                      />
                    </div>

                    {/* 2. pod.svg (File Reference Shopify o URL) */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-700 flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <FileCode className="w-3 h-3 text-indigo-600" />
                          File Reference SVG
                        </span>
                        <code className="text-gray-400 font-mono text-[9px]">pod.svg</code>
                      </label>
                      {shopifyFiles.length > 0 ? (
                        <select
                          value={form.pod_svg_file_id || ""}
                          onChange={e => handleInputChange(product.id, "pod_svg_file_id", e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                        >
                          <option value="">-- Seleziona File SVG ({shopifyFiles.length} trovati) --</option>
                          {shopifyFiles.map(file => (
                            <option key={file.id} value={file.id}>
                              📄 {file.filename}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input 
                          type="text"
                          value={form.pod_svg_file_id || ""}
                          onChange={e => handleInputChange(product.id, "pod_svg_file_id", e.target.value)}
                          placeholder="Incolla URL o GID del file SVG..."
                          className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                        />
                      )}
                    </div>

                    {/* 3. pod.height */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-700 flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <Ruler className="w-3 h-3 text-indigo-600" />
                          Altezza (mm)
                        </span>
                        <code className="text-gray-400 font-mono text-[9px]">pod.height</code>
                      </label>
                      <input 
                        type="text"
                        value={form.pod_height || ""}
                        onChange={e => handleInputChange(product.id, "pod_height", e.target.value)}
                        placeholder="Es. 200"
                        className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-gray-50/50"
                      />
                    </div>

                    {/* 4. pod.width */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-700 flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <Ruler className="w-3 h-3 text-indigo-600" />
                          Larghezza (mm)
                        </span>
                        <code className="text-gray-400 font-mono text-[9px]">pod.width</code>
                      </label>
                      <input 
                        type="text"
                        value={form.pod_width || ""}
                        onChange={e => handleInputChange(product.id, "pod_width", e.target.value)}
                        placeholder="Es. 300"
                        className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-gray-50/50"
                      />
                    </div>

                    {/* 5. custom.colore_stick */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-700 flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <Palette className="w-3 h-3 text-indigo-600" />
                          Colore Stick
                        </span>
                        <code className="text-gray-400 font-mono text-[9px]">custom.colore_stick</code>
                      </label>
                      <select
                        value={form.colore_stick || ""}
                        onChange={e => handleInputChange(product.id, "colore_stick", e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                      >
                        <option value="">-- Seleziona Colore Stick --</option>
                        {coloreStickList.map(color => (
                          <option key={color} value={color}>
                            {color}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 6. custom.colore_base */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-700 flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <Palette className="w-3.5 h-3.5 text-indigo-600" />
                          Colore Base
                        </span>
                        <code className="text-gray-400 font-mono text-[9px]">custom.colore_base</code>
                      </label>
                      <select
                        value={form.colore_base || ""}
                        onChange={e => handleInputChange(product.id, "colore_base", e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                      >
                        <option value="">-- Seleziona Colore Base --</option>
                        {coloreBaseList.map(color => (
                          <option key={color} value={color}>
                            {color}
                          </option>
                        ))}
                      </select>
                    </div>

                  </div>

                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
