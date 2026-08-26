import nodemailer from "nodemailer";
import { ImapFlow } from "imapflow";
import { prisma } from "./prisma";

export async function getEmailAccount() {
  let account = await prisma.emailAccount.findFirst();

  if (!account) {
    account = await prisma.emailAccount.create({
      data: {
        accountName: "Aruba Email",
        email: "",
        imapHost: "imaps.aruba.it",
        imapPort: 993,
        smtpHost: "smtps.aruba.it",
        smtpPort: 465,
        username: "",
        password: "",
        isSecure: true,
        isActive: true,
      },
    });
  }

  return account;
}

export async function updateEmailAccountConfig(id: string, data: {
  accountName?: string;
  email?: string;
  imapHost?: string;
  imapPort?: number | string;
  smtpHost?: string;
  smtpPort?: number | string;
  username?: string;
  password?: string;
  isSecure?: boolean;
  isActive?: boolean;
}) {
  return await prisma.emailAccount.update({
    where: { id },
    data: {
      accountName: data.accountName || "Aruba Email",
      email: data.email || "",
      imapHost: data.imapHost || "imaps.aruba.it",
      imapPort: parseInt(String(data.imapPort || 993), 10),
      smtpHost: data.smtpHost || "smtps.aruba.it",
      smtpPort: parseInt(String(data.smtpPort || 465), 10),
      username: data.username || "",
      password: data.password || "",
      isSecure: data.isSecure !== undefined ? Boolean(data.isSecure) : true,
      isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
    },
  });
}

export async function sendEmail({
  to,
  subject,
  bodyText,
  bodyHtml,
  threadId,
}: {
  to: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  threadId?: string;
}) {
  const account = await getEmailAccount();

  if (!account.email || !account.username || !account.password) {
    throw new Error("Credenziali Email Aruba non configurate nelle impostazioni.");
  }

  const transporter = nodemailer.createTransport({
    host: account.smtpHost || "smtps.aruba.it",
    port: account.smtpPort || 465,
    secure: account.smtpPort === 465,
    auth: {
      user: account.username,
      pass: account.password,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  const mailOptions = {
    from: `"${account.accountName}" <${account.email}>`,
    to: to,
    subject: subject,
    text: bodyText || "",
    html: bodyHtml || bodyText || "",
  };

  const info = await transporter.sendMail(mailOptions);

  const emailMsg = await prisma.emailMessage.create({
    data: {
      emailAccountId: account.id,
      threadId: threadId || to,
      messageId: info.messageId || `msg_${Date.now()}`,
      fromEmail: account.email,
      toEmail: to,
      subject: subject,
      bodyText: bodyText || "",
      bodyHtml: bodyHtml || bodyText || "",
      direction: "OUTBOUND",
      isRead: true,
      sentAt: new Date(),
    },
  });

  return emailMsg;
}

export async function syncEmailsFromImap() {
  const account = await getEmailAccount();

  if (!account.email || !account.username || !account.password || !account.isActive) {
    return { success: false, reason: "Account non configurato o disattivato." };
  }

  const client = new ImapFlow({
    host: account.imapHost || "imaps.aruba.it",
    port: account.imapPort || 993,
    secure: true,
    auth: {
      user: account.username,
      pass: account.password,
    },
    tls: {
      rejectUnauthorized: false,
    },
    logger: false,
  });

  let importedCount = 0;

  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");

    try {
      const messages = await client.fetch("1:*", {
        envelope: true,
        bodyStructure: true,
        source: true,
      });

      const messageList = [];
      for await (const msg of messages) {
        messageList.push(msg);
      }

      const recentMessages = messageList.slice(-25);

      for (const msg of recentMessages) {
        const env = msg.envelope;
        if (!env) continue;

        const messageId = env.messageId || `imap_${msg.seq}`;
        const fromEmail = env.from?.[0]?.address || "unknown@domain.com";
        const fromName = env.from?.[0]?.name || fromEmail;
        const toEmail = env.to?.[0]?.address || account.email;
        const subject = env.subject || "(Nessun oggetto)";
        const date = env.date ? new Date(env.date) : new Date();

        const existing = await prisma.emailMessage.findFirst({
          where: { messageId: messageId },
        });

        if (!existing) {
          const bodyContent = `Email ricevuta da ${fromName} <${fromEmail}>`;

          await prisma.emailMessage.create({
            data: {
              emailAccountId: account.id,
              threadId: fromEmail,
              messageId: messageId,
              fromEmail: `${fromName} <${fromEmail}>`,
              toEmail: toEmail,
              subject: subject,
              bodyText: bodyContent,
              bodyHtml: `<p>${bodyContent}</p>`,
              direction: "INBOUND",
              isRead: false,
              sentAt: date,
            },
          });
          importedCount++;
        }
      }
    } finally {
      lock.release();
    }

    await client.logout();
    return { success: true, importedCount };
  } catch (error: any) {
    console.error("Errore sincronizzazione IMAP Aruba:", error);
    return { success: false, error: error.message };
  }
}
