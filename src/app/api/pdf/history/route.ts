import { NextRequest, NextResponse } from "next/server";
import { shopifyFetch } from "@/lib/shopify";

export const dynamic = "force-dynamic";

// GET /api/pdf/history — Recupera lo storico dei batch PDF salvati su Shopify Shop Metafield (solo metadati)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const store = (searchParams.get("store") as "b2c" | "b2b") || "b2c";

    const query = `#graphql
      query getShopHistory {
        shop {
          metafield(namespace: "pod_app", key: "pdf_history") {
            id
            value
          }
        }
      }
    `;

    const res = await shopifyFetch({ store, query }).catch(() => null);
    const value = res?.data?.shop?.metafield?.value;

    let history = [];
    if (value) {
      try {
        history = JSON.parse(value);
      } catch (e) {
        console.error("Failed to parse history JSON:", e);
      }
    }

    return NextResponse.json({ success: true, history });
  } catch (error: any) {
    console.error("Errore recupero storico PDF:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/pdf/history — Aggiunge un nuovo batch PDF allo storico persistente su Shopify Shop Metafield
export async function POST(req: NextRequest) {
  try {
    const { store, historyItem } = await req.json();

    if (!historyItem || !historyItem.id) {
      return NextResponse.json({ success: false, error: "Elemento storico mancante o non valido." }, { status: 400 });
    }

    const currentStore = store === "b2b" ? "b2b" : "b2c";
    const pdfBase64 = historyItem.pdfBase64;

    // Crea un record leggero senza il file binario pesante per la lista generale
    const metadataItem = { ...historyItem };
    delete metadataItem.pdfBase64;

    // 1. Recupera shopId e storico attuale
    const query = `#graphql
      query getShopAndHistory {
        shop {
          id
          metafield(namespace: "pod_app", key: "pdf_history") {
            id
            value
          }
        }
      }
    `;

    const shopRes = await shopifyFetch({ store: currentStore, query });
    const shopId = shopRes.data?.shop?.id;
    const currentValue = shopRes.data?.shop?.metafield?.value;

    if (!shopId) {
      return NextResponse.json({ success: false, error: "ID Negozio Shopify non trovato." }, { status: 500 });
    }

    let historyList = [];
    if (currentValue) {
      try {
        historyList = JSON.parse(currentValue);
      } catch (e) {}
    }

    // Aggiungi il nuovo record all'inizio del log storico (massimo 50 record)
    historyList = [metadataItem, ...historyList].slice(0, 50);

    // 2. Salva in parallelo:
    // a) La lista aggiornata dei metadati in pod_app.pdf_history
    // b) Il file PDF pesante (Base64) in pod_pdf_files.[historyItem.id]
    const mutation = `#graphql
      mutation setShopHistoryAndPdf($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          userErrors { field message }
        }
      }
    `;

    const metafieldsToSet = [
      {
        ownerId: shopId,
        namespace: "pod_app",
        key: "pdf_history",
        type: "json",
        value: JSON.stringify(historyList)
      }
    ];

    if (pdfBase64) {
      metafieldsToSet.push({
        ownerId: shopId,
        namespace: "pod_pdf_files",
        key: `pdf_${historyItem.id}`,
        type: "multi_line_text_field",
        value: pdfBase64
      });
    }

    const setRes = await shopifyFetch({
      store: currentStore,
      query: mutation,
      variables: { metafields: metafieldsToSet }
    });

    const userErrors = setRes.data?.metafieldsSet?.userErrors || [];
    if (userErrors.length > 0) {
      return NextResponse.json({
        success: false,
        error: userErrors.map((e: any) => e.message).join(", ")
      }, { status: 400 });
    }

    return NextResponse.json({ success: true, history: historyList });
  } catch (error: any) {
    console.error("Errore salvataggio storico PDF:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE /api/pdf/history — Cancella l'intero storico PDF del negozio da Shopify Shop Metafields
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const store = (searchParams.get("store") as "b2c" | "b2b") || "b2c";

    const query = `#graphql
      query getShopId {
        shop {
          id
        }
      }
    `;
    const shopRes = await shopifyFetch({ store, query });
    const shopId = shopRes.data?.shop?.id;

    if (!shopId) {
      return NextResponse.json({ success: false, error: "ID Negozio non trovato." }, { status: 500 });
    }

    const mutation = `#graphql
      mutation clearShopHistory($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          userErrors { field message }
        }
      }
    `;
    await shopifyFetch({
      store,
      query: mutation,
      variables: {
        metafields: [{
          ownerId: shopId,
          namespace: "pod_app",
          key: "pdf_history",
          type: "json",
          value: "[]"
        }]
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Errore cancellazione storico PDF:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
