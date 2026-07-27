"use client";

import { useState } from "react";
import { loginAction } from "./actions";
import { LockKeyhole, Mail, Key } from "lucide-react";
import { getUsers, setCurrentUser, User } from "@/lib/userStore";

export default function AdminLoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const users = getUsers();
    const foundUser = users.find(
      u => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password
    );

    const formData = new FormData();
    formData.append("email", email);
    formData.append("password", password);
    if (foundUser) {
      formData.append("customUserJson", JSON.stringify(foundUser));
    }

    const res = await loginAction(formData);
    if (res?.error) {
      setError(res.error);
    } else {
      const userToSave: User = foundUser || {
        id: "user-" + Date.now(),
        email: email.trim().toLowerCase(),
        password: password,
        role: email.toLowerCase().includes("admin") ? "admin" : "operatore",
        createdAt: new Date().toISOString()
      };
      setCurrentUser(userToSave);
    }
  };

  return (
    <div className="flex min-h-screen flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100">
          <LockKeyhole className="h-8 w-8 text-indigo-600" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
          Accesso Ecosistema
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Inserisci le tue credenziali per accedere al Centro Operativo.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white px-6 py-8 shadow-sm rounded-2xl border border-gray-200 sm:px-10">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Indirizzo Email
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="nome@prettylittleitaly.it"
                  className="block w-full pl-10 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Key className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="block w-full pl-10 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 p-4 ring-1 ring-inset ring-red-600/20">
                <p className="text-sm text-red-800 font-medium">{error}</p>
              </div>
            )}

            <div>
              <button
                type="submit"
                className="flex w-full justify-center rounded-lg border border-transparent bg-indigo-600 py-2.5 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
              >
                Accedi al Sistema
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
