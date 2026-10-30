import * as fs from "fs";
import * as path from "path";
import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import { resolveSupabaseUrl, sanitizeDatabaseUrl } from "./test-db-connection";

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

async function runPhase2Audit() {
  console.log("==================================================");
  console.log("🛡️ BALLEGH AI — PHASE 2: READ-ONLY SECURITY AUDIT");
  console.log("==================================================");

  const localEnv = loadEnvLocal();
  const rawUrl = localEnv.DATABASE_URL;
  if (!rawUrl) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  const activeUrl = resolveSupabaseUrl(rawUrl);
  console.log(`• Target Connection: ${sanitizeDatabaseUrl(rawUrl)}\n`);

  const prisma = new PrismaClient({
    datasources: { db: { url: activeUrl } },
    log: ["error"],
  });

  try {
    await prisma.$connect();

    // 1. Prisma Server Connection Role & Privileges
    console.log("👤 [1/6] Prisma Server Connection Role & Privileges...");
    const connInfo = await prisma.$queryRaw<Array<{
      curr_user: string;
      sess_user: string;
      is_super: string;
      can_bypass_rls: boolean;
    }>>`
      SELECT current_user AS curr_user,
             session_user AS sess_user,
             current_setting('is_superuser') AS is_super,
             rolbypassrls AS can_bypass_rls
      FROM pg_roles
      WHERE rolname = current_user;
    `;
    const userRole = connInfo[0];
    console.log(`  - Connected User  : ${userRole?.curr_user}`);
    console.log(`  - Session User    : ${userRole?.sess_user}`);
    console.log(`  - Is Superuser    : ${userRole?.is_super}`);
    console.log(`  - Can Bypass RLS  : ${userRole?.can_bypass_rls ? "✅ YES (Role bypasses RLS policies)" : "NO"}`);

    // 2. Table Ownership & RLS Status in 'public'
    console.log("\n🔒 [2/6] Public Schema: Ownership & RLS Status...");
    const publicTables = await prisma.$queryRaw<Array<{
      table_name: string;
      owner: string;
      rls_enabled: boolean;
      rls_forced: boolean;
    }>>`
      SELECT c.relname AS table_name,
             pg_catalog.pg_get_userbyid(c.relowner) AS owner,
             c.relrowsecurity AS rls_enabled,
             c.relforcerowsecurity AS rls_forced
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r'
      ORDER BY c.relname ASC;
    `;

    for (const t of publicTables) {
      console.log(`  - ${t.table_name.padEnd(22)}: Owner=${t.owner}, RLS=${t.rls_enabled ? "ON" : "OFF"}, Forced=${t.rls_forced}`);
    }

    // 3. Policies in 'public'
    console.log("\n📜 [3/6] Policies in Schema 'public'...");
    const publicPolicies = await prisma.$queryRaw<Array<{
      tablename: string;
      policyname: string;
      roles: string[];
      cmd: string;
    }>>`
      SELECT tablename, policyname, roles::text[] as roles, cmd
      FROM pg_policies
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname;
    `;
    console.log(`  - Total policies in public: ${publicPolicies.length} ${publicPolicies.length === 0 ? "(Default Deny active for non-bypass roles)" : ""}`);
    for (const p of publicPolicies) {
      console.log(`    * ${p.tablename}: ${p.policyname} (${p.cmd}) -> roles: [${p.roles.join(", ")}]`);
    }

    // 4. Role Table Grants for anon, authenticated, service_role, postgres
    console.log("\n🔑 [4/6] Table Grants in Schema 'public'...");
    const grants = await prisma.$queryRaw<Array<{
      grantee: string;
      table_name: string;
      privilege_type: string;
    }>>`
      SELECT grantee, table_name, privilege_type
      FROM information_schema.role_table_grants
      WHERE table_schema = 'public'
        AND grantee IN ('anon', 'authenticated', 'service_role', 'postgres')
      ORDER BY grantee, table_name, privilege_type;
    `;

    const grantSummary: Record<string, number> = {};
    for (const g of grants) {
      grantSummary[g.grantee] = (grantSummary[g.grantee] || 0) + 1;
    }
    for (const [role, count] of Object.entries(grantSummary)) {
      console.log(`  - Role '${role.padEnd(14)}': ${count} table privileges`);
    }
    const anonGrants = grants.filter(g => g.grantee === 'anon');
    const authGrants = grants.filter(g => g.grantee === 'authenticated');
    console.log(`  - Direct grants to anon         : ${anonGrants.length} ${anonGrants.length === 0 ? "✅ (0 grants - hardened)" : "⚠️"}`);
    console.log(`  - Direct grants to authenticated: ${authGrants.length} ${authGrants.length === 0 ? "✅ (0 grants - hardened)" : "⚠️"}`);

    // Default privileges
    console.log("\n⚙️ Default Privileges (pg_default_acl)...");
    const defPrivs = await prisma.$queryRaw<Array<{
      owner: string;
      schema: string | null;
      obj_type: string;
      acl: string;
    }>>`
      SELECT pg_catalog.pg_get_userbyid(d.defaclrole) as owner,
             n.nspname as schema,
             d.defaclobjtype as obj_type,
             d.defaclacl::text as acl
      FROM pg_catalog.pg_default_acl d
      LEFT JOIN pg_catalog.pg_namespace n ON n.oid = d.defaclnamespace
      WHERE n.nspname = 'public' OR n.nspname IS NULL;
    `;
    for (const dp of defPrivs) {
      console.log(`  - [${dp.schema || "global"}] obj=${dp.obj_type} owner=${dp.owner} -> acl=${dp.acl}`);
    }

    // 5. Storage Buckets & Policies Audit
    console.log("\n🗄️ [5/6] Supabase Storage: Buckets & Policies Audit...");
    const buckets = await prisma.$queryRaw<Array<{
      id: string;
      name: string;
      public: boolean;
      file_size_limit: bigint | null;
      allowed_mime_types: string[] | null;
    }>>`
      SELECT id, name, public, file_size_limit, allowed_mime_types
      FROM storage.buckets
      ORDER BY name ASC;
    `;

    console.log(`  - Total Storage Buckets: ${buckets.length}`);
    for (const b of buckets) {
      console.log(`    * Bucket '${b.name}': public=${b.public ? "⚠️ PUBLIC" : "✅ PRIVATE"}, sizeLimit=${b.file_size_limit ? b.file_size_limit + "B" : "none"}, allowedTypes=[${(b.allowed_mime_types || []).join(", ") || "all"}]`);
    }

    const storagePolicies = await prisma.$queryRaw<Array<{
      tablename: string;
      policyname: string;
      roles: string[];
      cmd: string;
    }>>`
      SELECT tablename, policyname, roles::text[] as roles, cmd
      FROM pg_policies
      WHERE schemaname = 'storage'
      ORDER BY tablename, policyname;
    `;
    console.log(`  - Total Storage Policies: ${storagePolicies.length}`);
    for (const sp of storagePolicies) {
      console.log(`    * [storage.${sp.tablename}] ${sp.policyname} (${sp.cmd}) -> roles: [${sp.roles.join(", ")}]`);
    }

    // 6. Verify Backup File Integrity & .gitignore
    console.log("\n📦 [6/6] Verifying Local Backup Integrity & Git Exclusion...");
    const backupDir = path.resolve(process.cwd(), "backups");
    if (fs.existsSync(backupDir)) {
      const files = fs.readdirSync(backupDir).filter(f => f.endsWith(".json"));
      if (files.length > 0) {
        const latest = files.sort().reverse()[0];
        const fullPath = path.join(backupDir, latest);
        const stats = fs.statSync(fullPath);
        const content = fs.readFileSync(fullPath, "utf-8");
        const parsed = JSON.parse(content);

        const tableCountsSummary: Record<string, number> = {};
        for (const [tbl, rows] of Object.entries(parsed.tables || {})) {
          tableCountsSummary[tbl] = Array.isArray(rows) ? rows.length : 0;
        }

        console.log(`  - Latest Backup File : ${latest}`);
        console.log(`  - Valid JSON         : ✅ YES`);
        console.log(`  - File Size          : ${(stats.size / 1024).toFixed(2)} KB`);
        console.log(`  - Export Timestamp   : ${parsed.exportedAt}`);
        console.log(`  - Project Reference  : ${parsed.projectRef}`);
        console.log(`  - Tables Backed Up   :`, tableCountsSummary);
      } else {
        console.log("  ⚠️ No JSON backup file found in backups/ directory.");
      }
    }

    const gitignoreContent = fs.readFileSync(".gitignore", "utf-8");
    const isBackupsIgnored = gitignoreContent.includes("/backups/") || gitignoreContent.includes("backups/");
    console.log(`  - Excluded from Git  : ${isBackupsIgnored ? "✅ YES (/backups/ in .gitignore)" : "❌ NO"}`);

    console.log("\n==================================================");
    console.log("PHASE 2 READ-ONLY AUDIT COMPLETE");
    console.log("==================================================");

  } catch (err: any) {
    console.error("❌ Phase 2 audit error:", err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

runPhase2Audit().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
