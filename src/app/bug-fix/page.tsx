"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { 
  Bug, 
  Plus, 
  Search, 
  MessageSquare, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  User as UserIcon, 
  Paperclip, 
  Send, 
  ShieldCheck, 
  Trash2, 
  Image as ImageIcon, 
  X, 
  Sparkles,
  RefreshCw,
  Lock,
  ChevronRight,
  Filter
} from "lucide-react";
import { getCurrentUser } from "@/lib/userStore";
import { Ticket, TicketMessage } from "@/app/api/tickets/route";

export default function BugFixPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "aperto" | "in_lavorazione" | "risolto">("all");
  
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  
  // New Ticket Modal State
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newOperatorName, setNewOperatorName] = useState("");
  const [newPriority, setNewPriority] = useState<Ticket["priority"]>("media");
  const [newAttachments, setNewAttachments] = useState<string[]>([]);
  const [submittingTicket, setSubmittingTicket] = useState(false);

  // Conversation Message State
  const [newMessageText, setNewMessageText] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  // Resolution State (Admin)
  const [resolutionNote, setResolutionNote] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Media Zoom Modal
  const [zoomedMedia, setZoomedMedia] = useState<string | null>(null);

  const currentUser = getCurrentUser();
  const isAdmin = currentUser?.role === "admin" || (currentUser?.email ? currentUser.email.toLowerCase().includes("admin") : true);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tickets");
      const data = await res.json();
      if (data.success) {
        setTickets(data.tickets || []);
        if (!selectedTicketId && data.tickets?.length > 0) {
          setSelectedTicketId(data.tickets[0].id);
        }
      }
    } catch (e) {
      console.error("Errore recupero ticket:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.email) {
      setNewOperatorName(currentUser.email.split("@")[0]);
    } else {
      setNewOperatorName("Operatore");
    }
    fetchTickets();
  }, []);

  const selectedTicket = tickets.find(t => t.id === selectedTicketId) || tickets[0] || null;

  const handleFileUpload = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          setNewAttachments(prev => [...prev, result]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDescription.trim()) return;

    setSubmittingTicket(true);
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          ticket: {
            title: newTitle.trim(),
            description: newDescription.trim(),
            operatorName: newOperatorName.trim() || "Operatore",
            priority: newPriority,
            attachments: newAttachments
          }
        })
      });

      const data = await res.json();
      if (data.success) {
        setTickets(data.tickets);
        if (data.ticket?.id) {
          setSelectedTicketId(data.ticket.id);
        }
        setNewModalOpen(false);
        setNewTitle("");
        setNewDescription("");
        setNewAttachments([]);
      }
    } catch (err) {
      console.error("Errore creazione ticket:", err);
    } finally {
      setSubmittingTicket(false);
    }
  };

  const handleAddMessageDirectly = async (overrideTicketId?: string) => {
    const targetTicketId = overrideTicketId || selectedTicketId || selectedTicket?.id;
    if (!newMessageText.trim() || !targetTicketId) return;

    setSendingMessage(true);
    try {
      const authorRole = isAdmin ? "Admin" : "Operatore";
      const authorName = currentUser?.email ? currentUser.email.split("@")[0] : (isAdmin ? "Admin" : "Operatore");

      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_message",
          ticketId: targetTicketId,
          message: {
            authorName,
            authorRole,
            content: newMessageText.trim()
          }
        })
      });

      const data = await res.json();
      if (data.success) {
        setTickets(data.tickets);
        setNewMessageText("");
      } else {
        alert("Errore invio messaggio: " + (data.error || "Impossibile inviare."));
      }
    } catch (err: any) {
      alert("Errore di connessione: " + err.message);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleResolveTicket = async () => {
    if (!selectedTicket || !resolutionNote.trim()) return;

    setUpdatingStatus(true);
    try {
      const resolvedBy = currentUser?.email ? currentUser.email.split("@")[0] : "Super Admin";

      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_status",
          ticketId: selectedTicket.id,
          status: "risolto",
          resolutionNote: resolutionNote.trim(),
          resolvedBy
        })
      });

      const data = await res.json();
      if (data.success) {
        setTickets(data.tickets);
        setResolutionNote("");
      }
    } catch (err) {
      console.error("Errore risoluzione ticket:", err);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDeleteTicket = async (id: string) => {
    if (!confirm("Sei sicuro di voler eliminare questo ticket?")) return;
    try {
      const res = await fetch(`/api/tickets?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setTickets(data.tickets);
        if (selectedTicketId === id) {
          setSelectedTicketId(data.tickets[0]?.id || null);
        }
      }
    } catch (err) {
      console.error("Errore eliminazione ticket:", err);
    }
  };

  const filteredTickets = tickets.filter(t => {
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchDesc = t.description.toLowerCase().includes(q);
      const matchOp = t.operatorName.toLowerCase().includes(q);
      const matchId = t.id.toLowerCase().includes(q);
      return matchTitle || matchDesc || matchOp || matchId;
    }
    return true;
  });

  const getPriorityBadge = (p: Ticket["priority"]) => {
    switch (p) {
      case "urgente": return <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-rose-100 text-rose-800 border border-rose-300">🔥 Urgente</span>;
      case "alta": return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-900 border border-amber-300">⚠️ Alta</span>;
      case "media": return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 text-blue-800 border border-blue-200">Media</span>;
      default: return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-gray-100 text-gray-700 border border-gray-200">Bassa</span>;
    }
  };

  const getStatusBadge = (s: Ticket["status"]) => {
    switch (s) {
      case "risolto": return <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Risolto</span>;
      case "in_lavorazione": return <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-amber-600 animate-spin" /> In Lavorazione</span>;
      default: return <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-rose-100 text-rose-900 border border-rose-300 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> Aperto</span>;
    }
  };

  const formatTime = (isoStr: string) => {
    if (!isoStr) return "";
    const d = new Date(isoStr);
    return `${d.toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" })} alle ${d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}`;
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER DELLA PAGINA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2.5">
            <Bug className="w-7 h-7 text-rose-600" />
            BUG FIX — Gestione Ticket & Assistenza Tecnica
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Pannello di controllo per la segnalazione ed il tracciamento dei problemi tecnici ed errori di produzione.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={fetchTickets}
            className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-white rounded-xl transition-all border border-gray-200"
            title="Aggiorna Ticket"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={() => setNewModalOpen(true)}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>+ Segnala Nuovo Bug (Ticket)</span>
          </button>
        </div>
      </div>

      {/* STATISTICHE RIEPILOGATIVE */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-1">
          <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Ticket Aperti</span>
          <div className="text-2xl font-black text-rose-600">
            {tickets.filter(t => t.status === "aperto").length}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-1">
          <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">In Lavorazione</span>
          <div className="text-2xl font-black text-amber-600">
            {tickets.filter(t => t.status === "in_lavorazione").length}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-1">
          <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Risolti & Completati</span>
          <div className="text-2xl font-black text-emerald-600">
            {tickets.filter(t => t.status === "risolto").length}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-1">
          <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Totale Segnalazioni</span>
          <div className="text-2xl font-black text-gray-900">{tickets.length}</div>
        </div>
      </div>

      {/* GRIGLIA A 2 COLONNE: LISTA TICKET A SINISTRA (50%), CONVERSAZIONE & DETTAGLIO A DESTRA (50%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* COLONNA SINISTRA: ELENCO TICKET CON RICERCA E FILTRI (5 / 12) */}
        <div className="lg:col-span-5 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[650px]">
          
          {/* BARRA RICERCA & TABS STATO */}
          <div className="p-4 border-b border-gray-100 space-y-3 bg-gray-50/50">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input 
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cerca ticket per titolo, ID o operatore..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
              />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto text-[11px] font-bold p-1 bg-gray-100 rounded-xl">
              <button
                onClick={() => setFilterStatus("all")}
                className={`px-3 py-1 rounded-lg transition-all ${filterStatus === "all" ? "bg-white text-gray-900 shadow-xs" : "text-gray-500 hover:text-gray-900"}`}
              >
                Tutti ({tickets.length})
              </button>
              <button
                onClick={() => setFilterStatus("aperto")}
                className={`px-3 py-1 rounded-lg transition-all ${filterStatus === "aperto" ? "bg-white text-rose-700 shadow-xs" : "text-gray-500 hover:text-rose-600"}`}
              >
                Aperti ({tickets.filter(t => t.status === "aperto").length})
              </button>
              <button
                onClick={() => setFilterStatus("in_lavorazione")}
                className={`px-3 py-1 rounded-lg transition-all ${filterStatus === "in_lavorazione" ? "bg-white text-amber-800 shadow-xs" : "text-gray-500 hover:text-amber-600"}`}
              >
                In Lavoro ({tickets.filter(t => t.status === "in_lavorazione").length})
              </button>
              <button
                onClick={() => setFilterStatus("risolto")}
                className={`px-3 py-1 rounded-lg transition-all ${filterStatus === "risolto" ? "bg-white text-emerald-800 shadow-xs" : "text-gray-500 hover:text-emerald-600"}`}
              >
                Risolti ({tickets.filter(t => t.status === "risolto").length})
              </button>
            </div>
          </div>

          {/* LISTA SCHEDE TICKET */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100 max-h-[550px]">
            {loading ? (
              <div className="p-12 text-center text-gray-400 text-xs font-bold animate-pulse">
                Caricamento segnalazioni bug in corso...
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="p-12 text-center text-gray-500 text-xs font-medium space-y-2">
                <Bug className="w-8 h-8 text-gray-300 mx-auto" />
                <p>Nessun ticket trovato.</p>
              </div>
            ) : (
              filteredTickets.map(t => (
                <div
                  key={t.id}
                  onClick={() => setSelectedTicketId(t.id)}
                  className={`p-4 cursor-pointer transition-all hover:bg-rose-50/40 flex flex-col gap-2 relative ${
                    selectedTicketId === t.id ? "bg-rose-50/70 border-l-4 border-rose-600 shadow-xs" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono font-bold text-gray-400">{t.id}</span>
                    <div className="flex items-center gap-1.5">
                      {getPriorityBadge(t.priority)}
                      {getStatusBadge(t.status)}
                    </div>
                  </div>

                  <h3 className="font-extrabold text-gray-900 text-sm leading-snug line-clamp-1">
                    {t.title}
                  </h3>

                  <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                    {t.description}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-gray-400 pt-1 border-t border-gray-50">
                    <span className="font-bold text-gray-700 flex items-center gap-1">
                      <UserIcon className="w-3 h-3 text-gray-400" />
                      {t.operatorName}
                    </span>
                    <div className="flex items-center gap-3">
                      {(t.messages?.length || 0) > 0 && (
                        <span className="flex items-center gap-1 font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                          <MessageSquare className="w-3 h-3" /> {t.messages.length}
                        </span>
                      )}
                      <span>{formatTime(t.createdAt).split("alle")[0]}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* COLONNA DESTRA: DETTAGLIO TICKET & CHAT MESSAGGI (7 / 12) */}
        <div className="lg:col-span-7 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[650px]">
          
          {selectedTicket ? (
            <div className="flex flex-col h-full divide-y divide-gray-100">
              
              {/* INTESTAZIONE DETTAGLIO TICKET */}
              <div className="p-5 bg-gray-50/70 space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                      {selectedTicket.id}
                    </span>
                    {getPriorityBadge(selectedTicket.priority)}
                    {getStatusBadge(selectedTicket.status)}
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => handleDeleteTicket(selectedTicket.id)}
                      className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all text-xs font-bold flex items-center gap-1"
                      title="Elimina Ticket"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <h2 className="text-lg font-black text-gray-900 leading-tight">
                  {selectedTicket.title}
                </h2>

                <div className="flex items-center gap-4 text-xs text-gray-500 font-medium flex-wrap">
                  <span>Segnalato da: <strong className="text-gray-900 font-bold">{selectedTicket.operatorName}</strong></span>
                  <span>•</span>
                  <span>Data: <strong className="text-gray-700">{formatTime(selectedTicket.createdAt)}</strong></span>
                </div>
              </div>

              {/* DESCRIZIONE DETTAGLIATA & ALLEGATI FOTO/VIDEO */}
              <div className="p-5 space-y-4 bg-white">
                <div className="space-y-1.5">
                  <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Descrizione del Bug / Problema</span>
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 text-xs font-medium leading-relaxed text-gray-900 whitespace-pre-wrap">
                    {selectedTicket.description}
                  </div>
                </div>

                {/* ALLEGATI FOTO / VIDEO */}
                {selectedTicket.attachments && selectedTicket.attachments.length > 0 && (
                  <div className="space-y-1.5 pt-2">
                    <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                      <Paperclip className="w-3.5 h-3.5 text-gray-500" />
                      Allegati Foto / Video ({selectedTicket.attachments.length})
                    </span>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {selectedTicket.attachments.map((att, idx) => (
                        <div 
                          key={idx}
                          onClick={() => setZoomedMedia(att)}
                          className="w-20 h-20 bg-gray-100 rounded-xl border border-gray-300 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity flex items-center justify-center relative group"
                        >
                          {att.startsWith("data:video") || att.endsWith(".mp4") ? (
                            <div className="text-[10px] font-bold text-rose-700 bg-rose-50 p-1 rounded text-center">🎥 Video</div>
                          ) : (
                            <img src={att} alt="Allegato Ticket" className="w-full h-full object-cover" />
                          )}
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold">
                            Ingrandisci
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* NOTE DI RISOLUZIONE (SE COMPLETATO) */}
                {selectedTicket.status === "risolto" && (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-1.5 text-emerald-950 text-xs">
                    <div className="flex items-center justify-between font-extrabold text-emerald-900">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Ticket Risolto da {selectedTicket.resolvedBy || "Super Admin"}
                      </span>
                      <span className="text-[10px] font-mono text-emerald-700">{formatTime(selectedTicket.resolvedAt || "")}</span>
                    </div>
                    <p className="text-xs font-semibold leading-relaxed text-emerald-900 pt-1">
                      {selectedTicket.resolutionNote || "Problema risolto con successo."}
                    </p>
                  </div>
                )}
              </div>

              {/* THREAD MESSAGGI & CONVERSAZIONE IN TEMPO REALE */}
              <div className="flex-1 p-5 space-y-3 bg-gray-50/30 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                    <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                      <MessageSquare className="w-4 h-4 text-indigo-600" />
                      Messaggi & Conversazione ({selectedTicket.messages?.length || 0})
                    </h3>
                    <span className="text-[10px] text-gray-400 font-medium">Chat di supporto e chiarimenti</span>
                  </div>

                  <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                    {(!selectedTicket.messages || selectedTicket.messages.length === 0) ? (
                      <div className="p-6 text-center text-gray-400 text-xs font-medium">
                        Nessun messaggio presente. Scrivi un commento qui sotto per chiedere chiarimenti.
                      </div>
                    ) : (
                      selectedTicket.messages.map(m => (
                        <div key={m.id} className="p-3 bg-white border border-gray-200 rounded-2xl shadow-2xs space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <div className="flex items-center gap-1.5">
                              <span className="font-extrabold text-gray-900">{m.authorName}</span>
                              <span className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase ${
                                m.authorRole?.toLowerCase().includes("admin") ? "bg-indigo-100 text-indigo-800" : "bg-gray-100 text-gray-700"
                              }`}>
                                {m.authorRole}
                              </span>
                            </div>
                            <span className="text-[10px] text-gray-400 font-mono">{formatTime(m.createdAt)}</span>
                          </div>
                          <p className="text-xs text-gray-800 leading-relaxed font-medium pt-0.5">
                            {m.content}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* INPUT AGGIUNTA NUOVO MESSAGGIO */}
                <form 
                  onSubmit={e => {
                    e.preventDefault();
                    handleAddMessageDirectly();
                  }} 
                  className="mt-3 space-y-2"
                >
                  <div className="relative flex flex-col gap-2">
                    <textarea
                      value={newMessageText}
                      onChange={e => setNewMessageText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleAddMessageDirectly();
                        }
                      }}
                      placeholder="Scrivi una risposta o chiarimento (Premi Invio per inviare)..."
                      rows={3}
                      className="w-full p-3 border border-gray-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white resize-none"
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleAddMessageDirectly()}
                        disabled={sendingMessage || !newMessageText.trim()}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Send className="w-4 h-4" />
                        <span>{sendingMessage ? "Invio in corso..." : "Invia Messaggio"}</span>
                      </button>
                    </div>
                  </div>
                </form>

                {/* BOX CHIUSURA & RISOLUZIONE TICKET (SOLO ADMIN) */}
                {selectedTicket.status !== "risolto" && (
                  <div className="mt-4 p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-emerald-900 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        Pannello Chiusura Ticket (Solo Admin)
                      </span>
                    </div>

                    <textarea
                      value={resolutionNote}
                      onChange={e => setResolutionNote(e.target.value)}
                      placeholder="Descrivi come è stato risolto il bug (es. Corretto bug nel rendering PDF, aggiornato codice su Shopify)..."
                      rows={2}
                      className="w-full p-3 border border-emerald-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    />

                    <button
                      onClick={handleResolveTicket}
                      disabled={updatingStatus || !resolutionNote.trim()}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>✓ Risolvi & Chiudi Ticket Definitivamente</span>
                    </button>
                  </div>
                )}

              </div>

            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-gray-400 space-y-3">
              <Bug className="w-12 h-12 text-gray-300" />
              <p className="text-sm font-semibold">Seleziona un ticket dalla colonna di sinistra per visualizzare la conversazione ed i messaggi.</p>
            </div>
          )}

        </div>

      </div>

      {/* MODAL NUOVO TICKET BUG */}
      {newModalOpen && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setNewModalOpen(false)}
        >
          <div 
            className="bg-white rounded-3xl p-6 max-w-xl w-full shadow-2xl relative space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-extrabold text-gray-900 text-lg flex items-center gap-2">
                  <Bug className="w-5 h-5 text-rose-600" />
                  Segnala Nuovo Bug / Problema Tecnico
                </h3>
                <p className="text-xs text-gray-500">Compila i dettagli per aprire la pratica agli operatori ed agli sviluppatori.</p>
              </div>
              <button 
                onClick={() => setNewModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold text-gray-700 mb-1">Nome Operatore</label>
                <input 
                  type="text"
                  value={newOperatorName}
                  onChange={e => setNewOperatorName(e.target.value)}
                  placeholder="Il tuo nome o email..."
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-gray-700 mb-1">Titolo del Bug / Problema</label>
                <input 
                  type="text"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder='Es: "Il font Save non viene applicato sul PDF di stampa"'
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-gray-700 mb-1">Priorità</label>
                <select
                  value={newPriority}
                  onChange={e => setNewPriority(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
                >
                  <option value="bassa">Bassa (Nessun blocco di produzione)</option>
                  <option value="media">Media (Problema minore)</option>
                  <option value="alta">Alta (Blocco parziale su un prodotto)</option>
                  <option value="urgente">🔥 Urgente (Blocco totale ordini)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-gray-700 mb-1">Descrizione del Problema</label>
                <textarea 
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  placeholder="Descrivi dettagliatamente cosa è successo, l'ordine coinvolto o i passaggi per riprodurre l'errore..."
                  rows={4}
                  required
                  className="w-full p-3 border border-gray-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-gray-700 mb-1">Allegati Foto / Screenshot / Video</label>
                <input 
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={e => handleFileUpload(e.target.files)}
                  className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-extrabold file:bg-rose-50 file:text-rose-700 hover:file:bg-rose-100 cursor-pointer"
                />
                {newAttachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {newAttachments.map((att, idx) => (
                      <div key={idx} className="w-14 h-14 bg-gray-100 rounded-lg border border-gray-200 overflow-hidden relative">
                        <img src={att} alt="Anteprima allegato" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setNewAttachments(prev => prev.filter((_, i) => i !== idx))}
                          className="absolute top-0.5 right-0.5 bg-black/60 text-white rounded-full p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setNewModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-all"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={submittingTicket || !newTitle.trim() || !newDescription.trim()}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submittingTicket ? "Invio in corso..." : "Invia Ticket Bug"}</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* MODAL INGRANDIMENTO FOTO ALLEGATO */}
      {zoomedMedia && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setZoomedMedia(null)}
        >
          <div 
            className="bg-white rounded-3xl p-4 max-w-3xl w-full shadow-2xl relative space-y-3"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-2 px-2">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                <Paperclip className="w-4 h-4 text-gray-500" />
                Allegato del Ticket
              </h3>
              <button 
                onClick={() => setZoomedMedia(null)}
                className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="w-full h-[500px] bg-gray-900 rounded-2xl overflow-hidden flex items-center justify-center p-2">
              <img 
                src={zoomedMedia} 
                alt="Allegato ingrandito" 
                className="max-w-full max-h-full object-contain"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
