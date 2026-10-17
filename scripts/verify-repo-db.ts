import * as path from "path";
import * as fs from "fs";
import { PrismaClient } from "@prisma/client";
import assert from "assert/strict";

// Load .env.local natively
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

async function runRepoDatabaseVerification() {
  console.log("==================================================");
  console.log("🔍 VERIFYING REPOSITORY LAYER AGAINST REAL SUPABASE");
  console.log("==================================================");

  // Import repositories dynamically AFTER env is loaded
  const { createReport, getReportById, updateHumanReview, advanceReportStatus } = await import("../lib/repositories/reportRepository");
  const prisma = new PrismaClient({
    datasources: { db: { url: process.env.DATABASE_URL } },
    log: ["error"],
  });

  const testReportId = `rep-audit-${Date.now()}`;

  try {
    // 1. Create a report via repository
    console.log("\n1. Testing createReport repository function...");
    const created = await createReport({
      id: testReportId,
      category: "pothole",
      title: "[AUDIT-REPO] Nid-de-poule réel Supabase",
      description: "Vérification que le repository insère bien dans la table reports de Supabase.",
      district: "Bab Souika",
      streetAddress: "Rue Bab Souika Test 42",
      submittedBy: {
        id: "usr_audit_repo_01",
        name: "Citoyen Audit",
        phone: "+216 98 000 111",
      },
    });

    assert.equal(created.id, testReportId, "ID returned must match created ID");
    console.log("  [PASS] createReport returned report domain object");

    // 2. Directly verify existence in Supabase table
    console.log("\n2. Directly checking Supabase PostgreSQL 'reports' table...");
    const dbReport = await prisma.report.findUnique({
      where: { id: testReportId },
      include: { aiAnalysis: true, timeline: true, submittedBy: true },
    });
    assert.ok(dbReport, "Report must physically exist in Supabase 'reports' table");
    assert.equal(dbReport.category, "POTHOLE", "Category must match in PostgreSQL");
    assert.ok(dbReport.aiAnalysis, "AI analysis relation must be created in PostgreSQL");
    console.log("  [PASS] Report physically verified in Supabase PostgreSQL database");

    // 3. Test getReportById
    console.log("\n3. Testing getReportById from repository...");
    const fetched = await getReportById(testReportId);
    assert.ok(fetched, "getReportById must return the report from DB");
    assert.equal(fetched.location.district, "Bab Souika");
    console.log("  [PASS] getReportById retrieved the real report from database");

    // 4. Test updateHumanReview
    console.log("\n4. Testing updateHumanReview repository function...");
    const reviewed = await updateHumanReview(
      testReportId,
      { id: "usr_audit_agent_01", name: "Agent Municipal Audit", role: "municipal_agent" },
      "accepted",
      "Validé sur le terrain par l'agent"
    );
    assert.equal(reviewed?.status, "human_validated");

    // Verify in Supabase table human_reviews
    const dbReview = await prisma.humanReview.findUnique({
      where: { reportId: testReportId },
    });
    assert.ok(dbReview, "Human review record must physically exist in Supabase 'human_reviews'");
    assert.equal(dbReview.decision, "ACCEPTED");
    console.log("  [PASS] updateHumanReview persisted into Supabase 'human_reviews' table");

    // 5. Test advanceReportStatus
    console.log("\n5. Testing advanceReportStatus repository function...");
    const advanced = await advanceReportStatus(
      testReportId,
      { id: "usr_audit_agent_01", name: "Agent Municipal Audit", role: "municipal_agent" },
      "forwarded"
    );
    assert.equal(advanced?.status, "forwarded");
    assert.equal(advanced?.officialEmailSent, true);

    const dbUpdatedReport = await prisma.report.findUnique({ where: { id: testReportId } });
    assert.equal(dbUpdatedReport?.status, "FORWARDED");
    assert.equal(dbUpdatedReport?.officialEmailSent, true);
    console.log("  [PASS] advanceReportStatus persisted status transition into Supabase");

    // 6. Clean up ONLY this test record
    console.log("\n6. Cleaning up test record...");
    await prisma.report.delete({ where: { id: testReportId } });
    const verifyCleaned = await prisma.report.findUnique({ where: { id: testReportId } });
    assert.equal(verifyCleaned, null, "Record must be deleted");
    console.log("  [PASS] Isolated test record cleaned up successfully from Supabase");

    console.log("\n==================================================");
    console.log("✅ ALL REPOSITORY DATABASE CHECKS PASSED!");
    console.log("==================================================");
  } catch (err: any) {
    // Attempt cleanup if failed midway
    await prisma.report.delete({ where: { id: testReportId } }).catch(() => {});
    console.error("❌ Verification failed:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

runRepoDatabaseVerification();
