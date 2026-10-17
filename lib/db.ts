import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

export const prisma =
  globalThis.prismaGlobal ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

export const isDatabaseConfigured = Boolean(process.env.DATABASE_URL);

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = prisma;
}
