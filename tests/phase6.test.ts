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
// Isolate in-memory tests from mutating production database
delete process.env.DATABASE_URL;

import { createSessionToken, SESSION_COOKIE_NAME } from "../lib/auth/jwt";
import {
  analyzeReportTriage,
  geminiCivicAnalysisSchema,
  _setMockGeminiProvider,
  _resetMockGeminiProvider,
} from "../lib/services/aiService";
import {
  dispatchOfficialEmail,
  _setMockEmailTransport,
  _resetMockEmailTransport,
} from "../lib/services/emailService";
import { POST as registerHandler } from "../app/api/auth/register/route";
import { POST as loginHandler } from "../app/api/auth/login/route";
import { GET as meHandler } from "../app/api/auth/me/route";
import { POST as logoutHandler } from "../app/api/auth/logout/route";
import { POST as demoSwitchHandler } from "../app/api/auth/demo-switch/route";
import { POST as uploadPostHandler } from "../app/api/upload/route";
import { GET as reportsGetHandler, POST as reportsPostHandler } from "../app/api/reports/route";
import { GET as reportDetailGetHandler, PATCH as reportDetailPatchHandler } from "../app/api/reports/[id]/route";
import { GET as photoProxyGetHandler } from "../app/api/reports/[id]/photo/route";
import { GET as usersGetHandler, POST as usersPostHandler } from "../app/api/users/route";
import { migrateLegacyPhotos } from "../scripts/migrate-photos-to-storage";
import type { Report } from "../lib/types";

// Valid image binary fixture (JPEG magic bytes FF D8 FF)
const VALID_JPEG_BUFFER = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x60,
  0x00, 0x60, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
]);

