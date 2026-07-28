import { shopifyFetch } from "../src/lib/shopify.js";

async function run() {
  const query = `#graphql
    query getOrderMetafields($id: ID!) {
      node(id: $id) {
        ... on Order {
          id
          name
          metafields(first: 20) {
            nodes {
              id
              namespace
              key
              value
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
      variables: { id: "gid://shopify/Order/7912651391315" }
    });
    const order = res.data?.node;
    console.log(`Order: ${order?.name} (${order?.id})`);
    const nodes = order?.metafields?.nodes || [];
    console.log(`Found ${nodes.length} metafields:`);
    for (const node of nodes) {
      console.log(`- Namespace: "${node.namespace}", Key: "${node.key}"`);
      console.log(`  Value: "${node.value}"`);
    }
  } catch (e) {
    console.error("Error fetching order metafields:", e);
  }
}

run();
