import assert from "node:assert/strict";
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
import { createSessionToken, verifySessionToken } from "../lib/auth/jwt";

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
  await test("Generates signed JWT session token for citizen", async () => {
    citizenToken = await createSessionToken({
      userId: "usr_citizen_test",
      email: "citoyen@tunis.tn",
      fullName: "Yassine Test",
      role: "citizen",
      district: "Centre-Ville",
    });
    assert.ok(citizenToken.length > 20, "JWT token string should be non-empty");
  });

  await test("Verifies and decodes valid JWT token", async () => {
    const payload = await verifySessionToken(citizenToken);
    assert.ok(payload, "Payload should be decoded");
    assert.equal(payload?.userId, "usr_citizen_test");
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

  console.log("\n========================================================");
  console.log(` ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
  console.log("========================================================\n");
}

runTestSuite().catch((err) => {
  console.error("Test Suite Failed:", err);
  process.exit(1);
});
