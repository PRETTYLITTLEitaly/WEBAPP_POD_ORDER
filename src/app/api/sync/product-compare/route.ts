import { NextResponse } from "next/server";
import { shopifyFetch } from "@/lib/shopify";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const handle = searchParams.get("handle") || "";
    const queryStr = searchParams.get("query") || "";

    if (!handle && !queryStr) {
      return NextResponse.json({ error: "Fornire handle o query" }, { status: 400 });
    }

    const query = `#graphql
      query getProductByHandle($handle: String, $searchQuery: String) {
        products(first: 10, query: $searchQuery) {
          nodes {
            id
            title
            handle
            status
            vendor
            productType
            tags
            templateSuffix
            seo { title description }
            descriptionHtml
            options { name values }
            featuredImage { url altText }
            images(first: 20) { nodes { url altText } }
            collections(first: 20) { nodes { id title handle } }
            metafield_pod_svg: metafield(namespace: "pod", key: "svg") { value reference { ... on GenericFile { url } } }
            metafield_pod_url: metafield(namespace: "custom", key: "pod_svg_url") { value }
            metafield_pod_w: metafield(namespace: "pod", key: "width") { value }
            metafield_pod_h: metafield(namespace: "pod", key: "height") { value }
            variants(first: 100) {
              nodes {
                id
                title
                sku
                barcode
                price
                compareAtPrice
                weight
                weightUnit
                selectedOptions { name value }
              }
            }
          }
        }
      }
    `;

    const searchQuery = handle ? `handle:"${handle}"` : queryStr;

    const [b2cRes, b2bRes] = await Promise.all([
      shopifyFetch({ store: "b2c", query, variables: { searchQuery } }).catch(() => null),
      shopifyFetch({ store: "b2b", query, variables: { searchQuery } }).catch(() => null),
    ]);

    const b2cProducts = b2cRes?.data?.products?.nodes || [];
    const b2bProducts = b2bRes?.data?.products?.nodes || [];

    const b2cProduct = handle ? b2cProducts.find((p: any) => p.handle === handle) || b2cProducts[0] : b2cProducts[0];
    const targetHandle = b2cProduct?.handle || handle;
    const b2bProduct = b2bProducts.find((p: any) => p.handle === targetHandle) || (handle ? null : b2bProducts[0]);

    return NextResponse.json({
      b2cProduct: b2cProduct || null,
      b2bProduct: b2bProduct || null,
      searchMatches: b2cProducts.map((p: any) => {
        const b2bMatch = b2bProducts.find((b: any) => b.handle === p.handle);
        let badge = "Allineato";
        if (!b2bMatch) badge = "Mancante nel B2B";
        else if (p.status !== b2bMatch.status || p.variants.nodes.length !== b2bMatch.variants.nodes.length) badge = "Differenze";
        if (p.tags.includes("no-b2b")) badge = "Escluso (no-b2b)";
        return {
          id: p.id,
          title: p.title,
          handle: p.handle,
          badge,
          b2cStatus: p.status,
          b2bStatus: b2bMatch?.status || "N/A"
        };
      })
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
