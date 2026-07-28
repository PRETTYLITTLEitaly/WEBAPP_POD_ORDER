import { NextRequest, NextResponse } from "next/server";
import { shopifyFetch } from "@/lib/shopify";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const name = searchParams.get("name") || "#15119";
    const store = (searchParams.get("store") as "b2c" | "b2b") || "b2c";

    const query = `#graphql
      query getOrderByName($query: String!) {
        orders(first: 5, query: $query) {
          nodes {
            id
            name
            tags
            customAttributes {
              key
              value
            }
            lineItems(first: 20) {
              nodes {
                id
                title
                customAttributes {
                  key
                  value
                }
                product {
                  id
                  title
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
          }
        }
      }
    `;

    const res = await shopifyFetch({
      store,
      query,
      variables: { query: `name:${name}` }
    });

    return NextResponse.json({ success: true, data: res.data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
