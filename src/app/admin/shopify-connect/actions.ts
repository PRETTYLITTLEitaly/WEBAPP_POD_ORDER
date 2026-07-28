"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import crypto from "crypto";

export async function connectShopifyAction(formData: FormData) {
  const shop = formData.get("shop") as string;
  const clientId = formData.get("clientId") as string;
  const clientSecret = formData.get("clientSecret") as string;

  if (!shop || !clientId || !clientSecret) {
    return { error: "Tutti i campi sono obbligatori." };
  }

  // Genera uno state casuale per prevenire attacchi CSRF
  const state = crypto.randomBytes(16).toString("hex");

  // Salva i dati in un cookie temporaneo crittografato (in questo caso JSON stringified e firmato se possibile, 
  // ma per semplicità e siccome non usiamo librerie esterne, lo salviamo codificato in base64. 
  // È HTTP-only e lo stiamo usando solo per trasportare i parametri tra la pagina e la callback)
  const oauthData = JSON.stringify({ shop, clientId, clientSecret, state });
  const cookieStore = await cookies();
  cookieStore.set("shopify_oauth_state", Buffer.from(oauthData).toString("base64"), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10, // 10 minuti di validità
    path: "/",
  });

  // Costruisci il redirect_uri dinamico come richiesto
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  const redirectUri = `${appUrl}/admin/shopify-connect/callback`;

  // Costruisci l'URL di autorizzazione
  const authUrl = new URL(`https://${shop}/admin/oauth/authorize`);
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("scope", "read_all_orders,read_customers,read_files,write_files,read_fulfillments,write_fulfillments,read_locations,read_orders,write_orders,read_products,write_products");
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("state", state);

  redirect(authUrl.toString());
}
