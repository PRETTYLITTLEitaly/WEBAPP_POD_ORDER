import { shopifyFetch } from "../src/lib/shopify.js";
import fs from "fs";
import path from "path";

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

    // Let's find a font file in public/fonts
    const fontDir = path.join(process.cwd(), "public", "fonts");
    let fontFile = "";
    if (fs.existsSync(fontDir)) {
      const files = fs.readdirSync(fontDir);
      const font = files.find(f => f.endsWith(".ttf") || f.endsWith(".otf"));
      if (font) fontFile = path.join(fontDir, font);
    }

    if (!fontFile) {
      console.log("No font file found in public/fonts to test.");
      return;
    }

    console.log("Testing with font file:", fontFile);
    const buffer = fs.readFileSync(fontFile);
    const b64 = buffer.toString("base64");
    console.log("Base64 length:", b64.length);

    const filename = path.basename(fontFile);

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
          key: filename,
          type: "multi_line_text_field",
          value: b64
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
