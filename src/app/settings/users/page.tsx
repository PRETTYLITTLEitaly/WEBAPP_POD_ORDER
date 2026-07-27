"use client";

import { useState, useEffect } from "react";
import { getUsers, saveUsers, getCurrentUser, User } from "@/lib/userStore";
import { UserPlus, Shield, Key, Trash2, Users, AlertCircle } from "lucide-react";

export default function UserManagementPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsersList] = useState<User[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState<User | null>(null);

  // Form states
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "operatore">("operatore");
  const [resetPassVal, setResetPassVal] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setCurrentUser(getCurrentUser());
    setUsersList(getUsers());
  }, []);

  if (currentUser && currentUser.role !== "admin") {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-center gap-4 text-red-700">
          <AlertCircle className="w-8 h-8 shrink-0 text-red-600" />
          <div>
            <h3 className="font-bold text-lg">Accesso Negato</h3>
            <p className="text-sm">Solo gli utenti con ruolo <strong>Admin</strong> possono accedere alla gestione utenti.</p>
          </div>
        </div>
      </div>
    );
  }

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !newPassword.trim()) return;

    if (users.some(u => u.email.toLowerCase() === newEmail.trim().toLowerCase())) {
      alert("Un utente con questa email esiste già.");
      return;
    }

    const newUser: User = {
      id: Date.now().toString(),
      email: newEmail.trim().toLowerCase(),
      password: newPassword.trim(),
      role: newRole,
      createdAt: new Date().toISOString()
    };

    const updated = [...users, newUser];
    saveUsers(updated);
    setUsersList(updated);

    setNewEmail("");
    setNewPassword("");
    setNewRole("operatore");
    setShowCreateModal(false);
    setMessage(`Utente ${newUser.email} creato con successo!`);
    setTimeout(() => setMessage(null), 4000);
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showResetModal || !resetPassVal.trim()) return;

    const updated = users.map(u => {
      if (u.id === showResetModal.id) {
        return { ...u, password: resetPassVal.trim() };
      }
      return u;
    });

    saveUsers(updated);
    setUsersList(updated);
    setShowResetModal(null);
    setResetPassVal("");
    setMessage(`Password resettata con successo per ${showResetModal.email}!`);
    setTimeout(() => setMessage(null), 4000);
  };

  const handleDeleteUser = (user: User) => {
    if (user.id === "admin-default") {
      alert("Impossibile eliminare l'Admin di sistema predefinito.");
      return;
    }
    if (confirm(`Sei sicuro di voler eliminare l'utente ${user.email}?`)) {
      const updated = users.filter(u => u.id !== user.id);
      saveUsers(updated);
      setUsersList(updated);
      setMessage(`Utente ${user.email} eliminato.`);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-4xl space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-6 h-6 text-indigo-600" />
              Gestione Utenti & Ruoli
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Crea nuove utenze, assegna i ruoli (Admin / Operatore) e gestisci il reset delle password.
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg shadow-sm transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Nuovo Utente
          </button>
        </div>

        {message && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg text-sm font-medium">
            {message}
          </div>
        )}

        {/* Users Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Utente / Email</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Ruolo</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Data Creazione</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Azioni</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs">
                        {u.email.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-semibold text-gray-900">{u.email}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                      u.role === "admin" 
                        ? "bg-purple-100 text-purple-800" 
                        : "bg-blue-100 text-blue-800"
                    }`}>
                      {u.role === "admin" && <Shield className="w-3 h-3" />}
                      {u.role.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(u.createdAt).toLocaleDateString("it-IT")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setShowResetModal(u)}
                        className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Resetta Password"
                      >
                        <Key className="w-4 h-4" />
                      </button>
                      {u.id !== "admin-default" && (
                        <button
                          onClick={() => handleDeleteUser(u)}
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Elimina Utente"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Creazione Utente */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-1">Crea Nuovo Utente</h3>
              <p className="text-sm text-gray-500 mb-4">Inserisci le credenziali e il ruolo per la nuova utenza.</p>
              
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Email Utente</label>
                  <input 
                    type="email" 
                    required 
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    placeholder="operatore@prettylittleitaly.it"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Password</label>
                  <input 
                    type="password" 
                    required 
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Ruolo</label>
                  <select 
                    value={newRole}
                    onChange={e => setNewRole(e.target.value as "admin" | "operatore")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="operatore">Operatore (Solo Cambio Password)</option>
                    <option value="admin">Admin (Gestione Utenti Totale)</option>
                  </select>
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                  <button 
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    Annulla
                  </button>
                  <button 
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
                  >
                    Crea Utente
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Reset Password */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-1">Resetta Password</h3>
              <p className="text-sm text-gray-500 mb-4">
                Imposta una nuova password per l'utente <strong>{showResetModal.email}</strong>.
              </p>

              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Nuova Password</label>
                  <input 
                    type="password" 
                    required 
                    value={resetPassVal}
                    onChange={e => setResetPassVal(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                  <button 
                    type="button"
                    onClick={() => setShowResetModal(null)}
                    className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    Annulla
                  </button>
                  <button 
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
                  >
                    Aggiorna Password
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
