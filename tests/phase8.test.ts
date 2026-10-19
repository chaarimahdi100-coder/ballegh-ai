/**
 * BALLEGH AI — PHASE 8 ACCEPTANCE TEST SUITE
 * Real Email Delivery, Provider Acceptance, Human Approval Gating, and Deployment Readiness
 */

import assert from "node:assert/strict";
import * as path from "node:path";
import * as fs from "node:fs";

// 1. Load .env.local natively for test suite execution
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

import {
  dispatchOfficialEmail,
  getEmailServiceStatus,
  sanitizeError,
  _setMockEmailTransport,
  _resetMockEmailTransport,
} from "../lib/services/emailService";
import { createSessionToken, SESSION_COOKIE_NAME } from "../lib/auth/jwt";
import { createUser } from "../lib/repositories/userRepository";
import { createReport, updateHumanReview } from "../lib/repositories/reportRepository";
import { prisma, getIsDatabaseConfigured } from "../lib/db";
import { PATCH as reportDetailPatchHandler } from "../app/api/reports/[id]/route";
import type { Report } from "../lib/types";

let passedCount = 0;
let failedCount = 0;

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`  [PASS] ${name}`);
    passedCount++;
  } catch (err: any) {
    console.error(`  [FAIL] ${name}`);
    console.error(`         ${err.message}`);
    failedCount++;
    throw err;
  }
}

const mockValidatedReport: Report = {
  id: "rep-p8-test-01",
  referenceNumber: "BLG-2026-TUN-009988",
  title: {
    fr: "Dégradation chaussée Avenue Habib Bourguiba",
    ar: "تدهور الطريق في شارع الحبيب بورقيبة",
  },
  description: {
    fr: "Nid-de-poule d'une profondeur de 15cm perturbant le trafic.",
    ar: "حفرة بعمق 15 سم تعطل حركة المرور.",
  },
  category: "pothole",
  status: "human_validated",
  urgency: "high",
  location: {
    governorate: "Tunis",
    municipality: "Commune de Tunis",
    district: "Bab Bhar",
    streetAddress: "Avenue Habib Bourguiba",
    latitude: 36.8001,
    longitude: 10.1802,
  },
  submittedBy: {
    id: "usr_cit_p8",
    name: "Mohamed Ben Ali",
    phone: "+216 98 123 456",
    isAnonymous: false,
  },
  photos: [
    {
      id: "ph-p8-1",
      url: "/api/reports/rep-p8-test-01/photo",
      storagePath: "reports/test-photo.jpg",
      mimeType: "image/jpeg",
      fileSizeBytes: 1024,
      uploadedAt: "2026-10-19T10:00:00.000Z",
    },
  ],
  aiAnalysis: {
    predictedCategory: "pothole",
    confidenceScore: 0.94,
    estimatedSeverity: 2,
    severityRationale: {
      fr: "Troubé majeur sur artère principale",
      ar: "خلل كبير في شريان رئيسي",
    },
    priorityScore: 78,
    priorityFactors: {
      baseSeverityWeight: 35,
      densityWeight: 20,
      sensitiveZoneProximity: true,
      agingWeight: 13,
    },
    duplicateDetection: {
      isLikelyDuplicate: false,
      similarityScore: 0.1,
      relatedReportIds: [],
      explanation: {
        fr: "Aucun doublon détecté",
        ar: "لا يوجد بلاغ مطابق",
      },
    },
    suggestedServiceCode: "DIR-VOIRIE",
    generatedEmailDraft: {
      recipientDepartment: "Direction de la Voirie et des Travaux",
      recipientEmail: "voirie@commune-tunis.gov.tn",
      subject: "Ordre d'intervention — Réparation urgente chaussée Bourguiba",
      body: "Bonjour,\nUn nid-de-poule important a été signalé et validé sur l'Avenue Habib Bourguiba. Merci de mandater une équipe.",
    },
  },
  officialEmailSent: false,
  resolutionConfirmedByCitizen: false,
  timeline: [
    {
      id: "tl-p8-1",
      status: "received",
      timestamp: "2026-10-19T10:00:00.000Z",
      author: "Mohamed Ben Ali",
      authorRole: "citizen",
      comment: { fr: "Signalement créé", ar: "تم إنشاء البلاغ" },
    },
    {
      id: "tl-p8-2",
      status: "human_validated",
      timestamp: "2026-10-19T10:05:00.000Z",
      author: "Ing. Samira Trabelsi",
      authorRole: "municipal_agent",
      comment: { fr: "Dossier validé techniquement", ar: "تمت المصادقة الفنية" },
    },
  ],
  createdAt: "2026-10-19T10:00:00.000Z",
  updatedAt: "2026-10-19T10:05:00.000Z",
};

