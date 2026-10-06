import { PrismaClient } from "@prisma/client";

// Forza l'uso della porta 6543 (Supabase Transaction Pooler PgBouncer) se Vercel usa la 5432
if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes("pooler.supabase.com:5432")) {
  let dbUrl = process.env.DATABASE_URL.replace("pooler.supabase.com:5432", "pooler.supabase.com:6543");
  if (!dbUrl.includes("pgbouncer=true")) {
    dbUrl += dbUrl.includes("?") ? "&pgbouncer=true&connection_limit=3" : "?pgbouncer=true&connection_limit=3";
  }
  process.env.DATABASE_URL = dbUrl;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

// Assegna sempre al singleton globale per riutilizzare le connessioni nelle lambda di Vercel
globalForPrisma.prisma = prisma;


