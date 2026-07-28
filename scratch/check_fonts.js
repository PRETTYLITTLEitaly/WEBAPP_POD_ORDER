import { shopifyFetch } from "../src/lib/shopify.js";

async function run() {
  const query = `#graphql
    query getShopFonts {
      shop {
        metafields(first: 100, namespace: "pod_custom_font") {
          nodes {
            id
            key
            value
          }
        }
      }
    }
  `;

  try {
    const res = await shopifyFetch({ store: "b2c", query });
    const nodes = res.data?.shop?.metafields?.nodes || [];
    console.log(`Found ${nodes.length} fonts in Shopify metafields:`);
    for (const node of nodes) {
      console.log(`- Key: "${node.key}"`);
      console.log(`  Value Type: ${typeof node.value}`);
      console.log(`  Value Length: ${node.value ? node.value.length : 0}`);
      if (node.value) {
        console.log(`  Value Start: "${node.value.substring(0, 50)}..."`);
      }
    }
  } catch (e) {
    console.error("Error fetching shop fonts:", e);
  }
}

run();
