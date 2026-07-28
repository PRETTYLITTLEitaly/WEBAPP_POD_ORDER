import { NextRequest, NextResponse } from "next/server";
import { shopifyFetch } from "@/lib/shopify";

export const dynamic = "force-dynamic";

// GET /api/pdf/history/file — Recupera il file PDF pesante (Base64) dal metafield di Shopify Shop
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const store = (searchParams.get("store") as "b2c" | "b2b") || "b2c";

    if (!id) {
      return NextResponse.json({ success: false, error: "ID Batch mancante." }, { status: 400 });
    }

    const query = `#graphql
      query getShopPdfFile($key: String!) {
        shop {
          metafield(namespace: "pod_pdf_files", key: $key) {
            value
          }
        }
      }
    `;

    const res = await shopifyFetch({
      store,
      query,
      variables: { key: `pdf_${id}` }
    }).catch(() => null);

    const pdfBase64 = res?.data?.shop?.metafield?.value;

    if (!pdfBase64) {
      return NextResponse.json({ success: false, error: "File PDF non trovato per questo batch." }, { status: 404 });
    }

    return NextResponse.json({ success: true, pdfBase64 });
  } catch (error: any) {
    console.error("Errore recupero file PDF:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
