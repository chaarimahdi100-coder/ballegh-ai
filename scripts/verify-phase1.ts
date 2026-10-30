import * as fs from "fs";
import * as path from "path";
import * as https from "https";
import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
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

function queryVercelApi(apiPath: string): Promise<any> {
  const authPath = "C:/Users/user/AppData/Roaming/com.vercel.cli/Data/auth.json";
  const projectPath = ".vercel/project.json";

  const auth = JSON.parse(fs.readFileSync(authPath, "utf-8"));
  const project = JSON.parse(fs.readFileSync(projectPath, "utf-8"));

  const fullPath = apiPath.includes("?") 
    ? `${apiPath}&teamId=${project.orgId}` 
    : `${apiPath}?teamId=${project.orgId}`;

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: "api.vercel.com",
      port: 443,
      path: fullPath,
      method: "GET",
      headers: {
        "Authorization": `Bearer ${auth.token}`,
        "User-Agent": "ballegh-phase1-audit"
      },
      timeout: 10000
    }, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on("timeout", () => req.destroy(new Error("Vercel API timeout")));
    req.on("error", reject);
    req.end();
  });
}

async function runPhase1() {
  console.log("==================================================");
  console.log("🔍 BALLEGH AI — PHASE 1: PRE-CHANGE SAFETY AUDIT");
  console.log("==================================================");

  const localEnv = loadEnvLocal();

  // 1. Vercel project & environment-variable targets
  console.log("\n📦 [1/4] Checking Vercel Project & Environment Variable Targets...");
  const projectData = JSON.parse(fs.readFileSync(".vercel/project.json", "utf-8"));
  console.log(`• Vercel Project Name: ${projectData.projectName}`);
  console.log(`• Vercel Project ID  : ${projectData.projectId}`);
  console.log(`• Vercel Org/Team ID : ${projectData.orgId}`);

  const envsRes = await queryVercelApi(`/v9/projects/${projectData.projectId}/env`);
  const envList = envsRes.envs || [];
  console.log(`• Total Environment Variables in Vercel: ${envList.length}`);
  
  for (const item of envList) {
    console.log(`  - ${item.key.padEnd(26)} : targets = [${item.target.join(", ")}] (type: ${item.type})`);
  }

  // 2. Confirm association with Supabase project gtfvnxajbnkvpdxvjtyl
  console.log("\n🔗 [2/4] Verifying Project Association (Target: gtfvnxajbnkvpdxvjtyl)...");

  // Check DATABASE_URL
  const dbUrl = localEnv.DATABASE_URL || "";
  const dbRefMatch = dbUrl.match(/postgres\.([a-z0-9]+):/) || dbUrl.match(/@db\.([a-z0-9]+)\.supabase\.co/);
  const dbRef = dbRefMatch ? dbRefMatch[1] : "UNKNOWN";
  const dbMatches = dbRef === "gtfvnxajbnkvpdxvjtyl";
  console.log(`• DATABASE_URL project ref      : ${dbRef} (Matches target: ${dbMatches ? "✅ YES" : "❌ NO"})`);

  // Check Supabase URL
  const supabaseUrl = `https://${dbRef}.supabase.co`;
  console.log(`• Derived Supabase Project URL   : ${supabaseUrl}`);

  // Check SUPABASE_SERVICE_ROLE_KEY
  const serviceKey = localEnv.SUPABASE_SERVICE_ROLE_KEY || "";
  let serviceKeyValid = false;
  let serviceKeyRole = "none";
  let serviceKeyIssuer = "none";

  if (serviceKey) {
    try {
      // Decode JWT payload (part 2) without exposing secret
      const parts = serviceKey.split(".");
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf-8"));
        serviceKeyRole = payload.role || "unknown";
        serviceKeyIssuer = payload.iss || "unknown";
      }
    } catch {}

    // Test live authentication against Supabase Storage bucket
    try {
      const client = createClient(supabaseUrl, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false }
      });
      const { data: buckets, error } = await client.storage.listBuckets();
      if (!error && buckets) {
        serviceKeyValid = true;
        console.log(`• Service Role Key live test    : ✅ VALID (Authenticates successfully with project ${dbRef})`);
        console.log(`  - Token Role: '${serviceKeyRole}', Issuer: '${serviceKeyIssuer}'`);
        console.log(`  - Storage Buckets accessible: [${buckets.map(b => b.name).join(", ")}]`);
      } else {
        console.log(`• Service Role Key live test    : ❌ FAILED (${error?.message})`);
      }
    } catch (e: any) {
      console.log(`• Service Role Key live test    : ❌ ERROR (${e.message})`);
    }
  } else {
    console.log(`• SUPABASE_SERVICE_ROLE_KEY      : ⚠️ Missing locally`);
  }

  // 3. Database Integrity & Object Counts Check (Preservation check)
  console.log("\n📊 [3/4] Checking Current Database and Storage Object Counts...");
  const activeUrl = resolveSupabaseUrl(dbUrl);
  const prisma = new PrismaClient({ datasources: { db: { url: activeUrl } }, log: ["error"] });
  
  try {
    await prisma.$connect();
    const tableCounts = await prisma.$queryRaw<Array<{ table_name: string; count: bigint }>>`
      SELECT 'users' as table_name, count(*)::bigint as count FROM "users"
      UNION ALL SELECT 'reports', count(*)::bigint FROM "reports"
      UNION ALL SELECT 'report_photos', count(*)::bigint FROM "report_photos"
      UNION ALL SELECT 'ai_analyses', count(*)::bigint FROM "ai_analyses"
      UNION ALL SELECT 'human_reviews', count(*)::bigint FROM "human_reviews"
      UNION ALL SELECT 'timeline_events', count(*)::bigint FROM "timeline_events"
      UNION ALL SELECT 'municipal_services', count(*)::bigint FROM "municipal_services"
      UNION ALL SELECT 'duplicate_clusters', count(*)::bigint FROM "duplicate_clusters"
      UNION ALL SELECT '_prisma_migrations', count(*)::bigint FROM "_prisma_migrations";
    `;

    console.log("• PostgreSQL Record Counts in schema 'public':");
    for (const row of tableCounts) {
      console.log(`  - ${row.table_name.padEnd(20)}: ${row.count} records`);
    }
  } catch (err: any) {
    console.error("  ❌ Database query error:", err.message);
  } finally {
    await prisma.$disconnect().catch(() => {});
  }

  // 4. Recoverable Backup / Export Status Check
  console.log("\n💾 [4/4] Checking Recoverable Backup / Export Status...");
  const backupFiles: string[] = [];
  const checkDirs = [process.cwd(), path.join(process.cwd(), "backups"), path.join(process.cwd(), "prisma")];
  
  for (const d of checkDirs) {
    if (fs.existsSync(d)) {
      const files = fs.readdirSync(d);
      for (const f of files) {
        if (f.endsWith(".sql") || f.endsWith(".dump") || f.endsWith(".tar") || f.includes("backup")) {
          backupFiles.push(path.join(d, f));
        }
      }
    }
  }

  if (backupFiles.length > 0) {
    console.log(`• Local backup/export files found (${backupFiles.length}):`);
    for (const bf of backupFiles) {
      const stats = fs.statSync(bf);
      console.log(`  - ${path.basename(bf)} (${(stats.size / 1024).toFixed(1)} KB, modified: ${stats.mtime.toISOString()})`);
    }
  } else {
    console.log(`• Local backup/dump files        : ⚠️ None found in workspace.`);
  }

  console.log("\n==================================================");
  console.log("PHASE 1 PREFLIGHT AUDIT COMPLETE");
  console.log("==================================================");
}

runPhase1().catch(err => {
  console.error("Fatal error during Phase 1:", err);
  process.exit(1);
});
