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

export function getIsDatabaseConfigured(): boolean {
  const url = process.env.DATABASE_URL;
  return Boolean(
    url &&
    !url.includes("placeholder_password") &&
    url.trim().length > 0
  );
}

export const isDatabaseConfigured = getIsDatabaseConfigured();

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = prisma;
}
