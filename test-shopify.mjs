import fs from "fs";

async function run() {
  const query = `
    query getOrders {
      orders(first: 5, query: "status:open fulfillment_status:unfulfilled") {
        nodes {
          name
          tags
          lineItems(first: 5) {
            nodes {
              title
              product {
                id
                pod_svg: metafield(namespace: "pod", key: "svg") { reference { ... on GenericFile { url } } }
                custom_url: metafield(namespace: "custom", key: "pod_svg_url") { value }
              }
              variant {
                id
                pod_svg: metafield(namespace: "pod", key: "svg") { reference { ... on GenericFile { url } } }
                custom_url: metafield(namespace: "custom", key: "pod_svg_url") { value }
              }
            }
          }
        }
      }
    }
  `;

  async function fetchStore(shop, token) {
    if (!token) return console.log(`Token mancante per ${shop}`);
    console.log(`\n--- Fetching from ${shop} ---`);
    try {
      const res = await fetch(`https://${shop}/admin/api/2025-01/graphql.json`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": token
        },
        body: JSON.stringify({ query })
      });
      const data = await res.json();
      if (data.errors) {
        console.error("GraphQL Errors:", data.errors);
      } else {
        const orders = data.data.orders.nodes;
        console.log(`Trovati ${orders.length} ordini non evasi.`);
        orders.forEach(o => {
          console.log(`Ordine ${o.name} | Tags: ${o.tags.join(", ")}`);
          o.lineItems.nodes.forEach(item => {
            const p = item.product || {};
            const v = item.variant || {};
            const hasPod = !!(p.pod_svg?.reference?.url || p.custom_url?.value || v.pod_svg?.reference?.url || v.custom_url?.value);
            console.log(`  - ${item.title} | E' un POD? ${hasPod}`);
          });
        });
      }
    } catch (e) {
      console.error("Fetch Error:", e);
    }
  }

  await fetchStore("prettylittle-it.myshopify.com", process.env.SHOPIFY_B2C_TOKEN);
  await fetchStore("wholesale-prettylittle-it.myshopify.com", process.env.SHOPIFY_B2B_TOKEN);
}

run();
