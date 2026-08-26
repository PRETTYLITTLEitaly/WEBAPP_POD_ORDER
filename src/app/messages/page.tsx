"use client";

import { useEffect, useState } from "react";
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

  const loadData = async () => {
    try {
      setLoading(true);
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
        setError(json.error || "Impossibile caricare i messaggi");
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
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

  const handleSyncEmails = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionType: "sync_emails" }),
      });
      const json = await res.json();
      if (json.success) {
        showFeedback(`Sincronizzazione completata! (${json.importedCount || 0} nuove mail)`);
        await loadData();
      } else {
        showFeedback(json.error || json.reason || "Errore durante il sync IMAP", true);
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
            onClick={loadData}
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
              onSelectConv={setSelectedB2BConvId}
              waText={waText}
              setWaText={setWaText}
              onSend={(to) => handleSendWa(data?.b2bAccount?.id, to)}
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
              onSend={(to) => handleSendWa(data?.b2cAccount?.id, to)}
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
              onSelectEmail={(id) => {
                setSelectedEmailId(id);
                const msg = data?.emailMessages?.find((m: any) => m.id === id);
                if (msg) {
                  const cleanTo = msg.fromEmail.includes("<") ? msg.fromEmail.split("<")[1].replace(">", "") : msg.fromEmail;
                  setEmailTo(cleanTo);
                  setEmailSubject(`Re: ${msg.subject}`);
                }
              }}
              onSync={handleSyncEmails}
              onOpenNewEmail={() => {
                setEmailTo("");
                setEmailSubject("");
                setEmailBody("");
                setNewEmailOpen(true);
              }}
              submitting={submitting}
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

// Visualizzatore WhatsApp (B2B o B2C)
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
  const isConfigured = Boolean(account?.phoneNumberId && account?.accessToken);

  return (
    <div className="space-y-4">
      {!isConfigured && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Credenziali WhatsApp Meta Cloud API per <strong>{channelName}</strong> non configurate.
            </span>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          Chat WhatsApp - Canale {channelName}
        </h2>
        <button
          onClick={onOpenNewChat}
          className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          Nuova Chat WhatsApp
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 h-[550px]">
        {/* Sidebar Liste Conversazioni */}
        <div className="md:col-span-4 bg-gray-50 border border-gray-200 rounded-xl p-3 flex flex-col gap-2 overflow-y-auto">
          <div className="text-[11px] font-bold text-gray-500 uppercase px-2 mb-1">
            Conversazioni Attive ({conversations.length})
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
                    isSelected ? "bg-white border-emerald-500 shadow-sm" : "bg-white/60 hover:bg-white border-gray-200/80"
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

        {/* Finestra Chat */}
        <div className="md:col-span-8 bg-white border border-gray-200 rounded-xl p-4 flex flex-col justify-between h-full">
          {activeConv ? (
            <>
              {/* Topbar Chat */}
              <div className="pb-3 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-gray-900">{activeConv.customerName || activeConv.customerPhone}</h3>
                  <span className="text-xs text-gray-500">{activeConv.customerPhone}</span>
                </div>
                <span className="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2.5 py-1 rounded-full">
                  Canale {channelName}
                </span>
              </div>

              {/* Messaggi */}
              <div className="flex-1 overflow-y-auto py-4 px-2 space-y-3 bg-[#efeae2]/30 rounded-xl my-3 p-3">
                {activeConv.messages?.length === 0 ? (
                  <div className="text-center py-12 text-xs text-gray-400">Nessun messaggio presente.</div>
                ) : (
                  activeConv.messages.map((m: any) => {
                    const isOut = m.direction === "OUTBOUND";
                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isOut ? "items-end" : "items-start"}`}
                      >
                        <div
                          className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-xs shadow-sm ${
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

              {/* Form Input Risposta */}
              <div className="pt-2 flex items-center gap-2">
                <input
                  type="text"
                  value={waText}
                  onChange={(e) => setWaText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && onSend(activeConv.customerPhone)}
                  placeholder="Scrivi un messaggio WhatsApp..."
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  onClick={() => onSend(activeConv.customerPhone)}
                  disabled={submitting || !waText.trim()}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition-all disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  Invia
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 text-xs">
              <MessageSquare className="w-10 h-10 mb-2 stroke-[1.5]" />
              Seleziona una chat dalla colonna di sinistra o avviane una nuova.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Visualizzatore Email Aruba
function RenderEmailView({ account, messages, activeEmail, onSelectEmail, onSync, onOpenNewEmail, submitting }: any) {
  const isConfigured = Boolean(account?.email && account?.username && account?.password);

  return (
    <div className="space-y-4">
      {!isConfigured && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Credenziali Email Aruba (`smtps.aruba.it` / `imaps.aruba.it`) non configurate.
            </span>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            Posta Elettronica Aruba
          </h2>
          <p className="text-xs text-gray-500">{account?.email || "Account non configurato"}</p>
        </div>
        <div className="flex items-center gap-2">
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
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            Nuova Email
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 h-[550px]">
        {/* Sidebar Lista Email */}
        <div className="md:col-span-4 bg-gray-50 border border-gray-200 rounded-xl p-3 flex flex-col gap-2 overflow-y-auto">
          <div className="text-[11px] font-bold text-gray-500 uppercase px-2 mb-1">
            Messaggi Posta ({messages.length})
          </div>
          {messages.length === 0 ? (
            <div className="text-center py-8 text-xs text-gray-400">Nessun messaggio email trovato.</div>
          ) : (
            messages.map((m: any) => {
              const isSelected = activeEmail?.id === m.id;
              const isOut = m.direction === "OUTBOUND";
              return (
                <div
                  key={m.id}
                  onClick={() => onSelectEmail(m.id)}
                  className={`p-3 rounded-xl cursor-pointer transition-all border ${
                    isSelected ? "bg-white border-blue-500 shadow-sm" : "bg-white/60 hover:bg-white border-gray-200/80"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-gray-900 truncate">
                      {isOut ? `A: ${m.toEmail}` : m.fromEmail}
                    </span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${isOut ? "bg-blue-100 text-blue-800" : "bg-emerald-100 text-emerald-800"}`}>
                      {m.direction}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-gray-800 mt-1 truncate">{m.subject}</div>
                  <div className="text-[10px] text-gray-400 mt-1">{new Date(m.sentAt).toLocaleDateString()}</div>
                </div>
              );
            })
          )}
        </div>

        {/* Viewer Email */}
        <div className="md:col-span-8 bg-white border border-gray-200 rounded-xl p-6 flex flex-col justify-between h-full overflow-y-auto">
          {activeEmail ? (
            <div className="space-y-4">
              <div className="border-b border-gray-100 pb-4 space-y-2">
                <h3 className="text-lg font-bold text-gray-900">{activeEmail.subject}</h3>
                <div className="text-xs text-gray-500 space-y-0.5">
                  <div><strong>Da:</strong> {activeEmail.fromEmail}</div>
                  <div><strong>A:</strong> {activeEmail.toEmail}</div>
                  <div><strong>Data:</strong> {new Date(activeEmail.sentAt).toLocaleString()}</div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl text-xs text-gray-800 whitespace-pre-wrap leading-relaxed min-h-[220px]">
                {activeEmail.bodyText}
              </div>

              <div className="flex justify-end">
                <button
                  onClick={onOpenNewEmail}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5"
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
