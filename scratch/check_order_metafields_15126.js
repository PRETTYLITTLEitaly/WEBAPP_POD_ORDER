import { shopifyFetch } from "../src/lib/shopify.js";

async function run() {
  const query = `#graphql
    query getOrderMetafields($id: ID!) {
      order(id: $id) {
        id
        name
        metafields(first: 50) {
          nodes {
            namespace
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
      query,
      variables: { id: "gid://shopify/Order/7922033852755" }
    });
    console.log(JSON.stringify(res.data?.order, null, 2));
  } catch (e) {
    console.error("Error:", e);
  }
}

run();
