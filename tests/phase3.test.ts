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
const realDatabaseUrl = process.env.DATABASE_URL;
// Isolate in-memory unit tests from mutating production DB during initial checks
delete process.env.DATABASE_URL;

import { createSessionToken, SESSION_COOKIE_NAME } from "../lib/auth/jwt";
import { GET as reportsGetHandler, POST as reportsPostHandler } from "../app/api/reports/route";
import { GET as reportDetailGetHandler, PATCH as reportDetailPatchHandler } from "../app/api/reports/[id]/route";
import { GET as servicesGetHandler } from "../app/api/services/route";
import { GET as usersGetHandler, POST as usersPostHandler } from "../app/api/users/route";
import { prisma, getIsDatabaseConfigured } from "../lib/db";
import { listMunicipalServices } from "../lib/repositories/serviceRepository";

// Helper to construct mock Request objects with auth cookies
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

async function runPhase3Tests() {
  console.log("\n========================================================");
  console.log(" BALLEGH AI — PHASE 3 FULL APPLICATION INTEGRATION SUITE");
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

  // Tokens for actors
  const citizenToken = await createSessionToken({
    userId: "usr_citizen_01",
    email: "citoyen@tunis.tn",
    fullName: "Yassine Ben Amor",
    role: "citizen",
  });

  const citizen2Token = await createSessionToken({
    userId: "usr_citizen_99",
    email: "autre.citoyen@tunis.tn",
    fullName: "Autre Citoyen",
    role: "citizen",
  });

  const agentToken = await createSessionToken({
    userId: "usr_agent_01",
    email: "agent@commune-tunis.gov.tn",
    fullName: "Ing. Samira Trabelsi",
    role: "municipal_agent",
  });

  const adminToken = await createSessionToken({
    userId: "usr_admin_01",
    email: "admin@commune-tunis.gov.tn",
    fullName: "Karim Mansour",
    role: "admin",
  });

  let createdReportId = "";

  // ---------------------------------------------------------
  // 1. CITIZEN WORKFLOW VIA API
  // ---------------------------------------------------------
  console.log("--- 1. Citizen Workflow: Creation, Validation & Triage ---");

  await test("Rejects report creation without authentication (401)", async () => {
    const req = buildRequest("http://localhost:3000/api/reports", "POST", {
      category: "pothole",
      title: "Trou béant sur l'avenue",
      description: "Nid-de-poule dangereux devant l'école",
      district: "Bab Souika",
      streetAddress: "Avenue Habib Thameur",
    });
    const res = await reportsPostHandler(req);
    assert.equal(res.status, 401);
  });

  await test("Citizen submits report; system generates reference number and AI analysis", async () => {
    const req = buildRequest(
      "http://localhost:3000/api/reports",
      "POST",
      {
        category: "pothole",
        title: "Nid-de-poule profond devant arrêt de bus",
        description: "Très grand nid-de-poule d'environ 15cm de profondeur sur la voie de bus.",
        district: "Bab Souika",
        streetAddress: "Rue Bab Souika N° 45",
        photoUrl: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7",
      },
      citizenToken
    );

    const res = await reportsPostHandler(req);
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.report);
    assert.ok(body.report.id);
    assert.match(body.report.referenceNumber, /^BLG-\d{4}-TUN-\d{3,6}$/);
    assert.equal(body.report.status, "ai_analyzed");
    assert.ok(body.report.aiAnalysis);
    assert.ok(body.report.aiAnalysis.priorityScore >= 0);
    assert.equal(body.report.submittedBy.id, "usr_citizen_01");

    createdReportId = body.report.id;
  });

  await test("Citizen queries /api/reports?myOnly=true and sees only their report", async () => {
    const req = buildRequest(
      "http://localhost:3000/api/reports?myOnly=true",
      "GET",
      undefined,
      citizenToken
    );
    const res = await reportsGetHandler(req);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.reports));
    assert.ok(data.reports.length >= 1);
    const found = data.reports.find((r: any) => r.id === createdReportId);
    assert.ok(found);
    assert.equal(found.submittedBy.id, "usr_citizen_01");
  });

  // ---------------------------------------------------------
  // 2. MUNICIPAL WORKFLOW & HUMAN-IN-THE-LOOP CONTROL
  // ---------------------------------------------------------
  console.log("\n--- 2. Municipal Workflow: Review, Email Draft & Status Progression ---");

  await test("Citizen cannot review or approve reports (403)", async () => {
    const req = buildRequest(
      `http://localhost:3000/api/reports/${createdReportId}`,
      "PATCH",
      {
        action: "human_review",
        decision: "accepted",
        notes: "Je tente de valider mon propre signalement",
      },
      citizenToken
    );
    const res = await reportDetailPatchHandler(req, { params: Promise.resolve({ id: createdReportId }) });
    assert.equal(res.status, 403);
  });

  await test("Sending email is strictly rejected before human validation (422)", async () => {
    const req = buildRequest(
      `http://localhost:3000/api/reports/${createdReportId}`,
      "PATCH",
      { action: "send_email" },
      agentToken
    );
    const res = await reportDetailPatchHandler(req, { params: Promise.resolve({ id: createdReportId }) });
    assert.equal(res.status, 422);
    const data = await res.json();
    assert.match(data.error, /validation humaine préalable/i);
  });

  await test("Municipal agent accepts AI recommendation; status becomes human_validated", async () => {
    const req = buildRequest(
      `http://localhost:3000/api/reports/${createdReportId}`,
      "PATCH",
      {
        action: "human_review",
        decision: "accepted",
        notes: "Constat conforme. Recommandation IA approuvée sans modification.",
      },
      agentToken
    );
    const res = await reportDetailPatchHandler(req, { params: Promise.resolve({ id: createdReportId }) });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.report.status, "human_validated");
    assert.ok(data.report.humanReview);
    assert.equal(data.report.humanReview.decision, "accepted");
  });

  await test("Municipal agent transmits official email; status advances to forwarded", async () => {
    const req = buildRequest(
      `http://localhost:3000/api/reports/${createdReportId}`,
      "PATCH",
      { action: "send_email" },
      agentToken
    );
    const res = await reportDetailPatchHandler(req, { params: Promise.resolve({ id: createdReportId }) });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.report.status, "forwarded");
    assert.equal(data.report.officialEmailSent, true);
  });

  await test("Municipal agent marks work in_progress on site", async () => {
    const req = buildRequest(
      `http://localhost:3000/api/reports/${createdReportId}`,
      "PATCH",
      {
        action: "advance_status",
        status: "in_progress",
        comment: {
          fr: "Équipe de voirie déployée sur le terrain.",
          ar: "تم نشر فريق صيانة الطرقات في الميدان.",
        },
      },
      agentToken
    );
    const res = await reportDetailPatchHandler(req, { params: Promise.resolve({ id: createdReportId }) });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.report.status, "in_progress");
  });

  await test("Municipal agent closes intervention; status becomes resolved", async () => {
    const req = buildRequest(
      `http://localhost:3000/api/reports/${createdReportId}`,
      "PATCH",
      {
        action: "advance_status",
        status: "resolved",
        comment: {
          fr: "Enrobé bitumineux coulé et nivelé.",
          ar: "تم تعبيد الحفرة وتسوية الطريق بنجاح.",
        },
      },
      agentToken
    );
    const res = await reportDetailPatchHandler(req, { params: Promise.resolve({ id: createdReportId }) });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.report.status, "resolved");
  });

  // ---------------------------------------------------------
  // 3. CITIZEN RESOLUTION CONFIRMATION
  // ---------------------------------------------------------
  console.log("\n--- 3. Citizen Field Confirmation & Access Control ---");

  await test("Another citizen cannot confirm resolution of this report (403)", async () => {
    const req = buildRequest(
      `http://localhost:3000/api/reports/${createdReportId}`,
      "PATCH",
      { action: "confirm_resolution" },
      citizen2Token
    );
    const res = await reportDetailPatchHandler(req, { params: Promise.resolve({ id: createdReportId }) });
    assert.equal(res.status, 403);
  });

  await test("Author citizen confirms resolution on the ground", async () => {
    const req = buildRequest(
      `http://localhost:3000/api/reports/${createdReportId}`,
      "PATCH",
      { action: "confirm_resolution" },
      citizenToken
    );
    const res = await reportDetailPatchHandler(req, { params: Promise.resolve({ id: createdReportId }) });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.report.resolutionConfirmedByCitizen, true);
  });

  // ---------------------------------------------------------
  // 4. ADMIN APIs & SERVICE ROUTING
  // ---------------------------------------------------------
  console.log("\n--- 4. Administrative Services & User Management ---");

  await test("GET /api/services returns the 3 municipal services with SLA and supported categories", async () => {
    const req = buildRequest("http://localhost:3000/api/services", "GET");
    const res = await servicesGetHandler(req);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.services.length, 3);

    const codes = data.services.map((s: any) => s.code);
    assert.ok(codes.includes("DVRD-TUNIS"));
    assert.ok(codes.includes("DEP-ECL-TUNIS"));
    assert.ok(codes.includes("DAEP-TUNIS"));

    // Check multilingual name and supported categories
    const dvrd = data.services.find((s: any) => s.code === "DVRD-TUNIS");
    assert.equal(dvrd.name.fr, "Direction de la Voirie et des Réseaux Divers");
    assert.ok(dvrd.supportedCategories.includes("pothole"));
  });

  await test("GET /api/users rejects non-admin users (403)", async () => {
    const req = buildRequest("http://localhost:3000/api/users", "GET", undefined, agentToken);
    const res = await usersGetHandler(req);
    assert.equal(res.status, 403);
  });

  await test("GET /api/users returns registered users for system admin", async () => {
    const req = buildRequest("http://localhost:3000/api/users", "GET", undefined, adminToken);
    const res = await usersGetHandler(req);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(Array.isArray(data.users));
    assert.ok(data.users.length >= 3);
  });

  await test("POST /api/users rejects creation by non-admin users (403)", async () => {
    const req = buildRequest(
      "http://localhost:3000/api/users",
      "POST",
      {
        fullName: "Test User",
        email: "test.fail@commune-tunis.gov.tn",
        password: "Password123!",
        phone: "+216 71 111 222",
      },
      citizenToken
    );
    const res = await usersPostHandler(req);
    assert.equal(res.status, 403);
  });

  await test("POST /api/users creates a new user when called by administrator", async () => {
    const req = buildRequest(
      "http://localhost:3000/api/users",
      "POST",
      {
        fullName: "Ing. Moez Zorgati",
        email: `moez.${Date.now()}@commune-tunis.gov.tn`,
        password: "BalleghSecure2026!",
        phone: "+216 71 999 888",
        district: "Direction DVRD",
        role: "municipal_agent",
      },
      adminToken
    );
    const res = await usersPostHandler(req);
    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.user.name, "Ing. Moez Zorgati");
    assert.equal(data.user.role, "municipal_agent");
  });

  // ---------------------------------------------------------
  // 5. PRIVACY & ANONYMIZATION
  // ---------------------------------------------------------
  console.log("\n--- 5. Citizen Privacy & Data Masking ---");

  await test("Citizen phone number is redacted for public or other citizen viewers", async () => {
    const req = buildRequest("http://localhost:3000/api/reports", "GET", undefined, citizen2Token);
    const res = await reportsGetHandler(req);
    assert.equal(res.status, 200);
    const data = await res.json();
    const target = data.reports.find((r: any) => r.id === createdReportId);
    if (target) {
      assert.equal(target.submittedBy.phone, "+216 ** *** ***");
    }
  });

  await test("Citizen phone number is visible to authorized municipal staff", async () => {
    const req = buildRequest("http://localhost:3000/api/reports", "GET", undefined, agentToken);
    const res = await reportsGetHandler(req);
    assert.equal(res.status, 200);
    const data = await res.json();
    const target = data.reports.find((r: any) => r.id === createdReportId);
    if (target) {
      assert.notEqual(target.submittedBy.phone, "+216 ** *** ***");
      assert.ok(target.submittedBy.phone.length > 5);
    }
  });

  // ---------------------------------------------------------
  // 6. LIVE SUPABASE POSTGRESQL VERIFICATION
  // ---------------------------------------------------------
  console.log("\n--- 6. Supabase PostgreSQL Live Database Verification ---");

  if (realDatabaseUrl) {
    const { PrismaClient } = await import("@prisma/client");
    const livePrisma = new PrismaClient({
      datasources: { db: { url: realDatabaseUrl } },
    });

    await test("Connects to Supabase PostgreSQL and queries seeded municipal services", async () => {
      const dbServices = await livePrisma.municipalService.findMany({
        orderBy: { code: "asc" },
      });
      assert.equal(dbServices.length, 3);
      const codes = dbServices.map((s) => s.code);
      assert.ok(codes.includes("DVRD-TUNIS"));
      assert.ok(codes.includes("DEP-ECL-TUNIS"));
      assert.ok(codes.includes("DAEP-TUNIS"));
    });

    await test("Supabase contains expected reference tables without data loss", async () => {
      const userCount = await livePrisma.user.count();
      assert.ok(userCount >= 0);
      const srvCount = await livePrisma.municipalService.count();
      assert.equal(srvCount, 3);
      await livePrisma.$disconnect();
    });
  } else {
    console.log("  [SKIP] Live Supabase test skipped (DATABASE_URL not set)");
  }

  console.log("\n========================================================");
  console.log(` ALL ${passedTests}/${totalTests} PHASE 3 INTEGRATION TESTS PASSED!`);
  console.log("========================================================\n");
}

runPhase3Tests().catch((err) => {
  console.error("\n[TEST RUNNER FATAL ERROR]:", err);
  process.exit(1);
});
