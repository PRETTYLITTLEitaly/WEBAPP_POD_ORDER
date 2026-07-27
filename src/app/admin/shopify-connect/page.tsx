"use client";

import { useState } from "react";
import { connectShopifyAction } from "./actions";
import { KeyRound, Store } from "lucide-react";

export default function ShopifyConnectPage() {
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (formData: FormData) => {
    setError(null);
    const res = await connectShopifyAction(formData);
    if (res?.error) {
      setError(res.error);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-64px)] flex-col py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50">
          <KeyRound className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          Generatore Token Shopify
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          Usa questo strumento interno per scambiare le credenziali dell'app con un token permanente.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white px-4 py-8 shadow-sm sm:rounded-xl border border-gray-200 dark:bg-gray-900/50 dark:border-gray-800 sm:px-10 backdrop-blur-xl">
          <form action={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="shop" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Dominio Store (es. wholesale-prettylittle-it.myshopify.com)
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Store className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </div>
                <input
                  type="text"
                  name="shop"
                  id="shop"
                  required
                  placeholder="shop.myshopify.com"
                  className="block w-full rounded-md border border-gray-300 pl-10 py-2 focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="clientId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Client ID
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  name="clientId"
                  id="clientId"
                  required
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white sm:text-sm font-mono"
                />
              </div>
            </div>

            <div>
              <label htmlFor="clientSecret" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Client Secret
              </label>
              <div className="mt-1">
                <input
                  type="password"
                  name="clientSecret"
                  id="clientSecret"
                  required
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white sm:text-sm font-mono"
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
                className="flex w-full justify-center rounded-md border border-transparent bg-emerald-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-colors dark:hover:bg-emerald-500"
              >
                Connetti a Shopify
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
