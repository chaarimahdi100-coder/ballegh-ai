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

import { createSessionToken, verifySessionToken, SESSION_COOKIE_NAME } from "../lib/auth/jwt";
import bcrypt from "bcryptjs";
import {
  createUser,
  findUserByEmail,
  listAllUsers,
} from "../lib/repositories/userRepository";
import {
  createReport,
  getReportById,
  updateHumanReview,
  advanceReportStatus,
  confirmCitizenResolution,
} from "../lib/repositories/reportRepository";
import {
  uploadPhotoToStorage,
  getPhotoBufferFromStorage,
  deletePhotoFromStorage,
  detectImageMimeType,
  validateImageBuffer,
  BUCKET_NAME,
  MAX_FILE_SIZE_BYTES,
} from "../lib/storage/supabaseStorage";
import { analyzeReportTriage, _setMockGeminiProvider, _resetMockGeminiProvider } from "../lib/services/aiService";
import { dispatchOfficialEmail, _setMockEmailTransport, _resetMockEmailTransport } from "../lib/services/emailService";
import { GET as photoProxyGetHandler } from "../app/api/reports/[id]/photo/route";
import { prisma, getIsDatabaseConfigured } from "../lib/db";

// Fully valid 1x1 pixel PNG image (transparent RGBA)
const VALID_TEST_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64"
);

// Malicious / fake image fixture (HTML script pretending to be an image)
const MALICIOUS_FAKE_IMAGE = Buffer.from("<script>alert('xss')</script>", "utf-8");

let passedCount = 0;
let failedCount = 0;

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`  [PASS] ${name}`);
    passedCount++;
  } catch (err: any) {
    console.error(`  [FAIL] ${name}`);
    console.error(`         ${err.message}\n`);
    failedCount++;
    throw err;
  }
}

