import { PrismaClient } from "@prisma/client";
import * as fs from "node:fs";
import * as path from "node:path";

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

function resolveDatabaseUrl(url?: string): string | undefined {
  if (!url) return undefined;
  // If direct Supabase connection string is used and running in an IPv4-only environment
  if (url.includes("db.") && url.includes(".supabase.co")) {
    const match = url.match(
      /postgres(?:ql)?:\/\/([^:]+):([^@]+)@db\.([a-z0-9]+)\.supabase\.co(?::5432)?\/([a-zA-Z0-9_-]+)(.*)/
    );
    if (match) {
      const [, user, pass, ref, db, rest] = match;
      return `postgresql://${user}.${ref}:${pass}@aws-0-eu-west-1.pooler.supabase.com:5432/${db}${rest || ""}`;
    }
  }
  return url;
}

if (!process.env.DATABASE_URL) {
  try {
    const envLocalPath = path.resolve(process.cwd(), ".env.local");
    if (fs.existsSync(envLocalPath)) {
      const content = fs.readFileSync(envLocalPath, "utf-8");
      for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) process.env[key] = val;
        }
      }
    }
  } catch {}
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

globalThis.prismaGlobal = prisma;