function buildJsonRequest(url: string, method: string = "GET", body?: any, token?: string): Request {
  const headers = new Headers();
  if (body) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("cookie", `${SESSION_COOKIE_NAME}=${token}`);
  }

  return new Request(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

function buildMultipartUploadRequest(buffer: Buffer, fileName: string = "pothole.jpg", token?: string): Request {
  const formData = new FormData();
  const blob = new Blob([new Uint8Array(buffer)]);
  formData.append("file", blob, fileName);

  const headers = new Headers();
  if (token) {
    headers.set("cookie", `${SESSION_COOKIE_NAME}=${token}`);
  }

  return new Request("http://localhost:3000/api/upload", {
    method: "POST",
    headers,
    body: formData,
  });
}

function extractCookieToken(res: Response): string | null {
  const setCookie = res.headers.get("set-cookie");
  if (!setCookie) return null;
  const match = setCookie.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

async function runPhase6Tests() {
  console.log("\n========================================================");
  console.log(" BALLEGH AI — PHASE 6: FINALIZATION & PRODUCTION ASSURANCE");
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
  // SECTION 1: GEMINI AI INTEGRATION & SCHEMA VALIDATION
  // ---------------------------------------------------------
  console.log("--- 1. Gemini AI Integration, Schema & Fallback Safety ---");

  await test("Validates output adhering to Gemini civic triage JSON schema", async () => {
    const validGeminiOutput = {
      category: "pothole",
      confidenceScore: 0.94,
      estimatedSeverity: 2,
      severityRationaleFr: "Fissuration profonde constatée sur la chaussée.",
      severityRationaleAr: "تصدع عميق في مسار السير يتطلب التدخل السريع.",
      priorityScore: 78,
      priorityFactors: {
        baseSeverityWeight: 35,
        densityWeight: 25,
        sensitiveZoneProximity: true,
        agingWeight: 10,
      },
      duplicateDetection: {
        isLikelyDuplicate: false,
        similarityScore: 0.05,
        explanationFr: "Aucun doublon trouvé.",
        explanationAr: "لا يوجد تشابه.",
      },
    };

    const parsed = geminiCivicAnalysisSchema.safeParse(validGeminiOutput);
    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.equal(parsed.data.category, "pothole");
      assert.equal(parsed.data.estimatedSeverity, 2);
    }
  });

  await test("Rejects malformed Gemini output missing required fields", async () => {
    const malformedOutput = {
      category: "invalid_category",
      confidenceScore: 1.5, // Exceeds 1.0 max
    };
    const parsed = geminiCivicAnalysisSchema.safeParse(malformedOutput);
    assert.equal(parsed.success, false);
  });

  await test("Safely executes deterministic fallback when GEMINI_API_KEY is not configured", async () => {
    _resetMockGeminiProvider();
    const origKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    try {
      const result = await analyzeReportTriage({
        category: "flooding",
        title: "Inondation carrefour",
        description: "Eau accumulée bloquant la circulation.",
        district: "El Menzah",
        streetAddress: "Avenue Othman Ibn Affan",
        referenceNumber: "BLG-TEST-FALLBACK-01",
      });

      assert.equal(result.metadata.isSimulated, true);
      assert.equal(result.metadata.provider, "Ballegh Deterministic Taxonomy Classifier");
      assert.equal(result.predictedCategory, "flooding");
      assert.equal(result.estimatedSeverity, 3);
      assert.equal(result.suggestedServiceCode, "DAEP-TUNIS");
    } finally {
      if (origKey) process.env.GEMINI_API_KEY = origKey;
    }
  });

  await test("Executes genuine Gemini vision pipeline via mock provider without spending API credits", async () => {
    _setMockGeminiProvider(async (input) => {
      return {
        predictedCategory: input.category,
        confidenceScore: 0.97,
        estimatedSeverity: 3,
        severityRationale: {
          fr: "Diagnostic visuel Gemini : affaissement majeur de la structure routière.",
          ar: "تشخيص الذكاء الاصطناعي: هبوط حاد في البنية التحتية للطريق.",
        },
        priorityScore: 92,
        priorityFactors: {
          baseSeverityWeight: 40,
          densityWeight: 30,
          sensitiveZoneProximity: true,
          agingWeight: 10,
        },
        suggestedServiceCode: "DVRD-TUNIS",
        generatedEmailDraft: {
          recipientDepartment: "Direction de la Voirie",
          recipientEmail: "voirie@commune-tunis.gov.tn",
          subject: `[URGENT] ${input.referenceNumber} - ${input.district}`,
          body: input.description,
        },
        duplicateDetection: {
          isLikelyDuplicate: false,
          similarityScore: 0.02,
          relatedReportIds: [],
          explanation: { fr: "Aucun doublon.", ar: "لا يوجد تشابه." },
        },
        metadata: {
          isSimulated: false,
          provider: "Google Gemini Vision",
          model: "gemini-2.5-flash",
          configured: true,
        },
      };
    });

    try {
      const result = await analyzeReportTriage({
        category: "pothole",
        title: "Crevasse majeure",
        description: "Trou dangereux face à l'école primaire.",
        district: "Carthage",
        streetAddress: "Rue Hannibal",
        referenceNumber: "BLG-TEST-GEMINI-01",
      });

      assert.equal(result.metadata.isSimulated, false);
      assert.equal(result.metadata.provider, "Google Gemini Vision");
      assert.equal(result.metadata.model, "gemini-2.5-flash");
      assert.equal(result.priorityScore, 92);
      assert.equal(result.estimatedSeverity, 3);
    } finally {
      _resetMockGeminiProvider();
    }
  });

  // ---------------------------------------------------------
  // SECTION 2: OFFICIAL EMAIL GATING, IDEMPOTENCY & DISPATCH
  // ---------------------------------------------------------
  console.log("\n--- 2. Official Email Gating, Idempotency & Resend/SMTP Providers ---");

  const sampleReportForEmail: Report = {
    id: "rep-email-test-01",
    referenceNumber: "BLG-2026-TUN-777",
    title: { fr: "Câble électrique arraché", ar: "سلك كهربائي مقطوع" },
    description: { fr: "Danger immédiat sur le trottoir", ar: "خطر على الرصيف" },
    category: "lighting",
    status: "ai_analyzed", // NOT yet human_validated!
    urgency: "critical",
    officialEmailSent: false,
    resolutionConfirmedByCitizen: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    location: {
      governorate: "Tunis",
      municipality: "Commune de Tunis",
      district: "Bab Bhar",
      streetAddress: "Rue de Marseille, Tunis",
      latitude: 36.8,
      longitude: 10.18,
    },
    photos: [{ id: "ph-1", url: "/api/reports/rep-email-test-01/photo", uploadedAt: new Date().toISOString() }],
    submittedBy: { id: "usr_citizen_01", name: "Amine Triki", phone: "+216 98 000 111", isAnonymous: false },
    aiAnalysis: {
      predictedCategory: "lighting",
      confidenceScore: 0.95,
      estimatedSeverity: 3,
      severityRationale: { fr: "Câble au sol", ar: "سلك بالأرض" },
      priorityScore: 90,
      priorityFactors: { baseSeverityWeight: 35, densityWeight: 20, sensitiveZoneProximity: true, agingWeight: 10 },
      duplicateDetection: { isLikelyDuplicate: false, similarityScore: 0, relatedReportIds: [], explanation: { fr: "", ar: "" } },
      suggestedServiceCode: "DEP-ECL-TUNIS",
      generatedEmailDraft: {
        recipientDepartment: "Division Éclairage Public",
        recipientEmail: "eclairage.public@commune-tunis.gov.tn",
        subject: "[URGENCE] Câble arraché",
        body: "Intervention d'urgence demandée.",
      },
    },
    timeline: [],
  };

  await test("Strict Gating: Throws error if non-agent attempts email dispatch", async () => {
    await assert.rejects(
      async () => {
        await dispatchOfficialEmail({
          report: { ...sampleReportForEmail, status: "human_validated" },
          agentName: "Citoyen Non Habilité",
          agentRole: "citizen",
        });
      },
      { message: /Seul un agent municipal habilité/ }
    );
  });

  await test("Strict Gating: Throws error if report has not received human validation", async () => {
    await assert.rejects(
      async () => {
        await dispatchOfficialEmail({
          report: sampleReportForEmail, // status is ai_analyzed
          agentName: "Ing. Samira Trabelsi",
          agentRole: "municipal_agent",
        });
      },
      { message: /validation humaine préalable/ }
    );
  });

  await test("Validates recipient email address format", async () => {
    const invalidEmailReport = {
      ...sampleReportForEmail,
      status: "human_validated" as const,
      aiAnalysis: {
        ...sampleReportForEmail.aiAnalysis,
        generatedEmailDraft: {
          ...sampleReportForEmail.aiAnalysis.generatedEmailDraft,
          recipientEmail: "invalid-email-address",
        },
      },
    };

    await assert.rejects(
      async () => {
        await dispatchOfficialEmail({
          report: invalidEmailReport,
          agentName: "Ing. Samira Trabelsi",
          agentRole: "municipal_agent",
        });
      },
      { message: /Adresse de destination invalide/ }
    );
  });

  await test("Prevents duplicate email dispatch (Idempotency control)", async () => {
    _setMockEmailTransport(async () => ({ messageId: "msg-test-1" }));
    try {
      const alreadySentReport: Report = {
        ...sampleReportForEmail,
        status: "forwarded",
        officialEmailSent: true,
        officialEmailSentAt: new Date().toISOString(),
      };

      const dispatch = await dispatchOfficialEmail({
        report: alreadySentReport,
        agentName: "Ing. Samira Trabelsi",
        agentRole: "municipal_agent",
      });

      assert.equal(dispatch.success, false);
      assert.equal(dispatch.transportStatus, "DUPLICATE_BLOCKED");
      assert.ok(dispatch.notes.includes("déjà effectuée"));
    } finally {
      _resetMockEmailTransport();
    }
  });

  await test("Reports PENDING_SMTP_CONFIG simulation mode when SMTP credentials absent", async () => {
    const origResend = process.env.RESEND_API_KEY;
    const origSmtp = process.env.SMTP_HOST;
    delete process.env.RESEND_API_KEY;
    delete process.env.SMTP_HOST;
    _resetMockEmailTransport();

    try {
      const validatedReport: Report = {
        ...sampleReportForEmail,
        status: "human_validated",
      };

      const dispatch = await dispatchOfficialEmail({
        report: validatedReport,
        agentName: "Ing. Samira Trabelsi",
        agentRole: "municipal_agent",
      });

      assert.equal(dispatch.success, true);
      assert.equal(dispatch.isSimulated, true);
      assert.equal(dispatch.transportStatus, "PENDING_SMTP_CONFIG");
      assert.match(dispatch.notes, /Serveur SMTP non configuré/i);
    } finally {
      if (origResend) process.env.RESEND_API_KEY = origResend;
      if (origSmtp) process.env.SMTP_HOST = origSmtp;
    }
  });

  await test("Executes email dispatch via mock transport without sending real emails", async () => {
    _setMockEmailTransport(async ({ to, subject }) => {
      assert.ok(to.includes("@commune-tunis.gov.tn"));
      assert.ok(subject.length > 5);
      return { messageId: "msg_mock_verified_888" };
    });

    try {
      const validatedReport: Report = {
        ...sampleReportForEmail,
        status: "human_validated",
      };

      const dispatch = await dispatchOfficialEmail({
        report: validatedReport,
        agentName: "Ing. Samira Trabelsi",
        agentRole: "municipal_agent",
      });

      assert.equal(dispatch.success, true);
      assert.equal(dispatch.isSimulated, false);
      assert.equal(dispatch.transportStatus, "SENT");
      assert.equal(dispatch.messageId, "msg_mock_verified_888");
      assert.equal(dispatch.provider, "resend");
    } finally {
      _resetMockEmailTransport();
    }
  });

  // ---------------------------------------------------------
  // SECTION 3: END-TO-END APPLICATION JOURNEYS & RBAC
  // ---------------------------------------------------------
  console.log("\n--- 3. End-to-End User Journeys & Server-Side Security ---");

  const testCitizenEmail = `citizen.p6.${Date.now()}@ballegh-test.tn`;
  const testCitizenPassword = "SecureCitizenP6!";
  let testCitizenToken = "";
  let testCitizenId = "";

  await test("Journey 1: Citizen Registration, Login & Session Validation", async () => {
    // 1. Register
    const regReq = buildJsonRequest("http://localhost:3000/api/auth/register", "POST", {
      fullName: "Nour Ben Youssef",
      email: testCitizenEmail,
      phone: "+216 98 444 555",
      password: testCitizenPassword,
      district: "La Marsa",
    });
    const regRes = await registerHandler(regReq);
    assert.ok(regRes.status === 201 || regRes.status === 200, `Expected 201 or 200, got ${regRes.status}`);
    const regBody = await regRes.json();
    assert.equal(regBody.success, true);
    assert.equal(regBody.user.passwordHash, undefined, "passwordHash must never be exposed");
    testCitizenId = regBody.user.id;

    // 2. Login
    const loginReq = buildJsonRequest("http://localhost:3000/api/auth/login", "POST", {
      email: testCitizenEmail,
      password: testCitizenPassword,
    });
    const loginRes = await loginHandler(loginReq);
    assert.equal(loginRes.status, 200);
    testCitizenToken = extractCookieToken(loginRes) || "";
    assert.ok(testCitizenToken, "Login must set session token");

    // 3. GET /api/auth/me
    const meReq = buildJsonRequest("http://localhost:3000/api/auth/me", "GET", undefined, testCitizenToken);
    const meRes = await meHandler(meReq);
    assert.equal(meRes.status, 200);
    const meBody = await meRes.json();
    assert.equal(meBody.authenticated, true);
    assert.equal(meBody.user.email, testCitizenEmail);
    assert.equal(meBody.user.role, "citizen");

    // 4. Logout
    const logoutRes = await logoutHandler();
    assert.equal(logoutRes.status, 200);
    const setCookie = logoutRes.headers.get("set-cookie") || "";
    assert.ok(setCookie.includes("Max-Age=0") || setCookie.includes("expires="));
  });

  let createdReportId = "";

  await test("Journey 2: Citizen uploads real photo and creates report with location", async () => {
    // Upload image
    const uploadReq = buildMultipartUploadRequest(VALID_JPEG_BUFFER, "nid_de_poule.jpg", testCitizenToken);
    const uploadRes = await uploadPostHandler(uploadReq);
    assert.equal(uploadRes.status, 201);
    const uploadBody = await uploadRes.json();
    assert.equal(uploadBody.success, true);
    assert.ok(uploadBody.photo.storagePath);

    // Create report
    const createReq = buildJsonRequest(
      "http://localhost:3000/api/reports",
      "POST",
      {
        category: "pothole",
        title: "Nid-de-poule profond sur la chaussée",
        description: "Crevasse importante au niveau du virage.",
        district: "La Marsa",
        streetAddress: "Avenue Habib Bourguiba, La Marsa",
        photoStorage: uploadBody.photo,
      },
      testCitizenToken
    );
    const createRes = await reportsPostHandler(createReq);
    assert.equal(createRes.status, 201);
    const createBody = await createRes.json();
    assert.equal(createBody.success, true);
    assert.ok(createBody.report.id);
    createdReportId = createBody.report.id;

    // Check proxy url
    assert.equal(createBody.report.photos[0].url, `/api/reports/${createdReportId}/photo`);
    // Security check: storagePath must not be leaked
    assert.equal(createBody.report.photos[0].storagePath, undefined);
  });

  await test("Journey 3: Reloads report and verifies persistence of data, timeline & private image", async () => {
    const detailReq = buildJsonRequest(
      `http://localhost:3000/api/reports/${createdReportId}`,
      "GET",
      undefined,
      testCitizenToken
    );
    const detailRes = await reportDetailGetHandler(detailReq, {
      params: Promise.resolve({ id: createdReportId }),
    });
    assert.equal(detailRes.status, 200);
    const detailBody = await detailRes.json();
    assert.equal(detailBody.report.id, createdReportId);
    assert.equal(detailBody.report.category, "pothole");
    assert.ok(detailBody.report.timeline.length >= 2);

    // Verify private image access for author
    const photoReq = buildJsonRequest(
      `http://localhost:3000/api/reports/${createdReportId}/photo`,
      "GET",
      undefined,
      testCitizenToken
    );
    const photoRes = await photoProxyGetHandler(photoReq, {
      params: Promise.resolve({ id: createdReportId }),
    });
    assert.equal(photoRes.status, 200);
    assert.equal(photoRes.headers.get("Content-Type"), "image/jpeg");
    assert.equal(photoRes.headers.get("Cache-Control"), "private, max-age=3600");
  });

  const intruderCitizenToken = await createSessionToken({
    userId: "usr_citizen_intruder_p6",
    email: "intruder.p6@ballegh.tn",
    fullName: "Citoyen Non Propriétaire",
    phone: "+216 99 888 777",
    role: "citizen",
  });

  await test("Journey 4: Privacy & RBAC enforcement against unauthorized citizen", async () => {
    // 1. Intruder viewing report detail receives masked phone number
    const detailReq = buildJsonRequest(
      `http://localhost:3000/api/reports/${createdReportId}`,
      "GET",
      undefined,
      intruderCitizenToken
    );
    const detailRes = await reportDetailGetHandler(detailReq, {
      params: Promise.resolve({ id: createdReportId }),
    });
    assert.equal(detailRes.status, 200);
    const detailBody = await detailRes.json();
    assert.equal(detailBody.report.submittedBy.phone, "+216 ** *** ***");

    // 2. Intruder attempting to view private photo receives 403 Forbidden
    const photoReq = buildJsonRequest(
      `http://localhost:3000/api/reports/${createdReportId}/photo`,
      "GET",
      undefined,
      intruderCitizenToken
    );
    const photoRes = await photoProxyGetHandler(photoReq, {
      params: Promise.resolve({ id: createdReportId }),
    });
    assert.equal(photoRes.status, 403);
    const photoBody = await photoRes.json();
    assert.ok(photoBody.error.includes("Accès refusé"));

    // 3. Intruder attempting to confirm resolution receives 403 Forbidden
    const confirmReq = buildJsonRequest(
      `http://localhost:3000/api/reports/${createdReportId}`,
      "PATCH",
      { action: "confirm_resolution" },
      intruderCitizenToken
    );
    const confirmRes = await reportDetailPatchHandler(confirmReq, {
      params: Promise.resolve({ id: createdReportId }),
    });
    assert.equal(confirmRes.status, 403);
  });

  const municipalAgentToken = await createSessionToken({
    userId: "usr_agent_p6",
    email: "agent.p6@commune-tunis.gov.tn",
    fullName: "Ing. Samira Trabelsi",
    phone: "+216 71 345 678",
    role: "municipal_agent",
    district: "Direction de la Voirie et Travaux",
    organization: "Commune de Tunis",
  });

  await test("Journey 5: Municipal agent reviews report, modifies AI recommendation and validates", async () => {
    // Agent can inspect private photo
    const photoReq = buildJsonRequest(
      `http://localhost:3000/api/reports/${createdReportId}/photo`,
      "GET",
      undefined,
      municipalAgentToken
    );
    const photoRes = await photoProxyGetHandler(photoReq, {
      params: Promise.resolve({ id: createdReportId }),
    });
    assert.equal(photoRes.status, 200);

    // Agent modifies recommendations and validates
    const patchReq = buildJsonRequest(
      `http://localhost:3000/api/reports/${createdReportId}`,
      "PATCH",
      {
        action: "human_review",
        decision: "modified",
        notes: "Proximité ligne de bus. Sévérité augmentée à 3.",
        modifications: {
          severity: 3,
          priority: 95,
        },
      },
      municipalAgentToken
    );
    const patchRes = await reportDetailPatchHandler(patchReq, {
      params: Promise.resolve({ id: createdReportId }),
    });
    assert.equal(patchRes.status, 200);
    const patchBody = await patchRes.json();
    assert.equal(patchBody.report.status, "human_validated");
    assert.equal(patchBody.report.humanReview.adjustedSeverity, 3);
    assert.equal(patchBody.report.humanReview.adjustedPriority, 95);
  });

  await test("Journey 6: Municipal agent advances status through official email, in_progress, and resolved", async () => {
    // 1. Send official email
    const emailReq = buildJsonRequest(
      `http://localhost:3000/api/reports/${createdReportId}`,
      "PATCH",
      { action: "send_email" },
      municipalAgentToken
    );
    const emailRes = await reportDetailPatchHandler(emailReq, {
      params: Promise.resolve({ id: createdReportId }),
    });
    assert.equal(emailRes.status, 200);
    const emailBody = await emailRes.json();
    assert.equal(emailBody.report.status, "forwarded");
    assert.equal(emailBody.report.officialEmailSent, true);

    // 2. Advance to in_progress
    const inProgReq = buildJsonRequest(
      `http://localhost:3000/api/reports/${createdReportId}`,
      "PATCH",
      {
        action: "advance_status",
        status: "in_progress",
        comment: { fr: "Équipe d'enrobage sur place", ar: "فريق الأشغال متواجد بالميدان" },
      },
      municipalAgentToken
    );
    const inProgRes = await reportDetailPatchHandler(inProgReq, {
      params: Promise.resolve({ id: createdReportId }),
    });
    assert.equal(inProgRes.status, 200);
    const inProgBody = await inProgRes.json();
    assert.equal(inProgBody.report.status, "in_progress");

    // 3. Advance to resolved
    const resReq = buildJsonRequest(
      `http://localhost:3000/api/reports/${createdReportId}`,
      "PATCH",
      {
        action: "advance_status",
        status: "resolved",
        comment: { fr: "Rebouchage terminé et compacté", ar: "تم ردم الحفرة وتعبيد الطريق بنجاح" },
      },
      municipalAgentToken
    );
    const resRes = await reportDetailPatchHandler(resReq, {
      params: Promise.resolve({ id: createdReportId }),
    });
    assert.equal(resRes.status, 200);
    const resBody = await resRes.json();
    assert.equal(resBody.report.status, "resolved");
  });

  await test("Journey 7: Author citizen confirms resolution on the ground", async () => {
    const confirmReq = buildJsonRequest(
      `http://localhost:3000/api/reports/${createdReportId}`,
      "PATCH",
      { action: "confirm_resolution" },
      testCitizenToken
    );
    const confirmRes = await reportDetailPatchHandler(confirmReq, {
      params: Promise.resolve({ id: createdReportId }),
    });
    assert.equal(confirmRes.status, 200);
    const confirmBody = await confirmRes.json();
    assert.equal(confirmBody.report.resolutionConfirmedByCitizen, true);
  });

  const adminToken = await createSessionToken({
    userId: "usr_admin_p6",
    email: "admin.p6@commune-tunis.gov.tn",
    fullName: "Karim Mansour",
    phone: "+216 71 890 123",
    role: "admin",
    organization: "DSI Ville de Tunis",
  });

  await test("Journey 8: Administrator manages users and creates new municipal accounts", async () => {
    // List users
    const listReq = buildJsonRequest("http://localhost:3000/api/users", "GET", undefined, adminToken);
    const listRes = await usersGetHandler(listReq);
    assert.equal(listRes.status, 200);
    const listBody = await listRes.json();
    assert.ok(Array.isArray(listBody.users));

    // Create new agent
    const newAgentEmail = `agent.new.${Date.now()}@commune-tunis.gov.tn`;
    const createAgentReq = buildJsonRequest(
      "http://localhost:3000/api/users",
      "POST",
      {
        fullName: "Ing. Mehdi Ben Amor",
        email: newAgentEmail,
        phone: "+216 71 555 666",
        password: "AgentSecure2026!",
        role: "municipal_agent",
        district: "Bab Souika",
        organization: "Voirie Municipale",
      },
      adminToken
    );
    const createAgentRes = await usersPostHandler(createAgentReq);
    assert.equal(createAgentRes.status, 201);
    const createAgentBody = await createAgentRes.json();
    assert.equal(createAgentBody.user.email, newAgentEmail);
    assert.equal(createAgentBody.user.passwordHash, undefined);
  });

  await test("Journey 9: Production Security Defense: Demo role switch is blocked in production", async () => {
    const origEnv = process.env.NODE_ENV;
    const origAllow = process.env.ALLOW_DEMO_SWITCH;

    try {
      (process.env as any).NODE_ENV = "production";
      delete process.env.ALLOW_DEMO_SWITCH;

      const req = buildJsonRequest("http://localhost:3000/api/auth/demo-switch", "POST", { role: "admin" });
      const res = await demoSwitchHandler(req);
      assert.equal(res.status, 403);
      const data = await res.json();
      assert.equal(data.code, "DEMO_SWITCH_FORBIDDEN");
    } finally {
      (process.env as any).NODE_ENV = origEnv;
      if (origAllow) process.env.ALLOW_DEMO_SWITCH = origAllow;
    }
  });

  // ---------------------------------------------------------
  // SECTION 4: STORAGE AUDIT & MIGRATION TOOLING
  // ---------------------------------------------------------
  console.log("\n--- 4. Supabase Storage Migration Tooling Audit ---");

  await test("Storage migration script dry-run executes cleanly with zero errors", async () => {
    const summary = await migrateLegacyPhotos({ dryRun: true });
    assert.ok(typeof summary.scanned === "number");
    assert.equal(summary.errors, 0);
  });

  // ---------------------------------------------------------
  // SECTION 5: LIVE SUPABASE POSTGRESQL VERIFICATION
  // ---------------------------------------------------------
  console.log("\n--- 5. Live Supabase PostgreSQL Pooler Health Check ---");

  if (realDatabaseUrl) {
    const { resolveSupabaseUrl } = await import("../scripts/test-db-connection");
    const activeUrl = resolveSupabaseUrl(realDatabaseUrl, true);
    const { PrismaClient } = await import("@prisma/client");
    const livePrisma = new PrismaClient({
      datasources: { db: { url: activeUrl } },
    });

    await test("Supabase PostgreSQL responds to query and contains both migrations", async () => {
      const services = await livePrisma.municipalService.findMany();
      assert.equal(services.length, 3);
      const migrations = await livePrisma.$queryRaw<Array<{ migration_name: string }>>`
        SELECT migration_name FROM "_prisma_migrations" ORDER BY finished_at ASC
      `;
      assert.ok(migrations.length >= 2, "Must contain at least 2 migrations");
      await livePrisma.$disconnect();
    });
  }

  console.log("\n========================================================");
  console.log(` ALL ${passedTests}/${totalTests} PHASE 6 FINALIZATION TESTS PASSED!`);
  console.log("========================================================\n");
}

runPhase6Tests().catch((err) => {
  console.error("\n[PHASE 6 TEST RUNNER FATAL ERROR]:", err);
  process.exit(1);
});
