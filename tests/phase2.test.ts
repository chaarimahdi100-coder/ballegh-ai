import assert from "node:assert/strict";
import * as path from "node:path";
import * as fs from "node:fs";

// Load .env.local natively for test suite execution
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
const realDatabaseUrl = process.env.DATABASE_URL;
// Isolate unit/RBAC tests from mutating the production Supabase database
delete process.env.DATABASE_URL;

import {
  authenticateUser,
  registerUser,
  findUserByEmail,
  listAllUsers,
} from "../lib/repositories/userRepository";
import {
  listReports,
  getReportById,
  createReport,
  updateHumanReview,
  advanceReportStatus,
  confirmCitizenResolution,
} from "../lib/repositories/reportRepository";
import { createSessionToken, verifySessionToken, SESSION_COOKIE_NAME } from "../lib/auth/jwt";
import { analyzeReportTriage } from "../lib/services/aiService";
import { dispatchOfficialEmail } from "../lib/services/emailService";
import { inspectDatabaseConnection, testReportPersistence } from "../scripts/test-db-connection";

// Route handlers for direct HTTP contract & security testing
import { POST as demoSwitchHandler } from "../app/api/auth/demo-switch/route";
import { GET as reportsGetHandler, POST as reportsPostHandler } from "../app/api/reports/route";
import { GET as reportDetailGetHandler, PATCH as reportDetailPatchHandler } from "../app/api/reports/[id]/route";

