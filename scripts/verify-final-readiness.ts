import * as fs from "fs";
import * as path from "path";
import { PrismaClient } from "@prisma/client";
import { resolveSupabaseUrl } from "./test-db-connection";

function loadEnvLocal(): Record<string, string> {
  const envLocalPath = path.resolve(process.cwd(), ".env.local");
  const env: Record<string, string> = {};
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
        env[key] = val;
      }
    }
  }
  return env;
}

async function verifyFinalReadiness() {
  console.log("==================================================");
  console.log("🔍 BALLEGH AI — FINAL PRODUCTION PRE-DEPLOY VERIFY");
  console.log("==================================================");

  const localEnv = loadEnvLocal();
  const rawUrl = localEnv.DATABASE_URL;
  if (!rawUrl) {
    console.error("DATABASE_URL is missing.");
    process.exit(1);
  }

  const activeUrl = resolveSupabaseUrl(rawUrl);
  const prisma = new PrismaClient({
    datasources: { db: { url: activeUrl } },
    log: ["error"],
  });

  try {
    await prisma.$connect();

    // 1. RLS Status on all 9 public tables
    console.log("\n🔒 [1/5] Reconfirming RLS Status on all 9 tables...");
    const rls = await prisma.$queryRaw<Array<{ relname: string; relrowsecurity: boolean }>>`
      SELECT c.relname, c.relrowsecurity 
      FROM pg_class c 
      JOIN pg_namespace n ON n.oid = c.relnamespace 
      WHERE n.nspname = 'public' AND c.relkind = 'r' 
      ORDER BY c.relname;
    `;
    const allRlsOn = rls.length === 9 && rls.every((r) => r.relrowsecurity);
    console.log(`• Total application tables : ${rls.length}/9`);
    console.log(`• RLS Enabled on all tables : ${allRlsOn ? "PASS" : "FAIL"}`);

    // 2. Direct grants to anon / authenticated
    console.log("\n🔑 [2/5] Reconfirming table grants for anon & authenticated...");
    const grants = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT count(*)::bigint as count 
      FROM information_schema.role_table_grants 
      WHERE table_schema = 'public' AND grantee IN ('anon', 'authenticated');
    `;
    const grantsCount = Number(grants[0].count);
    console.log(`• Direct grants to anon/authenticated: ${grantsCount === 0 ? "PASS (0 grants)" : "FAIL (" + grantsCount + " grants)"}`);

    // 3. Storage bucket ballegh-reports
    console.log("\n🗄️ [3/5] Reconfirming ballegh-reports bucket configuration...");
    const buckets = await prisma.$queryRaw<Array<{
      name: string;
      public: boolean;
      file_size_limit: bigint | null;
      allowed_mime_types: string[] | null;
    }>>`
      SELECT name, public, file_size_limit, allowed_mime_types 
      FROM storage.buckets 
      WHERE name = 'ballegh-reports';
    `;
    const b = buckets[0];
    const bIsPrivate = b && !b.public;
    const bLimit5MB = b && b.file_size_limit?.toString() === "5242880";
    const bAllowedMime = b && b.allowed_mime_types && 
      b.allowed_mime_types.includes("image/jpeg") && 
      b.allowed_mime_types.includes("image/png") && 
      b.allowed_mime_types.includes("image/webp");

    console.log(`• Bucket exists         : ${b ? "PASS" : "FAIL"}`);
    console.log(`• Bucket is PRIVATE     : ${bIsPrivate ? "PASS (public=false)" : "FAIL"}`);
    console.log(`• Bucket 5MB size limit : ${bLimit5MB ? "PASS (5242880 bytes)" : "FAIL"}`);
    console.log(`• Mime Types restricted : ${bAllowedMime ? "PASS [jpeg, png, webp]" : "FAIL"}`);

    // 4. Prisma Migrations History in DB
    console.log("\n📜 [4/5] Checking Applied Prisma Migrations in Database...");
    const migrations = await prisma.$queryRaw<Array<{ migration_name: string; finished_at: Date | null }>>`
      SELECT migration_name, finished_at 
      FROM "_prisma_migrations" 
      ORDER BY finished_at ASC;
    `;
    console.log(`• Applied migrations in DB (${migrations.length}):`);
    for (const m of migrations) {
      console.log(`  - ${m.migration_name} (applied: ${m.finished_at?.toISOString() || "pending"})`);
    }

    // 5. Check migrations on disk in prisma/migrations
    const diskMigrationsDir = path.resolve(process.cwd(), "prisma", "migrations");
    const diskMigrations = fs.readdirSync(diskMigrationsDir).filter((f) =>
      fs.statSync(path.join(diskMigrationsDir, f)).isDirectory()
    );
    console.log(`• Migrations on disk (${diskMigrations.length}): ${diskMigrations.join(", ")}`);
    const allApplied = diskMigrations.every((dm) => migrations.some((m) => m.migration_name === dm && m.finished_at));
    console.log(`• All disk migrations applied in DB: ${allApplied ? "PASS" : "FAIL"}`);

  } catch (err: any) {
    console.error("❌ Error in verification:", err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

verifyFinalReadiness().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
