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
  syncEmailReadStatusToImap,
} from "@/lib/email";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

    if (actionType === "inbound_email" || actionType === "inbound" || actionType === "receive_email" || body.direction === "INBOUND" || body.fromEmail || body.originalFrom) {
      const rawSender = String(body.fromEmail || body.from || body.sender || body.mittente || body.originalFrom || body.originalSender || "").trim();
      const rawRecipient = String(body.toEmail || body.to || body.recipient || "servizioclienti@prettylittle.it").trim();
      const emailSubject = String(body.subject || body.title || "Email da Assistenza").trim();
      const emailContent = String(body.message || body.bodyText || body.body || body.text || "").trim();

      const senderMatch = rawSender.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      let sender = senderMatch ? senderMatch[0] : rawSender;

      if (!sender || !sender.includes("@")) {
        sender = "info@prettylittle.it";
      }

      // Se l'email inoltrata proviene da info@prettylittle.it o da un indirizzo aziendale, tenta di estrarre dal testo la vera mail cliente
      if (sender.toLowerCase().includes("info@prettylittle.it") || sender.toLowerCase().includes("servizioclienti@prettylittle.it")) {
        const embeddedMatch = emailContent.match(/(?:da|from|mittente|inoltrato\s+da|reply-to)\s*:?\s*([^<\n]+<)?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>?/i);
        if (embeddedMatch && embeddedMatch[2]) {
          const foundEmbedded = embeddedMatch[2].toLowerCase();
          if (!foundEmbedded.includes("info@prettylittle.it") && !foundEmbedded.includes("servizioclienti@prettylittle.it")) {
            sender = foundEmbedded;
          }
        }
      }

      const account = await getEmailAccount();
      const newInbound = await prisma.emailMessage.create({
        data: {
          emailAccountId: account.id,
          threadId: sender,
          messageId: `n8n_inbound_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          fromEmail: sender,
          toEmail: rawRecipient,
          subject: emailSubject,
          bodyText: emailContent,
          bodyHtml: `<p>${emailContent.replace(/\n/g, "<br>")}</p>`,
          direction: "INBOUND",
          isRead: false,
          sentAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        message: "Email Inbound salvata con successo nel sistema!",
        data: newInbound,
      });
    }

    if (actionType === "send_email" || body.to || body.toEmail) {
      const rawRecipient = String(body.to || body.toEmail || body.recipient || body.destinatario || "").trim();
      const emailSubject = String(body.subject || body.title || "Richiesta Numero Ordine").trim();
      const emailContent = String(body.message || body.bodyText || body.body || body.text || "").trim();
      const threadId = body.threadId;

      // Estrai indirizzo email pulito tramite Regex
      const emailMatch = rawRecipient.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      const recipient = emailMatch ? emailMatch[0] : rawRecipient;

      if (!recipient || recipient.length === 0 || !recipient.includes("@")) {
        return NextResponse.json(
          {
            error: `Destinatario non valido o vuoto. Valore ricevuto da n8n: '${rawRecipient}'. Verifica la variabile del destinatario su n8n.`,
          },
          { status: 400 }
        );
      }

      if (!emailContent) {
        return NextResponse.json({ error: "Manca il testo del messaggio 'message' o 'body'." }, { status: 400 });
      }

      const emailMsg = await sendEmail({
        to: recipient,
        subject: emailSubject,
        bodyText: emailContent,
        threadId,
      });

      return NextResponse.json({
        success: true,
        message: "Email inviata con successo tramite SMTP Aruba!",
        data: emailMsg,
      });
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

    if (actionType === "toggle_email_read") {
      const { messageId, isRead } = body;
      if (!messageId) {
        return NextResponse.json({ error: "messageId richiesto." }, { status: 400 });
      }

      const updated = await prisma.emailMessage.update({
        where: { id: messageId },
        data: { isRead: Boolean(isRead) },
      });

      // Sincronizza lo stato di lettura direttamente col server IMAP Aruba / Spark / Phone
      syncEmailReadStatusToImap(messageId, Boolean(isRead)).catch((err) => {
        console.warn("Errore sync flag IMAP:", err);
      });

      return NextResponse.json({ success: true, data: updated });
    }

    if (actionType === "mark_all_read") {
      await prisma.emailMessage.updateMany({
        data: { isRead: true },
      });
      return NextResponse.json({ success: true, message: "Tutte le email sono state segnate come lette!" });
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
