"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Ticket as TicketIcon,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  User,
  MapPin,
  Package,
  Truck,
  Send,
  ExternalLink,
  MessageSquare,
  Mail,
  Trash2,
  AlertCircle,
  Filter,
  Check,
  Sparkles,
} from "lucide-react";

export default function TicketsPageWrapper() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-gray-500">Caricamento pagina ticket...</div>}>
      <TicketsPage />
    </Suspense>
  );
}

function TicketsPage() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filtri
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "resolved">("all");
  const [causaleFilter, setCausaleFilter] = useState<string>("ALL");
  const [urgenzaFilter, setUrgenzaFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Ticket selezionato
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [selectedTicketOrder, setSelectedTicketOrder] = useState<any>(null);
  const [loadingOrder, setLoadingOrder] = useState(false);

  // Form note
  const [newNoteText, setNewNoteText] = useState("");
  const [submittingNote, setSubmittingNote] = useState(false);

  // Modal Nuovo Ticket
  const [newTicketOpen, setNewTicketOpen] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [causale, setCausale] = useState("ORDINE SMARRITO");
  const [urgenza, setUrgenza] = useState("MEDIO");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [activeEmailId, setActiveEmailId] = useState<string | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  const runAiAnalysis = async (emailIdParam?: string, convIdParam?: string) => {
    const targetEmailId = emailIdParam || activeEmailId;
    const targetConvId = convIdParam || activeConversationId;

    if (!targetEmailId && !targetConvId) return;

    setAiAnalyzing(true);
    try {
      const savedApiKey = typeof window !== "undefined" ? localStorage.getItem("anthropic_api_key") || "" : "";
      const res = await fetch("/api/ai/analyze-ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailId: targetEmailId,
          conversationId: targetConvId,
          apiKey: savedApiKey,
        }),
      });

      const json = await res.json();
      if (res.ok && json.analysis) {
        const { title: aiTitle, description: aiDesc, orderNumber: aiOrder, urgenza: aiUrgenza, causale: aiCausale, fullThreadText } = json.analysis;
        if (aiTitle) setTitle(aiTitle);
        if (aiOrder) setOrderNumber(aiOrder);
        if (aiUrgenza) setUrgenza(aiUrgenza);
        if (aiCausale) setCausale(aiCausale);

        if (aiDesc) setDescription(aiDesc);
      }
    } catch (err) {
      console.error("Errore analisi AI ticket:", err);
    } finally {
      setAiAnalyzing(false);
    }
  };

  const loadTickets = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/tickets");
      const json = await res.json();
      if (res.ok && json.tickets) {
        setTickets(json.tickets);
        if (json.tickets.length > 0 && !selectedTicketId) {
          setSelectedTicketId(json.tickets[0].id);
        }
      } else {
        setError(json.error || "Impossibile caricare i ticket");
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();

    if (searchParams) {
      const createParam = searchParams.get("create");
      const emailIdParam = searchParams.get("emailId");
      const convIdParam = searchParams.get("conversationId");

      if (createParam === "true" || emailIdParam || convIdParam) {
        const orderParam = searchParams.get("order") || "";
        const titleParam = searchParams.get("title") || "";
        const descParam = searchParams.get("desc") || "";

        if (orderParam) setOrderNumber(orderParam);
        if (titleParam) setTitle(titleParam);
        if (descParam) setDescription(descParam);

        if (emailIdParam) setActiveEmailId(emailIdParam);
        if (convIdParam) setActiveConversationId(convIdParam);

        setNewTicketOpen(true);

        if (emailIdParam || convIdParam) {
          runAiAnalysis(emailIdParam || undefined, convIdParam || undefined);
        }

        // Pulisce l'URL rimuovendo parametri per evitare riaperture del popup ai cambi di pagina
        if (typeof window !== "undefined") {
          window.history.replaceState({}, "", "/tickets");
        }
      }
    }
  }, [searchParams]);

  const activeTicket = tickets.find((t) => t.id === selectedTicketId) || tickets[0];

  // Carica i dettagli dell'ordine da Shopify quando cambia il ticket attivo
  useEffect(() => {
    if (!activeTicket?.orderNumber) {
      setSelectedTicketOrder(null);
      return;
    }

    const fetchOrderDetails = async () => {
      setLoadingOrder(true);
      try {
        const res = await fetch("/api/tickets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ actionType: "fetch_order", orderNumber: activeTicket.orderNumber }),
        });
        const json = await res.json();
        if (res.ok && json.order) {
          setSelectedTicketOrder(json.order);
        } else {
          setSelectedTicketOrder(null);
        }
      } catch (err) {
        console.error("Errore fetch dettagli ordine:", err);
        setSelectedTicketOrder(null);
      } finally {
        setLoadingOrder(false);
      }
    };

    fetchOrderDetails();
  }, [activeTicket?.id, activeTicket?.orderNumber]);

  const showFeedback = (msg: string, isErr = false) => {
    if (isErr) {
      setError(msg);
      setTimeout(() => setError(null), 4000);
    } else {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  const handleCreateTicket = async () => {
    if (!orderNumber.trim() || !title.trim()) {
      showFeedback("Inserisci sia il numero d'ordine che il titolo del ticket.", true);
      return;
    }

    setSubmittingTicket(true);
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionType: "create",
          orderNumber,
          causale,
          urgenza,
          title,
          description,
        }),
      });

      const json = await res.json();
      if (res.ok && json.ticket) {
        showFeedback("Ticket creato con successo!");
        setNewTicketOpen(false);
        setOrderNumber("");
        setTitle("");
        setDescription("");
        await loadTickets();
        setSelectedTicketId(json.ticket.id);
      } else {
        showFeedback(json.error || "Errore creazione ticket", true);
      }
    } catch (e: any) {
      showFeedback(e.message, true);
    } finally {
      setSubmittingTicket(false);
    }
  };

  const handleToggleResolve = async (ticketId: string, currentResolvedStatus: boolean) => {
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionType: "toggle_resolve",
          ticketId,
          isResolved: !currentResolvedStatus,
        }),
      });

      const json = await res.json();
      if (res.ok && json.ticket) {
        showFeedback(!currentResolvedStatus ? "Ticket contrassegnato come RISOLTO!" : "Ticket riaperto.");
        setTickets((prev) => prev.map((t) => (t.id === ticketId ? json.ticket : t)));
      } else {
        showFeedback(json.error || "Errore aggiornamento stato ticket", true);
      }
    } catch (e: any) {
      showFeedback(e.message, true);
    }
  };

  const handleAddNote = async () => {
    if (!activeTicket || !newNoteText.trim()) return;

    setSubmittingNote(true);
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionType: "add_note",
          ticketId: activeTicket.id,
          note: newNoteText,
          author: "Operatore",
        }),
      });

      const json = await res.json();
      if (res.ok && json.ticket) {
        setNewNoteText("");
        showFeedback("Nota aggiunta al ticket!");
        setTickets((prev) => prev.map((t) => (t.id === activeTicket.id ? json.ticket : t)));
      } else {
        showFeedback(json.error || "Errore salvataggio nota", true);
      }
    } catch (e: any) {
      showFeedback(e.message, true);
    } finally {
      setSubmittingNote(false);
    }
  };

  const handleDeleteTicket = async (ticketId: string) => {
    if (!confirm("Sei sicuro di voler eliminare questo ticket?")) return;

    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionType: "delete", ticketId }),
      });
      if (res.ok) {
        showFeedback("Ticket eliminato con successo.");
        const remaining = tickets.filter((t) => t.id !== ticketId);
        setTickets(remaining);
        if (remaining.length > 0) setSelectedTicketId(remaining[0].id);
        else setSelectedTicketId(null);
      }
    } catch (e: any) {
      showFeedback(e.message, true);
    }
  };

  // Filtraggio Ticket
  const filteredTickets = tickets.filter((t) => {
    if (statusFilter === "open" && t.isResolved) return false;
    if (statusFilter === "resolved" && !t.isResolved) return false;

    if (causaleFilter !== "ALL" && t.causale !== causaleFilter) return false;
    if (urgenzaFilter !== "ALL" && t.urgenza !== urgenzaFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchOrder = t.orderNumber.toLowerCase().includes(q);
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchDesc = t.description?.toLowerCase().includes(q);
      if (!matchOrder && !matchTitle && !matchDesc) return false;
    }

    return true;
  });

  const countOpen = tickets.filter((t) => !t.isResolved).length;
  const countResolved = tickets.filter((t) => t.isResolved).length;

  return (
    <div className="space-y-6">
      {/* Header Pagina */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-200/80">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
            <TicketIcon className="w-7 h-7 text-indigo-600" />
            Gestione Ticket Assistenza Ordini
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestisci le segnalazioni sui problemi d'ordine (Smarriti, Ritardi, Errori), scrivi note ed accedi direttamente ai dati dell'ordine Shopify.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadTickets}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs rounded-xl transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Aggiorna
          </button>
          <button
            onClick={() => setNewTicketOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            Nuovo Ticket
          </button>
        </div>
      </div>

      {/* Banner Feedback */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Statistiche Rapide */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-500 font-bold uppercase">Totale Ticket</span>
            <div className="text-2xl font-black text-gray-900 mt-0.5">{tickets.length}</div>
          </div>
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-bold">
            <TicketIcon className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-amber-700 font-bold uppercase">Ticket Aperti (In Corso)</span>
            <div className="text-2xl font-black text-amber-700 mt-0.5">{countOpen}</div>
          </div>
          <div className="w-10 h-10 bg-amber-100 text-amber-700 rounded-xl flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-emerald-700 font-bold uppercase">Ticket Risolti</span>
            <div className="text-2xl font-black text-emerald-700 mt-0.5">{countResolved}</div>
          </div>
          <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Barra Filtri e Ricerca */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {/* Tab Filtro Stato */}
          <div className="flex bg-gray-100 p-1 rounded-xl gap-1">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === "all" ? "bg-white text-indigo-700 shadow-sm" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Tutti ({tickets.length})
            </button>
            <button
              onClick={() => setStatusFilter("open")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === "open" ? "bg-white text-amber-700 shadow-sm" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              In Corso ({countOpen})
            </button>
            <button
              onClick={() => setStatusFilter("resolved")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === "resolved" ? "bg-white text-emerald-700 shadow-sm" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Risolti ({countResolved})
            </button>
          </div>

          {/* Select Causale */}
          <select
            value={causaleFilter}
            onChange={(e) => setCausaleFilter(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-xl text-xs font-semibold bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">Tutte le Causali</option>
            <option value="ORDINE SMARRITO">ORDINE SMARRITO</option>
            <option value="RITARDO">RITARDO</option>
            <option value="ERRORE SPEDIZIONE">ERRORE SPEDIZIONE</option>
            <option value="ALTRO">ALTRO</option>
          </select>

          {/* Select Urgenza */}
          <select
            value={urgenzaFilter}
            onChange={(e) => setUrgenzaFilter(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-xl text-xs font-semibold bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">Tutte le Urgenze</option>
            <option value="ALTO">Urgenza ALTO</option>
            <option value="MEDIO">Urgenza MEDIO</option>
            <option value="BASSO">Urgenza BASSO</option>
          </select>
        </div>

        {/* Input Ricerca */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cerca per #ordine o titolo..."
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Main Grid: Lista Ticket & Dettagli Ordine/Ticket */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 min-h-[600px]">
        {/* Colonna Sinistra: Lista Ticket */}
        <div className="md:col-span-4 bg-white border border-gray-200 rounded-2xl p-4 flex flex-col gap-3 overflow-y-auto max-h-[750px] shadow-sm">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">
            Elenco Segnalazioni ({filteredTickets.length})
          </div>

          {filteredTickets.length === 0 ? (
            <div className="text-center py-16 text-xs text-gray-400">
              <TicketIcon className="w-10 h-10 mx-auto mb-2 text-gray-300 stroke-[1.5]" />
              Nessun ticket trovato con i filtri correnti.
            </div>
          ) : (
            filteredTickets.map((t) => {
              const isSelected = activeTicket?.id === t.id;
              const isHigh = t.urgenza === "ALTO";
              const isMedium = t.urgenza === "MEDIO";

              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTicketId(t.id)}
                  className={`p-4 rounded-xl cursor-pointer transition-all border space-y-2.5 ${
                    isSelected
                      ? "bg-indigo-50/50 border-indigo-500 shadow-sm"
                      : "bg-white hover:bg-gray-50 border-gray-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded-lg">
                      Ordine #{t.orderNumber}
                    </span>

                    {/* Badge Checkpoint Stato */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleResolve(t.id, t.isResolved);
                      }}
                      className={`text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 transition-all ${
                        t.isResolved
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : "bg-amber-100 text-amber-800 border border-amber-300 hover:bg-emerald-100 hover:text-emerald-800"
                      }`}
                    >
                      {t.isResolved ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> RISOLTO
                        </>
                      ) : (
                        <>
                          <Clock className="w-3 h-3 text-amber-600" /> IN CORSO
                        </>
                      )}
                    </button>
                  </div>

                  <div>
                    <h4 className="font-bold text-xs text-gray-900 line-clamp-1">{t.title}</h4>
                    <p className="text-[11px] text-gray-500 line-clamp-2 mt-0.5">{t.description || "Nessuna descrizione."}</p>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                      {t.causale}
                    </span>

                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${
                        isHigh
                          ? "bg-red-100 text-red-700"
                          : isMedium
                          ? "bg-amber-100 text-amber-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {t.urgenza}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Colonna Destra: Dettaglio Ticket & Ordine Shopify */}
        <div className="md:col-span-8 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between overflow-y-auto max-h-[750px]">
          {activeTicket ? (
            <div className="space-y-6">
              {/* Header Dettaglio Ticket */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                      Ordine #{activeTicket.orderNumber}
                    </span>
                    <span className="text-xs font-bold bg-gray-100 text-gray-800 px-2.5 py-1 rounded-lg">
                      {activeTicket.causale}
                    </span>
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-lg uppercase ${
                        activeTicket.urgenza === "ALTO"
                          ? "bg-red-100 text-red-800"
                          : activeTicket.urgenza === "MEDIO"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      Urgenza: {activeTicket.urgenza}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mt-2">{activeTicket.title}</h2>
                  <p className="text-xs text-gray-500 mt-1">
                    Creato il {new Date(activeTicket.createdAt).toLocaleString()}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleResolve(activeTicket.id, activeTicket.isResolved)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all ${
                      activeTicket.isResolved
                        ? "bg-amber-100 hover:bg-amber-200 text-amber-800"
                        : "bg-emerald-600 hover:bg-emerald-700 text-white"
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {activeTicket.isResolved ? "Riapri Ticket" : "Segna come RISOLTO"}
                  </button>

                  <button
                    onClick={() => handleDeleteTicket(activeTicket.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                    title="Elimina Ticket"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Descrizione Segnalazione */}
              {activeTicket.description && (
                <div className="bg-gray-50 p-4 rounded-xl text-xs text-gray-800 border border-gray-200/80">
                  <strong className="block text-gray-900 font-bold mb-1">Descrizione Segnalazione:</strong>
                  <p className="whitespace-pre-wrap leading-relaxed">{activeTicket.description}</p>
                </div>
              )}

              {/* SECTION: SCHEDA ORDINE SHOPIFY AGGANCIATO */}
              <div className="bg-indigo-50/40 border border-indigo-100 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-indigo-950 flex items-center gap-2">
                    <Package className="w-4 h-4 text-indigo-600" />
                    Dettagli Ordine Shopify (Aggancio Automatico #{activeTicket.orderNumber})
                  </h3>
                  {selectedTicketOrder && (
                    <a
                      href={`/orders/${selectedTicketOrder.store}/${selectedTicketOrder.id.split("/").pop()}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] font-bold text-indigo-600 hover:underline flex items-center gap-1"
                    >
                      Apri Scheda Ordine completa <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                {loadingOrder ? (
                  <div className="text-center py-6 text-xs text-gray-500 flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                    Recupero dati ordine da Shopify...
                  </div>
                ) : selectedTicketOrder ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    {/* Cliente & Indirizzo Spedizione */}
                    <div className="bg-white p-3.5 rounded-xl border border-gray-200 space-y-2">
                      <div className="font-bold text-gray-900 flex items-center gap-1.5 border-b border-gray-100 pb-2">
                        <MapPin className="w-3.5 h-3.5 text-red-500" />
                        Indirizzo di Spedizione Cliente
                      </div>
                      {selectedTicketOrder.shippingAddress ? (
                        <div className="text-gray-700 space-y-0.5 leading-snug">
                          <div className="font-bold text-gray-900">{selectedTicketOrder.shippingAddress.name}</div>
                          <div>{selectedTicketOrder.shippingAddress.address1} {selectedTicketOrder.shippingAddress.address2}</div>
                          <div>
                            {selectedTicketOrder.shippingAddress.zip} {selectedTicketOrder.shippingAddress.city} ({selectedTicketOrder.shippingAddress.province})
                          </div>
                          <div>{selectedTicketOrder.shippingAddress.country}</div>
                          {selectedTicketOrder.shippingAddress.phone && (
                            <div className="text-indigo-600 font-medium mt-1">Tel: {selectedTicketOrder.shippingAddress.phone}</div>
                          )}
                        </div>
                      ) : (
                        <div className="text-gray-400">Nessun indirizzo di spedizione memorizzato.</div>
                      )}
                    </div>

                    {/* Spedizione & Tracking */}
                    <div className="bg-white p-3.5 rounded-xl border border-gray-200 space-y-2">
                      <div className="font-bold text-gray-900 flex items-center gap-1.5 border-b border-gray-100 pb-2">
                        <Truck className="w-3.5 h-3.5 text-emerald-600" />
                        Stato Spedizione & Tracking
                      </div>
                      <div className="space-y-1 text-gray-700">
                        <div>
                          <strong>Stato Fulfillment:</strong>{" "}
                          <span className="bg-gray-100 text-gray-800 font-bold px-1.5 py-0.5 rounded">
                            {selectedTicketOrder.fulfillmentStatus || "UNFULFILLED"}
                          </span>
                        </div>
                        <div>
                          <strong>Stato Pagamento:</strong> {selectedTicketOrder.financialStatus}
                        </div>
                        <div>
                          <strong>Totale Ordine:</strong> {selectedTicketOrder.totalPrice}
                        </div>

                        {selectedTicketOrder.fulfillments?.length > 0 && selectedTicketOrder.fulfillments[0].trackingInfo?.length > 0 ? (
                          <div className="pt-2 border-t border-gray-100 mt-2">
                            <span className="font-bold text-gray-900 block mb-1">Codice Tracciamento:</span>
                            {selectedTicketOrder.fulfillments[0].trackingInfo.map((tr: any, idx: number) => (
                              <a
                                key={idx}
                                href={tr.url || "#"}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 rounded-lg font-mono font-bold hover:underline"
                              >
                                {tr.company ? `${tr.company}: ` : ""}{tr.number}
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            ))}
                          </div>
                        ) : (
                          <div className="text-gray-400 pt-1">Nessun codice di tracciamento disponibile.</div>
                        )}
                      </div>
                    </div>

                    {/* Prodotti Ordine */}
                    <div className="md:col-span-2 bg-white p-3.5 rounded-xl border border-gray-200 space-y-2">
                      <div className="font-bold text-gray-900 flex items-center gap-1.5 border-b border-gray-100 pb-2">
                        <Package className="w-3.5 h-3.5 text-indigo-600" />
                        Prodotti nell'Ordine ({selectedTicketOrder.products.length})
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {selectedTicketOrder.products.map((p: any) => (
                          <div key={p.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg border border-gray-200/80">
                            {p.image?.url ? (
                              <img src={p.image.url} alt={p.title} className="w-10 h-10 object-cover rounded-md border border-gray-200 shrink-0" />
                            ) : (
                              <div className="w-10 h-10 bg-gray-200 rounded-md flex items-center justify-center text-[10px] text-gray-500 font-bold shrink-0">
                                POD
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="font-bold text-gray-900 truncate">{p.title}</div>
                              <div className="text-[11px] text-gray-500">
                                Qtà: <strong>{p.quantity}</strong> {p.variantTitle ? `| ${p.variantTitle}` : ""}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-xs text-amber-700 bg-amber-50 rounded-xl border border-amber-200">
                    Ordine <strong>#{activeTicket.orderNumber}</strong> non trovato su Shopify B2C/B2B o numero d'ordine errato.
                  </div>
                )}
              </div>

              {/* SECTION: NOTE DEL TICKET */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  Note Interne Operatori ({activeTicket.notes?.length || 0})
                </h3>

                {/* Timeline Note */}
                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                  {activeTicket.notes?.length === 0 ? (
                    <div className="text-xs text-gray-400 py-2">Nessuna nota ancora inserita per questo ticket.</div>
                  ) : (
                    activeTicket.notes.map((n: any) => (
                      <div key={n.id} className="bg-gray-50 p-3 rounded-xl border border-gray-200 text-xs space-y-1">
                        <div className="flex items-center justify-between text-gray-500 text-[11px]">
                          <strong className="text-gray-900">{n.author}</strong>
                          <span>{new Date(n.createdAt).toLocaleString()}</span>
                        </div>
                        <p className="text-gray-800 font-medium whitespace-pre-wrap">{n.note}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Form Aggiungi Nota */}
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="text"
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddNote()}
                    placeholder="Aggiungi una nota interna per questo ticket..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    onClick={handleAddNote}
                    disabled={submittingNote || !newNoteText.trim()}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 disabled:opacity-50 transition-all"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Salva Nota
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 text-xs py-16">
              <TicketIcon className="w-12 h-12 mb-2 stroke-[1.5]" />
              Seleziona un ticket dalla lista per visualizzarne i dettagli ed i prodotti dell'ordine.
            </div>
          )}
        </div>
      </div>

      {/* Modal Creazione Nuovo Ticket */}
      {newTicketOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <TicketIcon className="w-5 h-5 text-indigo-600" />
                Crea Nuovo Ticket Assistenza
              </h3>
              {(activeEmailId || activeConversationId) && (
                <button
                  onClick={() => runAiAnalysis()}
                  disabled={aiAnalyzing}
                  className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-all disabled:opacity-50"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${aiAnalyzing ? "animate-spin" : ""}`} />
                  {aiAnalyzing ? "Analisi..." : "Ri-analizza AI"}
                </button>
              )}
            </div>

            {aiAnalyzing ? (
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs font-semibold text-purple-900 flex items-center gap-2 animate-pulse">
                <Sparkles className="w-4 h-4 text-purple-600 animate-spin" />
                Claude AI sta analizzando l'intero thread ed estraendo i dettagli...
              </div>
            ) : (
              (activeEmailId || activeConversationId) && (
                <div className="flex items-center justify-between bg-gradient-to-r from-indigo-50 to-purple-50 p-2.5 rounded-xl border border-indigo-100 text-xs">
                  <span className="font-bold text-indigo-950 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    Thread raggruppato da Claude AI
                  </span>
                  <span className="text-[10px] text-indigo-700 bg-white px-2 py-0.5 rounded-md font-bold border border-indigo-100">
                    Estrazione Automatica Attiva
                  </span>
                </div>
              )
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Numero Ordine Shopify <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  placeholder="Es. 15150"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Causale Segnalazione</label>
                  <select
                    value={causale}
                    onChange={(e) => setCausale(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                  >
                    <option value="ORDINE SMARRITO">ORDINE SMARRITO</option>
                    <option value="RITARDO">RITARDO</option>
                    <option value="ERRORE SPEDIZIONE">ERRORE SPEDIZIONE</option>
                    <option value="ALTRO">ALTRO</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Livello Urgenza</label>
                  <select
                    value={urgenza}
                    onChange={(e) => setUrgenza(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white font-bold"
                  >
                    <option value="ALTO" className="text-red-600">ALTO</option>
                    <option value="MEDIO" className="text-amber-600">MEDIO</option>
                    <option value="BASSO" className="text-blue-600">BASSO</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Titolo Ticket <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Es. Pacco fermo da 5 giorni al hub corriere"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Dettagli / Descrizione Segnalazione</label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Inserisci ulteriori dettagli comunicati dal cliente..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setNewTicketOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                Annulla
              </button>
              <button
                onClick={handleCreateTicket}
                disabled={submittingTicket}
                className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm flex items-center gap-1.5"
              >
                {submittingTicket ? "Creazione..." : "Crea Ticket Assistenza"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
