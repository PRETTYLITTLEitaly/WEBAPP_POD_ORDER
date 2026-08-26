import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleWhatsAppWebhook } from "@/lib/whatsapp";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token && challenge) {
    const matchingAccount = await prisma.whatsAppAccount.findFirst({
      where: { verifyToken: token },
    });

    if (matchingAccount || token === "pod_app_whatsapp_secret") {
      return new NextResponse(challenge, { status: 200 });
    } else {
      return new NextResponse("Forbidden: Invalid verify token", { status: 403 });
    }
  }

  return new NextResponse("WhatsApp Webhook Endpoint", { status: 200 });
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    await handleWhatsAppWebhook(payload);
    return NextResponse.json({ status: "success" });
  } catch (error: any) {
    console.error("Errore elaborazione webhook WhatsApp:", error);
    return NextResponse.json({ status: "error", message: error.message }, { status: 500 });
  }
}
