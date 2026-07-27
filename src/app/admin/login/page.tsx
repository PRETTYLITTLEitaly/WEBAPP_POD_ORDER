"use client";

import { useState } from "react";
import { loginAction } from "./actions";
import { LockKeyhole } from "lucide-react";

export default function AdminLoginPage() {
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (formData: FormData) => {
    setError(null);
    const res = await loginAction(formData);
    if (res?.error) {
      setError(res.error);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-64px)] flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/50">
          <LockKeyhole className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          Accesso Admin Requisito
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          Inserisci la password di amministrazione per accedere agli strumenti interni.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white px-4 py-8 shadow-sm sm:rounded-xl border border-gray-200 dark:bg-gray-900/50 dark:border-gray-800 sm:px-10 backdrop-blur-xl">
          <form action={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white sm:text-sm transition-colors"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-4 dark:bg-red-900/20 ring-1 ring-inset ring-red-600/20">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}

            <div>
              <button
                type="submit"
                className="flex w-full justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors dark:hover:bg-indigo-500"
              >
                Sblocca Accesso
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
