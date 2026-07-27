"use client";

import { useState, useEffect } from "react";
import { getCurrentUser, getUsers, saveUsers, setCurrentUser, User } from "@/lib/userStore";
import { Key, CheckCircle, ShieldAlert } from "lucide-react";

export default function AccountSettingsPage() {
  const [currentUser, setCurrUser] = useState<User | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    setCurrUser(getCurrentUser());
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
    const userInDb = users.find(u => u.email.toLowerCase() === currentUser?.email?.toLowerCase());

    if (userInDb && userInDb.password && userInDb.password !== currentPassword) {
      setMessage({ type: "error", text: "La password attuale non è corretta." });
      return;
    }

    // Update in database
    const updatedUsers = users.map(u => {
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
            Gestisci le tue credenziali e aggiorna la tua password di accesso.
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

        {/* Change Password Form */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Cambia Password</h2>

          {message && (
            <div className={`p-4 rounded-lg text-sm font-medium mb-6 flex items-center gap-2 ${
              message.type === "success" 
                ? "bg-green-50 text-green-800 border border-green-200" 
                : "bg-red-50 text-red-800 border border-red-200"
            }`}>
              {message.type === "success" ? <CheckCircle className="w-5 h-5 text-green-600" /> : <ShieldAlert className="w-5 h-5 text-red-600" />}
              {message.text}
            </div>
          )}

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