async function runTestSuite() {
  console.log("\n========================================================");
  console.log(" BALLEGH AI — PHASE 2 INTEGRATION & RBAC TEST SUITE");
  console.log("========================================================\n");

  let passedTests = 0;
  let totalTests = 0;

  async function test(name: string, fn: () => Promise<void>) {
    totalTests++;
    try {
      await fn();
      console.log(`  [PASS] ${name}`);
      passedTests++;
    } catch (err: any) {
      console.error(`  [FAIL] ${name}`);
      console.error(`         Error: ${err.message}`);
      throw err;
    }
  }

  // ---------------------------------------------------------
  // 1. AUTHENTICATION & PASSWORD VERIFICATION
  // ---------------------------------------------------------
  console.log("--- 1. Authentication & Credentials ---");

  await test("Rejects invalid password for citizen account", async () => {
    const user = await authenticateUser("citoyen@tunis.tn", "WrongPassword123!");
    assert.equal(user, null, "Should return null for invalid password");
  });

  await test("Authenticates citizen account with correct password", async () => {
    const user = await authenticateUser("citoyen@tunis.tn", "Ballegh2026!");
    assert.ok(user, "User should be found and authenticated");
    assert.equal(user?.email, "citoyen@tunis.tn");
    assert.equal(user?.role, "citizen");
  });

  await test("Authenticates municipal agent account with correct password", async () => {
    const agent = await authenticateUser("agent@commune-tunis.gov.tn", "Ballegh2026!");
    assert.ok(agent, "Municipal agent should be authenticated");
    assert.equal(agent?.role, "municipal_agent");
  });

  await test("Authenticates system administrator account with correct password", async () => {
    const admin = await authenticateUser("admin@commune-tunis.gov.tn", "Ballegh2026!");
    assert.ok(admin, "Admin should be authenticated");
    assert.equal(admin?.role, "admin");
  });

  // ---------------------------------------------------------
  // 2. CRYPTOGRAPHIC JWT SESSION TOKENS
  // ---------------------------------------------------------
  console.log("\n--- 2. Cryptographic Session Tokens (HS256) ---");

  let citizenToken = "";
  let agentToken = "";
  let adminToken = "";

  await test("Generates signed JWT session token for citizen", async () => {
    citizenToken = await createSessionToken({
      userId: "usr_citizen_01",
      email: "citoyen@tunis.tn",
      fullName: "Yassine Ben Amor",
      role: "citizen",
      district: "Centre-Ville",
    });
    assert.ok(citizenToken.length > 20, "JWT token string should be non-empty");
  });

  await test("Generates signed JWT session token for municipal agent", async () => {
    agentToken = await createSessionToken({
      userId: "usr_agent_01",
      email: "agent@commune-tunis.gov.tn",
      fullName: "Ing. Samira Trabelsi",
      role: "municipal_agent",
      district: "Direction de la Voirie",
    });
    assert.ok(agentToken.length > 20);
  });

  await test("Generates signed JWT session token for admin", async () => {
    adminToken = await createSessionToken({
      userId: "usr_admin_01",
      email: "admin@commune-tunis.gov.tn",
      fullName: "Karim Mansour",
      role: "admin",
      district: "DSI Tunis",
    });
    assert.ok(adminToken.length > 20);
  });

  await test("Verifies and decodes valid JWT token", async () => {
    const payload = await verifySessionToken(citizenToken);
    assert.ok(payload, "Payload should be decoded");
    assert.equal(payload?.userId, "usr_citizen_01");
    assert.equal(payload?.email, "citoyen@tunis.tn");
    assert.equal(payload?.role, "citizen");
  });

  await test("Rejects tampered JWT token", async () => {
    const tampered = citizenToken.slice(0, -6) + "xxxxxx";
    const payload = await verifySessionToken(tampered);
    assert.equal(payload, null, "Tampered token must be rejected");
  });

  // ---------------------------------------------------------
  // 3. CITIZEN REGISTRATION
  // ---------------------------------------------------------
  console.log("\n--- 3. User Registration & Security ---");

  const testEmail = `citoyen_${Date.now()}@test.tn`;
  await test("Registers a new citizen with hashed password", async () => {
    const newUser = await registerUser({
      name: "Amira Trabelsi",
      email: testEmail,
      phone: "+216 99 888 777",
      district: "El Menzah 1",
      password: "SecurePassword2026!",
    });
    assert.ok(newUser.id, "New user should have an id");
    assert.equal(newUser.email, testEmail);
    assert.equal(newUser.role, "citizen");
  });

  await test("Prevents duplicate registration with identical email", async () => {
    let duplicateRejected = false;
    try {
      await registerUser({
        name: "Amira Duplicate",
        email: testEmail,
        phone: "+216 99 888 777",
        district: "El Menzah 1",
        password: "AnotherPassword123!",
      });
    } catch (e: any) {
      duplicateRejected = true;
      assert.match(e.message, /existe déjà/i);
    }
    assert.ok(duplicateRejected, "Duplicate email registration must fail");
  });

  // ---------------------------------------------------------
  // 4. REPORT CREATION & AI PRE-ANALYSIS
  // ---------------------------------------------------------
  console.log("\n--- 4. Report Creation & Automated AI Triage ---");

  let createdReportId = "";
  await test("Citizen submits a flooding incident and AI generates triage", async () => {
    const report = await createReport({
      category: "flooding",
      title: "Inondation critique Avenue Habib Bourguiba",
      description: "Accumulation d'eau pluviale bloquant le passage piéton et circulation.",
      district: "Centre-Ville",
      streetAddress: "Avenue Habib Bourguiba",
      landmark: "Devant le Théâtre Municipal",
      submittedBy: {
        id: "usr_citizen_01",
        name: "Yassine Ben Amor",
        phone: "+216 98 123 456",
      },
    });

    assert.ok(report.id, "Report should have a persistent ID");
    assert.equal(report.status, "ai_analyzed");
    assert.equal(report.urgency, "critical");
    assert.equal(report.category, "flooding");

    // Check AI Analysis
    assert.ok(report.aiAnalysis, "AI analysis must be generated");
    assert.equal(report.aiAnalysis.estimatedSeverity, 3, "Flooding severity should be 3");
    assert.ok(report.aiAnalysis.priorityScore >= 80, "Priority score should reflect critical severity");
    assert.equal(report.aiAnalysis.suggestedServiceCode, "DAEP-TUNIS");
    assert.ok(report.aiAnalysis.generatedEmailDraft.recipientEmail.includes("eaux.pluviales"));

    // Check Timeline
    assert.equal(report.timeline.length, 2, "Timeline should have submission and AI diagnostic events");
    assert.equal(report.timeline[1].status, "ai_analyzed");

    createdReportId = report.id;
  });

  // ---------------------------------------------------------
  // 5. HUMAN REVIEW (MUNICIPAL AGENT OVERSIGHT)
  // ---------------------------------------------------------
  console.log("\n--- 5. Human-in-the-Loop Municipal Decision ---");

  await test("Municipal agent reviews and modifies AI recommendation", async () => {
    const agent = {
      id: "usr_agent_01",
      name: "Ing. Samira Bouazizi",
      role: "municipal_agent" as const,
    };

    const updated = await updateHumanReview(
      createdReportId,
      agent,
      "modified",
      "Gravité confirmée mais priorité ajustée pour intervention rapide avec la SONEDE.",
      {
        severity: 3,
        priority: 95,
      }
    );

    assert.ok(updated, "Updated report must exist");
    assert.equal(updated!.status, "human_validated");
    assert.ok(updated!.humanReview, "Human review record must exist");
    assert.equal(updated!.humanReview.decision, "modified");
    assert.equal(updated!.humanReview.reviewedBy, agent.name);
    assert.equal(updated!.humanReview.adjustedPriority, 95);

    // Verify audit timeline
    const latestEvent = updated!.timeline[updated!.timeline.length - 1];
    assert.equal(latestEvent.status, "human_validated");
    assert.equal(latestEvent.authorRole, "municipal_agent");
  });

  // ---------------------------------------------------------
  // 6. OFFICIAL COMMUNICATION & STATUS PROGRESSION
  // ---------------------------------------------------------
  console.log("\n--- 6. Status Transitions & Email Dispatch ---");

  await test("Advances report status to forwarded (email sent)", async () => {
    const agent = {
      id: "usr_agent_01",
      name: "Ing. Samira Bouazizi",
      role: "municipal_agent" as const,
    };

    const forwarded = await advanceReportStatus(
      createdReportId,
      agent,
      "forwarded",
      {
        fr: "Transmission officielle transmise au service d'assainissement.",
        ar: "تمت إحالة الملف رسمياً لإدارة الصرف الصحي.",
      }
    );

    assert.ok(forwarded, "Forwarded report must exist");
    assert.equal(forwarded!.status, "forwarded");
    assert.equal(forwarded!.officialEmailSent, true);
    assert.ok(forwarded!.officialEmailSentAt);
  });

  await test("Advances report status to in_progress (teams on site)", async () => {
    const agent = {
      id: "usr_agent_01",
      name: "Ing. Samira Bouazizi",
      role: "municipal_agent" as const,
    };

    const inProgress = await advanceReportStatus(
      createdReportId,
      agent,
      "in_progress",
      {
        fr: "Équipes techniques déployées avec camions hydrocureurs.",
        ar: "الفرق الفنية متواجدة بالمكان مع شاحنات الشفط.",
      }
    );

    assert.ok(inProgress, "In-progress report must exist");
    assert.equal(inProgress!.status, "in_progress");
  });

  await test("Marks report as resolved by municipal service", async () => {
    const agent = {
      id: "usr_agent_01",
      name: "Ing. Samira Bouazizi",
      role: "municipal_agent" as const,
    };

    const resolved = await advanceReportStatus(
      createdReportId,
      agent,
      "resolved",
      {
        fr: "Intervention terminée : évacuation des eaux achevée.",
        ar: "انتهاء التدخل وتصريف المياه بالكامل.",
      }
    );

    assert.ok(resolved, "Resolved report must exist");
    assert.equal(resolved!.status, "resolved");
    assert.equal(resolved!.resolutionConfirmedByCitizen, false);
  });

  // ---------------------------------------------------------
  // 7. CITIZEN RESOLUTION CONFIRMATION
  // ---------------------------------------------------------
  console.log("\n--- 7. Citizen Field Confirmation ---");

  await test("Citizen confirms incident is resolved on the ground", async () => {
    const confirmed = await confirmCitizenResolution(createdReportId, {
      id: "usr_citizen_01",
      name: "Yassine Ben Amor",
    });

    assert.ok(confirmed, "Confirmed report must exist");
    assert.equal(confirmed!.status, "resolved");
    assert.equal(confirmed!.resolutionConfirmedByCitizen, true);

    const latestEvent = confirmed!.timeline[confirmed!.timeline.length - 1];
    assert.equal(latestEvent.authorRole, "citizen");
    assert.match(latestEvent.comment?.fr || "", /confirmée par le citoyen/i);
  });

  // ---------------------------------------------------------
  // 8. LISTING & RBAC QUERIES
  // ---------------------------------------------------------
  console.log("\n--- 8. Data Querying & Filters ---");

  await test("Lists reports filtered by category", async () => {
    const floodingReports = await listReports({ category: "flooding" });
    assert.ok(floodingReports.length > 0);
    assert.ok(floodingReports.every((r) => r.category === "flooding"));
  });

  await test("Lists reports filtered by citizen author", async () => {
    const myReports = await listReports({ submittedById: "usr_citizen_01" });
    assert.ok(myReports.length > 0);
    assert.ok(myReports.every((r) => r.submittedBy.id === "usr_citizen_01"));
  });

  await test("Retrieves all registered users for admin dashboard", async () => {
    const allUsers = await listAllUsers();
    assert.ok(allUsers.length >= 3, "Should include citizen, agent, and admin");
    assert.ok(allUsers.some((u) => u.role === "admin"));
    assert.ok(allUsers.some((u) => u.role === "municipal_agent"));
    assert.ok(allUsers.some((u) => u.role === "citizen"));
  });

  // ---------------------------------------------------------
  // 9. SECURITY & PRIVILEGE ESCALATION REGRESSION TESTS
  // ---------------------------------------------------------
  console.log("\n--- 9. Security & Privilege Escalation Defenses ---");

  await test("Rejects demo role switch when in production mode without explicit flag", async () => {
    const originalEnv = process.env.NODE_ENV;
    const originalAllow = process.env.ALLOW_DEMO_SWITCH;

    try {
      (process.env as any).NODE_ENV = "production";
      delete process.env.ALLOW_DEMO_SWITCH;

      const req = new Request("http://localhost:3000/api/auth/demo-switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "admin" }),
      });

      const res = await demoSwitchHandler(req);
      assert.equal(res.status, 403, "Must return 403 Forbidden in production");

      const body = await res.json();
      assert.equal(body.code, "DEMO_SWITCH_FORBIDDEN");
    } finally {
      (process.env as any).NODE_ENV = originalEnv;
      if (originalAllow) process.env.ALLOW_DEMO_SWITCH = originalAllow;
    }
  });

  // ---------------------------------------------------------
  // 10. STRICT HUMAN-IN-THE-LOOP WORKFLOW ENFORCEMENT
  // ---------------------------------------------------------
  console.log("\n--- 10. Strict Human Validation Workflow Enforcement ---");

  // Create fresh report in ai_analyzed state
  const unreviewedReport = await createReport({
    category: "pothole",
    title: "Nid-de-poule test workflow",
    description: "Trou profond sur chaussée.",
    district: "Bab Souika",
    streetAddress: "Rue Halfaouine",
    submittedBy: {
      id: "usr_citizen_01",
      name: "Yassine Ben Amor",
      phone: "+216 98 123 456",
    },
  });

  await test("Forbids sending official email before human validation", async () => {
    const req = new Request(`http://localhost:3000/api/reports/${unreviewedReport.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: `${SESSION_COOKIE_NAME}=${agentToken}`,
      },
      body: JSON.stringify({ action: "send_email" }),
    });

    const res = await reportDetailPatchHandler(req, {
      params: Promise.resolve({ id: unreviewedReport.id }),
    });

    assert.equal(res.status, 422, "Must return 422 Unprocessable Entity when not human validated");
    const data = await res.json();
    assert.equal(data.code, "HUMAN_VALIDATION_REQUIRED");
  });

  await test("Forbids citizen resolution confirmation if report is not yet resolved", async () => {
    const req = new Request(`http://localhost:3000/api/reports/${unreviewedReport.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: `${SESSION_COOKIE_NAME}=${citizenToken}`,
      },
      body: JSON.stringify({ action: "confirm_resolution" }),
    });

    const res = await reportDetailPatchHandler(req, {
      params: Promise.resolve({ id: unreviewedReport.id }),
    });

    assert.equal(res.status, 422, "Must return 422 if report is not resolved");
    const data = await res.json();
    assert.equal(data.code, "NOT_YET_RESOLVED");
  });

  await test("Forbids citizen B from confirming resolution of citizen A's report", async () => {
    // Generate token for a different citizen
    const otherCitizenToken = await createSessionToken({
      userId: "usr_other_citizen_99",
      email: "intruder@civic.tn",
      fullName: "Impostor User",
      role: "citizen",
    });

    const req = new Request(`http://localhost:3000/api/reports/${createdReportId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: `${SESSION_COOKIE_NAME}=${otherCitizenToken}`,
      },
      body: JSON.stringify({ action: "confirm_resolution" }),
    });

    const res = await reportDetailPatchHandler(req, {
      params: Promise.resolve({ id: createdReportId }),
    });

    assert.equal(res.status, 403, "Must return 403 Forbidden for non-author citizen");
  });

  // ---------------------------------------------------------
  // 11. CITIZEN PRIVACY & PHONE NUMBER SANITIZATION
  // ---------------------------------------------------------
  console.log("\n--- 11. Citizen Privacy & Contact Data Protection ---");

  await test("Redacts citizen phone number in GET /api/reports for non-staff viewers", async () => {
    const otherCitizenToken = await createSessionToken({
      userId: "usr_other_citizen_99",
      email: "citizen2@civic.tn",
      fullName: "Other Citizen",
      role: "citizen",
    });

    const req = new Request("http://localhost:3000/api/reports", {
      method: "GET",
      headers: {
        Cookie: `${SESSION_COOKIE_NAME}=${otherCitizenToken}`,
      },
    });

    const res = await reportsGetHandler(req);
    assert.equal(res.status, 200);
    const data = await res.json();

    const otherReport = data.reports.find((r: any) => r.submittedBy.id !== "usr_other_citizen_99");
    assert.ok(otherReport, "Found a report submitted by someone else");
    assert.match(otherReport.submittedBy.phone, /\*\*/, "Phone number must be masked");
  });

  // ---------------------------------------------------------
  // 12. EXTERNAL INTEGRATION STATUS & SIMULATION TRANSPARENCY
  // ---------------------------------------------------------
  console.log("\n--- 12. Integration Status & Boundary Verification ---");

  await test("AI Service clearly declares simulation mode when GEMINI_API_KEY is not configured", async () => {
    const origKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    try {
      const triage = await analyzeReportTriage({
        category: "pothole",
        title: "Test AI diagnostic",
        description: "Nid-de-poule test.",
        district: "Centre-Ville",
        streetAddress: "Avenue de France",
        referenceNumber: "BLG-TEST-001",
      });

      assert.equal(triage.metadata.isSimulated, true, "Must flag simulation when key is missing");
      assert.equal(triage.metadata.configured, false);
      assert.equal(triage.metadata.provider, "Ballegh Deterministic Taxonomy Classifier");
    } finally {
      if (origKey) process.env.GEMINI_API_KEY = origKey;
    }
  });

  await test("Email Service clearly declares draft mode when SMTP/Resend is not configured", async () => {
    const sampleReport = await getReportById(createdReportId);
    assert.ok(sampleReport);

    const dispatch = await dispatchOfficialEmail({
      report: sampleReport!,
      agentName: "Ing. Samira Bouazizi",
      agentRole: "municipal_agent",
    });

    assert.equal(dispatch.isSimulated, true, "Must flag simulation when SMTP is not configured");
    assert.equal(dispatch.transportStatus, "PENDING_SMTP_CONFIG");
    assert.match(dispatch.notes, /Serveur SMTP non configuré/i);
  });

  console.log("\n--- 13. Supabase PostgreSQL Integration & CRUD Persistence ---");
  await test("Connects to real Supabase PostgreSQL and verifies migrations", async () => {
    process.env.DATABASE_URL = realDatabaseUrl;
    const inspection = await inspectDatabaseConnection();
    assert.equal(inspection.connected, true, "Must successfully connect to Supabase PostgreSQL: " + inspection.error);
    assert.ok(inspection.existingTables?.includes("reports"), "Table 'reports' must exist");
    assert.ok(inspection.existingTables?.includes("users"), "Table 'users' must exist");
    assert.ok(inspection.existingTables?.includes("municipal_services"), "Table 'municipal_services' must exist");
    assert.ok(inspection.existingTables?.includes("human_reviews"), "Table 'human_reviews' must exist");
    assert.ok(inspection.migrationsApplied && inspection.migrationsApplied.length > 0, "At least one migration must be recorded");
  });

  await test("Executes isolated report CRUD persistence and cleans up test record in Supabase", async () => {
    process.env.DATABASE_URL = realDatabaseUrl;
    const result = await testReportPersistence();
    assert.equal(result.success, true, "All persistence checks must pass: " + result.error);
    assert.equal(result.created, true, "Must successfully create record in Supabase");
    assert.equal(result.readBack, true, "Must successfully read back record from Supabase");
    assert.equal(result.updated, true, "Must successfully update record in Supabase");
    assert.equal(result.cleanedUp, true, "Must clean up test record from Supabase");
  });

  console.log("\n========================================================");
  console.log(` ALL ${passedTests}/${totalTests} AUDIT TESTS PASSED SUCCESSFULLY!`);
  console.log("========================================================\n");
}

runTestSuite().catch((err) => {
  console.error("Test Suite Failed:", err);
  process.exit(1);
});
