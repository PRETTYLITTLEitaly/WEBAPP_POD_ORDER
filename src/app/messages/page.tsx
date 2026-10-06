"use client";

import { useEffect, useState, useMemo } from "react";
import {
  MessageSquare,
  MessageCircle,
  Mail,
  Settings,
  Plus,
  RefreshCw,
  Send,
  Check,
  CheckCheck,
  Search,
  Building2,
  User,
  AlertCircle,
  ShieldCheck,
  Inbox,
  Ticket as TicketIcon,
  Package,
  ExternalLink,
  CheckCircle,
} from "lucide-react";

export default function MessagesPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"b2b" | "b2c" | "email" | "settings">("b2b");

  // Conversazioni Selezionate
  const [selectedB2BId, setSelectedB2BId] = useState<string | null>(null);
  const [selectedB2CId, setSelectedB2CId] = useState<string | null>(null);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);

  // Form risposte
  const [waText, setWaText] = useState("");
  const [emailTo, setEmailTo] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");

  // Modali
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [newChatPhone, setNewChatPhone] = useState("");
  const [newChatName, setNewChatName] = useState("");

  const [newEmailOpen, setNewEmailOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form Impostazioni
  const [b2bConfig, setB2bConfig] = useState({ phoneNumberId: "", wabaId: "", accessToken: "", verifyToken: "" });
  const [b2cConfig, setB2cConfig] = useState({ phoneNumberId: "", wabaId: "", accessToken: "", verifyToken: "" });
  const [emailConfig, setEmailConfig] = useState({
    accountName: "Aruba Email",
    email: "",
    username: "",
    password: "",
    imapHost: "imaps.aruba.it",
    imapPort: "993",
    smtpHost: "smtps.aruba.it",
    smtpPort: "465",
  });

  const [isAutoSyncing, setIsAutoSyncing] = useState(false);

  const loadData = async (showSpinner = true) => {
    try {
      if (showSpinner) setLoading(true);
      const res = await fetch("/api/messages");
      const json = await res.json();
      if (res.ok) {
        setData(json);
        if (json.b2bConversations?.length > 0 && !selectedB2BId) {
          setSelectedB2BId(json.b2bConversations[0].id);
        }
        if (json.b2cConversations?.length > 0 && !selectedB2CId) {
          setSelectedB2CId(json.b2cConversations[0].id);
        }
        if (json.emailMessages?.length > 0 && !selectedEmailId) {
          setSelectedEmailId(json.emailMessages[0].id);
        }

        if (json.b2bAccount) {
          setB2bConfig({
            phoneNumberId: json.b2bAccount.phoneNumberId || "",
            wabaId: json.b2bAccount.wabaId || "",
            accessToken: json.b2bAccount.accessToken || "",
            verifyToken: json.b2bAccount.verifyToken || "",
          });
        }
        if (json.b2cAccount) {
          setB2cConfig({
            phoneNumberId: json.b2cAccount.phoneNumberId || "",
            wabaId: json.b2cAccount.wabaId || "",
            accessToken: json.b2cAccount.accessToken || "",
            verifyToken: json.b2cAccount.verifyToken || "",
          });
        }
        if (json.emailAccount) {
          setEmailConfig({
            accountName: json.emailAccount.accountName || "Aruba Email",
            email: json.emailAccount.email || "",
            username: json.emailAccount.username || "",
            password: json.emailAccount.password || "",
            imapHost: json.emailAccount.imapHost || "imaps.aruba.it",
            imapPort: String(json.emailAccount.imapPort || 993),
            smtpHost: json.emailAccount.smtpHost || "smtps.aruba.it",
            smtpPort: String(json.emailAccount.smtpPort || 465),
          });
        }
      } else {
        if (showSpinner) setError(json.error || "Impossibile caricare i messaggi");
      }
    } catch (e: any) {
      if (showSpinner) setError(e.message);
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  const silentAutoSync = async () => {
    try {
      setIsAutoSyncing(true);
      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionType: "sync_emails" }),
      });
      await loadData(false);
    } catch (e) {
      console.error("Auto sync error:", e);
    } finally {
      setIsAutoSyncing(false);
    }
  };

  useEffect(() => {
    loadData(true);

    // Auto-polling ogni 20 secondi per la ricezione live delle nuove email da Aruba IMAP
    const interval = setInterval(() => {
      silentAutoSync();
    }, 20000);

    return () => clearInterval(interval);
  }, []);

  const showFeedback = (msg: string, isErr = false) => {
    if (isErr) {
      setError(msg);
      setTimeout(() => setError(null), 4000);
    } else {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  const handleSendWa = async (accountId: string, toPhone: string) => {
    if (!waText.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionType: "send_whatsapp", accountId, to: toPhone, message: waText }),
      });
      const json = await res.json();
      if (res.ok) {
        setWaText("");
        showFeedback("Messaggio WhatsApp inviato!");
        await loadData();
      } else {
        showFeedback(json.error || "Errore durante l'invio", true);
      }
    } catch (e: any) {
      showFeedback(e.message, true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartChat = async () => {
    if (!newChatPhone.trim()) return;
    const accountId = activeTab === "b2b" ? data?.b2bAccount?.id : data?.b2cAccount?.id;
    setSubmitting(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionType: "start_whatsapp_chat", accountId, phone: newChatPhone, name: newChatName }),
      });
      const json = await res.json();
      if (res.ok) {
        setNewChatOpen(false);
        setNewChatPhone("");
        setNewChatName("");
        showFeedback("Chat creata con successo!");
        await loadData();
      } else {
        showFeedback(json.error || "Errore creazione chat", true);
      }
    } catch (e: any) {
      showFeedback(e.message, true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendEmail = async () => {
    if (!emailTo || !emailSubject || !emailBody) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionType: "send_email", to: emailTo, subject: emailSubject, message: emailBody }),
      });
      const json = await res.json();
      if (res.ok) {
        setNewEmailOpen(false);
        setEmailBody("");
        showFeedback("Email inviata con successo via Aruba!");
        await loadData();
      } else {
        showFeedback(json.error || "Errore invio email", true);
      }
    } catch (e: any) {
      showFeedback(e.message, true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleEmailRead = async (messageId: string, isRead: boolean) => {
    try {
      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionType: "toggle_email_read", messageId, isRead }),
      });
      await loadData();
    } catch (e: any) {
      showFeedback(e.message, true);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionType: "mark_all_read" }),
      });
      const json = await res.json();
      if (res.ok) {
        showFeedback("Tutte le email sono state segnate come lette!");
        await loadData();
      } else {
        showFeedback(json.error || "Errore aggiornamento email", true);
      }
    } catch (e: any) {
      showFeedback(e.message, true);
    }
  };

  const handleSyncEmails = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionType: "sync_emails" }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        showFeedback(`Sincronizzazione completata! (${json.importedCount || 0} nuove email)`);
        await loadData();
      } else {
        showFeedback(json.reason || json.error || "Errore sincronizzazione IMAP", true);
      }
    } catch (e: any) {
      showFeedback(e.message, true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveWaConfig = async (channel: "b2b" | "b2c") => {
    const acc = channel === "b2b" ? data?.b2bAccount : data?.b2cAccount;
    const cfg = channel === "b2b" ? b2bConfig : b2cConfig;
    if (!acc) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionType: "save_wa_config", accountId: acc.id, ...cfg }),
      });
      const json = await res.json();
      if (res.ok) {
        showFeedback(`Credenziali WhatsApp ${channel.toUpperCase()} salvate!`);
        await loadData();
      } else {
        showFeedback(json.error || "Errore salvataggio credenziali", true);
      }
    } catch (e: any) {
      showFeedback(e.message, true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveEmailConfig = async () => {
    if (!data?.emailAccount) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionType: "save_email_config", accountId: data.emailAccount.id, ...emailConfig }),
      });
      const json = await res.json();
      if (res.ok) {
        showFeedback("Credenziali Email Aruba salvate!");
        await loadData();
      } else {
        showFeedback(json.error || "Errore salvataggio credenziali email", true);
      }
    } catch (e: any) {
      showFeedback(e.message, true);
    } finally {
      setSubmitting(false);
    }
  };

  const activeB2BConv = data?.b2bConversations?.find((c: any) => c.id === selectedB2BId) || data?.b2bConversations?.[0];
  const activeB2CConv = data?.b2cConversations?.find((c: any) => c.id === selectedB2CId) || data?.b2cConversations?.[0];
  const activeEmail = data?.emailMessages?.find((m: any) => m.id === selectedEmailId) || data?.emailMessages?.[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-200/80">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
            <MessageSquare className="w-7 h-7 text-indigo-600" />
            Hub Comunicazioni & Messaggi
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestisci in tempo reale le chat WhatsApp Business (B2B / B2C) ed i messaggi Email dal tuo dominio Aruba.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadData(true)}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs rounded-xl transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Aggiorna
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
          <ShieldCheck className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Schede di Navigazione Tab */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 overflow-hidden">
        <div className="flex border-b border-gray-200 bg-gray-50/50 p-2 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab("b2b")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
              activeTab === "b2b" ? "bg-white text-indigo-700 shadow-sm border border-gray-200" : "text-gray-600 hover:bg-gray-200/50"
            }`}
          >
            <Building2 className="w-4 h-4 text-emerald-600" />
            WhatsApp B2B
            <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[10px]">
              {data?.b2bConversations?.length || 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("b2c")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
              activeTab === "b2c" ? "bg-white text-indigo-700 shadow-sm border border-gray-200" : "text-gray-600 hover:bg-gray-200/50"
            }`}
          >
            <User className="w-4 h-4 text-emerald-600" />
            WhatsApp B2C
            <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[10px]">
              {data?.b2cConversations?.length || 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("email")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
              activeTab === "email" ? "bg-white text-indigo-700 shadow-sm border border-gray-200" : "text-gray-600 hover:bg-gray-200/50"
            }`}
          >
            <Mail className="w-4 h-4 text-blue-600" />
            Email Aruba
            <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-[10px]">
              {data?.emailMessages?.length || 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("settings")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
              activeTab === "settings" ? "bg-white text-indigo-700 shadow-sm border border-gray-200" : "text-gray-600 hover:bg-gray-200/50"
            }`}
          >
            <Settings className="w-4 h-4 text-gray-600" />
            Impostazioni Canali
          </button>
        </div>

        <div className="p-6">
          {/* TAB 0: WHATSAPP B2B */}
          {activeTab === "b2b" && (
            <RenderWhatsAppView
              channelName="B2B"
              account={data?.b2bAccount}
              conversations={data?.b2bConversations || []}
              activeConv={activeB2BConv}
              onSelectConv={setSelectedB2BId}
              waText={waText}
              setWaText={setWaText}
              onSend={(to: string) => handleSendWa(data?.b2bAccount?.id, to)}
              onOpenNewChat={() => setNewChatOpen(true)}
              submitting={submitting}
            />
          )}

          {/* TAB 1: WHATSAPP B2C */}
          {activeTab === "b2c" && (
            <RenderWhatsAppView
              channelName="B2C"
              account={data?.b2cAccount}
              conversations={data?.b2cConversations || []}
              activeConv={activeB2CConv}
              onSelectConv={setSelectedB2CId}
              waText={waText}
              setWaText={setWaText}
              onSend={(to: string) => handleSendWa(data?.b2cAccount?.id, to)}
              onOpenNewChat={() => setNewChatOpen(true)}
              submitting={submitting}
            />
          )}

          {/* TAB 2: EMAIL ARUBA */}
          {activeTab === "email" && (
            <RenderEmailView
              account={data?.emailAccount}
              messages={data?.emailMessages || []}
              activeEmail={activeEmail}
              onSelectEmail={(id: string) => {
                setSelectedEmailId(id);
              }}
              onToggleRead={handleToggleEmailRead}
              onMarkAllRead={handleMarkAllRead}
              onSync={handleSyncEmails}
              onOpenNewEmail={() => {
                setEmailTo("");
                setEmailSubject("");
                setEmailBody("");
                setNewEmailOpen(true);
              }}
              onReplyEmail={(msg: any) => {
                if (!msg) return;
                let cleanTo = msg.fromEmail || "";
                if (cleanTo.includes("<")) {
                  const match = cleanTo.match(/<([^>]+)>/);
                  if (match && match[1]) {
                    cleanTo = match[1];
                  } else {
                    cleanTo = cleanTo.split("<")[1].replace(">", "").trim();
                  }
                }
                let subject = msg.subject || "";
                if (!subject.toLowerCase().startsWith("re:")) {
                  subject = `Re: ${subject}`;
                }
                setEmailTo(cleanTo);
                setEmailSubject(subject);
                setEmailBody("");
                setNewEmailOpen(true);
              }}
              submitting={submitting}
              isAutoSyncing={isAutoSyncing}
            />
          )}

          {/* TAB 3: IMPOSTAZIONI CANALI */}
          {activeTab === "settings" && (
            <RenderSettingsView
              b2bConfig={b2bConfig}
              setB2bConfig={setB2bConfig}
              b2cConfig={b2cConfig}
              setB2cConfig={setB2cConfig}
              emailConfig={emailConfig}
              setEmailConfig={setEmailConfig}
              onSaveB2b={() => handleSaveWaConfig("b2b")}
              onSaveB2c={() => handleSaveWaConfig("b2c")}
              onSaveEmail={handleSaveEmailConfig}
              submitting={submitting}
            />
          )}
        </div>
      </div>

      {/* Modal Nuova Chat WhatsApp */}
      {newChatOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-emerald-600" />
              Avvia Nuova Chat WhatsApp ({activeTab.toUpperCase()})
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Numero di Telefono (con prefisso int. es. +393401234567)
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  value={newChatPhone}
                  onChange={(e) => setNewChatPhone(e.target.value)}
                  placeholder="+393401234567"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nome / Azienda Cliente (Opzionale)</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  value={newChatName}
                  onChange={(e) => setNewChatName(e.target.value)}
                  placeholder="Rossi SRL"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setNewChatOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                Annulla
              </button>
              <button
                onClick={handleStartChat}
                disabled={submitting}
                className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm"
              >
                {submitting ? "Creazione..." : "Crea Conversazione"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nuova Email */}
      {newEmailOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Mail className="w-5 h-5 text-blue-600" />
              Componi Nuova Email Aruba
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Destinatario Email</label>
                <input
                  type="email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  placeholder="cliente@dominio.it"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Oggetto</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Conferma Ordine e Dettagli Spedizione"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Messaggio</label>
                <textarea
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  placeholder="Gentile cliente..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setNewEmailOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                Annulla
              </button>
              <button
                onClick={handleSendEmail}
                disabled={submitting}
                className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                {submitting ? "Invio in corso..." : "Invia Email Aruba"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Visualizzatore WhatsApp (B2B o B2C) con Modalità QR Code e Pannello Affiancato Ordine/Ticket
function RenderWhatsAppView({
  channelName,
  account,
  conversations,
  activeConv,
  onSelectConv,
  waText,
  setWaText,
  onSend,
  onOpenNewChat,
  submitting,
}: any) {
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [sideOrderNum, setSideOrderNum] = useState("");
  const [sideOrder, setSideOrder] = useState<any>(null);
  const [loadingSideOrder, setLoadingSideOrder] = useState(false);

  // Cerca automaticamente numeri d'ordine (es. #15150 o 15150) nei messaggi della conversazione attiva
  useEffect(() => {
    if (!activeConv?.messages || activeConv.messages.length === 0) {
      setSideOrderNum("");
      setSideOrder(null);
      return;
    }

    let detected: string | null = null;
    for (let i = activeConv.messages.length - 1; i >= 0; i--) {
      const text = activeConv.messages[i].body || "";
      const match = text.match(/#?(\d{4,6})/);
      if (match && match[1]) {
        detected = match[1];
        break;
      }
    }

    if (detected) {
      setSideOrderNum(detected);
    }
  }, [activeConv?.id]);

  // Carica i dettagli dell'ordine Shopify quando cambia il numero d'ordine cercato
  const fetchSideOrderDetails = async (numToFetch: string) => {
    if (!numToFetch.trim()) return;
    setLoadingSideOrder(true);
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionType: "fetch_order", orderNumber: numToFetch }),
      });
      const json = await res.json();
      if (res.ok && json.order) {
        setSideOrder(json.order);
      } else {
        setSideOrder(null);
      }
    } catch (e) {
      console.error("Errore recupero ordine affiancato:", e);
      setSideOrder(null);
    } finally {
      setLoadingSideOrder(false);
    }
  };

  useEffect(() => {
    if (sideOrderNum) {
      fetchSideOrderDetails(sideOrderNum);
    }
  }, [sideOrderNum]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-emerald-900 to-teal-950 p-4 rounded-2xl text-white shadow-sm">
        <div>
          <h2 className="text-base font-bold flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-emerald-400" />
            WhatsApp Business - Canale {channelName}
          </h2>
          <p className="text-xs text-emerald-200 mt-0.5">
            Chat in tempo reale con pannello Ordine Shopify & Ticket affiancato.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const width = Math.min(window.screen.availWidth * 0.55, 900);
              const height = window.screen.availHeight * 0.9;
              window.open(
                "https://web.whatsapp.com",
                "WhatsAppWebWindow",
                `width=${width},height=${height},left=0,top=0,resizable=yes,scrollbars=yes`
              );
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
            title="Apri la schermata originale di WhatsApp Web affiancata alla piattaforma"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Apri WhatsApp Web Affiancato
          </button>

          <button
            onClick={() => setQrModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-white/20 hover:bg-white/30 text-white text-xs font-bold rounded-xl backdrop-blur-sm transition-all"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            Info Connessione & SendApp
          </button>

          <button
            onClick={onOpenNewChat}
            className="flex items-center gap-1.5 px-3 py-2 bg-white/20 hover:bg-white/30 text-white text-xs font-bold rounded-xl backdrop-blur-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            Nuova Chat
          </button>
        </div>
      </div>

      {/* Griglia Principale a 3 Colonne (Conversazioni, Chat, Ordine/Ticket Side-by-Side) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 h-[600px]">
        {/* Colonna 1: Liste Conversazioni */}
        <div className="md:col-span-3 bg-gray-50 border border-gray-200 rounded-2xl p-3 flex flex-col gap-2 overflow-y-auto">
          <div className="text-[11px] font-bold text-gray-500 uppercase px-2 mb-1">
            Conversazioni ({conversations.length})
          </div>
          {conversations.length === 0 ? (
            <div className="text-center py-8 text-xs text-gray-400">Nessuna conversazione registrata.</div>
          ) : (
            conversations.map((c: any) => {
              const isSelected = activeConv?.id === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => onSelectConv(c.id)}
                  className={`p-3 rounded-xl cursor-pointer transition-all border ${
                    isSelected ? "bg-white border-emerald-500 shadow-sm ring-2 ring-emerald-500/20" : "bg-white/70 hover:bg-white border-gray-200/80"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-gray-900 truncate">{c.customerName || c.customerPhone}</span>
                    {c.unreadCount > 0 && (
                      <span className="bg-emerald-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                        {c.unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-gray-500 mt-0.5">{c.customerPhone}</div>
                </div>
              );
            })
          )}
        </div>

        {/* Colonna 2: Finestra Chat */}
        <div className="md:col-span-5 bg-white border border-gray-200 rounded-2xl p-4 flex flex-col justify-between h-full shadow-sm">
          {activeConv ? (
            <>
              {/* Topbar Chat */}
              <div className="pb-3 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-gray-900">{activeConv.customerName || activeConv.customerPhone}</h3>
                  <span className="text-xs text-gray-500">{activeConv.customerPhone}</span>
                </div>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Canale {channelName}
                </span>
              </div>

              {/* Messaggi */}
              <div className="flex-1 overflow-y-auto py-3 px-2 space-y-3 bg-[#efeae2]/40 rounded-xl my-3 p-3 border border-amber-900/5">
                {activeConv.messages?.length === 0 ? (
                  <div className="text-center py-12 text-xs text-gray-400">Nessun messaggio presente.</div>
                ) : (
                  activeConv.messages.map((m: any) => {
                    const isOut = m.direction === "OUTBOUND";
                    return (
                      <div key={m.id} className={`flex flex-col ${isOut ? "items-end" : "items-start"}`}>
                        <div
                          className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-xs shadow-sm ${
                            isOut
                              ? "bg-emerald-600 text-white rounded-br-none"
                              : "bg-white text-gray-900 border border-gray-200 rounded-bl-none"
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{m.body}</p>
                          <div className={`text-[10px] mt-1 text-right flex items-center justify-end gap-1 ${isOut ? "text-emerald-100" : "text-gray-400"}`}>
                            <span>{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {isOut && (m.status === "READ" ? <CheckCheck className="w-3 h-3 text-sky-200" /> : <Check className="w-3 h-3" />)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Input Risposta */}
              <div className="pt-1 flex items-center gap-2">
                <input
                  type="text"
                  value={waText}
                  onChange={(e) => setWaText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && onSend(activeConv.customerPhone)}
                  placeholder="Scrivi un messaggio WhatsApp..."
                  className="flex-1 px-3.5 py-2 border border-gray-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  onClick={() => onSend(activeConv.customerPhone)}
                  disabled={submitting || !waText.trim()}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition-all disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  Invia
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 text-xs">
              <MessageSquare className="w-10 h-10 mb-2 stroke-[1.5]" />
              Seleziona una chat dalla lista per iniziare.
            </div>
          )}
        </div>

        {/* Colonna 3: SCHEDA AFFIANCATA ORDINE SHOPIFY & APERTURA TICKET */}
        <div className="md:col-span-4 bg-indigo-50/40 border border-indigo-100 rounded-2xl p-4 flex flex-col justify-between overflow-y-auto shadow-sm">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-indigo-100 pb-2.5">
              <h3 className="text-xs font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                <Package className="w-4 h-4 text-indigo-600" />
                Ordine Shopify Affiancato
              </h3>

              <a
                href={
                  activeConv
                    ? `/tickets?create=true&conversationId=${activeConv.id}${sideOrderNum ? `&order=${encodeURIComponent(sideOrderNum)}` : ""}`
                    : `/tickets`
                }
                className="px-2.5 py-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-[10px] rounded-lg shadow-sm flex items-center gap-1 transition-all"
              >
                <TicketIcon className="w-3 h-3" />
                + Apri Ticket AI
              </a>
            </div>

            {/* Input Ricerca Numero Ordine */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={sideOrderNum}
                  onChange={(e) => setSideOrderNum(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fetchSideOrderDetails(sideOrderNum)}
                  placeholder="Inserisci #ordine (es. 15150)..."
                  className="w-full pl-8 pr-3 py-1.5 border border-indigo-200 rounded-xl text-xs bg-white font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <button
                onClick={() => fetchSideOrderDetails(sideOrderNum)}
                className="p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingSideOrder ? "animate-spin" : ""}`} />
              </button>
            </div>

            {/* Dettagli dell'Ordine Caricato */}
            {loadingSideOrder ? (
              <div className="text-center py-8 text-xs text-gray-500 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                Ricerca prodotti ordine Shopify...
              </div>
            ) : sideOrder ? (
              <div className="space-y-3 text-xs">
                <div className="bg-white p-3 rounded-xl border border-indigo-100 shadow-2xs space-y-1">
                  <div className="font-bold text-gray-900 text-xs">Ordine #{sideOrder.name || sideOrderNum}</div>
                  <div className="text-[11px] text-gray-500">Store: <strong>{sideOrder.store?.toUpperCase()}</strong> | Stato: {sideOrder.financialStatus}</div>
                  <div className="text-indigo-600 font-bold">Totale: {sideOrder.totalPrice}</div>
                </div>

                {/* Indirizzo Cliente */}
                {sideOrder.shippingAddress && (
                  <div className="bg-white p-3 rounded-xl border border-indigo-100 text-[11px] space-y-0.5">
                    <div className="font-bold text-gray-900 flex items-center gap-1 mb-1">
                      <User className="w-3 h-3 text-red-500" /> Indirizzo Spedizione
                    </div>
                    <div className="font-bold">{sideOrder.shippingAddress.name}</div>
                    <div>{sideOrder.shippingAddress.address1}</div>
                    <div>{sideOrder.shippingAddress.zip} {sideOrder.shippingAddress.city} ({sideOrder.shippingAddress.province})</div>
                    {sideOrder.shippingAddress.phone && <div className="text-indigo-600 font-semibold">Tel: {sideOrder.shippingAddress.phone}</div>}
                  </div>
                )}

                {/* Prodotti Ordine */}
                <div className="bg-white p-3 rounded-xl border border-indigo-100 space-y-2">
                  <div className="font-bold text-gray-900 text-[11px] flex items-center justify-between border-b border-gray-100 pb-1">
                    <span>Prodotti ({sideOrder.products?.length || 0})</span>
                  </div>
                  <div className="space-y-1.5 max-h-[160px] overflow-y-auto">
                    {sideOrder.products?.map((p: any) => (
                      <div key={p.id} className="flex items-center gap-2 p-1.5 bg-gray-50 rounded-lg text-[11px]">
                        {p.image?.url ? (
                          <img src={p.image.url} alt={p.title} className="w-8 h-8 object-cover rounded shrink-0 border border-gray-200" />
                        ) : (
                          <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center text-[9px] font-bold text-gray-500 shrink-0">POD</div>
                        )}
                        <div className="min-w-0">
                          <div className="font-bold text-gray-900 truncate">{p.title}</div>
                          <div className="text-[10px] text-gray-500">Qtà: {p.quantity} {p.variantTitle ? `| ${p.variantTitle}` : ""}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : sideOrderNum ? (
              <div className="text-center py-6 text-xs text-amber-800 bg-amber-50 rounded-xl border border-amber-200">
                Nessun ordine trovato per <strong>#{sideOrderNum}</strong>.
              </div>
            ) : (
              <div className="text-center py-8 text-xs text-gray-400">
                Fai riferimento ad un numero d'ordine per vedere i dettagli dell'acquirente ed i prodotti.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Stato Connessione & WhatsApp Web */}
      {qrModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 text-center">
            <h3 className="text-base font-bold text-gray-900 flex items-center justify-center gap-2">
              <MessageCircle className="w-5 h-5 text-emerald-600" />
              Connessione WhatsApp Business ({channelName})
            </h3>

            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-xs text-emerald-900 space-y-2 text-left">
              <div className="flex items-center gap-2 font-bold text-emerald-800">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping shrink-0" />
                Canale Meta WhatsApp Business API / SendApp Attivo
              </div>
              <p className="text-[11px] text-emerald-700 leading-relaxed">
                I messaggi vengono inviati e ricevuti direttamente tramite le API ufficiali di Meta o SendApp. <strong>Non occorre disconnettere altre app o scansionare il telefono.</strong>
              </p>
              <div className="font-mono text-[10px] bg-white/80 p-2.5 rounded-lg border border-emerald-200 space-y-1">
                <div><strong>Phone Number ID:</strong> {account?.phoneNumberId || "Configurato"}</div>
                <div><strong>WABA ID:</strong> {account?.wabaId || "Configurato"}</div>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <a
                href="https://web.whatsapp.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all"
              >
                <MessageCircle className="w-4 h-4" />
                Apri WhatsApp Web Ufficiale (web.whatsapp.com)
              </a>

              <a
                href="/settings/account"
                className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all"
              >
                <Settings className="w-3.5 h-3.5" />
                Impostazioni Credenziali WhatsApp / SendApp
              </a>
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-100">
              <button
                onClick={() => setQrModalOpen(false)}
                className="px-4 py-1.5 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Visualizzatore Email Aruba
function RenderEmailView({ account, messages, activeEmail, onSelectEmail, onToggleRead, onMarkAllRead, onSync, onOpenNewEmail, onReplyEmail, submitting, isAutoSyncing }: any) {
  const [folderTab, setFolderTab] = useState<"threads" | "inbox" | "sent">("threads");
  const [selectedThreadKey, setSelectedThreadKey] = useState<string | null>(null);

  function normalizeSubject(sub: string): string {
    if (!sub) return "Senza Oggetto";
    let clean = sub;
    while (/^(re|fwd|r|fw|fwd:|re:|r:|fw:)\s*/i.test(clean)) {
      clean = clean.replace(/^(re|fwd|r|fw|fwd:|re:|r:|fw:)\s*/i, "").trim();
    }
    return clean || "Senza Oggetto";
  }

  function getCleanCustomerEmail(m: any): string {
    const raw = m.direction === "INBOUND" ? (m.fromEmail || "") : (m.toEmail || "");
    const match = raw.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    let extracted = match ? match[0].toLowerCase() : raw.trim().toLowerCase();

    // Se l'email è stata inoltrata da info@prettylittle.it o da servizioclienti@, estraiamo l'email originale del cliente dal corpo
    if (m.direction === "INBOUND" && (extracted.includes("info@prettylittle.it") || extracted.includes("servizioclienti@prettylittle.it") || extracted === account?.email?.toLowerCase())) {
      const bodyText = m.bodyText || "";
      const embeddedMatch = bodyText.match(/(?:da|from|mittente|inoltrato\s+da|reply-to)\s*:?\s*([^<\n]+<)?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>?/i);
      if (embeddedMatch && embeddedMatch[2]) {
        const foundEmbedded = embeddedMatch[2].toLowerCase();
        // Escludi solo gli indirizzi interni di inoltro (info@ e servizioclienti@)
        if (!foundEmbedded.includes("info@prettylittle.it") && !foundEmbedded.includes("servizioclienti@prettylittle.it")) {
          return foundEmbedded;
        }
      }
    }

    return extracted;
  }

  const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000; // 5 giorni in millisecondi

  const groupedThreads = useMemo(() => {
    // 1. Separiamo tutti i messaggi per ciascun indirizzo email del cliente
    const byCustomer: { [email: string]: any[] } = {};
    (messages || []).forEach((m: any) => {
      const custEmail = getCleanCustomerEmail(m);
      if (!custEmail) return;
      if (!byCustomer[custEmail]) byCustomer[custEmail] = [];
      byCustomer[custEmail].push(m);
    });

    const threadsList: any[] = [];

    function buildThreadObj(custEmail: string, msgs: any[]) {
      const lastMsg = msgs[msgs.length - 1];
      const threadKey = `${custEmail}_${new Date(msgs[0].sentAt).getTime()}`;
      const unreadCount = msgs.filter((m: any) => m.direction === "INBOUND" && !m.isRead).length;

      return {
        threadKey,
        customerEmail: custEmail,
        subjectDisplay: normalizeSubject(lastMsg.subject),
        lastMsgDate: new Date(lastMsg.sentAt),
        messages: msgs,
        count: msgs.length,
        hasInbound: msgs.some((m: any) => m.direction === "INBOUND"),
        hasOutbound: msgs.some((m: any) => m.direction === "OUTBOUND"),
        unreadCount,
        hasUnread: unreadCount > 0,
      };
    }

    // 2. Per ciascun cliente, raggruppiamo i messaggi che rientrano nella finestra di 5 giorni
    Object.keys(byCustomer).forEach((custEmail) => {
      const msgs = byCustomer[custEmail].sort(
        (a: any, b: any) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()
      );

      let currentCluster: any[] = [];

      msgs.forEach((m: any) => {
        if (currentCluster.length === 0) {
          currentCluster.push(m);
        } else {
          const lastMsgDate = new Date(currentCluster[currentCluster.length - 1].sentAt).getTime();
          const msgDate = new Date(m.sentAt).getTime();
          if (msgDate - lastMsgDate <= FIVE_DAYS_MS) {
            currentCluster.push(m);
          } else {
            threadsList.push(buildThreadObj(custEmail, currentCluster));
            currentCluster = [m];
          }
        }
      });

      if (currentCluster.length > 0) {
        threadsList.push(buildThreadObj(custEmail, currentCluster));
      }
    });

    // 3. Ordiniamo i thread per data del messaggio più recente in ordine decrescente
    return threadsList.sort((a, b) => b.lastMsgDate.getTime() - a.lastMsgDate.getTime());
  }, [messages]);

  const inboundMessages = (messages || []).filter((m: any) => m.direction === "INBOUND");
  const outboundMessages = (messages || []).filter((m: any) => m.direction === "OUTBOUND");
  const unreadCount = inboundMessages.filter((m: any) => !m.isRead).length;
  const activeThreadObj = groupedThreads.find((t) => t.threadKey === selectedThreadKey) || groupedThreads[0];

  const isConfigured = Boolean(account?.email && account?.username && account?.password);

  if (!isConfigured) {
    return (
      <div className="bg-amber-50 border border-amber-200 text-amber-800 p-6 rounded-2xl text-xs space-y-3">
        <div className="flex items-center gap-2 font-bold text-sm">
          <AlertCircle className="w-5 h-5 text-amber-600" />
          Configurazione Email Richiesta
        </div>
        <p>Credenziali Email Aruba (`smtps.aruba.it` / `imaps.aruba.it`) non configurate.</p>
        <button
          onClick={onOpenNewEmail}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs"
        >
          Configura Email Ora
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Mail className="w-5 h-5 text-indigo-600" />
            Posta Elettronica Aruba
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold rounded-full ml-2">
              <span className={`w-2 h-2 rounded-full bg-emerald-500 ${isAutoSyncing ? "animate-ping" : "animate-pulse"}`} />
              <span>{isAutoSyncing ? "Sincronizzazione in corso..." : "Auto-aggiornamento Live (20s)"}</span>
            </div>
          </h2>
          <p className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
            <span>{account?.email || "Account non configurato"}</span>
            <span className="font-mono text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md font-bold text-[11px]">
              Cartella: INBOX.ASSISTENZA
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllRead}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold rounded-xl transition-all"
            >
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
              Segna Tutte Come Lette
            </button>
          )}
          <button
            onClick={onSync}
            disabled={submitting}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${submitting ? "animate-spin" : ""}`} />
            Sincronizza Posta IMAP
          </button>
          <button
            onClick={onOpenNewEmail}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            Nuova Email
          </button>
        </div>
      </div>

      {/* Sub-Tabs di Separazione Caselle: PRIMO TAB = Conversazioni Raggruppate (5 giorni) */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => {
            setFolderTab("threads");
            if (groupedThreads.length > 0 && !selectedThreadKey) {
              setSelectedThreadKey(groupedThreads[0].threadKey);
            }
          }}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            folderTab === "threads"
              ? "bg-purple-600 text-white shadow-sm ring-1 ring-purple-400"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          📑 Conversazioni Raggruppate ({groupedThreads.length})
        </button>

        <button
          onClick={() => setFolderTab("inbox")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            folderTab === "inbox"
              ? "bg-indigo-600 text-white shadow-sm"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          <Inbox className="w-4 h-4" />
          📥 Posta in Arrivo ({inboundMessages.length})
          {unreadCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-black rounded-full shadow-xs">
              {unreadCount} NON LETTE
            </span>
          )}
        </button>

        <button
          onClick={() => setFolderTab("sent")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            folderTab === "sent"
              ? "bg-emerald-600 text-white shadow-sm"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          <Send className="w-4 h-4" />
          📤 Posta Inviata ({outboundMessages.length})
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 h-[560px]">
        {/* Sidebar Lista Messaggi o Thread */}
        <div className="md:col-span-4 bg-gray-50 border border-gray-200 rounded-xl p-3 flex flex-col gap-2 overflow-y-auto">
          {folderTab === "threads" ? (
            groupedThreads.length === 0 ? (
              <div className="text-center py-8 text-xs text-gray-400">Nessuna conversazione trovata.</div>
            ) : (
              groupedThreads.map((t) => {
                const isSelected = selectedThreadKey === t.threadKey || (activeThreadObj && activeThreadObj.threadKey === t.threadKey);
                return (
                  <div
                    key={t.threadKey}
                    onClick={() => {
                      setSelectedThreadKey(t.threadKey);
                      if (t.hasUnread && onToggleRead) {
                        t.messages.forEach((msg: any) => {
                          if (msg.direction === "INBOUND" && !msg.isRead) {
                            onToggleRead(msg.id, true);
                          }
                        });
                      }
                    }}
                    className={`p-3 rounded-xl cursor-pointer transition-all border ${
                      isSelected
                        ? "bg-white border-purple-500 shadow-sm ring-1 ring-purple-400"
                        : t.hasUnread
                        ? "bg-purple-50/70 hover:bg-purple-50 border-purple-300 font-bold"
                        : "bg-white/70 hover:bg-white border-gray-200"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-gray-900 truncate">{t.customerEmail}</span>
                      <div className="flex items-center gap-1">
                        {t.hasUnread && (
                          <span className="text-[9px] font-black bg-red-500 text-white px-1.5 py-0.2 rounded-full">
                            🔴 {t.unreadCount} NUOVE
                          </span>
                        )}
                        <span className="text-[10px] font-extrabold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full border border-purple-200">
                          {t.count} {t.count === 1 ? "email" : "messaggi"}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs font-semibold text-gray-800 mt-1 truncate">{t.subjectDisplay}</div>
                    <div className="flex items-center justify-between text-[10px] text-gray-400 mt-2 pt-1 border-t border-gray-100">
                      <span>{t.lastMsgDate.toLocaleDateString()} {t.lastMsgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <div className="flex items-center gap-1">
                        {t.hasInbound && <span className="text-[9px] bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded font-bold">Cliente</span>}
                        {t.hasOutbound && <span className="text-[9px] bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded font-bold">Noi</span>}
                      </div>
                    </div>
                  </div>
                );
              })
            )
          ) : (
            (folderTab === "inbox" ? inboundMessages : outboundMessages).length === 0 ? (
              <div className="text-center py-8 text-xs text-gray-400">
                Nessuna email {folderTab === "inbox" ? "in arrivo" : "inviata"} trovata.
              </div>
            ) : (
              (folderTab === "inbox" ? inboundMessages : outboundMessages).map((m: any) => {
                const isSelected = activeEmail?.id === m.id;
                const isOut = m.direction === "OUTBOUND";
                const isUnread = !m.isRead && !isOut;
                return (
                  <div
                    key={m.id}
                    onClick={() => {
                      onSelectEmail(m.id);
                      if (!m.isRead && m.direction === "INBOUND" && onToggleRead) {
                        onToggleRead(m.id, true);
                      }
                    }}
                    className={`p-3 rounded-xl cursor-pointer transition-all border ${
                      isSelected
                        ? "bg-white border-indigo-600 shadow-sm ring-1 ring-indigo-400"
                        : isUnread
                        ? "bg-indigo-50/70 hover:bg-indigo-50 border-indigo-300 font-bold"
                        : "bg-white/70 hover:bg-white border-gray-200"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-gray-900 truncate">
                        {isOut ? `A: ${m.toEmail}` : m.fromEmail}
                      </span>
                      <div className="flex items-center gap-1">
                        {isUnread && (
                          <span className="text-[9px] font-black bg-red-500 text-white px-1.5 py-0.2 rounded-full animate-pulse">
                            🔴 NON LETTA
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            isOut ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-indigo-50 text-indigo-800 border-indigo-200"
                          }`}
                        >
                          {isOut ? "📤 INVIATA" : "📥 ARRIVATA"}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs font-semibold text-gray-800 mt-1 truncate">{m.subject}</div>
                    <div className="text-[10px] text-gray-400 mt-1">{new Date(m.sentAt).toLocaleString()}</div>
                  </div>
                );
              })
            )
          )}
        </div>

        {/* Viewer Email o Thread Raggruppato */}
        <div className="md:col-span-8 bg-white border border-gray-200 rounded-xl p-6 flex flex-col justify-between h-full overflow-y-auto space-y-4">
          {folderTab === "threads" ? (
            activeThreadObj ? (
              <div className="space-y-4 h-full flex flex-col justify-between">
                <div className="space-y-4">
                  {/* Header Thread Raggruppato */}
                  <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-purple-600" />
                        {activeThreadObj.subjectDisplay}
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Cliente: <strong>{activeThreadObj.customerEmail}</strong> • {activeThreadObj.count} messaggi nel thread
                      </p>
                    </div>

                    <a
                      href={`/tickets?create=true&emailId=${activeThreadObj.messages[activeThreadObj.messages.length - 1]?.id}`}
                      className="px-3.5 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition-all"
                    >
                      <TicketIcon className="w-3.5 h-3.5" />
                      Crea Ticket con Claude AI
                    </a>
                  </div>

                  {/* Messaggi del Thread in Ordine Cronologico */}
                  <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                    {activeThreadObj.messages.map((msg: any) => {
                      const isOut = msg.direction === "OUTBOUND";
                      const isUnread = !msg.isRead && !isOut;
                      return (
                        <div
                          key={msg.id}
                          onClick={() => {
                            if (isUnread && onToggleRead) {
                              onToggleRead(msg.id, true);
                            }
                          }}
                          className={`p-4 rounded-xl border transition-all cursor-pointer ${
                            isOut
                              ? "bg-emerald-50/40 border-emerald-200"
                              : isUnread
                              ? "bg-indigo-50/90 border-indigo-400 shadow-xs ring-1 ring-indigo-300 font-bold"
                              : "bg-indigo-50/30 border-indigo-200"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-xs text-gray-900 flex items-center gap-1.5">
                              {isOut ? "📤 INVIATA DA OPERATORE" : "📥 RICEVUTA DA CLIENTE"}
                              <span className="text-gray-500 font-normal">
                                ({isOut ? msg.toEmail : (getCleanCustomerEmail(msg) !== msg.fromEmail.toLowerCase() ? `${getCleanCustomerEmail(msg)} (via info@)` : msg.fromEmail)})
                              </span>
                            </span>
                            <div className="flex items-center gap-2">
                              {!isOut && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (onToggleRead) onToggleRead(msg.id, !msg.isRead);
                                  }}
                                  className={`px-2 py-0.5 text-[10px] font-bold rounded-lg border transition-all flex items-center gap-1 ${
                                    msg.isRead
                                      ? "bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300"
                                      : "bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-300"
                                  }`}
                                  title={msg.isRead ? "Segna come NON LETTA per riattivare la notifica" : "Segna come LETTA"}
                                >
                                  {msg.isRead ? "📬 Segna Non Letta" : "✅ Segna Letta"}
                                </button>
                              )}
                              {isUnread && (
                                <span className="text-[9px] font-black bg-red-500 text-white px-1.5 py-0.2 rounded-full animate-pulse">
                                  🔴 NON LETTA
                                </span>
                              )}
                              <span className="text-[10px] text-gray-400">
                                {new Date(msg.sentAt).toLocaleString()}
                              </span>
                            </div>
                          </div>
                          <div className="text-xs text-gray-800 whitespace-pre-wrap leading-relaxed">
                            {msg.bodyText}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => onReplyEmail(activeThreadObj.messages[activeThreadObj.messages.length - 1])}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    Rispondi a questa Conversazione
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 text-xs">
                <MessageSquare className="w-10 h-10 mb-2 stroke-[1.5]" />
                Seleziona una conversazione per visualizzare l'intero thread di risposte.
              </div>
            )
          ) : activeEmail ? (
            <div className="space-y-4 h-full flex flex-col justify-between">
              <div className="space-y-4">
                <div className="border-b border-gray-100 pb-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-900">{activeEmail.subject}</h3>
                    <div className="flex items-center gap-2">
                      {activeEmail.direction === "INBOUND" && (
                        <button
                          onClick={() => onToggleRead && onToggleRead(activeEmail.id, !activeEmail.isRead)}
                          className={`px-3 py-1.5 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all border shadow-2xs ${
                            activeEmail.isRead
                              ? "bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300"
                              : "bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-300"
                          }`}
                          title={activeEmail.isRead ? "Segna come NON LETTA per riattivare la notifica" : "Segna come LETTA per rimuovere la notifica"}
                        >
                          {activeEmail.isRead ? (
                            <>
                              <Mail className="w-3.5 h-3.5 text-amber-700" />
                              <span>📬 Segna come Non Letta</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-700" />
                              <span>✅ Segna come Letta</span>
                            </>
                          )}
                        </button>
                      )}
                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-full border ${
                          activeEmail.direction === "OUTBOUND"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : "bg-indigo-50 text-indigo-800 border-indigo-200"
                        }`}
                      >
                        {activeEmail.direction === "OUTBOUND" ? "📤 INVIATA DA OPERATORE" : "📥 RICEVUTA DA CLIENTE"}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 space-y-0.5">
                    <div><strong>Da:</strong> {activeEmail.fromEmail}</div>
                    <div><strong>A:</strong> {activeEmail.toEmail}</div>
                    <div><strong>Data:</strong> {new Date(activeEmail.sentAt).toLocaleString()}</div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl text-xs text-gray-800 whitespace-pre-wrap leading-relaxed min-h-[220px]">
                  {activeEmail.bodyText}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <a
                  href={`/tickets?create=true&emailId=${activeEmail.id}`}
                  className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all"
                >
                  <TicketIcon className="w-3.5 h-3.5" />
                  Crea Ticket con Claude AI
                </a>
                <button
                  onClick={() => onReplyEmail(activeEmail)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5"
                >
                  <Mail className="w-3.5 h-3.5" />
                  Rispondi a questa Email
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 text-xs">
              <Inbox className="w-10 h-10 mb-2 stroke-[1.5]" />
              Seleziona una mail dalla lista per visualizzarne il contenuto.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Scheda Impostazioni Credenziali
function RenderSettingsView({
  b2bConfig,
  setB2bConfig,
  b2cConfig,
  setB2cConfig,
  emailConfig,
  setEmailConfig,
  onSaveB2b,
  onSaveB2c,
  onSaveEmail,
  submitting,
}: any) {
  return (
    <div className="space-y-6 max-w-4xl">
      {/* 1. WhatsApp B2B */}
      <div className="bg-gray-50/60 border border-gray-200 rounded-2xl p-6 space-y-4">
        <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-emerald-600" />
          1. WhatsApp Business - Canale B2B
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-bold text-gray-700 mb-1">Phone Number ID</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              value={b2bConfig.phoneNumberId}
              onChange={(e) => setB2bConfig({ ...b2bConfig, phoneNumberId: e.target.value })}
            />
          </div>
          <div>
            <label className="block font-bold text-gray-700 mb-1">WABA ID (WhatsApp Business Account ID)</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              value={b2bConfig.wabaId}
              onChange={(e) => setB2bConfig({ ...b2bConfig, wabaId: e.target.value })}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block font-bold text-gray-700 mb-1">Permanent System User Access Token</label>
            <input
              type="password"
              className="w-full px-3 py-2 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              value={b2bConfig.accessToken}
              onChange={(e) => setB2bConfig({ ...b2bConfig, accessToken: e.target.value })}
            />
          </div>
        </div>
        <button
          onClick={onSaveB2b}
          disabled={submitting}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
        >
          {submitting ? "Salvataggio..." : "Salva Credenziali WhatsApp B2B"}
        </button>
      </div>

      {/* 2. WhatsApp B2C */}
      <div className="bg-gray-50/60 border border-gray-200 rounded-2xl p-6 space-y-4">
        <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
          <User className="w-5 h-5 text-emerald-600" />
          2. WhatsApp Business - Canale B2C
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-bold text-gray-700 mb-1">Phone Number ID</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              value={b2cConfig.phoneNumberId}
              onChange={(e) => setB2cConfig({ ...b2cConfig, phoneNumberId: e.target.value })}
            />
          </div>
          <div>
            <label className="block font-bold text-gray-700 mb-1">WABA ID (WhatsApp Business Account ID)</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              value={b2cConfig.wabaId}
              onChange={(e) => setB2cConfig({ ...b2cConfig, wabaId: e.target.value })}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block font-bold text-gray-700 mb-1">Permanent System User Access Token</label>
            <input
              type="password"
              className="w-full px-3 py-2 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              value={b2cConfig.accessToken}
              onChange={(e) => setB2cConfig({ ...b2cConfig, accessToken: e.target.value })}
            />
          </div>
        </div>
        <button
          onClick={onSaveB2c}
          disabled={submitting}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
        >
          {submitting ? "Salvataggio..." : "Salva Credenziali WhatsApp B2C"}
        </button>
      </div>

      {/* 3. Email Aruba */}
      <div className="bg-gray-50/60 border border-gray-200 rounded-2xl p-6 space-y-4">
        <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
          <Mail className="w-5 h-5 text-blue-600" />
          3. Server Email Aruba (SMTP & IMAP)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-bold text-gray-700 mb-1">Nome Mittente Visualizzato</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              value={emailConfig.accountName}
              onChange={(e) => setEmailConfig({ ...emailConfig, accountName: e.target.value })}
            />
          </div>
          <div>
            <label className="block font-bold text-gray-700 mb-1">Indirizzo Email Dominio</label>
            <input
              type="email"
              className="w-full px-3 py-2 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              value={emailConfig.email}
              onChange={(e) => setEmailConfig({ ...emailConfig, email: e.target.value })}
              placeholder="info@tuodominio.it"
            />
          </div>
          <div>
            <label className="block font-bold text-gray-700 mb-1">Username Aruba</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              value={emailConfig.username}
              onChange={(e) => setEmailConfig({ ...emailConfig, username: e.target.value })}
              placeholder="info@tuodominio.it"
            />
          </div>
          <div>
            <label className="block font-bold text-gray-700 mb-1">Password Aruba</label>
            <input
              type="password"
              className="w-full px-3 py-2 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              value={emailConfig.password}
              onChange={(e) => setEmailConfig({ ...emailConfig, password: e.target.value })}
            />
          </div>
          <div>
            <label className="block font-bold text-gray-700 mb-1">SMTP Host (Invio)</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              value={emailConfig.smtpHost}
              onChange={(e) => setEmailConfig({ ...emailConfig, smtpHost: e.target.value })}
            />
          </div>
          <div>
            <label className="block font-bold text-gray-700 mb-1">Porta SMTP</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              value={emailConfig.smtpPort}
              onChange={(e) => setEmailConfig({ ...emailConfig, smtpPort: e.target.value })}
            />
          </div>
          <div>
            <label className="block font-bold text-gray-700 mb-1">IMAP Host (Lettura Posta)</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              value={emailConfig.imapHost}
              onChange={(e) => setEmailConfig({ ...emailConfig, imapHost: e.target.value })}
            />
          </div>
          <div>
            <label className="block font-bold text-gray-700 mb-1">Porta IMAP</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              value={emailConfig.imapPort}
              onChange={(e) => setEmailConfig({ ...emailConfig, imapPort: e.target.value })}
            />
          </div>
        </div>
        <button
          onClick={onSaveEmail}
          disabled={submitting}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
        >
          {submitting ? "Salvataggio..." : "Salva Credenziali Email Aruba"}
        </button>
      </div>
    </div>
  );
}
