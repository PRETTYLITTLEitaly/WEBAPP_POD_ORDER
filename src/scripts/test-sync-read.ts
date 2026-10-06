import { syncEmailsFromImap } from "../lib/email";
import { prisma } from "../lib/prisma";

async function main() {
  console.log("Esecuzione sincronizzazione fedele IMAP...");
  const res = await syncEmailsFromImap();
  console.log("Risultato sync:", res);

  const unreadInbound = await prisma.emailMessage.count({
    where: { direction: "INBOUND", isRead: false },
  });
  const totalInbound = await prisma.emailMessage.count({
    where: { direction: "INBOUND" },
  });
  console.log(`Email Inbound Non Lette nel DB: ${unreadInbound} / ${totalInbound}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
