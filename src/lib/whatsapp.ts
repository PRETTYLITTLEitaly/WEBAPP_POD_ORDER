import { prisma } from "./prisma";

/**
 * Assicura l'esistenza dei due account WhatsApp "B2B" e "B2C" nel DB.
 */
export async function getWhatsAppAccounts() {
  let accounts = await prisma.whatsAppAccount.findMany({
    orderBy: { name: "asc" },
  });

  if (accounts.length === 0) {
    await prisma.whatsAppAccount.createMany({
      data: [
        { name: "B2B", isActive: true },
        { name: "B2C", isActive: true },
      ],
    });
    accounts = await prisma.whatsAppAccount.findMany({
      orderBy: { name: "asc" },
    });
  } else {
    const hasB2B = accounts.some((a) => a.name === "B2B");
    const hasB2C = accounts.some((a) => a.name === "B2C");
    if (!hasB2B) {
      await prisma.whatsAppAccount.create({ data: { name: "B2B", isActive: true } });
    }
    if (!hasB2C) {
      await prisma.whatsAppAccount.create({ data: { name: "B2C", isActive: true } });
    }
    accounts = await prisma.whatsAppAccount.findMany({
      orderBy: { name: "asc" },
    });
  }

  return accounts;
}

/**
 * Aggiorna le credenziali di un account WhatsApp
 */
export async function updateWhatsAppAccountConfig(id: string, data: {
  phoneNumberId?: string;
  wabaId?: string;
  accessToken?: string;
  verifyToken?: string;
  isActive?: boolean;
}) {
  return await prisma.whatsAppAccount.update({
    where: { id },
    data: {
      phoneNumberId: data.phoneNumberId || "",
      wabaId: data.wabaId || "",
      accessToken: data.accessToken || "",
      verifyToken: data.verifyToken || "",
      isActive: data.isActive !== undefined ? data.isActive : true,
    },
  });
}

/**
 * Invia un messaggio tramite Meta Cloud API per uno specifico account WhatsApp (B2B o B2C)
 */
export async function sendWhatsAppMessage({ accountId, to, body }: { accountId: string; to: string; body: string }) {
  const account = await prisma.whatsAppAccount.findUnique({
    where: { id: accountId },
  });

  if (!account) {
    throw new Error("Account WhatsApp non trovato.");
  }

  if (!account.phoneNumberId || !account.accessToken) {
    throw new Error(`Credenziali WhatsApp ${account.name} non configurate.`);
  }

  const cleanPhone = to.replace(/[^\d]/g, "");

  const url = `https://graph.facebook.com/v19.0/${account.phoneNumberId}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: cleanPhone,
    type: "text",
    text: {
      preview_url: false,
      body: body,
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${account.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const responseData = await response.json();

  if (!response.ok) {
    console.error("Errore invio WhatsApp Meta API:", responseData);
    throw new Error(responseData.error?.message || "Impossibile inviare il messaggio WhatsApp.");
  }

  const messageId = responseData.messages?.[0]?.id || `wmid.${Date.now()}`;

  let conversation = await prisma.whatsAppConversation.findUnique({
    where: {
      accountId_customerPhone: {
        accountId: account.id,
        customerPhone: cleanPhone,
      },
    },
  });

  if (!conversation) {
    conversation = await prisma.whatsAppConversation.create({
      data: {
        accountId: account.id,
        customerPhone: cleanPhone,
        customerName: cleanPhone,
        unreadCount: 0,
        lastMessageAt: new Date(),
      },
    });
  } else {
    await prisma.whatsAppConversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    });
  }

  const message = await prisma.whatsAppMessage.create({
    data: {
      conversationId: conversation.id,
      direction: "OUTBOUND",
      messageId: messageId,
      body: body,
      status: "SENT",
      timestamp: new Date(),
    },
  });

  return { conversation, message };
}

/**
 * Gestione dei Webhook in arrivo da Meta WhatsApp API
 */
export async function handleWhatsAppWebhook(payload: any) {
  if (payload.object !== "whatsapp_business_account") return;

  for (const entry of payload.entry || []) {
    const wabaId = entry.id;

    for (const change of entry.changes || []) {
      const value = change.value;
      if (!value) continue;

      const phoneNumberId = value.metadata?.phone_number_id;

      let account = await prisma.whatsAppAccount.findFirst({
        where: {
          OR: [{ phoneNumberId: phoneNumberId }, { wabaId: wabaId }],
        },
      });

      if (!account) {
        account = await prisma.whatsAppAccount.findFirst();
        if (!account) continue;
      }

      if (value.messages && value.messages.length > 0) {
        for (const msg of value.messages) {
          const fromPhone = msg.from;
          const msgId = msg.id;
          const timestamp = new Date(parseInt(msg.timestamp) * 1000);

          let textBody = "";
          if (msg.type === "text") {
            textBody = msg.text?.body || "";
          } else if (msg.type === "image") {
            textBody = `[Immagine] ${msg.image?.caption || ""}`;
          } else if (msg.type === "document") {
            textBody = `[Documento] ${msg.document?.filename || ""}`;
          } else {
            textBody = `[Messaggio ${msg.type}]`;
          }

          const profileName = value.contacts?.[0]?.profile?.name || fromPhone;

          let conversation = await prisma.whatsAppConversation.findUnique({
            where: {
              accountId_customerPhone: {
                accountId: account.id,
                customerPhone: fromPhone,
              },
            },
          });

          if (!conversation) {
            conversation = await prisma.whatsAppConversation.create({
              data: {
                accountId: account.id,
                customerPhone: fromPhone,
                customerName: profileName,
                unreadCount: 1,
                lastMessageAt: timestamp,
              },
            });
          } else {
            await prisma.whatsAppConversation.update({
              where: { id: conversation.id },
              data: {
                customerName: profileName || conversation.customerName,
                unreadCount: { increment: 1 },
                lastMessageAt: timestamp,
              },
            });
          }

          await prisma.whatsAppMessage.create({
            data: {
              conversationId: conversation.id,
              direction: "INBOUND",
              messageId: msgId,
              body: textBody,
              status: "READ",
              timestamp: timestamp,
            },
          });
        }
      }

      if (value.statuses && value.statuses.length > 0) {
        for (const statusObj of value.statuses) {
          const msgId = statusObj.id;
          const statusStr = statusObj.status?.toUpperCase();

          await prisma.whatsAppMessage.updateMany({
            where: { messageId: msgId },
            data: { status: statusStr },
          });
        }
      }
    }
  }
}