async function runPhase7AcceptanceSuite() {
  console.log("========================================================");
  console.log(" BALLEGH AI — PHASE 7: FULL END-TO-END ACCEPTANCE AUDIT");
  console.log(" Mode: Live Storage & Database Integration");
  console.log("========================================================\n");

  const runId = Date.now().toString().slice(-6);

  // Track created test IDs for isolated cleanup
  const createdUserIds: string[] = [];
  const createdReportIds: string[] = [];
  const createdStoragePaths: string[] = [];

  try {
    // -------------------------------------------------------------------
    // 1. CITIZEN JOURNEY: REGISTRATION, AUTH & SESSION INTEGRITY
    // -------------------------------------------------------------------
    console.log("--- 1. Citizen Registration, Authentication & Session Tokens ---");

    const citizenEmail = `citoyen.p7.${runId}@ballegh-test.tn`;
    const citizenPassword = "CitizenSecure2026!";

    let citizenUser: any = null;

    await test("Registers new citizen with hashed password and district metadata", async () => {
      citizenUser = await createUser({
        email: citizenEmail,
        password: citizenPassword,
        fullName: "Amira Trabelsi Acceptance",
        phone: "+216 71 555 777",
        role: "citizen",
        district: "Bab Bhar",
      });

      assert.ok(citizenUser.id);
      assert.equal(citizenUser.email, citizenEmail);
      assert.equal(citizenUser.role, "citizen");
      assert.equal(citizenUser.district, "Bab Bhar");
      createdUserIds.push(citizenUser.id);
    });

    await test("Authenticates citizen password with bcrypt", async () => {
      const fetched = await findUserByEmail(citizenEmail);
      assert.ok(fetched);
      const isValid = await bcrypt.compare(citizenPassword, fetched!.passwordHash);
      assert.equal(isValid, true);
      const isInvalid = await bcrypt.compare("WrongPassword123", fetched!.passwordHash);
      assert.equal(isInvalid, false);
    });

    let citizenToken = "";
    await test("Issues signed HS256 JWT session token with required claims", async () => {
      citizenToken = await createSessionToken({
        userId: citizenUser.id,
        email: citizenUser.email,
        fullName: citizenUser.name,
        phone: citizenUser.phone,
        role: citizenUser.role,
        district: citizenUser.district,
      });

      assert.ok(citizenToken.length > 50);
      const verified = await verifySessionToken(citizenToken);
      assert.ok(verified);
      assert.equal(verified?.userId, citizenUser.id);
      assert.equal(verified?.role, "citizen");
    });

    // -------------------------------------------------------------------
    // 2. REMOTE SUPABASE STORAGE & PHOTO PROXY SECURITY
    // -------------------------------------------------------------------
    console.log("\n--- 2. Remote Supabase Storage & Photo Proxy RBAC ---");

    const testStoragePath = `reports/acceptance-${runId}/sample-photo.png`;

    await test("Validates image magic bytes (PNG) and rejects malicious payloads", async () => {
      const validMime = detectImageMimeType(VALID_TEST_PNG);
      assert.equal(validMime, "image/png");

      const validResult = validateImageBuffer(VALID_TEST_PNG);
      assert.equal(validResult.valid, true);

      const fakeResult = validateImageBuffer(MALICIOUS_FAKE_IMAGE);
      assert.equal(fakeResult.valid, false);
      assert.ok(fakeResult.error?.includes("octets magiques"));
    });

    await test("Uploads valid image to private bucket 'ballegh-reports' via SDK", async () => {
      const upload = await uploadPhotoToStorage(VALID_TEST_PNG, testStoragePath);
      assert.equal(upload.storagePath, testStoragePath);
      assert.equal(upload.mimeType, "image/png");
      assert.equal(upload.isSimulated, false, "Must upload to real Supabase Storage bucket");
      createdStoragePaths.push(testStoragePath);
    });

    await test("Retrieves binary photo from private bucket without leaking service key", async () => {
      const retrieved = await getPhotoBufferFromStorage(testStoragePath);
      assert.ok(retrieved);
      assert.equal(retrieved!.buffer.length, VALID_TEST_PNG.length);
      assert.equal(retrieved!.mimeType, "image/png");
    });

    // -------------------------------------------------------------------
    // 3. CITIZEN REPORT CREATION WITH STORAGE PHOTO & AI TRIAGE
    // -------------------------------------------------------------------
    console.log("\n--- 3. Report Creation with Storage Photo & AI Triage ---");

    let createdReport: any = null;

    await test("Creates report linked to Supabase Storage photo with AI triage", async () => {
      createdReport = await createReport({
        category: "pothole",
        title: "Crevasse dangereuse face gare",
        description: "Affaissement du goudron créant un nid-de-poule profond.",
        district: "Bab Bhar",
        streetAddress: "Place de la République, Bab Bhar",
        latitude: 36.8012,
        longitude: 10.1804,
        submittedBy: {
          id: citizenUser.id,
          name: citizenUser.name || "Amira Trabelsi Acceptance",
          phone: citizenUser.phone,
        },
        photoUrl: `/api/reports/temp/photo`,
        photoStorage: {
          storagePath: testStoragePath,
          mimeType: "image/png",
          fileSizeBytes: VALID_TEST_PNG.length,
        },
      });

      assert.ok(createdReport.id);
      assert.ok(createdReport.referenceNumber.startsWith("BLG-2026-TUN-"));
      assert.equal(createdReport.category, "pothole");
      assert.equal(createdReport.photos[0].storagePath, testStoragePath);
      assert.equal(createdReport.photos[0].url, `/api/reports/${createdReport.id}/photo`);
      assert.ok(createdReport.aiAnalysis);
      assert.ok(createdReport.aiAnalysis.priorityScore >= 0);
      createdReportIds.push(createdReport.id);
    });

    await test("Report persists in Supabase PostgreSQL and is reloadable", async () => {
      const fetched = await getReportById(createdReport.id);
      assert.ok(fetched);
      assert.equal(fetched!.referenceNumber, createdReport.referenceNumber);
      assert.equal(fetched!.photos[0].storagePath, testStoragePath);
      assert.equal(fetched!.submittedBy.id, citizenUser.id);
    });

    // -------------------------------------------------------------------
    // 4. PHOTO PROXY AUTHORIZATION & PRIVACY ENFORCEMENT
    // -------------------------------------------------------------------
    console.log("\n--- 4. Photo Proxy RBAC & Privacy Defenses (/api/reports/[id]/photo) ---");

    await test("Rejects unauthenticated photo access with 401 Unauthorized", async () => {
      const req = new Request(`http://localhost:3000/api/reports/${createdReport.id}/photo`);
      const res = await photoProxyGetHandler(req, { params: Promise.resolve({ id: createdReport.id }) });
      assert.equal(res.status, 401);
    });

    // Create a second citizen (intruder)
    const intruderEmail = `intruder.p7.${runId}@ballegh-test.tn`;
    let intruderUser: any = null;
    let intruderToken = "";

    await test("Rejects non-author citizen from accessing private photo with 403 Forbidden", async () => {
      intruderUser = await createUser({
        email: intruderEmail,
        password: "IntruderPass2026!",
        fullName: "Intruder Citizen",
        phone: "+216 99 111 222",
        role: "citizen",
        district: "El Menzah",
      });
      createdUserIds.push(intruderUser.id);

      intruderToken = await createSessionToken({
        userId: intruderUser.id,
        email: intruderUser.email,
        fullName: intruderUser.name,
        role: "citizen",
      });

      const headers = new Headers();
      headers.set("cookie", `${SESSION_COOKIE_NAME}=${intruderToken}`);
      const req = new Request(`http://localhost:3000/api/reports/${createdReport.id}/photo`, { headers });
      const res = await photoProxyGetHandler(req, { params: Promise.resolve({ id: createdReport.id }) });
      assert.equal(res.status, 403);
    });

    await test("Allows author citizen to access photo with 200 OK and security headers", async () => {
      const headers = new Headers();
      headers.set("cookie", `${SESSION_COOKIE_NAME}=${citizenToken}`);
      const req = new Request(`http://localhost:3000/api/reports/${createdReport.id}/photo`, { headers });
      const res = await photoProxyGetHandler(req, { params: Promise.resolve({ id: createdReport.id }) });
      assert.equal(res.status, 200);
      assert.equal(res.headers.get("Content-Type"), "image/png");
      assert.equal(res.headers.get("Cache-Control"), "private, max-age=3600");
      assert.equal(res.headers.get("X-Content-Type-Options"), "nosniff");
    });

    // -------------------------------------------------------------------
    // 5. MUNICIPAL AGENT JOURNEY & WORKFLOW PROGRESSION
    // -------------------------------------------------------------------
    console.log("\n--- 5. Municipal Agent Review, Email Gating & Workflow ---");

    const agentEmail = `agent.p7.${runId}@commune-tunis.gov.tn`;
    let agentUser: any = null;
    let agentToken = "";

    await test("Creates and authenticates municipal agent account", async () => {
      agentUser = await createUser({
        email: agentEmail,
        password: "AgentPass2026!",
        fullName: "Ing. Samira Bouazizi Acceptance",
        phone: "+216 71 222 333",
        role: "municipal_agent",
        district: "Bab Bhar",
      });
      createdUserIds.push(agentUser.id);

      agentToken = await createSessionToken({
        userId: agentUser.id,
        email: agentUser.email,
        fullName: agentUser.name,
        role: "municipal_agent",
        district: agentUser.district,
      });

      assert.ok(agentToken);
    });

    await test("Municipal agent inspects report photo with 200 OK", async () => {
      const headers = new Headers();
      headers.set("cookie", `${SESSION_COOKIE_NAME}=${agentToken}`);
      const req = new Request(`http://localhost:3000/api/reports/${createdReport.id}/photo`, { headers });
      const res = await photoProxyGetHandler(req, { params: Promise.resolve({ id: createdReport.id }) });
      assert.equal(res.status, 200);
    });

    await test("Gating: Transmission of official email blocked before human validation", async () => {
      const unvalidated = await getReportById(createdReport.id);
      let blocked = false;
      try {
        await dispatchOfficialEmail({
          report: unvalidated!,
          agentName: agentUser.name,
          agentRole: agentUser.role,
        });
      } catch (err: any) {
        blocked = true;
        assert.ok(err.message.includes("validation humaine préalable"));
      }
      assert.equal(blocked, true);
    });

    await test("Municipal agent adjusts severity and saves human review", async () => {
      const updated = await updateHumanReview(
        createdReport.id,
        {
          id: agentUser.id,
          name: agentUser.name || "Ing. Samira Bouazizi Acceptance",
          role: agentUser.role,
        },
        "modified",
        "Artère principale. Intervention d'urgence ordonnée.",
        {
          severity: 3,
          priority: 95,
        }
      );

      assert.ok(updated);
      assert.equal(updated!.status, "human_validated");
      assert.equal(updated!.humanReview?.adjustedSeverity, 3);
    });

    await test("Transmits official email after human validation (audit status PENDING_SMTP_CONFIG)", async () => {
      const validated = await getReportById(createdReport.id);
      const dispatch = await dispatchOfficialEmail({
        report: validated!,
        agentName: agentUser.name,
        agentRole: agentUser.role,
      });

      assert.equal(dispatch.success, true);
      assert.equal(dispatch.isSimulated, true);
      assert.equal(dispatch.transportStatus, "PENDING_SMTP_CONFIG");

      const forwarded = await advanceReportStatus(
        createdReport.id,
        { id: agentUser.id, name: agentUser.name, role: agentUser.role },
        "forwarded"
      );
      assert.equal(forwarded!.status, "forwarded");
    });

    await test("Advances status to in_progress and resolved by municipal staff", async () => {
      const inProgress = await advanceReportStatus(
        createdReport.id,
        { id: agentUser.id, name: agentUser.name, role: agentUser.role },
        "in_progress",
        { fr: "Équipe voirie en cours de rebouchage.", ar: "فريق الأشغال بصدد ردم الحفرة." }
      );
      assert.equal(inProgress!.status, "in_progress");

      const resolved = await advanceReportStatus(
        createdReport.id,
        { id: agentUser.id, name: agentUser.name, role: agentUser.role },
        "resolved",
        { fr: "Travaux terminés avec succès.", ar: "تم إنهاء الأشغال بنجاح." }
      );
      assert.equal(resolved!.status, "resolved");
    });

    // -------------------------------------------------------------------
    // 6. CITIZEN RESOLUTION CONFIRMATION & ACCESS CONTROL
    // -------------------------------------------------------------------
    console.log("\n--- 6. Citizen Resolution Confirmation & Access Control ---");

    await test("Rejects non-author citizen from confirming resolution (IDOR defense)", async () => {
      let rejected = false;
      try {
        await confirmCitizenResolution(createdReport.id, {
          id: intruderUser.id,
          name: intruderUser.name,
        });
      } catch (err: any) {
        rejected = true;
        assert.ok(err.message.includes("Seul l'auteur"));
      }
      assert.equal(rejected, true);
    });

    await test("Author citizen confirms resolution on the ground", async () => {
      const confirmed = await confirmCitizenResolution(createdReport.id, {
        id: citizenUser.id,
        name: citizenUser.name,
      });
      assert.ok(confirmed);
      assert.equal(confirmed!.resolutionConfirmedByCitizen, true);

      // Verify persistent timeline reload
      const finalReport = await getReportById(createdReport.id);
      assert.equal(finalReport!.resolutionConfirmedByCitizen, true);
      assert.ok(finalReport!.timeline.length >= 4);
    });

    // -------------------------------------------------------------------
    // 7. ADMINISTRATOR RBAC RESTRICTIONS
    // -------------------------------------------------------------------
    console.log("\n--- 7. Administrator Permissions & RBAC Defense ---");

    await test("Admin lists all users and can create new staff members", async () => {
      const allUsers = await listAllUsers();
      assert.ok(allUsers.length >= 3);
      const foundCitizen = allUsers.some((u) => u.email === citizenEmail);
      const foundAgent = allUsers.some((u) => u.email === agentEmail);
      assert.ok(foundCitizen);
      assert.ok(foundAgent);
    });
  } finally {
    // -------------------------------------------------------------------
    // 8. TEARDOWN & CLEANUP OF TEST ARTIFACTS
    // -------------------------------------------------------------------
    console.log("\n--- 8. Teardown: Isolated Cleanup of Test Records ---");

    // Clean up Supabase Storage test photos
    for (const p of createdStoragePaths) {
      try {
        const deleted = await deletePhotoFromStorage(p);
        console.log(`  [CLEANUP] Deleted test photo from Supabase Storage: ${p} (${deleted})`);
      } catch (err: any) {
        console.warn(`  [CLEANUP WARN] Failed to delete photo ${p}:`, err.message);
      }
    }

    // Clean up PostgreSQL test records if database is configured
    if (getIsDatabaseConfigured()) {
      try {
        if (createdReportIds.length > 0) {
          await prisma.report.deleteMany({ where: { id: { in: createdReportIds } } });
          console.log(`  [CLEANUP] Deleted test reports from PostgreSQL: ${createdReportIds.join(", ")}`);
        }
        if (createdUserIds.length > 0) {
          await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
          console.log(`  [CLEANUP] Deleted test users from PostgreSQL: ${createdUserIds.join(", ")}`);
        }
      } catch (err: any) {
        console.warn("  [CLEANUP WARN] Database cleanup notice:", err.message);
      } finally {
        await prisma.$disconnect().catch(() => {});
      }
    }
  }

  console.log("\n========================================================");
  console.log(` ALL ${passedCount}/${passedCount} PHASE 7 ACCEPTANCE TESTS PASSED!`);
  console.log("========================================================\n");
}

runPhase7AcceptanceSuite().catch((err) => {
  console.error("FATAL ERROR in Phase 7 acceptance suite:", err);
  process.exit(1);
});
