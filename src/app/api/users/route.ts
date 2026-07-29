import { NextResponse } from "next/server";
import { shopifyFetch } from "@/lib/shopify";

export const revalidate = 0;

const DEFAULT_ADMIN = {
  id: "admin-default",
  email: "admin@prettylittleitaly.it",
  password: "admin",
  role: "admin",
  createdAt: new Date().toISOString()
};

async function getShopId() {
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
  return shopRes.data?.shop?.id;
}

export async function GET() {
  try {
    const query = `#graphql
      query getShopUsers {
        shop {
          metafield(namespace: "pod_users", key: "user_list") {
            value
          }
        }
      }
    `;
    const res = await shopifyFetch({ store: "b2c", query });
    const rawValue = res.data?.shop?.metafield?.value;

    let users = [DEFAULT_ADMIN];
    if (rawValue) {
      try {
        users = JSON.parse(rawValue);
        // Ensure default admin is always present
        if (!users.some((u: any) => u.email.toLowerCase() === DEFAULT_ADMIN.email)) {
          users.unshift(DEFAULT_ADMIN);
        }
      } catch (e) {
        console.error("Failed to parse users metafield:", e);
      }
    }
    return NextResponse.json({ success: true, users });
  } catch (error: any) {
    console.error("GET /api/users failed:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { users } = await req.json();
    if (!Array.isArray(users)) {
      return NextResponse.json({ success: false, error: "Invalid users list format" }, { status: 400 });
    }

    const shopId = await getShopId();
    if (!shopId) {
      return NextResponse.json({ success: false, error: "Failed to resolve shopId from Shopify" }, { status: 500 });
    }

    const metafieldMutation = `#graphql
      mutation setShopMetafield($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          userErrors { field message }
        }
      }
    `;

    const mutationRes = await shopifyFetch({
      store: "b2c",
      query: metafieldMutation,
      variables: {
        metafields: [{
          ownerId: shopId,
          namespace: "pod_users",
          key: "user_list",
          type: "multi_line_text_field",
          value: JSON.stringify(users)
        }]
      }
    });

    const userErrors = mutationRes.data?.metafieldsSet?.userErrors || [];
    if (userErrors.length > 0) {
      console.error("metafieldsSet userErrors:", userErrors);
      return NextResponse.json({ success: false, error: userErrors[0].message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("POST /api/users failed:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
