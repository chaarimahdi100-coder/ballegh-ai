import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

function resolveDatabaseUrl(url?: string): string | undefined {
  if (!url) return undefined;
  // If direct Supabase connection string is used and running in an IPv4-only environment
  if (url.includes("db.") && url.includes(".supabase.co:5432")) {
    const match = url.match(
      /postgresql:\/\/([^:]+):([^@]+)@db\.([a-z0-9]+)\.supabase\.co:5432\/([a-zA-Z0-9_-]+)(.*)/
    );
    if (match) {
      const [, user, pass, ref, db, rest] = match;
      return `postgresql://${user}.${ref}:${pass}@aws-0-eu-west-1.pooler.supabase.com:5432/${db}${rest || ""}`;
    }
  }
  return url;
}

const activeUrl = resolveDatabaseUrl(process.env.DATABASE_URL);

export const prisma =
  globalThis.prismaGlobal ??
  new PrismaClient({
    datasources: activeUrl ? { db: { url: activeUrl } } : undefined,
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
