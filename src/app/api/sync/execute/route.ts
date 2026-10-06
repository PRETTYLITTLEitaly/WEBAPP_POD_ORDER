import { NextRequest, NextResponse } from "next/server";
import { syncProduct, syncMultipleProducts } from "@/lib/syncEngine";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, handle, handles, forceReal } = body;

    if (action === "sync_product") {
      if (!handle) {
        return NextResponse.json({ error: "Parametro 'handle' mancante" }, { status: 400 });
      }
      const result = await syncProduct(handle, { forceReal, origin: "manual" });
      return NextResponse.json({ success: true, result });
    }

    if (action === "sync_multiple") {
      if (!Array.isArray(handles) || handles.length === 0) {
        return NextResponse.json({ error: "Parametro 'handles' mancante o non valido" }, { status: 400 });
      }
      const batchResult = await syncMultipleProducts(handles, { forceReal, origin: "manual" });
      return NextResponse.json({ success: true, ...batchResult });
    }

    return NextResponse.json({ error: "Azione non supportata" }, { status: 400 });
  } catch (err: any) {
    console.error("Errore API /api/sync/execute:", err);
    return NextResponse.json({ error: err.message || "Errore del server durante la sincronizzazione" }, { status: 500 });
  }
}
