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

import { createSessionToken, verifySessionToken, SESSION_COOKIE_NAME } from "../lib/auth/jwt";
import { POST as registerHandler } from "../app/api/auth/register/route";
import { POST as loginHandler } from "../app/api/auth/login/route";
import { GET as meHandler } from "../app/api/auth/me/route";
import { POST as demoSwitchHandler } from "../app/api/auth/demo-switch/route";
import { GET as reportsGetHandler, POST as reportsPostHandler } from "../app/api/reports/route";
import { GET as reportDetailGetHandler, PATCH as reportDetailPatchHandler } from "../app/api/reports/[id]/route";
import { GET as servicesGetHandler } from "../app/api/services/route";
import { GET as usersGetHandler, POST as usersPostHandler } from "../app/api/users/route";

function buildRequest(url: string, method: string = "GET", body?: any, token?: string): Request {
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

function extractCookieToken(res: Response): string | null {
  const setCookie = res.headers.get("set-cookie");
  if (!setCookie) return null;
  const match = setCookie.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

async function runPhase4Tests() {
  console.log("\n========================================================");
  console.log(" BALLEGH AI — PHASE 4: FULL E2E QA & PRODUCTION AUDIT");
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

  // Safe isolated test accounts
  const testCitizenEmail = `qa.citizen.${Date.now()}@ballegh-test.tn`;
  const testCitizenPassword = "QAStrongPass2026!";
  let testCitizenToken = "";
  let testCitizenId = "";

  const testAgentToken = await createSessionToken({
    userId: "usr_agent_01",
    email: "agent@commune-tunis.gov.tn",
    fullName: "Ing. Samira Trabelsi",
    phone: "+216 71 345 678",
    role: "municipal_agent",
    district: "Direction de la Voirie et Travaux",
    organization: "Commune de Tunis",
  });

  const testAdminToken = await createSessionToken({
    userId: "usr_admin_01",
    email: "admin@commune-tunis.gov.tn",
    fullName: "Karim Mansour",
    phone: "+216 71 890 123",
    role: "admin",
    organization: "DSI Ville de Tunis",
  });

  const citizenIntruderToken = await createSessionToken({
    userId: "usr_intruder_99",
    email: "intruder@civic.tn",
    fullName: "Citoyen Non Auteur",
    phone: "+216 22 999 888",
    role: "citizen",
  });

  let createdReportId = "";

  // ---------------------------------------------------------
  // JOURNEY 1: CITIZEN REGISTRATION & LOGIN
  // ---------------------------------------------------------
  console.log("--- Journey 1: Citizen Registration, Login & Session Integrity ---");

  await test("Registers a new citizen with validated phone and district", async () => {
    const req = buildRequest("http://localhost:3000/api/auth/register", "POST", {
      fullName: "Anis Ben Salem",
      email: testCitizenEmail,
      password: testCitizenPassword,
      phone: "+216 98 765 432",
      district: "Bab Souika",
    });

    const res = await registerHandler(req);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.user.id);
    assert.equal(body.user.email, testCitizenEmail);
    assert.equal(body.user.role, "citizen");
    // Security check: passwordHash MUST NOT be returned
    assert.equal(body.user.passwordHash, undefined);

    testCitizenId = body.user.id;
    const cookieToken = extractCookieToken(res);
    assert.ok(cookieToken, "Must set session cookie on registration");
  });

  await test("Authenticates newly registered citizen with valid credentials", async () => {
    const req = buildRequest("http://localhost:3000/api/auth/login", "POST", {
      email: testCitizenEmail,
      password: testCitizenPassword,
    });

    const res = await loginHandler(req);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.user.email, testCitizenEmail);
    assert.equal(body.user.passwordHash, undefined);

    testCitizenToken = extractCookieToken(res) || "";
    assert.ok(testCitizenToken.length > 20);

    const decoded = await verifySessionToken(testCitizenToken);
    assert.ok(decoded);
    assert.equal(decoded.userId, testCitizenId);
    assert.equal(decoded.role, "citizen");
  });

  await test("Rejects invalid password during citizen login (401)", async () => {
    const req = buildRequest("http://localhost:3000/api/auth/login", "POST", {
      email: testCitizenEmail,
      password: "WrongPassword999!",
    });

    const res = await loginHandler(req);
    assert.equal(res.status, 401);
  });

  await test("Validates active session via GET /api/auth/me", async () => {
    const req = buildRequest("http://localhost:3000/api/auth/me", "GET", undefined, testCitizenToken);
    const res = await meHandler(req);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.authenticated, true);
    assert.equal(data.user.email, testCitizenEmail);
  });

  // ---------------------------------------------------------
  // JOURNEY 2: CITIZEN REPORT CREATION WITH MULTIMEDIA & PERSISTENCE
  // ---------------------------------------------------------
  console.log("\n--- Journey 2: Citizen Creates Report with Photo & Metadata ---");

  await test("Citizen creates report with custom uploaded photo and location", async () => {
    const customPhotoData = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP...";
    const req = buildRequest(
      "http://localhost:3000/api/reports",
      "POST",
      {
        category: "pothole",
        title: "Affaissement chaussée rue Bab Souika",
        description: "Trou de 20cm causant des ralentissements et risques pour motocyclistes.",
        district: "Bab Souika",
        streetAddress: "Angle Rue Bab Souika et Rue Halfaouine",
        latitude: 36.8085,
        longitude: 10.1742,
        landmark: "En face du dispensaire",
        photoUrl: customPhotoData,
      },
      testCitizenToken
    );

    const res = await reportsPostHandler(req);
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.report.id);
    assert.equal(body.report.submittedBy.id, testCitizenId);
    // Real phone propagation:
    assert.equal(body.report.submittedBy.phone, "+216 98 765 432");
    assert.equal(body.report.category, "pothole");
    assert.equal(body.report.photos[0].url, customPhotoData);

    createdReportId = body.report.id;
  });

  // ---------------------------------------------------------
  // JOURNEY 3: REPORT & TIMELINE PERSISTENCE AFTER RELOAD
  // ---------------------------------------------------------
  console.log("\n--- Journey 3: Persistence Verification & Timeline Reload ---");

  await test("Fetches persisted report by ID and validates timeline initialization", async () => {
    const req = buildRequest(
      `http://localhost:3000/api/reports/${createdReportId}`,
      "GET",
      undefined,
      testCitizenToken
    );

    const res = await reportDetailGetHandler(req, { params: Promise.resolve({ id: createdReportId }) });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.report.id, createdReportId);
    assert.ok(Array.isArray(body.report.timeline));
    assert.ok(body.report.timeline.length >= 1);
    assert.equal(body.report.timeline[0].status, "received");
  });

  // ---------------------------------------------------------
  // JOURNEY 4: CITIZEN DATA ISOLATION & PRIVACY SHIELD
  // ---------------------------------------------------------
  console.log("\n--- Journey 4: Data Isolation & Privacy Masking ---");

  await test("Citizen receives only their own reports when querying myOnly=true", async () => {
    const req = buildRequest(
      "http://localhost:3000/api/reports?myOnly=true",
      "GET",
      undefined,
      testCitizenToken
    );

    const res = await reportsGetHandler(req);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.reports.every((r: any) => r.submittedBy.id === testCitizenId));
  });

  await test("Other citizen cannot view creator's real phone number (+216 ** *** ***)", async () => {
    const req = buildRequest(
      `http://localhost:3000/api/reports/${createdReportId}`,
      "GET",
      undefined,
      citizenIntruderToken
    );

    const res = await reportDetailGetHandler(req, { params: Promise.resolve({ id: createdReportId }) });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.report.submittedBy.phone, "+216 ** *** ***");
  });

  await test("Authorized municipal staff sees real citizen phone number", async () => {
    const req = buildRequest(
      `http://localhost:3000/api/reports/${createdReportId}`,
      "GET",
      undefined,
      testAgentToken
    );

    const res = await reportDetailGetHandler(req, { params: Promise.resolve({ id: createdReportId }) });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.report.submittedBy.phone, "+216 98 765 432");
  });

  // ---------------------------------------------------------
  // JOURNEY 5: MUNICIPAL AGENT REPORTS FILTERING
  // ---------------------------------------------------------
  console.log("\n--- Journey 5: Municipal Filtering & Querying ---");

  await test("Municipal agent filters reports by category and status", async () => {
    const req = buildRequest(
      "http://localhost:3000/api/reports?category=pothole",
      "GET",
      undefined,
      testAgentToken
    );

    const res = await reportsGetHandler(req);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.reports.every((r: any) => r.category === "pothole"));
  });

  // ---------------------------------------------------------
  // JOURNEY 6: AGENT REVIEWS & MODIFIES AI RECOMMENDATIONS
  // ---------------------------------------------------------
  console.log("\n--- Journey 6: Municipal Human-in-the-Loop Review & Modification ---");

  await test("Municipal agent adjusts severity and saves human review notes", async () => {
    const req = buildRequest(
      `http://localhost:3000/api/reports/${createdReportId}`,
      "PATCH",
      {
        action: "human_review",
        decision: "modified",
        notes: "Constat terrain : risque accru en raison de la proximité d'une école primaire.",
        modifications: {
          category: "pothole",
          severity: 3,
        },
      },
      testAgentToken
    );

    const res = await reportDetailPatchHandler(req, { params: Promise.resolve({ id: createdReportId }) });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.report.status, "human_validated");
    assert.equal(body.report.humanReview.decision, "modified");
    assert.equal(body.report.humanReview.adjustedSeverity, 3);
  });

  // ---------------------------------------------------------
  // JOURNEY 7: STRICT GATING ON OFFICIAL EMAIL TRANSMISSION
  // ---------------------------------------------------------
  console.log("\n--- Journey 7: Official Email Transmission Gating ---");

  await test("Cannot transmit official email for unvalidated report (Simulated on new report)", async () => {
    // Create temporary unvalidated report
    const tempReq = buildRequest(
      "http://localhost:3000/api/reports",
      "POST",
      {
        category: "lighting",
        title: "Lampadaire éteint Bab El Khadhra",
        description: "Lampadaire hors service depuis 3 jours",
        district: "Bab El Khadhra",
        streetAddress: "Rue de Lyon",
      },
      testCitizenToken
    );
    const tempRes = await reportsPostHandler(tempReq);
    const tempBody = await tempRes.json();
    const tempId = tempBody.report.id;

    // Attempt email dispatch before human validation
    const emailReq = buildRequest(
      `http://localhost:3000/api/reports/${tempId}`,
      "PATCH",
      { action: "send_email" },
      testAgentToken
    );
    const emailRes = await reportDetailPatchHandler(emailReq, { params: Promise.resolve({ id: tempId }) });
    assert.equal(emailRes.status, 422);
    const emailData = await emailRes.json();
    assert.equal(emailData.code, "HUMAN_VALIDATION_REQUIRED");
  });

  await test("Transmits official email once human-validated; updates report status to forwarded", async () => {
    const req = buildRequest(
      `http://localhost:3000/api/reports/${createdReportId}`,
      "PATCH",
      { action: "send_email" },
      testAgentToken
    );

    const res = await reportDetailPatchHandler(req, { params: Promise.resolve({ id: createdReportId }) });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.report.status, "forwarded");
    assert.equal(body.report.officialEmailSent, true);
    assert.ok(body.dispatch);
    assert.equal(body.dispatch.isSimulated, true, "Must flag simulation when SMTP not configured");
  });

  // ---------------------------------------------------------
  // JOURNEY 8: PROGRESSION & TIMELINE AUDIT TRAIL
  // ---------------------------------------------------------
  console.log("\n--- Journey 8: Status Progression & Timeline Persistence ---");

  await test("Advances status to in_progress and verifies timeline entry", async () => {
    const req = buildRequest(
      `http://localhost:3000/api/reports/${createdReportId}`,
      "PATCH",
      {
        action: "advance_status",
        status: "in_progress",
        comment: {
          fr: "Équipe technique sur le terrain avec camion d'enrobé.",
          ar: "الفريق الفني متواجد بالميدان مع شاحنة التعبيد.",
        },
      },
      testAgentToken
    );

    const res = await reportDetailPatchHandler(req, { params: Promise.resolve({ id: createdReportId }) });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.report.status, "in_progress");

    const latestEvent = body.report.timeline[body.report.timeline.length - 1];
    assert.equal(latestEvent.status, "in_progress");
    assert.equal(latestEvent.author, "Ing. Samira Trabelsi");
  });

  await test("Advances status to resolved upon field completion", async () => {
    const req = buildRequest(
      `http://localhost:3000/api/reports/${createdReportId}`,
      "PATCH",
      {
        action: "advance_status",
        status: "resolved",
        comment: {
          fr: "Travaux terminés avec succès.",
          ar: "تم إنهاء الأشغال بنجاح.",
        },
      },
      testAgentToken
    );

    const res = await reportDetailPatchHandler(req, { params: Promise.resolve({ id: createdReportId }) });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.report.status, "resolved");
  });

  // ---------------------------------------------------------
  // JOURNEY 9: CITIZEN FIELD CONFIRMATION AUTHORIZATION
  // ---------------------------------------------------------
  console.log("\n--- Journey 9: Resolution Confirmation Access Control ---");

  await test("Rejects resolution confirmation from non-owner citizen (403)", async () => {
    const req = buildRequest(
      `http://localhost:3000/api/reports/${createdReportId}`,
      "PATCH",
      { action: "confirm_resolution" },
      citizenIntruderToken
    );

    const res = await reportDetailPatchHandler(req, { params: Promise.resolve({ id: createdReportId }) });
    assert.equal(res.status, 403);
  });

  await test("Report owner citizen confirms resolution on the ground", async () => {
    const req = buildRequest(
      `http://localhost:3000/api/reports/${createdReportId}`,
      "PATCH",
      { action: "confirm_resolution" },
      testCitizenToken
    );

    const res = await reportDetailPatchHandler(req, { params: Promise.resolve({ id: createdReportId }) });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.report.resolutionConfirmedByCitizen, true);
  });

  // ---------------------------------------------------------
  // JOURNEY 10: ADMIN USER MANAGEMENT & OPERATIONAL STATS
  // ---------------------------------------------------------
  console.log("\n--- Journey 10: Admin Management & Security Defenses ---");

  await test("Admin lists all users and creates a new municipal agent account", async () => {
    const newAgentEmail = `agent.test.${Date.now()}@commune-tunis.gov.tn`;
    const req = buildRequest(
      "http://localhost:3000/api/users",
      "POST",
      {
        fullName: "Ing. Ridha Mabrouk",
        email: newAgentEmail,
        password: "BalleghAgentPass2026!",
        phone: "+216 71 888 777",
        district: "Direction de l'Éclairage Public",
        role: "municipal_agent",
      },
      testAdminToken
    );

    const res = await usersPostHandler(req);
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.user.role, "municipal_agent");
    assert.equal(body.user.passwordHash, undefined);
  });

  await test("Demo role switching is blocked in production mode without explicit override", async () => {
    const origEnv = process.env.NODE_ENV;
    const origAllow = process.env.ALLOW_DEMO_SWITCH;

    try {
      (process.env as any).NODE_ENV = "production";
      delete process.env.ALLOW_DEMO_SWITCH;

      const req = buildRequest("http://localhost:3000/api/auth/demo-switch", "POST", {
        role: "admin",
      });

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
  // LIVE SUPABASE POSTGRESQL VERIFICATION
  // ---------------------------------------------------------
  console.log("\n--- Live Supabase Database Health Check ---");
  if (realDatabaseUrl) {
    const { resolveSupabaseUrl } = await import("../scripts/test-db-connection");
    const activeUrl = resolveSupabaseUrl(realDatabaseUrl, true);
    const { PrismaClient } = await import("@prisma/client");
    const livePrisma = new PrismaClient({
      datasources: { db: { url: activeUrl } },
    });

    await test("Supabase PostgreSQL responds to query and maintains reference tables", async () => {
      const services = await livePrisma.municipalService.findMany();
      assert.equal(services.length, 3);
      const userCount = await livePrisma.user.count();
      assert.ok(userCount >= 0);
      await livePrisma.$disconnect();
    });
  } else {
    console.log("  [SKIP] Supabase live test skipped (DATABASE_URL not set)");
  }

  console.log("\n========================================================");
  console.log(` ALL ${passedTests}/${totalTests} PHASE 4 QA AUDIT TESTS PASSED!`);
  console.log("========================================================\n");
}

runPhase4Tests().catch((err) => {
  console.error("\n[PHASE 4 TEST RUNNER FATAL ERROR]:", err);
  process.exit(1);
});
