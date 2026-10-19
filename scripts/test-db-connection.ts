import { PrismaClient } from "@prisma/client";
import * as path from "path";
import * as fs from "fs";

// Load .env.local natively without external dependencies
function loadEnvLocal(): void {
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
        process.env[key] = val;
      }
    }
  }
}

loadEnvLocal();

/**
 * Mask password and sensitive info from connection string
 */
export function sanitizeDatabaseUrl(url?: string): string {
  if (!url) return "<NON_DEFINIE>";
  try {
    // Regex replace password between : and @
    return url.replace(/:\/\/([^:]+):([^@]+)@/, "://$1:********@");
  } catch {
    return "<URL_MASQUEE>";
  }
}

export interface DatabaseInspectionResult {
  connected: boolean;
  sanitizedUrl: string;
  error?: string;
  databaseName?: string;
  databaseVersion?: string;
  existingTables?: string[];
  migrationsApplied?: string[];
  isCleanDatabase?: boolean;
}

export function resolveSupabaseUrl(url?: string, forcePooler = false): string {
  if (!url) return "";
  if (url.includes("pooler.supabase.com")) return url;
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

export async function inspectDatabaseConnection(): Promise<DatabaseInspectionResult> {
  const rawUrl = process.env.DATABASE_URL;
  const sanitizedUrl = sanitizeDatabaseUrl(rawUrl);

  if (!rawUrl || rawUrl.includes("placeholder_password") || rawUrl.trim().length === 0) {
    return {
      connected: false,
      sanitizedUrl,
      error: "DATABASE_URL n'est pas configurée dans .env.local ou contient un mot de passe temporaire.",
    };
  }

  const activeUrl = resolveSupabaseUrl(rawUrl);
  let prisma = new PrismaClient({
    datasources: {
      db: { url: activeUrl },
    },
    log: ["error"],
  });

  try {
    // 1. Test basic connectivity
    await prisma.$connect();

    // 2. Query DB info
    const dbInfoRaw = await prisma.$queryRaw<Array<{ db_name: string; pg_version: string }>>`
      SELECT current_database() AS db_name, version() AS pg_version
    `;
    const dbInfo = dbInfoRaw[0];

    // 3. Inspect public tables
    const tablesRaw = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name ASC
    `;
    const existingTables = tablesRaw.map((t) => t.table_name);

    // 4. Inspect Prisma migration history
    let migrationsApplied: string[] = [];
    if (existingTables.includes("_prisma_migrations")) {
      const migrationsRaw = await prisma.$queryRaw<Array<{ migration_name: string; finished_at: Date | null }>>`
        SELECT migration_name, finished_at 
        FROM "_prisma_migrations" 
        ORDER BY finished_at ASC
      `;
      migrationsApplied = migrationsRaw.map((m) => m.migration_name);
    }

    const isCleanDatabase = existingTables.length === 0 || 
      (existingTables.length === 1 && existingTables[0] === "_prisma_migrations");

    return {
      connected: true,
      sanitizedUrl,
      databaseName: dbInfo?.db_name,
      databaseVersion: dbInfo?.pg_version?.split(" ")[0] + " " + dbInfo?.pg_version?.split(" ")[1],
      existingTables,
      migrationsApplied,
      isCleanDatabase,
    };
  } catch (err: any) {
    return {
      connected: false,
      sanitizedUrl,
      error: err.message || String(err),
    };
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

export async function testReportPersistence(): Promise<{
  success: boolean;
  referenceNumber: string;
  created: boolean;
  readBack: boolean;
  updated: boolean;
  cleanedUp: boolean;
  error?: string;
}> {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl || rawUrl.includes("placeholder_password")) {
    return {
      success: false,
      referenceNumber: "N/A",
      created: false,
      readBack: false,
      updated: false,
      cleanedUp: false,
      error: "DATABASE_URL non configurée",
    };
  }

  const activeUrl = resolveSupabaseUrl(rawUrl);
  let prisma = new PrismaClient({
    datasources: { db: { url: activeUrl } },
    log: ["error"],
  });

  const testRef = `BLG-TEST-PERSIST-${Date.now().toString().slice(-6)}`;
  let testUserId: string | null = null;
  let testReportId: string | null = null;

  try {
    await prisma.$connect();

    // 1. Create or get test author
    const testUser = await prisma.user.upsert({
      where: { email: "test.persistence@ballegh.local" },
      update: {},
      create: {
        email: "test.persistence@ballegh.local",
        fullName: "Test Persistence User",
        phone: "+216 99 999 999",
        passwordHash: "TEST_HASH_SECURE",
        role: "CITIZEN",
      },
    });
    testUserId = testUser.id;

    // 2. Create isolated report
    const createdReport = await prisma.report.create({
      data: {
        referenceNumber: testRef,
        titleFr: "[TEST AUDIT] Nid-de-poule test persistance",
        titleAr: "[اختبار] حفرة طريق تجريبية",
        descriptionFr: "Signalement créé automatiquement pour vérifier la persistance réelle Supabase.",
        descriptionAr: "بلاغ تم إنشاؤه آليا للتحقق من حفظ البيانات الفعلي.",
        category: "POTHOLE",
        status: "RECEIVED",
        urgency: "HIGH",
        district: "Bab Souika",
        streetAddress: "Rue Test Persistance 101",
        latitude: 36.8065,
        longitude: 10.1815,
        submittedById: testUserId,
        photos: {
          create: [{ url: "https://example.com/test-pothole.jpg", caption: "Photo test" }],
        },
        aiAnalysis: {
          create: {
            predictedCategory: "POTHOLE",
            confidenceScore: 0.95,
            estimatedSeverity: 3,
            severityRationaleFr: "Test de sévérité",
            severityRationaleAr: "اختبار الخطورة",
            priorityScore: 85,
            suggestedServiceCode: "DVRD-TUNIS",
            draftEmailDept: "Voirie",
            draftEmailTo: "voirie@commune-tunis.gov.tn",
            draftEmailSubject: "Urgence voirie test",
            draftEmailBody: "Corps du message test",
          },
        },
        timeline: {
          create: [
            {
              authorName: testUser.fullName,
              authorRole: "CITIZEN",
              status: "RECEIVED",
              commentFr: "Création du signalement test",
              commentAr: "إنشاء البلاغ التجريبي",
            },
          ],
        },
      },
      include: {
        aiAnalysis: true,
        photos: true,
        timeline: true,
      },
    });
    testReportId = createdReport.id;
    const created = Boolean(createdReport && createdReport.id);

    // 3. Read back from database
    const readBackReport = await prisma.report.findUnique({
      where: { id: testReportId },
      include: { aiAnalysis: true, timeline: true },
    });
    const readBack = Boolean(readBackReport && readBackReport.referenceNumber === testRef);

    // 4. Update status in database
    const updatedReport = await prisma.report.update({
      where: { id: testReportId },
      data: {
        status: "IN_PROGRESS",
        officialEmailSent: true,
        officialEmailSentAt: new Date(),
        timeline: {
          create: {
            authorName: "Agent Test",
            authorRole: "MUNICIPAL_AGENT",
            status: "IN_PROGRESS",
            commentFr: "Équipe envoyée sur le terrain",
            commentAr: "إرسال الفريق الفني للميدان",
          },
        },
      },
    });
    const updated = Boolean(updatedReport && updatedReport.status === "IN_PROGRESS" && updatedReport.officialEmailSent);

    // 5. Clean up ONLY this test record
    await prisma.report.delete({
      where: { id: testReportId },
    });
    testReportId = null;

    // Verify deletion
    const verifyDeleted = await prisma.report.findUnique({
      where: { referenceNumber: testRef },
    });
    const cleanedUp = verifyDeleted === null;

    return {
      success: created && readBack && updated && cleanedUp,
      referenceNumber: testRef,
      created,
      readBack,
      updated,
      cleanedUp,
    };
  } catch (err: any) {
    // Attempt cleanup if failed midway
    if (testReportId) {
      await prisma.report.delete({ where: { id: testReportId } }).catch(() => {});
    }
    return {
      success: false,
      referenceNumber: testRef,
      created: false,
      readBack: false,
      updated: false,
      cleanedUp: false,
      error: err.message || String(err),
    };
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

// CLI runner
if (require.main === module) {
  (async () => {
    console.log("==================================================");
    console.log("🔍 BALLEGH AI — SUPABASE POSTGRESQL AUDIT RUNNER");
    console.log("==================================================");

    const inspection = await inspectDatabaseConnection();
    console.log(`\n• Target Connection: ${inspection.sanitizedUrl}`);
    console.log(`• Connected: ${inspection.connected ? "✅ YES" : "❌ NO"}`);

    if (!inspection.connected) {
      console.log(`• Error: ${inspection.error}`);
      console.log("\n⚠️ Database is not reachable or not configured.");
      process.exit(1);
    }

    console.log(`• Database Name: ${inspection.databaseName}`);
    console.log(`• PostgreSQL Version: ${inspection.databaseVersion}`);
    console.log(`• Existing Tables (${inspection.existingTables?.length || 0}): ${(inspection.existingTables || []).join(", ") || "None"}`);
    console.log(`• Migrations Applied (${inspection.migrationsApplied?.length || 0}): ${(inspection.migrationsApplied || []).join(", ") || "None"}`);

    if (inspection.existingTables && inspection.existingTables.includes("reports")) {
      console.log("\n🧪 Running Isolated CRUD Persistence Test...");
      const testResult = await testReportPersistence();
      console.log(`• Test Reference: ${testResult.referenceNumber}`);
      console.log(`• Created in PostgreSQL: ${testResult.created ? "✅ PASS" : "❌ FAIL"}`);
      console.log(`• Read back from PostgreSQL: ${testResult.readBack ? "✅ PASS" : "❌ FAIL"}`);
      console.log(`• Updated in PostgreSQL: ${testResult.updated ? "✅ PASS" : "❌ FAIL"}`);
      console.log(`• Isolated cleanup completed: ${testResult.cleanedUp ? "✅ PASS" : "❌ FAIL"}`);
      console.log(`• Result: ${testResult.success ? "✅ ALL PERSISTENCE CHECKS PASSED" : "❌ PERSISTENCE FAILURE: " + testResult.error}`);
    } else {
      console.log("\nℹ️ Table 'reports' not found yet. Migration needed before persistence test.");
    }
  })();
}
