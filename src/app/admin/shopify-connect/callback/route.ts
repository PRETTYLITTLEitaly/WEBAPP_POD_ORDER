import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const searchParams = url.searchParams;
  
  const code = searchParams.get("code");
  const hmac = searchParams.get("hmac");
  const shop = searchParams.get("shop");
  const state = searchParams.get("state");

  if (!code || !hmac || !shop || !state) {
    return new NextResponse("Parametri mancanti da Shopify", { status: 400 });
  }

  // 1. Leggi il cookie di stato
  const cookieStore = await cookies();
  const stateCookie = cookieStore.get("shopify_oauth_state");
  if (!stateCookie) {
    return new NextResponse("Sessione OAuth scaduta o non valida.", { status: 400 });
  }

  let oauthData;
  try {
    oauthData = JSON.parse(Buffer.from(stateCookie.value, "base64").toString("utf-8"));
  } catch (e) {
    return new NextResponse("Dati di sessione corrotti.", { status: 400 });
  }

  // 2. Verifica lo state per prevenire CSRF
  if (state !== oauthData.state) {
    return new NextResponse("Verifica CSRF fallita (state non corrispondente).", { status: 403 });
  }

  // 3. Verifica l'HMAC
  // Rimuovi l'hmac dai parametri per validare il resto della query string
  const map = new Map();
  searchParams.forEach((value, key) => {
    if (key !== "hmac") {
      map.set(key, value);
    }
  });

  // Ordina i parametri alfabeticamente
  const sortedKeys = Array.from(map.keys()).sort();
  const message = sortedKeys.map(key => `${key}=${map.get(key)}`).join("&");

  // Calcola l'HMAC-SHA256
  const generatedHash = crypto
    .createHmac("sha256", oauthData.clientSecret)
    .update(message)
    .digest("hex");

  if (generatedHash !== hmac) {
    return new NextResponse("Verifica HMAC fallita. Richiesta non autentica da Shopify.", { status: 403 });
  }

  // 4. Scambia il code per l'access token
  let tokenData;
  try {
    const axios = require("axios");
    const { HttpsProxyAgent } = require("https-proxy-agent");
    const agent = process.env.https_proxy ? new HttpsProxyAgent(process.env.https_proxy) : undefined;
    
    const tokenResponse = await axios({
      url: `https://${shop}/admin/oauth/access_token`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      data: {
        client_id: oauthData.clientId,
        client_secret: oauthData.clientSecret,
        code: code
      },
      httpsAgent: agent
    });
    tokenData = tokenResponse.data;
  } catch (error: any) {
    console.error("Errore fetch token Shopify:", error);
    return new NextResponse(`Errore di rete o API nel recupero del token Shopify: ${error.message}`, { status: 500 });
  }

  const accessToken = tokenData.access_token;

  if (!accessToken) {
    return new NextResponse("Nessun access token ricevuto da Shopify.", { status: 500 });
  }

  // Pulisci il cookie di stato OAuth (non ci serve più)
  cookieStore.delete("shopify_oauth_state");

  // 5. Restituisci la pagina HTML finale, senza framework, super leggera e stilizzata con Tailwind CDN
  const html = `
    <!DOCTYPE html>
    <html lang="it">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Token Generato - Centro Operativo</title>
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-gray-50 min-h-screen flex flex-col items-center justify-center p-4">
      <div class="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        <div class="flex items-center justify-center w-16 h-16 bg-green-100 text-green-600 rounded-full mb-6 mx-auto">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-center text-gray-900 mb-2">Autenticazione Completata</h1>
        <p class="text-center text-gray-600 mb-8">Lo store <strong>${shop}</strong> è stato collegato con successo.</p>
        
        <div class="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-md mb-8">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <p class="text-sm text-amber-700 font-medium">
                Copia questo token ORA.
              </p>
              <p class="text-sm text-amber-600 mt-1">
                Per motivi di sicurezza, questo token non verrà mai salvato nel database. Salvalo nelle variabili d'ambiente (SHOPIFY_B2B_TOKEN o SHOPIFY_B2C_TOKEN). Chiudendo questa pagina non potrai più recuperarlo.
              </p>
            </div>
          </div>
        </div>

        <div class="relative">
          <label class="block text-sm font-medium text-gray-700 mb-1">Admin API Access Token</label>
          <div class="flex rounded-md shadow-sm">
            <input type="text" readonly value="${accessToken}" id="tokenInput" class="flex-1 min-w-0 block w-full px-4 py-3 rounded-none rounded-l-md border-gray-300 bg-gray-50 text-gray-900 font-mono text-sm border focus:ring-0 focus:outline-none" onclick="this.select()">
            <button onclick="copyToken()" id="copyBtn" class="inline-flex items-center px-4 py-2 border border-l-0 border-gray-300 rounded-r-md bg-white text-sm font-medium text-indigo-600 hover:bg-gray-50 focus:outline-none transition-colors">
              Copia
            </button>
          </div>
        </div>

        <div class="mt-8 text-center">
          <a href="/" class="text-indigo-600 hover:text-indigo-800 font-medium text-sm inline-flex items-center">
            &larr; Torna alla Dashboard
          </a>
        </div>
      </div>

      <script>
        function copyToken() {
          const input = document.getElementById('tokenInput');
          input.select();
          input.setSelectionRange(0, 99999); 
          navigator.clipboard.writeText(input.value).then(() => {
            const btn = document.getElementById('copyBtn');
            btn.textContent = 'Copiato!';
            btn.classList.remove('text-indigo-600');
            btn.classList.add('text-green-600');
            setTimeout(() => {
              btn.textContent = 'Copia';
              btn.classList.remove('text-green-600');
              btn.classList.add('text-indigo-600');
            }, 2000);
          });
        }
      </script>
    </body>
    </html>
  `;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html",
      // Disabilitiamo completamente la cache per questa rotta
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      "Pragma": "no-cache",
      "Expires": "0"
    },
  });
}
