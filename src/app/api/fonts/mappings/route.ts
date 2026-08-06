import { NextRequest, NextResponse } from "next/server";
import { shopifyFetch } from "@/lib/shopify";
import fs from "fs";
import path from "path";
import os from "os";

export const dynamic = "force-dynamic";

const LOCAL_MAPPINGS_FILE = path.join(os.tmpdir(), "font_mappings.json");

// GET /api/fonts/mappings — Recupera le mappature salvate in piattaforma
export async function GET() {
  try {
    // 1. Tenta di leggere da Shopify Shop Metafield (pod_settings -> font_mappings)
    try {
      const query = `#graphql
        query getFontMappingsMetafield {
          shop {
            id
            metafields(first: 20, namespace: "pod_settings") {
              nodes {
                id
                key
                value
              }
            }
          }
        }
      `;
      const res = await shopifyFetch({ store: "b2c", query });
      const nodes = res.data?.shop?.metafields?.nodes || [];
      const mappingNode = nodes.find((n: any) => n.key === "font_mappings");

      if (mappingNode && mappingNode.value) {
        const parsed = JSON.parse(mappingNode.value);
        if (Array.isArray(parsed) && parsed.length > 0) {
          try { fs.writeFileSync(LOCAL_MAPPINGS_FILE, JSON.stringify(parsed)); } catch (e) {}
          return NextResponse.json({ success: true, mappings: parsed, source: "shopify" });
        }
      }
    } catch (err: any) {
      console.error("Errore lettura font_mappings da Shopify:", err.message);
    }

    // 2. Fallback su cache file locale
    if (fs.existsSync(LOCAL_MAPPINGS_FILE)) {
      const localData = fs.readFileSync(LOCAL_MAPPINGS_FILE, "utf-8");
      const parsed = JSON.parse(localData);
      return NextResponse.json({ success: true, mappings: parsed, source: "local" });
    }

    return NextResponse.json({ success: true, mappings: [], source: "none" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/fonts/mappings — Salva le mappature permanentemente in piattaforma
export async function POST(req: NextRequest) {
  try {
    const { mappings } = await req.json();
    if (!Array.isArray(mappings)) {
      return NextResponse.json({ success: false, error: "Dati mappatura non validi." }, { status: 400 });
    }

    // 1. Cache locale
    try {
      fs.writeFileSync(LOCAL_MAPPINGS_FILE, JSON.stringify(mappings));
    } catch (e) {}

    // 2. Salva permanentemente su Shopify Shop Metafield (Namespace: pod_settings, Key: font_mappings)
    try {
      const shopRes = await shopifyFetch({
        store: "b2c",
        query: `#graphql query { shop { id } }`
      });
      const shopId = shopRes.data?.shop?.id;

      if (shopId) {
        const mutation = `#graphql
          mutation setFontMappingsMetafield($metafields: [MetafieldsSetInput!]!) {
            metafieldsSet(metafields: $metafields) {
              metafields { id key value }
              userErrors { field message }
            }
          }
        `;

        await shopifyFetch({
          store: "b2c",
          query: mutation,
          variables: {
            metafields: [
              {
                ownerId: shopId,
                namespace: "pod_settings",
                key: "font_mappings",
                type: "json",
                value: JSON.stringify(mappings)
              }
            ]
          }
        });
      }
    } catch (err: any) {
      console.error("Errore salvataggio font_mappings su Shopify:", err.message);
    }

    return NextResponse.json({ success: true, mappings });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
