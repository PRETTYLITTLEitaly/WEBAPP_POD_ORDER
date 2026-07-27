import { shopifyFetch } from "./src/lib/shopify";

async function run() {
  const query = `#graphql
    query getOrders {
      orders(first: 10, query: "status:open fulfillment_status:unfulfilled") {
        nodes {
          id
          name
          tags
        }
      }
    }
  `;
  try {
    const b2c = await shopifyFetch({ store: "b2c", query });
    console.log("B2C Orders:", JSON.stringify(b2c, null, 2));
  } catch (e) {
    console.error("B2C Error:", e);
  }
  
  try {
    const b2b = await shopifyFetch({ store: "b2b", query });
    console.log("B2B Orders:", JSON.stringify(b2b, null, 2));
  } catch (e) {
    console.error("B2B Error:", e);
  }
}
run();
