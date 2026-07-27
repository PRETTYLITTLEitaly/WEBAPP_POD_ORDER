const B2C_SHOP = process.env.NEXT_PUBLIC_B2C_SHOP || "prettylittle-it.myshopify.com";
const B2B_SHOP = process.env.NEXT_PUBLIC_B2B_SHOP || "wholesale-prettylittle-it.myshopify.com";

export async function shopifyFetch({
  store,
  query,
  variables = {}
}: {
  store: "b2b" | "b2c" | "both",
  query: string,
  variables?: any
}) {
  const shop = store === "b2b" ? B2B_SHOP : B2C_SHOP;
  const token = store === "b2b" ? process.env.SHOPIFY_B2B_TOKEN : process.env.SHOPIFY_B2C_TOKEN;

  if (!token) {
    throw new Error(`Token mancante per lo store ${store}. Configura SHOPIFY_${store.toUpperCase()}_TOKEN.`);
  }

  const endpoint = `https://${shop}/admin/api/2025-01/graphql.json`;

  let dispatcher;
  if (process.env.https_proxy) {
    try {
      const { ProxyAgent } = eval('require')('undici');
      dispatcher = new ProxyAgent(process.env.https_proxy);
    } catch (e) {}
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": token
    },
    body: JSON.stringify({ query, variables }),
    ...(dispatcher ? { dispatcher } : {})
  } as any);

  if (!response.ok) {
    throw new Error(`Errore API Shopify HTTP ${response.status}: ${await response.text()}`);
  }

  const data = await response.json();
  if (data.errors) {
    throw new Error(`Errore GraphQL: ${JSON.stringify(data.errors)}`);
  }

  return data;
}

export { B2C_SHOP, B2B_SHOP };
