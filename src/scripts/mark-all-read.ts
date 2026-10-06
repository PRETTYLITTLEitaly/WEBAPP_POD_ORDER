import { prisma } from "../lib/prisma";

async function main() {
  const result = await prisma.emailMessage.updateMany({
    data: {
      isRead: true,
    },
  });
  console.log(`Aggiornate ${result.count} email esistenti a isRead = true`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
