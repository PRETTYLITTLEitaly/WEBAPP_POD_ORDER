"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { 
  Package, 
  Search, 
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
  Tag as TagIcon,
  Eye,
  X,
  Zap,
  Wand2,
  Plus,
  ImageIcon,
  Grid,
  Sparkles,
  Trash2
} from "lucide-react";

interface CollectionRef {
  id: string;
  title: string;
  isAutomated?: boolean;
}

interface ProductItem {
  id: string;
  title: string;
  handle: string;
  productType: string;
  tags: string[];
  collections: CollectionRef[];
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
    colore_cavo: string;
    colore_manico: string;
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
  isAutomated?: boolean;
}

const DEFAULT_COLOR_OPTIONS = [
  "Nero", "Bianco", "Trasparente", "Naturale", "Legno", "Oro", "Argento", 
  "Rosso", "Blu", "Azzurro", "Verde", "Rosa", "Giallo", "Tiffany", "Bordeaux", "Foresta", "Tessuto Nero", "Tessuto Rosso"
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
  const [coloreCavoList, setColoreCavoList] = useState<string[]>(DEFAULT_COLOR_OPTIONS);
  const [coloreManicoList, setColoreManicoList] = useState<string[]>(DEFAULT_COLOR_OPTIONS);
  
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  
  const [zoomedImage, setZoomedImage] = useState<{ url: string; title: string } | null>(null);

  // Modal Galleria Anteprime SVG
  const [svgGalleryModalProductId, setSvgGalleryModalProductId] = useState<string | null>(null);
  const [svgGallerySearch, setSvgGallerySearch] = useState("");

  // Filtri Shopify
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCollection, setSelectedCollection] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "missing" | "partial" | "complete">("all");

  // Filtro specifico per la mancanza di un metafield
  const [selectedMetafieldKey, setSelectedMetafieldKey] = useState<string>("");
  const [metafieldCondition, setMetafieldCondition] = useState<"missing" | "present">("missing");
  
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form local state per ogni prodotto
  const [editedMetafields, setEditedMetafields] = useState<{ [productId: string]: ProductItem["metafields"] }>({});
  const [editedTags, setEditedTags] = useState<{ [productId: string]: string[] }>({});
  const [editedCollections, setEditedCollections] = useState<{ [productId: string]: CollectionRef[] }>({});

  const [addingTagForProduct, setAddingTagForProduct] = useState<string | null>(null);
  const [newTagInput, setNewTagInput] = useState("");

  const [addingCollectionForProduct, setAddingCollectionForProduct] = useState<string | null>(null);

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

        if (data.coloreStickChoices && Array.isArray(data.coloreStickChoices) && data.coloreStickChoices.length > 0) {
          setColoreStickList(Array.from(new Set(data.coloreStickChoices)));
        } else {
          setColoreStickList(DEFAULT_COLOR_OPTIONS);
        }

        if (data.coloreBaseChoices && Array.isArray(data.coloreBaseChoices) && data.coloreBaseChoices.length > 0) {
          setColoreBaseList(Array.from(new Set(data.coloreBaseChoices)));
        } else {
          setColoreBaseList(DEFAULT_COLOR_OPTIONS);
        }

        if (data.coloreCavoChoices && Array.isArray(data.coloreCavoChoices) && data.coloreCavoChoices.length > 0) {
          setColoreCavoList(Array.from(new Set(data.coloreCavoChoices)));
        } else {
          setColoreCavoList(DEFAULT_COLOR_OPTIONS);
        }

        if (data.coloreManicoChoices && Array.isArray(data.coloreManicoChoices) && data.coloreManicoChoices.length > 0) {
          setColoreManicoList(Array.from(new Set(data.coloreManicoChoices)));
        } else {
          setColoreManicoList(DEFAULT_COLOR_OPTIONS);
        }

        const initialFormState: { [id: string]: ProductItem["metafields"] } = {};
        const initialTagsState: { [id: string]: string[] } = {};
        const initialCollectionsState: { [id: string]: CollectionRef[] } = {};

        (data.products || []).forEach((p: ProductItem) => {
          initialFormState[p.id] = { ...p.metafields };
          initialTagsState[p.id] = [...(p.tags || [])];
          initialCollectionsState[p.id] = [...(p.collections || [])];
        });

        setEditedMetafields(initialFormState);
        setEditedTags(initialTagsState);
        setEditedCollections(initialCollectionsState);
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
        pod_svg_url: "", pod_svg_file_id: "", pod_svg_file_url: "", pod_height: "", pod_width: "", colore_stick: "", colore_base: "", colore_cavo: "", colore_manico: ""
      };

      const updated = {
        ...currentForm,
        [field]: value
      };

      if (field === "pod_svg_url" && value && !updated.pod_svg_file_id) {
        updated.pod_svg_file_id = value;
      }
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

  const handleAutoMatchSvg = (productId: string, productTitle: string, productHandle: string) => {
    if (shopifyFiles.length === 0) {
      setMessage({ type: "error", text: "Nessun file SVG disponibile in memoria per l'abbinamento." });
      return;
    }

    const cleanTitle = (productTitle + " " + productHandle).toLowerCase()
      .replace(/[^a-z0-9]/g, " ")
      .split(" ")
      .filter(w => w.length > 2);

    let bestFile: ShopifyFile | null = null;
    let maxScore = 0;

    shopifyFiles.forEach(file => {
      const fn = file.filename.toLowerCase();
      let score = 0;

      cleanTitle.forEach(word => {
        if (fn.includes(word)) {
          score += word.length * 3;
        }
      });

      if (score > maxScore) {
        maxScore = score;
        bestFile = file;
      }
    });

    if (bestFile && maxScore > 0) {
      const matched = bestFile as ShopifyFile;
      setEditedMetafields(prev => ({
        ...prev,
        [productId]: {
          ...(prev[productId] || {}),
          pod_svg_file_id: matched.id,
          pod_svg_url: matched.url
        } as any
      }));
      setMessage({ 
        type: "success", 
        text: `🪄 Bacchetta Magica: Abbinata l'anteprima SVG "${matched.filename}" col punteggio di affinità (${maxScore})!` 
      });
    } else {
      setMessage({ 
        type: "error", 
        text: `🪄 Bacchetta Magica: Nessun file SVG con nome simile a "${productTitle}" trovato.` 
      });
    }
  };

  const handleSelectSvgFromGallery = (productId: string, file: ShopifyFile) => {
    setEditedMetafields(prev => ({
      ...prev,
      [productId]: {
        ...(prev[productId] || {}),
        pod_svg_file_id: file.id,
        pod_svg_url: file.url
      } as any
    }));
    setSvgGalleryModalProductId(null);
    setMessage({ type: "success", text: `Selezionato il file SVG: ${file.filename}` });
  };

  const handleRemoveTag = (productId: string, tagToRemove: string) => {
    setEditedTags(prev => ({
      ...prev,
      [productId]: (prev[productId] || []).filter(t => t !== tagToRemove)
    }));
  };

  const handleAddTag = (productId: string, tagToAdd: string) => {
    const cleanTag = tagToAdd.trim();
    if (!cleanTag) return;
    setEditedTags(prev => {
      const current = prev[productId] || [];
      if (current.includes(cleanTag)) return prev;
      return {
        ...prev,
        [productId]: [...current, cleanTag]
      };
    });
    setNewTagInput("");
    setAddingTagForProduct(null);
  };

  const handleRemoveCollection = (productId: string, collectionIdToRemove: string) => {
    setEditedCollections(prev => ({
      ...prev,
      [productId]: (prev[productId] || []).filter(c => c.id !== collectionIdToRemove)
    }));
  };

  const handleAddCollection = (productId: string, collectionItem: CollectionItem) => {
    setEditedCollections(prev => {
      const current = prev[productId] || [];
      if (current.some(c => c.id === collectionItem.id)) return prev;
      return {
        ...prev,
        [productId]: [...current, { id: collectionItem.id, title: collectionItem.title, isAutomated: collectionItem.isAutomated }]
      };
    });
    setAddingCollectionForProduct(null);
  };

  const handleSaveProduct = async (product: ProductItem) => {
    setSavingId(product.id);
    setMessage(null);

    const currentMetafields = editedMetafields[product.id];
    const currentTags = editedTags[product.id];
    const currentCollections = editedCollections[product.id] || [];

    const originalColIds = new Set((product.collections || []).map(c => c.id));
    const currentColIds = new Set(currentCollections.map(c => c.id));

    const addCollectionIds = Array.from(currentColIds).filter(id => !originalColIds.has(id));
    const removeCollectionIds = Array.from(originalColIds).filter(id => !currentColIds.has(id));

    try {
      const res = await fetch("/api/products/metafields", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store,
          productId: product.id,
          metafields: currentMetafields,
          tags: currentTags,
          addCollectionIds,
          removeCollectionIds
        })
      });

      const data = await res.json();

      if (data.success) {
        setMessage({ type: "success", text: "Prodotto, Tag e Metafield salvati con successo su Shopify!" });
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
    if (filterStatus === "missing" && p.status !== "missing") return false;
    if (filterStatus === "partial" && p.status !== "partial") return false;
    if (filterStatus === "complete" && p.status !== "complete") return false;

    if (selectedMetafieldKey) {
      const val = p.metafields[selectedMetafieldKey as keyof typeof p.metafields];
      const isEmpty = !val || String(val).trim() === "";
      if (metafieldCondition === "missing" && !isEmpty) return false;
      if (metafieldCondition === "present" && isEmpty) return false;
    }

    return true;
  });

  const filteredGalleryFiles = shopifyFiles.filter(f => 
    f.filename.toLowerCase().includes(svgGallerySearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* Header Page */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="w-6 h-6 text-indigo-600" />
            Configuratore Metafield Prodotti & Grafiche SVG
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestisci gli 8 metafield di produzione con anteprime grafiche SVG, tasto Cestino rapido per svuotare i parametri, Bacchetta Magica, Tag e Collezioni.
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
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          
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
                  {col.isAutomated ? "⚡ [Automatica]" : "📁 [Manuale]"} {col.title} ({col.productsCount ?? "N"} prodotti)
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

          {/* Verifica Metafield Specifico */}
          <div className="relative">
            <select
              value={selectedMetafieldKey}
              onChange={e => setSelectedMetafieldKey(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-gray-50/50"
            >
              <option value="">-- Verifica Metafield --</option>
              <option value="pod_svg_url">URL Grafica SVG</option>
              <option value="pod_svg_file_id">File Reference SVG</option>
              <option value="pod_height">Altezza (mm)</option>
              <option value="pod_width">Larghezza (mm)</option>
              <option value="colore_stick">Colore Stick</option>
              <option value="colore_base">Colore Base</option>
              <option value="colore_cavo">Colore Cavo</option>
              <option value="colore_manico">Colore Manico</option>
            </select>
          </div>

          {/* Condizione Verifica Metafield */}
          <div className="relative">
            <select
              value={metafieldCondition}
              onChange={e => setMetafieldCondition(e.target.value as "missing" | "present")}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-gray-50/50"
            >
              <option value="missing">Mancante (vuoto)</option>
              <option value="present">Compilato (presente)</option>
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
              Tutti ({products.length})
            </button>
            <button
              onClick={() => setFilterStatus("missing")}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                filterStatus === "missing" ? "bg-white text-red-800 shadow-sm font-bold" : "text-gray-500 hover:text-red-700"
              }`}
            >
              <XCircle className="w-3.5 h-3.5 text-red-500" />
              Nessun Metafield ({products.filter(p => p.status === "missing").length})
            </button>
            <button
              onClick={() => setFilterStatus("partial")}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                filterStatus === "partial" ? "bg-white text-amber-800 shadow-sm font-bold" : "text-gray-500 hover:text-amber-700"
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              Parziali ({products.filter(p => p.status === "partial").length})
            </button>
            <button
              onClick={() => setFilterStatus("complete")}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                filterStatus === "complete" ? "bg-white text-green-800 shadow-sm font-bold" : "text-gray-500 hover:text-green-700"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
              Completi ({products.filter(p => p.status === "complete").length})
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-gray-600">
            <span>📄 {shopifyFiles.length} file .SVG trovati su Shopify</span>
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

      </div>

      {/* LISTA SCHEDE PRODOTTI */}
      {loading ? (
        <div className="p-16 text-center text-gray-400 font-medium animate-pulse">
          Recupero prodotti, collezioni e file SVG da Shopify in corso...
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-white p-12 text-center text-gray-500 rounded-xl border border-gray-200">
          Nessun prodotto trovato con i filtri selezionati.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredProducts.map(product => {
            const form = editedMetafields[product.id] || product.metafields;
            const currentTags = editedTags[product.id] || [];
            const currentCols = editedCollections[product.id] || [];
            const isSaving = savingId === product.id;

            const selectedFileObj = shopifyFiles.find(f => f.id === form.pod_svg_file_id);
            const activeSvgUrl = selectedFileObj?.url || form.pod_svg_url || form.pod_svg_file_url || "";
            const activeSvgFilename = selectedFileObj?.filename || (activeSvgUrl ? activeSvgUrl.split("?")[0].split("/").pop() : "");

            return (
              <div 
                key={product.id}
                className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col md:flex-row hover:border-gray-300 transition-all"
              >
                {/* IMMAGINE PRODOTTO CON TASTO OCCHIO SOTTO */}
                <div className="w-full md:w-44 bg-gray-50 border-b md:border-b-0 md:border-r border-gray-200 flex flex-col items-center justify-between p-3 shrink-0">
                  <div className="flex-1 flex items-center justify-center w-full">
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

                  {product.imageUrl && (
                    <button
                      onClick={() => setZoomedImage({ url: product.imageUrl!, title: product.title })}
                      className="mt-2 w-full py-1.5 bg-white hover:bg-gray-100 border border-gray-300 rounded-xl text-xs font-bold text-gray-700 flex items-center justify-center gap-1.5 shadow-sm transition-all"
                      title="Ingrandisci foto prodotto"
                    >
                      <Eye className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Ingrandisci</span>
                    </button>
                  )}
                </div>

                {/* AREA CONTENUTO DESTRO */}
                <div className="flex-1 p-5 space-y-4">
                  
                  {/* INTESTAZIONE SCHEDA */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-gray-100">
                    <div className="space-y-2 flex-1">
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

                      {/* GESTIONE COLLEZIONI & TAG CON DISTINZIONE AUTOMATICHE VS MANUALI */}
                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        <span className="text-gray-400 font-mono text-[11px]">Handle: {product.handle}</span>

                        {/* COLLEZIONI */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {currentCols.map(col => (
                            col.isAutomated ? (
                              <span 
                                key={col.id} 
                                className="bg-amber-50 text-amber-900 px-2 py-0.5 rounded-md font-bold text-[10px] flex items-center gap-1 border border-amber-200 shadow-2xs"
                                title="Collezione Automatica Shopify"
                              >
                                <Sparkles className="w-3 h-3 text-amber-600" />
                                {col.title}
                                <span className="text-[8px] bg-amber-200/80 text-amber-900 px-1 py-0.2 rounded font-mono uppercase">
                                  Auto
                                </span>
                              </span>
                            ) : (
                              <span 
                                key={col.id} 
                                className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md font-semibold text-[10px] flex items-center gap-1 border border-purple-100 group"
                                title="Collezione Manuale"
                              >
                                <Folder className="w-3 h-3 text-purple-500" />
                                {col.title}
                                <button
                                  onClick={() => handleRemoveCollection(product.id, col.id)}
                                  className="text-purple-400 hover:text-red-600 ml-1 transition-colors"
                                  title="Rimuovi da questa collezione manuale"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            )
                          ))}

                          {addingCollectionForProduct === product.id ? (
                            <div className="flex items-center gap-1">
                              <select
                                onChange={e => {
                                  const selected = collections.find(c => c.id === e.target.value);
                                  if (selected) handleAddCollection(product.id, selected);
                                }}
                                defaultValue=""
                                className="px-2 py-0.5 border border-purple-300 rounded text-[10px] font-semibold bg-white"
                              >
                                <option value="" disabled>-- Seleziona Collezione Manuale --</option>
                                {collections.filter(c => !c.isAutomated && !currentCols.some(cc => cc.id === c.id)).map(c => (
                                  <option key={c.id} value={c.id}>
                                    📁 {c.title}
                                  </option>
                                ))}
                              </select>
                              <button onClick={() => setAddingCollectionForProduct(null)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setAddingCollectionForProduct(product.id)}
                              className="bg-gray-100 hover:bg-purple-100 text-gray-600 hover:text-purple-800 px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 border border-gray-200 transition-all"
                            >
                              <Plus className="w-3 h-3" />
                              Collezione
                            </button>
                          )}
                        </div>

                        {/* TAG */}
                        <div className="flex items-center gap-1.5 flex-wrap border-l border-gray-200 pl-2">
                          {currentTags.map(tag => (
                            <span 
                              key={tag} 
                              className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-semibold text-[10px] flex items-center gap-1 border border-indigo-100 group"
                            >
                              🏷️ {tag}
                              <button
                                onClick={() => handleRemoveTag(product.id, tag)}
                                className="text-indigo-400 hover:text-red-600 ml-1 transition-colors"
                                title="Elimina tag"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}

                          {addingTagForProduct === product.id ? (
                            <div className="flex items-center gap-1">
                              <input 
                                type="text"
                                value={newTagInput}
                                onChange={e => setNewTagInput(e.target.value)}
                                onKeyDown={e => { if (e.key === "Enter") handleAddTag(product.id, newTagInput); }}
                                placeholder="Nuovo tag..."
                                className="px-2 py-0.5 border border-indigo-300 rounded text-[10px] font-semibold w-24 bg-white"
                              />
                              <button 
                                onClick={() => handleAddTag(product.id, newTagInput)}
                                className="text-xs text-indigo-600 font-bold hover:underline"
                              >
                                OK
                              </button>
                              <button onClick={() => setAddingTagForProduct(null)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setAddingTagForProduct(product.id)}
                              className="bg-gray-100 hover:bg-indigo-100 text-gray-600 hover:text-indigo-800 px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 border border-gray-200 transition-all"
                            >
                              <Plus className="w-3 h-3" />
                              Tag
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Badge & Salva */}
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
                        onClick={() => handleSaveProduct(product)}
                        disabled={isSaving}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <Save className={`w-3.5 h-3.5 ${isSaving ? "animate-spin" : ""}`} />
                        <span>{isSaving ? "Salvataggio..." : "Salva Prodotto"}</span>
                      </button>
                    </div>
                  </div>

                  {/* FORM GRIGLIA I 7 METAFIELD (CON CESTINO RAPIDO SU OGNI CAMPO) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    
                    {/* 1. custom.pod_svg_url */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-700 flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <LinkIcon className="w-3 h-3 text-indigo-600" />
                          URL Grafica SVG
                        </span>
                        <code className="text-gray-400 font-mono text-[9px]">custom.pod_svg_url</code>
                      </label>
                      <div className="relative flex items-center">
                        <input 
                          type="text"
                          value={form.pod_svg_url || ""}
                          onChange={e => handleInputChange(product.id, "pod_svg_url", e.target.value)}
                          placeholder="https://cdn.shopify.com/.../grafica.svg"
                          className="w-full pl-2.5 pr-8 py-1.5 border border-gray-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-gray-50/50"
                        />
                        {form.pod_svg_url && (
                          <button
                            onClick={() => handleInputChange(product.id, "pod_svg_url", "")}
                            className="absolute right-2 text-gray-400 hover:text-red-600 transition-colors p-0.5"
                            title="Svuota URL SVG"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 2. pod.svg */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-gray-700 flex items-center gap-1">
                          <FileCode className="w-3 h-3 text-indigo-600" />
                          File Reference SVG
                        </label>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleAutoMatchSvg(product.id, product.title, product.handle)}
                            className="text-[10px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded border border-amber-200 flex items-center gap-1 transition-all"
                            title="Auto-abbina l'SVG con nome più simile al prodotto"
                          >
                            <Wand2 className="w-3 h-3 text-amber-600" />
                            <span>Magia</span>
                          </button>

                          <button
                            onClick={() => {
                              setSvgGalleryModalProductId(product.id);
                              setSvgGallerySearch("");
                            }}
                            className="text-[10px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded border border-indigo-200 flex items-center gap-1 transition-all"
                            title="Sfoglia tutte le anteprime grafiche in galleria"
                          >
                            <Grid className="w-3 h-3 text-indigo-600" />
                            <span>Galleria</span>
                          </button>
                        </div>
                      </div>

                      <div className="relative flex items-center">
                        {shopifyFiles.length > 0 ? (
                          <select
                            value={form.pod_svg_file_id || ""}
                            onChange={e => handleInputChange(product.id, "pod_svg_file_id", e.target.value)}
                            className="w-full pl-2.5 pr-8 py-1.5 border border-gray-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                          >
                            <option value="">-- Seleziona File SVG ({shopifyFiles.length} file .SVG) --</option>
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
                            placeholder="Incolla GID o URL del file SVG..."
                            className="w-full pl-2.5 pr-8 py-1.5 border border-gray-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                          />
                        )}

                        {form.pod_svg_file_id && (
                          <button
                            onClick={() => {
                              handleInputChange(product.id, "pod_svg_file_id", "");
                              handleInputChange(product.id, "pod_svg_url", "");
                            }}
                            className="absolute right-2 text-gray-400 hover:text-red-600 transition-colors p-0.5 z-10"
                            title="Deseleziona file SVG"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* BADGE ANTEPRIMA GRAFICA VISUALE SVG SELEZIONATA CON CESTINO RAPIDO */}
                      {activeSvgUrl && (
                        <div className="mt-1 flex items-center justify-between gap-2 bg-indigo-50/80 p-1.5 rounded-xl border border-indigo-100">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div 
                              onClick={() => setZoomedImage({ url: activeSvgUrl, title: `Anteprima Vettoriale: ${product.title}` })}
                              className="w-10 h-10 bg-white rounded-lg border border-indigo-200 flex items-center justify-center p-1 cursor-pointer hover:scale-105 transition-all shadow-sm shrink-0"
                              title="Clicca per ingrandire vettoriale"
                            >
                              <img src={activeSvgUrl} alt="SVG Preview" className="max-w-full max-h-full object-contain" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-[10px] font-bold text-indigo-950 truncate">
                                {activeSvgFilename || "Grafica SVG Selezionata"}
                              </div>
                              <button 
                                onClick={() => setZoomedImage({ url: activeSvgUrl, title: `Anteprima Vettoriale: ${product.title}` })}
                                className="text-[9px] text-indigo-600 font-bold hover:underline flex items-center gap-0.5 mt-0.5"
                              >
                                <Eye className="w-2.5 h-2.5" /> Ingrandisci Vettoriale
                              </button>
                            </div>
                          </div>

                          {/* TASTO CESTINO / X PER DESELEZIONARE L'SVG IMMEDIATAMENTE */}
                          <button
                            onClick={() => {
                              handleInputChange(product.id, "pod_svg_file_id", "");
                              handleInputChange(product.id, "pod_svg_url", "");
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                            title="Deseleziona e rimuovi SVG dal prodotto"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
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
                      <div className="relative flex items-center">
                        <input 
                          type="text"
                          value={form.pod_height || ""}
                          onChange={e => handleInputChange(product.id, "pod_height", e.target.value)}
                          placeholder="Es. 200"
                          className="w-full pl-2.5 pr-8 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-gray-50/50"
                        />
                        {form.pod_height && (
                          <button
                            onClick={() => handleInputChange(product.id, "pod_height", "")}
                            className="absolute right-2 text-gray-400 hover:text-red-600 transition-colors p-0.5"
                            title="Svuota Altezza"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
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
                      <div className="relative flex items-center">
                        <input 
                          type="text"
                          value={form.pod_width || ""}
                          onChange={e => handleInputChange(product.id, "pod_width", e.target.value)}
                          placeholder="Es. 300"
                          className="w-full pl-2.5 pr-8 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-gray-50/50"
                        />
                        {form.pod_width && (
                          <button
                            onClick={() => handleInputChange(product.id, "pod_width", "")}
                            className="absolute right-2 text-gray-400 hover:text-red-600 transition-colors p-0.5"
                            title="Svuota Larghezza"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
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
                      <div className="relative flex items-center">
                        <select
                          value={form.colore_stick || ""}
                          onChange={e => handleInputChange(product.id, "colore_stick", e.target.value)}
                          className="w-full pl-2.5 pr-8 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                        >
                          <option value="">-- Seleziona Colore Stick --</option>
                          {coloreStickList.map(color => (
                            <option key={color} value={color}>
                              {color}
                            </option>
                          ))}
                        </select>
                        {form.colore_stick && (
                          <button
                            onClick={() => handleInputChange(product.id, "colore_stick", "")}
                            className="absolute right-2 text-gray-400 hover:text-red-600 transition-colors p-0.5 z-10"
                            title="Reset Colore Stick"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
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
                      <div className="relative flex items-center">
                        <select
                          value={form.colore_base || ""}
                          onChange={e => handleInputChange(product.id, "colore_base", e.target.value)}
                          className="w-full pl-2.5 pr-8 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                        >
                          <option value="">-- Seleziona Colore Base --</option>
                          {coloreBaseList.map(color => (
                            <option key={color} value={color}>
                              {color}
                            </option>
                          ))}
                        </select>
                        {form.colore_base && (
                          <button
                            onClick={() => handleInputChange(product.id, "colore_base", "")}
                            className="absolute right-2 text-gray-400 hover:text-red-600 transition-colors p-0.5 z-10"
                            title="Reset Colore Base"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 7. custom.colore_cavo */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-700 flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <Zap className="w-3.5 h-3.5 text-indigo-600" />
                          Colore Cavo
                        </span>
                        <code className="text-gray-400 font-mono text-[9px]">custom.colore_cavo</code>
                      </label>
                      <div className="relative flex items-center">
                        <select
                          value={form.colore_cavo || ""}
                          onChange={e => handleInputChange(product.id, "colore_cavo", e.target.value)}
                          className="w-full pl-2.5 pr-8 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                        >
                          <option value="">-- Seleziona Colore Cavo --</option>
                          {coloreCavoList.map(color => (
                            <option key={color} value={color}>
                              {color}
                            </option>
                          ))}
                        </select>
                        {form.colore_cavo && (
                          <button
                            onClick={() => handleInputChange(product.id, "colore_cavo", "")}
                            className="absolute right-2 text-gray-400 hover:text-red-600 transition-colors p-0.5 z-10"
                            title="Reset Colore Cavo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 8. custom.colore_manico */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-700 flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <Palette className="w-3.5 h-3.5 text-indigo-600" />
                          Colore Manico
                        </span>
                        <code className="text-gray-400 font-mono text-[9px]">custom.colore_manico</code>
                      </label>
                      <div className="relative flex items-center">
                        <select
                          value={form.colore_manico || ""}
                          onChange={e => handleInputChange(product.id, "colore_manico", e.target.value)}
                          className="w-full pl-2.5 pr-8 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                        >
                          <option value="">-- Seleziona Colore Manico --</option>
                          {coloreManicoList.map(color => (
                            <option key={color} value={color}>
                              {color}
                            </option>
                          ))}
                        </select>
                        {form.colore_manico && (
                          <button
                            onClick={() => handleInputChange(product.id, "colore_manico", "")}
                            className="absolute right-2 text-gray-400 hover:text-red-600 transition-colors p-0.5 z-10"
                            title="Reset Colore Manico"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                  </div>

                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* MODAL GALLERIA ANTEPRIME GRAFICHE SVG */}
      {svgGalleryModalProductId && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setSvgGalleryModalProductId(null)}
        >
          <div 
            className="bg-white rounded-3xl p-6 max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl relative space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                  <Grid className="w-5 h-5 text-indigo-600" />
                  Galleria Anteprime Grafiche SVG ({shopifyFiles.length} file)
                </h3>
                <p className="text-xs text-gray-500">Seleziona visivamente l&apos;anteprima vettoriale per il prodotto.</p>
              </div>
              <button 
                onClick={() => setSvgGalleryModalProductId(null)}
                className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input 
                type="text"
                value={svgGallerySearch}
                onChange={e => setSvgGallerySearch(e.target.value)}
                placeholder="Filtra file SVG per nome..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-gray-50/50"
              />
            </div>

            <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 p-1">
              {filteredGalleryFiles.map(file => (
                <div 
                  key={file.id}
                  onClick={() => handleSelectSvgFromGallery(svgGalleryModalProductId, file)}
                  className="bg-gray-50 hover:bg-indigo-50/50 border border-gray-200 hover:border-indigo-400 rounded-2xl p-3 flex flex-col items-center justify-between gap-2 cursor-pointer transition-all hover:shadow-md group"
                >
                  <div className="w-full h-24 bg-white rounded-xl border border-gray-100 flex items-center justify-center p-2 group-hover:scale-105 transition-transform">
                    <img src={file.url} alt={file.filename} className="max-w-full max-h-full object-contain" />
                  </div>
                  <div className="w-full text-center">
                    <div className="text-[11px] font-bold text-gray-800 truncate" title={file.filename}>
                      {file.filename}
                    </div>
                    <span className="mt-1 inline-block px-2 py-0.5 rounded text-[9px] font-bold text-indigo-700 bg-indigo-100 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      Scegli SVG
                    </span>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      )}

      {/* MODAL INGRANDIMENTO FOTO PRODOTTO O VETTORIALE */}
      {zoomedImage && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setZoomedImage(null)}
        >
          <div 
            className="bg-white rounded-3xl p-4 max-w-2xl w-full shadow-2xl relative space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 px-2">
              <h3 className="font-bold text-gray-900 text-base">{zoomedImage.title}</h3>
              <button 
                onClick={() => setZoomedImage(null)}
                className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="w-full h-[450px] bg-gray-50 rounded-2xl overflow-hidden flex items-center justify-center p-4">
              <img 
                src={zoomedImage.url} 
                alt={zoomedImage.title}
                className="max-w-full max-h-full object-contain drop-shadow-md"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
