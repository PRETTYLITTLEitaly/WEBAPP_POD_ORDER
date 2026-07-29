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
    const res = await shopifyFetch({
      store: "b2c",
      query
    });
    const nodes = res.data?.shop?.metafields?.nodes || [];
    console.log(`Found ${nodes.length} fonts on Shopify:`);
    for (const node of nodes) {
      console.log(`- Key (filename): "${node.key}" (Length: ${node.value?.length} bytes)`);
    }
  } catch (e) {
    console.error("Error fetching fonts:", e);
  }
}

run();
