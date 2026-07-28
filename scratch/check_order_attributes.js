import { shopifyFetch } from "../src/lib/shopify.js";

async function run() {
  const query = `#graphql
    query getOrderByName($query: String!) {
      orders(first: 5, query: $query) {
        nodes {
          id
          name
          customAttributes {
            key
            value
          }
          lineItems(first: 10) {
            nodes {
              title
              customAttributes {
                key
                value
              }
            }
          }
        }
      }
    }
  `;

  try {
    const res = await shopifyFetch({
      store: "b2c",
      query,
      variables: { query: "name:#15100" }
    });
    const order = res.data?.orders?.nodes[0];
    console.log(`Order: ${order?.name} (${order?.id})`);
    console.log("Custom attributes:");
    console.log(JSON.stringify(order?.customAttributes, null, 2));
    
    console.log("\nLine Items:");
    for (const item of order?.lineItems?.nodes || []) {
      console.log(`- Item: "${item.title}"`);
      console.log("  Attributes:");
      console.log(JSON.stringify(item.customAttributes, null, 2));
    }
  } catch (e) {
    console.error("Error fetching order attributes:", e);
  }
}

run();
