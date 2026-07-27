import { NextResponse } from "next/server";
import { shopifyFetch } from "@/lib/shopify";

export async function GET() {
  try {
    const query = `#graphql
      query getUnfulfilledCount {
        orders(first: 250, query: "status:open fulfillment_status:unfulfilled") {
          nodes { id }
        }
      }
    `;

    const [b2bRes, b2cRes] = await Promise.allSettled([
      shopifyFetch({ store: "b2b", query }),
      shopifyFetch({ store: "b2c", query })
    ]);

    const b2bCount = b2bRes.status === "fulfilled" ? b2bRes.value.data?.orders?.nodes?.length || 0 : 0;
    const b2cCount = b2cRes.status === "fulfilled" ? b2cRes.value.data?.orders?.nodes?.length || 0 : 0;

    return NextResponse.json({ b2bCount, b2cCount });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
