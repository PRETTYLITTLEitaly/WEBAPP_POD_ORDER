"use client";

import { useState, useEffect } from "react";
import { getCurrentUser, getUsers, saveUsers, setCurrentUser, User } from "@/lib/userStore";
import { Key, CheckCircle, ShieldAlert, Sparkles, Save } from "lucide-react";

export default function AccountSettingsPage() {
  const [currentUser, setCurrUser] = useState<User | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Claude API Key Globale
  const [anthropicKey, setAnthropicKey] = useState("");
  const [savingKey, setSavingKey] = useState(false);
  const [isKeyActive, setIsKeyActive] = useState(false);

  useEffect(() => {
    setCurrUser(getCurrentUser());

    // Carica la Chiave API Claude Globale salvata nel database per tutti gli utenti
    fetch("/api/settings/ai")
      .then((res) => res.json())
      .then((data) => {
        if (data.apiKey) {
          setAnthropicKey(data.apiKey);
          setIsKeyActive(true);
        }
      })
      .catch((err) => console.error("Errore caricamento impostazioni AI:", err));
  }, []);

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!newPassword.trim()) {
      setMessage({ type: "error", text: "La nuova password non può essere vuota." });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "La nuova password e la conferma non coincidono." });
      return;
    }

    const users = getUsers();
    const userInDb = users.find((u) => u.email.toLowerCase() === currentUser?.email?.toLowerCase());

    if (userInDb && userInDb.password && userInDb.password !== currentPassword) {
      setMessage({ type: "error", text: "La password attuale non è corretta." });
      return;
    }

    // Update in database
    const updatedUsers = users.map((u) => {
      if (u.email.toLowerCase() === currentUser?.email?.toLowerCase()) {
        return { ...u, password: newPassword.trim() };
      }
      return u;
    });

    saveUsers(updatedUsers);
    if (currentUser) {
      const updatedUser = { ...currentUser, password: newPassword.trim() };
      setCurrentUser(updatedUser);
      setCurrUser(updatedUser);
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setMessage({ type: "success", text: "Password aggiornata con successo!" });
  };

  const handleSaveApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingKey(true);
    setMessage(null);

    try {
      const res = await fetch("/api/settings/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: anthropicKey.trim() }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setIsKeyActive(Boolean(anthropicKey.trim()));
        // Salva anche localmente come backup
        if (typeof window !== "undefined") {
          localStorage.setItem("anthropic_api_key", anthropicKey.trim());
        }
        setMessage({ type: "success", text: "Chiave API Claude Anthropic salvata GLOBALMENTE nel sistema per TUTTI gli operatori!" });
      } else {
        setMessage({ type: "error", text: data.error || "Errore durante il salvataggio della chiave API." });
      }
    } catch (e: any) {
      setMessage({ type: "error", text: e.message });
    } finally {
      setSavingKey(false);
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-2xl space-y-6">
        
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Key className="w-6 h-6 text-indigo-600" />
            Il Tuo Account
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestisci le tue credenziali, la password ed imposta la Chiave API Claude condivisa con l'intero team.
          </p>
        </div>

        {/* User Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase">Profilo Utente</span>
            <p className="text-lg font-bold text-gray-900 mt-0.5">{currentUser?.email || "operatore@prettylittleitaly.it"}</p>
          </div>
          <span className="px-3 py-1 bg-indigo-50 text-indigo-700 font-bold text-xs uppercase rounded-full border border-indigo-100">
            Ruolo: {currentUser?.role || "operatore"}
          </span>
        </div>

        {/* Banner Feedback */}
        {message && (
          <div
            className={`p-4 rounded-lg text-sm font-medium flex items-center gap-2 ${
              message.type === "success"
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
            ) : (
              <ShieldAlert className="w-5 h-5 text-red-600 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Configurazione API Key Claude Anthropic (Globale Sistema) */}
        <div className="bg-white rounded-xl border border-purple-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              Chiave API Claude Anthropic (Condivisa con Tutti gli Operatori)
            </h2>
            <span className={`text-xs px-2.5 py-1 rounded-md font-bold border ${
              isKeyActive 
                ? "bg-green-50 text-green-700 border-green-200" 
                : "bg-purple-50 text-purple-700 border-purple-200"
            }`}>
              {isKeyActive ? "Attiva nel Sistema" : "Opzionale"}
            </span>
          </div>
          <p className="text-xs text-gray-500">
            Inserendo la tua chiave API Claude Anthropic (es. <code className="font-mono bg-gray-100 px-1 py-0.5 rounded text-gray-800">sk-ant-api03-...</code>), la configurazione verrà salvata nel database ed utilizzerà **l'IA di Claude per TUTTI gli operatori del sistema**, senza bisogno che ciascun utente debba inserirla sul proprio computer.
          </p>

          <form onSubmit={handleSaveApiKey} className="space-y-3 pt-1">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Chiave API Anthropic Claude
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="password"
                  placeholder="sk-ant-api03-..."
                  value={anthropicKey}
                  onChange={(e) => setAnthropicKey(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
                <button
                  type="submit"
                  disabled={savingKey}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {savingKey ? "Salvataggio..." : "Salva per Tutti gli Operatori"}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Change Password Form */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Cambia Password</h2>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Password Attuale
              </label>
              <input 
                type="password" 
                required 
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Nuova Password
              </label>
              <input 
                type="password" 
                required 
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Conferma Nuova Password
              </label>
              <input 
                type="password" 
                required 
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="pt-4 border-t border-gray-100 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-lg shadow-sm transition-colors"
              >
                Salva Nuova Password
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}
