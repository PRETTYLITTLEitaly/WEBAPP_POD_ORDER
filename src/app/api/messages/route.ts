import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getWhatsAppAccounts,
  updateWhatsAppAccountConfig,
  sendWhatsAppMessage,
} from "@/lib/whatsapp";
import {
  getEmailAccount,
  updateEmailAccountConfig,
  sendEmail,
  syncEmailsFromImap,
} from "@/lib/email";

export async function GET() {
  try {
    const waAccounts = await getWhatsAppAccounts();
    const b2bAccount = waAccounts.find((a) => a.name === "B2B");
    const b2cAccount = waAccounts.find((a) => a.name === "B2C");

    const b2bConversations = b2bAccount
      ? await prisma.whatsAppConversation.findMany({
          where: { accountId: b2bAccount.id },
          include: { messages: { orderBy: { timestamp: "asc" } } },
          orderBy: { lastMessageAt: "desc" },
        })
      : [];

    const b2cConversations = b2cAccount
      ? await prisma.whatsAppConversation.findMany({
          where: { accountId: b2cAccount.id },
          include: { messages: { orderBy: { timestamp: "asc" } } },
          orderBy: { lastMessageAt: "desc" },
        })
      : [];

    const emailAccount = await getEmailAccount();
    const emailMessages = await prisma.emailMessage.findMany({
      where: { emailAccountId: emailAccount.id },
      orderBy: { sentAt: "desc" },
    });

    return NextResponse.json({
      b2bAccount,
      b2cAccount,
      b2bConversations,
      b2cConversations,
      emailAccount,
      emailMessages,
    });
  } catch (error: any) {
    console.error("GET /api/messages Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { actionType } = body;

    if (actionType === "send_whatsapp") {
      const { accountId, to, message } = body;
      if (!to || !message) {
        return NextResponse.json({ error: "Compila tutti i campi." }, { status: 400 });
      }
      const res = await sendWhatsAppMessage({ accountId, to, body: message });
      return NextResponse.json({ success: true, message: "Messaggio WhatsApp inviato!", data: res });
    }

    if (actionType === "start_whatsapp_chat") {
      const { accountId, phone, name } = body;
      if (!phone) {
        return NextResponse.json({ error: "Inserisci un numero di telefono." }, { status: 400 });
      }

      const cleanPhone = phone.replace(/[^\d]/g, "");

      let conv = await prisma.whatsAppConversation.findUnique({
        where: {
          accountId_customerPhone: {
            accountId,
            customerPhone: cleanPhone,
          },
        },
      });

      if (!conv) {
        conv = await prisma.whatsAppConversation.create({
          data: {
            accountId,
            customerPhone: cleanPhone,
            customerName: name || cleanPhone,
            lastMessageAt: new Date(),
          },
        });
      }

      return NextResponse.json({ success: true, conversationId: conv.id });
    }

    if (actionType === "send_email") {
      const { to, subject, message, threadId } = body;
      if (!to || !subject || !message) {
        return NextResponse.json({ error: "Compila destinatario, oggetto e messaggio." }, { status: 400 });
      }
      const emailMsg = await sendEmail({ to, subject, bodyText: message, threadId });
      return NextResponse.json({ success: true, message: "Email inviata con successo tramite SMTP Aruba!", data: emailMsg });
    }

    if (actionType === "sync_emails") {
      const result = await syncEmailsFromImap();
      return NextResponse.json(result);
    }

    if (actionType === "save_wa_config") {
      const { accountId, phoneNumberId, wabaId, accessToken, verifyToken } = body;
      const updated = await updateWhatsAppAccountConfig(accountId, {
        phoneNumberId,
        wabaId,
        accessToken,
        verifyToken,
      });
      return NextResponse.json({ success: true, message: "Configurazione WhatsApp salvata!", data: updated });
    }

    if (actionType === "save_email_config") {
      const { accountId, accountName, email, username, password, imapHost, imapPort, smtpHost, smtpPort } = body;
      const updated = await updateEmailAccountConfig(accountId, {
        accountName,
        email,
        username,
        password,
        imapHost,
        imapPort,
        smtpHost,
        smtpPort,
      });
      return NextResponse.json({ success: true, message: "Configurazione Email Aruba salvata!", data: updated });
    }

    return NextResponse.json({ error: "Azione non riconosciuta" }, { status: 400 });
  } catch (error: any) {
    console.error("POST /api/messages Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
