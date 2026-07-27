import fs from "fs";

async function run() {
  const query = `
    query getOrderMetafields {
      orders(first: 5, query: "status:open", sortKey: CREATED_AT, reverse: true) {
        nodes {
          name
          metafields(first: 20) {
            nodes {
              namespace
              key
              value
            }
          }
        }
      }
    }
  `;

  async function fetchStore(shop, token) {
    console.log(`\n--- Metafields for ${shop} ---`);
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
      const orders = data.data.orders.nodes;
      orders.forEach(o => {
        console.log(`Order ${o.name}:`);
        if (o.metafields.nodes.length === 0) console.log("  No metafields");
        o.metafields.nodes.forEach(m => console.log(`  - ${m.namespace}.${m.key} = ${m.value}`));
      });
    } catch (e) {
      console.error("Error:", e);
    }
  }

  await fetchStore("prettylittle-it.myshopify.com", process.env.SHOPIFY_B2C_TOKEN);
  await fetchStore("wholesale-prettylittle-it.myshopify.com", process.env.SHOPIFY_B2B_TOKEN);
}

run();