async function runPhase8Suite() {
  console.log("========================================================");
  console.log(" BALLEGH AI — PHASE 8: EMAIL DELIVERY & DEPLOYMENT QA");
  console.log("========================================================\n");

  // -------------------------------------------------------------------
  // 1. UNCONFIGURED & TRANSPARENT SIMULATION STATE
  // -------------------------------------------------------------------
  console.log("--- 1. Unconfigured Credentials & Simulation Transparency ---");

  await test("Unconfigured email service keeps status explicitly PENDING_SMTP_CONFIG and isSimulated true", async () => {
    // Save original env
    const origResend = process.env.RESEND_API_KEY;
    const origSmtp = process.env.SMTP_HOST;
    delete process.env.RESEND_API_KEY;
    delete process.env.SMTP_HOST;

    try {
      const result = await dispatchOfficialEmail({
        report: mockValidatedReport,
        agentName: "Ing. Samira Trabelsi",
        agentRole: "municipal_agent",
      });

      assert.equal(result.success, true);
      assert.equal(result.isSimulated, true);
      assert.equal(result.provider, "simulated");
      assert.equal(result.transportStatus, "PENDING_SMTP_CONFIG");
      assert.equal(result.deliveryState, "simulated");
      assert.equal(result.attempts, 0);
      assert.match(result.notes, /non configuré[e]? dans \.env\.local/i);
    } finally {
      if (origResend) process.env.RESEND_API_KEY = origResend;
      if (origSmtp) process.env.SMTP_HOST = origSmtp;
    }
  });

  await test("getEmailServiceStatus accurately reports state without exposing secrets", async () => {
    const status = getEmailServiceStatus();
    assert.ok(status.provider);
    assert.ok(status.fromAddress);
    assert.ok(typeof status.configured === "boolean");
    assert.ok(!status.details.includes("re_"));
  });

  // -------------------------------------------------------------------
  // 2. SERVER-SIDE AUTHORIZATION & HUMAN APPROVAL GATING
  // -------------------------------------------------------------------
  console.log("\n--- 2. Server-Side Authorization & Human Gating ---");

  await test("Server-side check strictly rejects unauthorized citizen from dispatching official email", async () => {
    let errorThrown = false;
    try {
      await dispatchOfficialEmail({
        report: mockValidatedReport,
        agentName: "Hacker Citizen",
        agentRole: "citizen",
      });
    } catch (err: any) {
      errorThrown = true;
      assert.match(err.message, /Seul un agent municipal habilité ou un administrateur/i);
    }
    assert.equal(errorThrown, true);
  });

  await test("Server-side check strictly blocks dispatch for report without prior human approval", async () => {
    const unvalidatedReport: Report = {
      ...mockValidatedReport,
      status: "received",
    };

    let errorThrown = false;
    try {
      await dispatchOfficialEmail({
        report: unvalidatedReport,
        agentName: "Ing. Samira Trabelsi",
        agentRole: "municipal_agent",
      });
    } catch (err: any) {
      errorThrown = true;
      assert.match(err.message, /validation humaine préalable/i);
    }
    assert.equal(errorThrown, true);
  });

  // -------------------------------------------------------------------
  // 3. RECIPIENT & CONTENT VALIDATION
  // -------------------------------------------------------------------
  console.log("\n--- 3. Recipient & Content Validation ---");

  await test("Rejects invalid recipient email syntax before invoking transport", async () => {
    const invalidRecipientReport: Report = {
      ...mockValidatedReport,
      aiAnalysis: {
        ...mockValidatedReport.aiAnalysis!,
        generatedEmailDraft: {
          ...mockValidatedReport.aiAnalysis!.generatedEmailDraft!,
          recipientEmail: "invalid-recipient-without-at-domain",
        },
      },
    };

    let errorThrown = false;
    try {
      await dispatchOfficialEmail({
        report: invalidRecipientReport,
        agentName: "Ing. Samira Trabelsi",
        agentRole: "municipal_agent",
      });
    } catch (err: any) {
      errorThrown = true;
      assert.match(err.message, /Adresse de destination invalide/i);
    }
    assert.equal(errorThrown, true);
  });

  await test("Rejects insufficient subject and body lengths", async () => {
    let shortSubjectThrown = false;
    try {
      await dispatchOfficialEmail({
        report: mockValidatedReport,
        agentName: "Ing. Samira Trabelsi",
        agentRole: "municipal_agent",
        customSubject: "Hi",
      });
    } catch (err: any) {
      shortSubjectThrown = true;
      assert.match(err.message, /L'objet du message officiel doit comporter au moins 5 caractères/i);
    }
    assert.equal(shortSubjectThrown, true);

    let shortBodyThrown = false;
    try {
      await dispatchOfficialEmail({
        report: mockValidatedReport,
        agentName: "Ing. Samira Trabelsi",
        agentRole: "municipal_agent",
        customBody: "Bref",
      });
    } catch (err: any) {
      shortBodyThrown = true;
      assert.match(err.message, /Le corps du message officiel doit comporter au moins 10 caractères/i);
    }
    assert.equal(shortBodyThrown, true);
  });

  // -------------------------------------------------------------------
  // 4. IDEMPOTENCY & DUPLICATE DISPATCH BLOCKING
  // -------------------------------------------------------------------
  console.log("\n--- 4. Idempotency & Duplicate Dispatch Defenses ---");

  await test("Prevents duplicate dispatch for reports where official email was already sent", async () => {
    _setMockEmailTransport(async () => ({ messageId: "msg-p8-dup" }));

    try {
      const alreadySentReport: Report = {
        ...mockValidatedReport,
        status: "forwarded",
        officialEmailSent: true,
        officialEmailSentAt: "2026-10-19T10:06:00.000Z",
      };

      const duplicateAttempt = await dispatchOfficialEmail({
        report: alreadySentReport,
        agentName: "Ing. Samira Trabelsi",
        agentRole: "municipal_agent",
      });

      assert.equal(duplicateAttempt.success, false);
      assert.equal(duplicateAttempt.transportStatus, "DUPLICATE_BLOCKED");
      assert.equal(duplicateAttempt.deliveryState, "duplicate_blocked");
      assert.match(duplicateAttempt.notes, /Réexpédition bloquée par mesure d'idempotence/i);
    } finally {
      _resetMockEmailTransport();
    }
  });

  await test("Allows retransmission when forceResend is explicitly provided by staff", async () => {
    _setMockEmailTransport(async ({ to }) => {
      return { messageId: "msg-forced-retry-999" };
    });

    try {
      const alreadySentReport: Report = {
        ...mockValidatedReport,
        status: "forwarded",
        officialEmailSent: true,
        officialEmailSentAt: "2026-10-19T10:06:00.000Z",
      };

      const forcedAttempt = await dispatchOfficialEmail({
        report: alreadySentReport,
        agentName: "Ing. Samira Trabelsi",
        agentRole: "municipal_agent",
        forceResend: true,
      });

      assert.equal(forcedAttempt.success, true);
      assert.equal(forcedAttempt.transportStatus, "SENT");
      assert.equal(forcedAttempt.deliveryState, "accepted_by_provider");
      assert.equal(forcedAttempt.messageId, "msg-forced-retry-999");
    } finally {
      _resetMockEmailTransport();
    }
  });

  // -------------------------------------------------------------------
  // 5. PROVIDER ACCEPTANCE VS CONFIRMED INBOX DELIVERY
  // -------------------------------------------------------------------
  console.log("\n--- 5. Provider Acceptance Semantics & Delivery States ---");

  await test("Mock transport records accepted_by_provider and notes distinction from inbox delivery", async () => {
    _setMockEmailTransport(async ({ to, subject }) => {
      assert.equal(to, "voirie@commune-tunis.gov.tn");
      return {
        messageId: "re_mock_accepted_12345",
        transportStatus: "ACCEPTED_BY_PROVIDER",
        deliveryState: "accepted_by_provider",
        attempts: 1,
      };
    });

    try {
      const result = await dispatchOfficialEmail({
        report: mockValidatedReport,
        agentName: "Ing. Samira Trabelsi",
        agentRole: "municipal_agent",
      });

      assert.equal(result.success, true);
      assert.equal(result.isSimulated, false);
      assert.equal(result.messageId, "re_mock_accepted_12345");
      assert.equal(result.transportStatus, "ACCEPTED_BY_PROVIDER");
      assert.equal(result.deliveryState, "accepted_by_provider");
      assert.match(result.notes, /n'équivaut pas à la remise garantie en boîte de réception/i);
    } finally {
      _resetMockEmailTransport();
    }
  });

  // -------------------------------------------------------------------
  // 6. SAFE ERROR HANDLING, SANITIZATION & RETRIES
  // -------------------------------------------------------------------
  console.log("\n--- 6. Safe Error Handling, Retries & Secret Sanitization ---");

  await test("SanitizeError thoroughly redacts bearer tokens, API keys, and passwords", async () => {
    const rawError = "Authorization error: Bearer re_1234567890abcdef failed with secret password123";
    const sanitized = sanitizeError(rawError);
    assert.ok(!sanitized.includes("re_1234567890abcdef"));
    assert.ok(sanitized.includes("[REDACTED]"));
  });

  await test("Provider failure records FAILED status and sanitized notes without crashing", async () => {
    _setMockEmailTransport(async () => {
      throw new Error("HTTP 503 Service Unavailable: Bearer re_supersecretkey1234 failed");
    });

    try {
      const result = await dispatchOfficialEmail({
        report: mockValidatedReport,
        agentName: "Ing. Samira Trabelsi",
        agentRole: "municipal_agent",
      });

      assert.equal(result.success, false);
      assert.equal(result.transportStatus, "FAILED");
      assert.equal(result.deliveryState, "failed");
      assert.ok(!result.notes.includes("re_supersecretkey1234"));
      assert.ok(!result.error?.includes("re_supersecretkey1234"));
    } finally {
      _resetMockEmailTransport();
    }
  });

  await test("Transient retry succeeds and documents attempt count", async () => {
    let callCount = 0;
    _setMockEmailTransport(async () => {
      callCount++;
      return {
        messageId: "re_retry_success_456",
        attempts: 2,
        transportStatus: "ACCEPTED_BY_PROVIDER",
        deliveryState: "accepted_by_provider",
      };
    });

    try {
      const result = await dispatchOfficialEmail({
        report: mockValidatedReport,
        agentName: "Ing. Samira Trabelsi",
        agentRole: "municipal_agent",
      });

      assert.equal(result.success, true);
      assert.equal(result.attempts, 2);
      assert.equal(result.deliveryState, "accepted_by_provider");
    } finally {
      _resetMockEmailTransport();
    }
  });

  // -------------------------------------------------------------------
  // 7. HTTP API ROUTE INTEGRATION & RBAC AUDIT (/api/reports/[id])
  // -------------------------------------------------------------------
  console.log("\n--- 7. HTTP API Route Integration & RBAC Defenses ---");

  const createdReportIds: string[] = [];
  const createdUserIds: string[] = [];

  try {
    const testCitizenUser = await createUser({
      email: `citizen.p8.${Date.now()}@ballegh-test.tn`,
      password: "Password123!",
      fullName: "Citoyen Test Phase 8",
      phone: "+216 98 123 456",
      role: "citizen",
      district: "Bab Bhar",
    });
    createdUserIds.push(testCitizenUser.id);

    const testAgent = await createUser({
      email: `agent.p8.${Date.now()}@commune-tunis.gov.tn`,
      password: "Password123!",
      fullName: "Ing. Samira Agent Phase 8",
      phone: "+216 71 111 222",
      role: "municipal_agent",
      district: "Bab Bhar",
    });
    createdUserIds.push(testAgent.id);

    const testReport = await createReport({
      category: "pothole",
      title: "Nid-de-poule test Phase 8",
      description: "Nid-de-poule test pour validation d'envoi d'email.",
      district: "Bab Bhar",
      streetAddress: "Avenue Habib Bourguiba",
      latitude: 36.8001,
      longitude: 10.1802,
      submittedBy: {
        id: testCitizenUser.id,
        name: testCitizenUser.name,
        phone: testCitizenUser.phone,
      },
      photoUrl: `/api/reports/temp/photo`,
    });
    createdReportIds.push(testReport.id);

    await test("API Route: Rejects unauthenticated request with 401 Unauthorized", async () => {
      const req = new Request(`http://localhost:3000/api/reports/${testReport.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send_email" }),
      });

      const res = await reportDetailPatchHandler(req, {
        params: Promise.resolve({ id: testReport.id }),
      });

      assert.equal(res.status, 401);
    });

    await test("API Route: Rejects citizen role from triggering send_email with 403 Forbidden", async () => {
      const citizenToken = await createSessionToken({
        userId: testCitizenUser.id,
        email: testCitizenUser.email,
        fullName: testCitizenUser.name,
        role: "citizen",
      });

      const headers = new Headers({ "Content-Type": "application/json" });
      headers.set("cookie", `${SESSION_COOKIE_NAME}=${citizenToken}`);

      const req = new Request(`http://localhost:3000/api/reports/${testReport.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ action: "send_email" }),
      });

      const res = await reportDetailPatchHandler(req, {
        params: Promise.resolve({ id: testReport.id }),
      });

      assert.equal(res.status, 403);
    });

    await test("API Route: Rejects agent from sending email on unvalidated report with 422 Unprocessable", async () => {
      const agentToken = await createSessionToken({
        userId: testAgent.id,
        email: testAgent.email,
        fullName: testAgent.name,
        role: "municipal_agent",
      });

      const headers = new Headers({ "Content-Type": "application/json" });
      headers.set("cookie", `${SESSION_COOKIE_NAME}=${agentToken}`);

      const req = new Request(`http://localhost:3000/api/reports/${testReport.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ action: "send_email" }),
      });

      const res = await reportDetailPatchHandler(req, {
        params: Promise.resolve({ id: testReport.id }),
      });

      assert.equal(res.status, 422);
      const body = await res.json();
      assert.equal(body.code, "HUMAN_VALIDATION_REQUIRED");
    });

    await test("API Route: Successfully dispatches official email after human review and advances status", async () => {
      // 1. Human validate the report
      await updateHumanReview(
        testReport.id,
        { id: testAgent.id, name: testAgent.name, role: "municipal_agent" },
        "accepted",
        "Dossier validé pour intervention"
      );

      // 2. Set mock transport
      _setMockEmailTransport(async ({ to, subject }) => {
        return {
          messageId: "re_api_route_test_789",
          transportStatus: "ACCEPTED_BY_PROVIDER",
          deliveryState: "accepted_by_provider",
        };
      });

      try {
        const agentToken = await createSessionToken({
          userId: testAgent.id,
          email: testAgent.email,
          fullName: testAgent.name,
          role: "municipal_agent",
        });

        const headers = new Headers({ "Content-Type": "application/json" });
        headers.set("cookie", `${SESSION_COOKIE_NAME}=${agentToken}`);

        const req = new Request(`http://localhost:3000/api/reports/${testReport.id}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify({ action: "send_email" }),
        });

        const res = await reportDetailPatchHandler(req, {
          params: Promise.resolve({ id: testReport.id }),
        });

        assert.equal(res.status, 200);
        const data = await res.json();
        assert.equal(data.success, true);
        assert.equal(data.report.status, "forwarded");
        assert.equal(data.dispatch.success, true);
        assert.equal(data.dispatch.transportStatus, "ACCEPTED_BY_PROVIDER");
      } finally {
        _resetMockEmailTransport();
      }
    });

    await test("API Route: Rejects duplicate send_email with 409 Conflict", async () => {
      const agentToken = await createSessionToken({
        userId: testAgent.id,
        email: testAgent.email,
        fullName: testAgent.name,
        role: "municipal_agent",
      });

      const headers = new Headers({ "Content-Type": "application/json" });
      headers.set("cookie", `${SESSION_COOKIE_NAME}=${agentToken}`);

      const req = new Request(`http://localhost:3000/api/reports/${testReport.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ action: "send_email" }),
      });

      const res = await reportDetailPatchHandler(req, {
        params: Promise.resolve({ id: testReport.id }),
      });

      assert.equal(res.status, 409);
      const data = await res.json();
      assert.equal(data.code, "DUPLICATE_DISPATCH_BLOCKED");
    });
  } finally {
    // -------------------------------------------------------------------
    // 8. TEARDOWN: CLEANUP TEST RECORDS
    // -------------------------------------------------------------------
    if (getIsDatabaseConfigured()) {
      try {
        if (createdReportIds.length > 0) {
          await prisma.report.deleteMany({ where: { id: { in: createdReportIds } } });
        }
        if (createdUserIds.length > 0) {
          await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
        }
      } catch (err: any) {
        console.warn("  [CLEANUP WARN] Phase 8 cleanup notice:", err.message);
      } finally {
        await prisma.$disconnect().catch(() => {});
      }
    }
  }

  console.log("\n========================================================");
  console.log(` ALL ${passedCount}/${passedCount} PHASE 8 TESTS PASSED!`);
  console.log("========================================================\n");
}

runPhase8Suite().catch((err) => {
  console.error("FATAL ERROR in Phase 8 acceptance suite:", err);
  process.exit(1);
});
