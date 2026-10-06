import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { prisma } from "../lib/prisma";

async function testImap() {
  const account = await prisma.emailAccount.findFirst();
  if (!account) {
    console.log("nessun account email");
    return;
  }

  const client = new ImapFlow({
    host: account.imapHost || "imaps.aruba.it",
    port: account.imapPort || 993,
    secure: true,
    auth: {
      user: account.username.trim(),
      pass: account.password.trim(),
    },
    tls: { rejectUnauthorized: false },
    logger: false,
  });

  await client.connect();
  console.log("Connesso a IMAP Aruba!");

  const mailboxes = await client.list();
  console.log("Cartelle:", mailboxes.map(m => m.path));

  const lock = await client.getMailboxLock("INBOX", { readOnly: true });
  try {
    const messages = await client.fetch("1:*", {
      envelope: true,
      source: true,
      flags: true,
      uid: true,
    });

    let count = 0;
    for await (const msg of messages) {
      count++;
      if (msg.source) {
        const parsed = await simpleParser(msg.source);
        console.log(`Msg #${msg.seq} [UID ${msg.uid}] Flags:`, Array.from(msg.flags || []), `Da: ${parsed.from?.text} Oggetto: ${parsed.subject}`);
      }
    }
    console.log(`Totale messaggi letti: ${count}`);
  } finally {
    lock.release();
    await client.logout();
  }
}

testImap().catch(console.error);
