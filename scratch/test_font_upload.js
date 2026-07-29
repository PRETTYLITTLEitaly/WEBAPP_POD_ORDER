import { shopifyFetch } from "../src/lib/shopify.js";

async function run() {
  try {
    const shopRes = await shopifyFetch({
      store: "b2c",
      query: `#graphql
        query getShopId {
          shop {
            id
          }
        }
      `
    });
    const shopId = shopRes.data?.shop?.id;
    console.log("Shop ID:", shopId);

    if (!shopId) {
      console.error("No shop ID found!");
      return;
    }

    const metafieldMutation = `#graphql
      mutation setShopMetafield($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields {
            id
            key
            namespace
            value
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const res = await shopifyFetch({
      store: "b2c",
      query: metafieldMutation,
      variables: {
        metafields: [{
          ownerId: shopId,
          namespace: "pod_custom_font",
          key: "test_font.txt",
          type: "multi_line_text_field",
          value: "test data content"
        }]
      }
    });

    console.log("Mutation response:");
    console.log(JSON.stringify(res, null, 2));

  } catch (e) {
    console.error("Exception occurred:", e);
  }
}

run();
