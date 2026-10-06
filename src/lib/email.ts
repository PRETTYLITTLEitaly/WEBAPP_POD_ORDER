import nodemailer from "nodemailer";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
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
  fromEmail,
  fromName,
}: {
  to: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  threadId?: string;
  fromEmail?: string;
  fromName?: string;
}) {
  const account = await getEmailAccount();

  if (!account.email || !account.username || !account.password) {
    throw new Error("Credenziali Email Aruba non configurate nelle impostazioni.");
  }

  const cleanUser = (account.username || "").trim();
  const cleanEmail = (account.email || "").trim();
  const cleanPass = (account.password || "").trim();

  const senderAddress = fromEmail ? fromEmail.trim() : cleanEmail;
  const senderName = fromName ? fromName.trim() : (account.accountName || "Assistenza Prettylittleitaly");

  const createTransporter = (port: number, secure: boolean) =>
    nodemailer.createTransport({
      host: account.smtpHost || "smtps.aruba.it",
      port: port,
      secure: secure,
      pool: false, // Rilascia subito il socket SMTP Aruba per prevenire interferenze con n8n
      auth: {
        user: cleanUser,
        pass: cleanPass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    } as any);

  const mailOptions = {
    from: `"${senderName}" <${senderAddress}>`,
    to: to.trim(),
    subject: subject,
    text: bodyText || "",
    html: bodyHtml || bodyText || "",
  };

  let info;
  try {
    const mainTransporter = createTransporter(account.smtpPort || 465, (account.smtpPort || 465) === 465);
    info = await mainTransporter.sendMail(mailOptions);
  } catch (err1: any) {
    console.warn("Tentativo SMTP 465 fallito, provo fallback porta 587...", err1?.message);
    try {
      const fallbackTransporter = createTransporter(587, false);
      info = await fallbackTransporter.sendMail(mailOptions);
    } catch (err2: any) {
      const errMsg = err2?.message || err1?.message || String(err2);
      if (errMsg.includes("525 5.7.13") || errMsg.includes("temporaneamente disabilitato") || errMsg.includes("please change password")) {
        throw new Error(
          `⚠️ Blocco Filtro Anti-Spam Aruba (525 5.7.13): Aruba ha sospeso l'invio SMTP per la casella ${cleanEmail}. Per rimuovere il blocco automatizzato: entra su webmail.aruba.it ed invia 1 email di prova manuale dalla webmail.`
        );
      }
      throw new Error(`Errore Invio Aruba SMTP: ${errMsg}`);
    }
  }

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

  const cleanUser = (account.username || "").trim();
  const cleanPass = (account.password || "").trim();

  const client = new ImapFlow({
    host: account.imapHost || "imaps.aruba.it",
    port: account.imapPort || 993,
    secure: true,
    auth: {
      user: cleanUser,
      pass: cleanPass,
    },
    tls: {
      rejectUnauthorized: false,
    },
    logger: false,
  });

  let importedCount = 0;

  try {
    await client.connect();

    // Elenco di tutte le cartelle sul server IMAP Aruba
    let allMailboxes: string[] = [];
    try {
      const mailboxes = await client.list();
      allMailboxes = mailboxes.map((m) => m.path);
      console.log(`[IMAP Aruba] Cartelle trovate sul server: ${allMailboxes.join(", ")}`);
    } catch (e) {
      console.warn("[IMAP Aruba] Impossibile elencare le cartelle:", e);
    }

    // ----------------------------------------------------
    // 1. SINCRONIZZAZIONE INBOUND (INBOX.ASSISTENZA & INBOX)
    // ----------------------------------------------------
    const inboundFoldersToScan = [
      ...allMailboxes.filter((p) => p.toUpperCase().includes("ASSISTENZA")),
      "INBOX.ASSISTENZA",
      "INBOX/ASSISTENZA",
      "INBOX.Assistenza",
      "INBOX/Assistenza",
      "INBOX.assistenza",
      "INBOX/assistenza",
      "ASSISTENZA",
      "Assistenza",
      "INBOX",
    ];
    const uniqueInboundFolders = Array.from(new Set(inboundFoldersToScan));
    const validFolders = allMailboxes.length > 0
      ? Array.from(new Set(allMailboxes.filter((p) => uniqueInboundFolders.includes(p) || p.toUpperCase().includes("ASSISTENZA") || p === "INBOX")))
      : ["INBOX.ASSISTENZA", "INBOX"];

    for (const folder of validFolders) {
      let lock: any = null;
      try {
        lock = await client.getMailboxLock(folder, { readOnly: true });
        console.log(`[IMAP Aruba] Scansione Inbound cartella: ${folder}`);

        const messages = await client.fetch("1:*", {
          envelope: true,
          source: true,
          flags: true,
          uid: true,
        });

        const messageList = [];
        for await (const msg of messages) {
          messageList.push(msg);
        }

        const recentMessages = messageList.slice(-100);

        for (const msg of recentMessages) {
          const env = msg.envelope;
          if (!env) continue;

          const messageId = env.messageId || `imap_${folder}_${msg.uid || msg.seq}`;
          const fromEmail = env.from?.[0]?.address || "unknown@domain.com";
          const fromName = env.from?.[0]?.name || fromEmail;
          const toEmail = env.to?.[0]?.address || account.email;
          const subject = env.subject || "(Nessun oggetto)";
          const date = env.date ? new Date(env.date) : new Date();

          // Reale stato di lettura sul server IMAP Aruba / Spark / Phone
          const isSeenOnImap = Boolean(msg.flags && (msg.flags.has("\\Seen") || msg.flags.has("SEEN")));

          const existing = await prisma.emailMessage.findFirst({
            where: { messageId: messageId },
          });

          let fullText = "";
          let fullHtml = "";

          if (!existing || existing.bodyText?.startsWith("Email ricevuta da")) {
            try {
              if (msg.source) {
                const parsed = await simpleParser(msg.source);
                fullText = parsed.text || parsed.textAsHtml || "(Nessun testo presente nel messaggio)";
                fullHtml = parsed.html || `<p>${fullText}</p>`;
              }
            } catch (err) {
              console.error("Errore parsing messaggio IMAP Inbound:", err);
              fullText = `Email da ${fromName} <${fromEmail}>`;
              fullHtml = `<p>${fullText}</p>`;
            }
          }

          let realFromEmail = fromEmail;
          let realFromName = fromName;

          // Se l'email è stata inoltrata da info@prettylittle.it o da un indirizzo interno, estraiamo il mittente originale dal testo del messaggio
          if (fromEmail.toLowerCase().includes("info@prettylittle.it") || fromEmail.toLowerCase().includes("servizioclienti@prettylittle.it") || fromEmail.toLowerCase() === account.email?.toLowerCase()) {
            const embeddedMatch = fullText.match(/(?:da|from|mittente|inoltrato\s+da|reply-to)\s*:?\s*([^<\n]+<)?([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>?/i);
            if (embeddedMatch && embeddedMatch[2]) {
              const foundEmbedded = embeddedMatch[2].toLowerCase();
              // Escludi solo gli indirizzi interni di inoltro (info@ e servizioclienti@)
              if (!foundEmbedded.includes("info@prettylittle.it") && !foundEmbedded.includes("servizioclienti@prettylittle.it")) {
                realFromEmail = foundEmbedded;
                realFromName = embeddedMatch[1] ? embeddedMatch[1].replace("<", "").trim() : foundEmbedded;
              }
            }
          }

          if (!existing) {
            await prisma.emailMessage.create({
              data: {
                emailAccountId: account.id,
                threadId: realFromEmail,
                messageId: messageId,
                fromEmail: realFromName && realFromName !== realFromEmail ? `${realFromName} <${realFromEmail}>` : realFromEmail,
                toEmail: toEmail,
                subject: subject,
                bodyText: fullText,
                bodyHtml: fullHtml,
                direction: "INBOUND",
                isRead: false,
                sentAt: date,
              },
            });
            importedCount++;
          } else {
            if (existing.bodyText?.startsWith("Email ricevuta da")) {
              await prisma.emailMessage.update({
                where: { id: existing.id },
                data: {
                  bodyText: fullText,
                  bodyHtml: fullHtml,
                },
              });
            }
          }
        }
      } catch (err) {
        console.warn(`[IMAP Aruba] Errore durante la scansione della cartella Inbound ${folder}:`, err);
      } finally {
        if (lock) {
          try {
            lock.release();
          } catch (e) {}
        }
      }
    }

    // ----------------------------------------------------
    // 2. SINCRONIZZAZIONE OUTBOUND (Tutte le Inviate da Webmail/Outlook)
    // ----------------------------------------------------
    const sentFoldersToScan = [
      ...allMailboxes.filter(
        (p) => p.toUpperCase().includes("SENT") || p.toUpperCase().includes("INVIATA") || p.toUpperCase().includes("USCITA")
      ),
      "Sent",
      "INBOX.Sent",
      "INBOX/Sent",
      "Posta Inviata",
      "INBOX.Posta Inviata",
      "INBOX/Posta Inviata",
      "Sent Messages",
      "INBOX.Sent Messages",
      "OUTBOX",
    ];
    const uniqueSentFolders = Array.from(new Set(sentFoldersToScan));
    const validSentFolders = allMailboxes.length > 0
      ? Array.from(new Set(allMailboxes.filter((p) => uniqueSentFolders.includes(p) || p.toUpperCase().includes("SENT") || p.toUpperCase().includes("INVIAT"))))
      : ["INBOX.Sent", "Sent"];

    for (const sentFolder of validSentFolders) {
      let sentLock: any = null;
      try {
        sentLock = await client.getMailboxLock(sentFolder, { readOnly: true });
        console.log(`[IMAP Aruba] Scansione Outbound cartella inviata: ${sentFolder}`);

        const sentMessagesFetch = await client.fetch("1:*", {
          envelope: true,
          source: true,
          flags: true,
          uid: true,
        });

        const sentList = [];
        for await (const msg of sentMessagesFetch) {
          sentList.push(msg);
        }

        const recentSent = sentList.slice(-100);
        for (const msg of recentSent) {
          const env = msg.envelope;
          if (!env) continue;

          const messageId = env.messageId || `sent_imap_${sentFolder}_${msg.uid || msg.seq}`;
          const toEmail = env.to?.[0]?.address || "unknown@domain.com";
          const fromEmail = env.from?.[0]?.address || account.email;
          const subject = env.subject || "(Nessun oggetto)";
          const date = env.date ? new Date(env.date) : new Date();

          const existing = await prisma.emailMessage.findFirst({
            where: { messageId: messageId },
          });

          if (!existing) {
            let fullText = "";
            let fullHtml = "";

            try {
              if (msg.source) {
                const parsed = await simpleParser(msg.source);
                fullText = parsed.text || parsed.textAsHtml || "(Nessun testo presente nel messaggio)";
                fullHtml = parsed.html || `<p>${fullText}</p>`;
              }
            } catch (err) {
              fullText = `Email inviata a ${toEmail}`;
              fullHtml = `<p>${fullText}</p>`;
            }

            await prisma.emailMessage.create({
              data: {
                emailAccountId: account.id,
                threadId: toEmail,
                messageId: messageId,
                fromEmail: fromEmail,
                toEmail: toEmail,
                subject: subject,
                bodyText: fullText,
                bodyHtml: fullHtml,
                direction: "OUTBOUND",
                isRead: true,
                sentAt: date,
              },
            });
            importedCount++;
          }
        }
      } catch (err) {
        console.warn(`[IMAP Aruba] Errore scansione cartella inviata ${sentFolder}:`, err);
      } finally {
        if (sentLock) {
          try {
            sentLock.release();
          } catch (e) {}
        }
      }
    }

    await client.logout();
    return { success: true, importedCount };
  } catch (error: any) {
    console.error("Errore sincronizzazione IMAP Aruba:", error);
    return { success: false, error: error.message };
  }
}

export async function syncEmailReadStatusToImap(messageId: string, isRead: boolean) {
  const account = await getEmailAccount();
  if (!account.email || !account.username || !account.password || !account.isActive) return;

  const emailMsg = await prisma.emailMessage.findUnique({ where: { id: messageId } });
  if (!emailMsg || !emailMsg.messageId) return;

  const client = new ImapFlow({
    host: account.imapHost || "imaps.aruba.it",
    port: account.imapPort || 993,
    secure: true,
    auth: {
      user: (account.username || "").trim(),
      pass: (account.password || "").trim(),
    },
    tls: { rejectUnauthorized: false },
    logger: false,
  });

  try {
    await client.connect();
    const mailboxes = await client.list();
    const inboundFolders = mailboxes.map((m) => m.path).filter((p) => p.toUpperCase().includes("ASSISTENZA") || p === "INBOX");
    const uniqueFolders = Array.from(new Set([...inboundFolders, "INBOX.ASSISTENZA", "INBOX"]));

    for (const folder of uniqueFolders) {
      let lock: any = null;
      try {
        lock = await client.getMailboxLock(folder);
        
        let seqOrUid: any = null;

        // 1. Se il messageId è nel formato "imap_FOLDER_UID", estrai l'UID direttamente
        if (emailMsg.messageId.startsWith(`imap_${folder}_`)) {
          const uidStr = emailMsg.messageId.replace(`imap_${folder}_`, "");
          const uidNum = parseInt(uidStr, 10);
          if (!isNaN(uidNum)) {
            seqOrUid = String(uidNum);
          }
        }

        // 2. Altrimenti cerca tramite Message-ID header (con e senza parentesi angolari <>)
        if (!seqOrUid) {
          const rawMsgId = emailMsg.messageId.trim();
          const cleanMsgId = rawMsgId.replace(/^<+|>+$/g, "");
          const bracketMsgId = `<${cleanMsgId}>`;

          const searchRes1 = await client.search({ header: { 'message-id': cleanMsgId } });
          if (searchRes1 && searchRes1.length > 0) {
            seqOrUid = searchRes1;
          } else {
            const searchRes2 = await client.search({ header: { 'message-id': bracketMsgId } });
            if (searchRes2 && searchRes2.length > 0) {
              seqOrUid = searchRes2;
            }
          }
        }

        // 3. Se non trovato per Message-ID, cerca per Oggetto esatto
        if (!seqOrUid && emailMsg.subject) {
          const searchRes3 = await client.search({ subject: emailMsg.subject });
          if (searchRes3 && searchRes3.length > 0) {
            seqOrUid = searchRes3;
          }
        }

        if (seqOrUid) {
          if (isRead) {
            await client.messageFlagsAdd(seqOrUid, ['\\Seen']);
            console.log(`[IMAP Aruba] Flag \\Seen AGGIUNTA (Letta) per: ${emailMsg.subject}`);
          } else {
            await client.messageFlagsRemove(seqOrUid, ['\\Seen']);
            console.log(`[IMAP Aruba] Flag \\Seen RIMOSSA (Non Letta) per: ${emailMsg.subject}`);
          }
          break;
        }
      } catch (e: any) {
        console.warn(`[IMAP Aruba] Errore aggiornamento flag su cartella ${folder}:`, e?.message);
      } finally {
        if (lock) {
          try { lock.release(); } catch (e) {}
        }
      }
    }
  } catch (err) {
    console.warn("Impossibile sincronizzare flag IMAP su Aruba:", err);
  } finally {
    await client.logout().catch(() => {});
  }
}

