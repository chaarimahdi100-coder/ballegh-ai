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
  detectImageMimeType,
  validateImageBuffer,
  generateSecureStoragePath,
  uploadPhotoToStorage,
  deletePhotoFromStorage,
  getPhotoBufferFromStorage,
  _resetInMemoryStorage,
  MAX_FILE_SIZE_BYTES,
} from "../lib/storage/supabaseStorage";
import { POST as uploadPostHandler } from "../app/api/upload/route";
import { GET as reportsGetHandler, POST as reportsPostHandler } from "../app/api/reports/route";
import { GET as reportDetailGetHandler } from "../app/api/reports/[id]/route";
import { GET as photoProxyGetHandler } from "../app/api/reports/[id]/photo/route";
import { migrateLegacyPhotos } from "../scripts/migrate-photos-to-storage";

// Real image header bytes fixtures
const VALID_JPEG_BUFFER = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x60,
  0x00, 0x60, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
]);

const VALID_PNG_BUFFER = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
]);

const VALID_WEBP_BUFFER = Buffer.concat([
  Buffer.from("RIFF"),
  Buffer.from([0x20, 0x00, 0x00, 0x00]),
  Buffer.from("WEBP"),
  Buffer.from("VP8 "),
  Buffer.from([0x14, 0x00, 0x00, 0x00]),
]);

const FAKE_IMAGE_TEXT_BUFFER = Buffer.from(
  "<html><script>alert('malicious')</script></html>",
  "utf-8"
);

function buildMultipartUploadRequest(
  buffer: Buffer | null,
  fileName: string = "photo.jpg",
  token?: string
): Request {
  const formData = new FormData();
  if (buffer) {
    const blob = new Blob([new Uint8Array(buffer)]);
    formData.append("file", blob, fileName);
  }

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

async function runPhase5Tests() {
  console.log("\n========================================================");
  console.log(" BALLEGH AI — PHASE 5: PRODUCTION STORAGE & IMAGE RBAC");
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

  // Pre-generate tokens
  const citizenAuthorToken = await createSessionToken({
    userId: "usr_citizen_p5_author",
    email: "citizen.p5.author@ballegh.tn",
    fullName: "Mehdi Riahi",
    phone: "+216 98 111 222",
    role: "citizen",
    district: "El Menzah",
  });

  const citizenIntruderToken = await createSessionToken({
    userId: "usr_citizen_p5_intruder",
    email: "intruder.p5@ballegh.tn",
    fullName: "Autre Citoyen",
    phone: "+216 98 999 888",
    role: "citizen",
    district: "Carthage",
  });

  const municipalAgentToken = await createSessionToken({
    userId: "usr_agent_p5",
    email: "agent.p5@commune-tunis.gov.tn",
    fullName: "Ing. Samira Trabelsi",
    phone: "+216 71 345 678",
    role: "municipal_agent",
    district: "Direction de la Voirie et Travaux",
    organization: "Commune de Tunis",
  });

  const adminToken = await createSessionToken({
    userId: "usr_admin_p5",
    email: "admin.p5@commune-tunis.gov.tn",
    fullName: "Karim Mansour",
    phone: "+216 71 890 123",
    role: "admin",
    organization: "DSI Ville de Tunis",
  });

  // ---------------------------------------------------------
  // TEST SUITE 1: MAGIC BYTES & CONTENT-TYPE VERIFICATION
  // ---------------------------------------------------------
  console.log("--- 1. Magic Bytes & MIME Type Inspection ---");

  await test("Detects valid JPEG from binary signature (FF D8 FF)", async () => {
    const mime = detectImageMimeType(VALID_JPEG_BUFFER);
    assert.equal(mime, "image/jpeg");
  });

  await test("Detects valid PNG from binary signature (89 50 4E 47 0D 0A 1A 0A)", async () => {
    const mime = detectImageMimeType(VALID_PNG_BUFFER);
    assert.equal(mime, "image/png");
  });

  await test("Detects valid WebP from binary signature (RIFF...WEBP)", async () => {
    const mime = detectImageMimeType(VALID_WEBP_BUFFER);
    assert.equal(mime, "image/webp");
  });

  await test("Rejects fake images (HTML/executable) pretending to be JPEG", async () => {
    const mime = detectImageMimeType(FAKE_IMAGE_TEXT_BUFFER);
    assert.equal(mime, null);
    const validation = validateImageBuffer(FAKE_IMAGE_TEXT_BUFFER);
    assert.equal(validation.valid, false);
    assert.ok(validation.error?.includes("octets magiques"));
  });

  await test("Rejects images exceeding strict 5 MB limit", async () => {
    const oversizedBuffer = Buffer.alloc(MAX_FILE_SIZE_BYTES + 1024, 0xff);
    const validation = validateImageBuffer(oversizedBuffer);
    assert.equal(validation.valid, false);
    assert.ok(validation.error?.includes("5 Mo"));
  });

  // ---------------------------------------------------------
  // TEST SUITE 2: STORAGE PATH GENERATION & CRUD ENGINE
  // ---------------------------------------------------------
  console.log("\n--- 2. Storage Path Generation & Lifecycle Engine ---");

  await test("Generates unique, non-guessable storage paths with proper date partition", async () => {
    const path1 = generateSecureStoragePath("image/jpeg");
    const path2 = generateSecureStoragePath("image/png");
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, "0");

    assert.ok(path1.startsWith(`reports/${year}/${month}/`), "Must partition by year/month");
    assert.ok(path1.endsWith(".jpg"), "Must map JPEG to .jpg extension");
    assert.ok(path2.endsWith(".png"), "Must map PNG to .png extension");
    assert.notEqual(path1, path2, "Paths must be unique UUIDs");
  });

  let testUploadedStoragePath = "";

  await test("Uploads valid buffer to storage and verifies binary retrieval", async () => {
    _resetInMemoryStorage();
    const uploadResult = await uploadPhotoToStorage(VALID_JPEG_BUFFER);
    assert.ok(uploadResult.storagePath);
    assert.equal(uploadResult.mimeType, "image/jpeg");
    assert.equal(uploadResult.fileSizeBytes, VALID_JPEG_BUFFER.length);
    testUploadedStoragePath = uploadResult.storagePath;

    // Retrieve from storage
    const retrieved = await getPhotoBufferFromStorage(uploadResult.storagePath);
    assert.ok(retrieved);
    assert.equal(retrieved.mimeType, "image/jpeg");
    assert.equal(retrieved.buffer.length, VALID_JPEG_BUFFER.length);
    assert.deepEqual(retrieved.buffer, VALID_JPEG_BUFFER);
  });

  await test("Deletes photo from storage (orphaned file cleanup / rollback)", async () => {
    const deleted = await deletePhotoFromStorage(testUploadedStoragePath);
    assert.equal(deleted, true);

    const check = await getPhotoBufferFromStorage(testUploadedStoragePath);
    assert.equal(check, null, "Deleted photo must no longer exist in storage");
  });

  // ---------------------------------------------------------
  // TEST SUITE 3: SECURE UPLOAD API ROUTE (/api/upload)
  // ---------------------------------------------------------
  console.log("\n--- 3. Upload API Route Security & Validation (/api/upload) ---");

  await test("Rejects unauthenticated upload request with 401 Unauthorized", async () => {
    const req = buildMultipartUploadRequest(VALID_JPEG_BUFFER, "pothole.jpg");
    const res = await uploadPostHandler(req);
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.ok(body.error?.includes("Authentification requise"));
  });

  await test("Rejects upload with missing file field with 400 Bad Request", async () => {
    const req = buildMultipartUploadRequest(null, "pothole.jpg", citizenAuthorToken);
    const res = await uploadPostHandler(req);
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.ok(body.error?.includes("manquant"));
  });

  await test("Rejects fake/malicious file content with 400 Bad Request", async () => {
    const req = buildMultipartUploadRequest(FAKE_IMAGE_TEXT_BUFFER, "fake.jpg", citizenAuthorToken);
    const res = await uploadPostHandler(req);
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.code, "INVALID_FILE_TYPE");
  });

  await test("Rejects oversized file (> 5MB) with 413 Payload Too Large", async () => {
    const bigBuffer = Buffer.alloc(MAX_FILE_SIZE_BYTES + 2048, 0x00);
    const req = buildMultipartUploadRequest(bigBuffer, "huge.jpg", citizenAuthorToken);
    const res = await uploadPostHandler(req);
    assert.equal(res.status, 413);
    const body = await res.json();
    assert.equal(body.code, "FILE_TOO_LARGE");
  });

  let citizenUploadedPhotoMeta: {
    storagePath: string;
    mimeType: string;
    fileSizeBytes: number;
  } | null = null;

  await test("Successfully uploads valid JPEG for authenticated citizen", async () => {
    const req = buildMultipartUploadRequest(VALID_JPEG_BUFFER, "chaussee_abimee.jpg", citizenAuthorToken);
    const res = await uploadPostHandler(req);
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.photo.storagePath);
    assert.equal(body.photo.mimeType, "image/jpeg");
    assert.equal(body.photo.fileSizeBytes, VALID_JPEG_BUFFER.length);

    citizenUploadedPhotoMeta = body.photo;
  });

  await test("Successfully uploads valid PNG for authenticated municipal agent", async () => {
    const req = buildMultipartUploadRequest(VALID_PNG_BUFFER, "inspection.png", municipalAgentToken);
    const res = await uploadPostHandler(req);
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.photo.mimeType, "image/png");
  });

  // ---------------------------------------------------------
  // TEST SUITE 4: REPORT CREATION WITH STORAGE METADATA
  // ---------------------------------------------------------
  console.log("\n--- 4. Report Creation with Photo Storage & Proxy Resolution ---");

  let createdReportWithStorageId = "";

  await test("Creates report referencing uploaded storage photo and sets proxy URL", async () => {
    assert.ok(citizenUploadedPhotoMeta, "Prerequisite upload metadata must be present");

    const req = buildJsonRequest(
      "http://localhost:3000/api/reports",
      "POST",
      {
        category: "pothole",
        title: "Nid-de-poule dangereux avenue Habib Bourguiba",
        description: "Crevasse importante sur la chaussée causant des dégâts aux essieux.",
        district: "Bab Bhar",
        streetAddress: "45 Avenue Habib Bourguiba, Tunis",
        photoStorage: citizenUploadedPhotoMeta,
      },
      citizenAuthorToken
    );

    const res = await reportsPostHandler(req);
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.report.id);
    createdReportWithStorageId = body.report.id;

    // Check proxy URL formatting
    assert.equal(body.report.photos.length, 1);
    assert.equal(body.report.photos[0].url, `/api/reports/${body.report.id}/photo`);

    // CRITICAL SECURITY CHECK: storagePath MUST NOT be exposed in public API response
    assert.equal(body.report.photos[0].storagePath, undefined, "storagePath must be stripped from API response");
  });

  // ---------------------------------------------------------
  // TEST SUITE 5: AUTHENTICATED PHOTO PROXY ROUTE & RBAC (/api/reports/[id]/photo)
  // ---------------------------------------------------------
  console.log("\n--- 5. Authenticated Photo Proxy & Authorization Gate (/api/reports/[id]/photo) ---");

  await test("Rejects unauthenticated access to report photo with 401 Unauthorized", async () => {
    const req = buildJsonRequest(`http://localhost:3000/api/reports/${createdReportWithStorageId}/photo`);
    const res = await photoProxyGetHandler(req, {
      params: Promise.resolve({ id: createdReportWithStorageId }),
    });
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.ok(body.error?.includes("Authentification requise"));
  });

  await test("Rejects non-author citizen from accessing private photo with 403 Forbidden", async () => {
    const req = buildJsonRequest(
      `http://localhost:3000/api/reports/${createdReportWithStorageId}/photo`,
      "GET",
      undefined,
      citizenIntruderToken
    );
    const res = await photoProxyGetHandler(req, {
      params: Promise.resolve({ id: createdReportWithStorageId }),
    });
    assert.equal(res.status, 403);
    const body = await res.json();
    assert.ok(body.error?.includes("Accès refusé"));
  });

  await test("Allows author citizen to access report photo with 200 and correct security headers", async () => {
    const req = buildJsonRequest(
      `http://localhost:3000/api/reports/${createdReportWithStorageId}/photo`,
      "GET",
      undefined,
      citizenAuthorToken
    );
    const res = await photoProxyGetHandler(req, {
      params: Promise.resolve({ id: createdReportWithStorageId }),
    });
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("Content-Type"), "image/jpeg");
    assert.equal(res.headers.get("Cache-Control"), "private, max-age=3600");
    assert.equal(res.headers.get("X-Content-Type-Options"), "nosniff");

    const arrayBuf = await res.arrayBuffer();
    assert.equal(arrayBuf.byteLength, VALID_JPEG_BUFFER.length);
  });

  await test("Allows municipal agent to inspect report photo with 200 OK", async () => {
    const req = buildJsonRequest(
      `http://localhost:3000/api/reports/${createdReportWithStorageId}/photo`,
      "GET",
      undefined,
      municipalAgentToken
    );
    const res = await photoProxyGetHandler(req, {
      params: Promise.resolve({ id: createdReportWithStorageId }),
    });
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("Content-Type"), "image/jpeg");
  });

  await test("Allows administrator to inspect report photo with 200 OK", async () => {
    const req = buildJsonRequest(
      `http://localhost:3000/api/reports/${createdReportWithStorageId}/photo`,
      "GET",
      undefined,
      adminToken
    );
    const res = await photoProxyGetHandler(req, {
      params: Promise.resolve({ id: createdReportWithStorageId }),
    });
    assert.equal(res.status, 200);
  });

  await test("Returns 404 for non-existent report ID", async () => {
    const req = buildJsonRequest(
      "http://localhost:3000/api/reports/rep-nonexistent-999/photo",
      "GET",
      undefined,
      municipalAgentToken
    );
    const res = await photoProxyGetHandler(req, {
      params: Promise.resolve({ id: "rep-nonexistent-999" }),
    });
    assert.equal(res.status, 404);
  });

  // ---------------------------------------------------------
  // TEST SUITE 6: PRIVACY AUDIT IN REPORT LIST & DETAILS
  // ---------------------------------------------------------
  console.log("\n--- 6. Public API Privacy Audit (Storage Path & Contact Obfuscation) ---");

  await test("Report detail API (/api/reports/[id]) does not leak storagePath", async () => {
    const req = buildJsonRequest(
      `http://localhost:3000/api/reports/${createdReportWithStorageId}`,
      "GET",
      undefined,
      citizenAuthorToken
    );
    const res = await reportDetailGetHandler(req, {
      params: Promise.resolve({ id: createdReportWithStorageId }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.report.photos[0].storagePath, undefined, "storagePath must be omitted in detail GET");
  });

  await test("Report listing API (/api/reports) does not leak storagePath", async () => {
    const req = buildJsonRequest("http://localhost:3000/api/reports", "GET", undefined, citizenAuthorToken);
    const res = await reportsGetHandler(req);
    assert.equal(res.status, 200);
    const body = await res.json();
    for (const report of body.reports) {
      for (const photo of report.photos) {
        assert.equal(photo.storagePath, undefined, "No photo in list can expose storagePath");
      }
    }
  });

  // ---------------------------------------------------------
  // TEST SUITE 7: BASE64 TO STORAGE MIGRATION SCRIPT DRY-RUN
  // ---------------------------------------------------------
  console.log("\n--- 7. Migration Tooling Verification (Dry-Run Audit) ---");

  await test("Migration script executes dry-run audit cleanly without exceptions", async () => {
    const summary = await migrateLegacyPhotos({ dryRun: true });
    assert.ok(typeof summary.scanned === "number");
    assert.ok(typeof summary.base64Found === "number");
    assert.ok(typeof summary.migrated === "number");
    assert.ok(typeof summary.skipped === "number");
    assert.equal(summary.errors, 0, "Dry run must encounter zero unhandled errors");
  });

  console.log("\n========================================================");
  console.log(` ALL ${passedTests}/${totalTests} PHASE 5 STORAGE & RBAC TESTS PASSED!`);
  console.log("========================================================\n");
}

runPhase5Tests().catch((err) => {
  console.error("\n[PHASE 5 TEST RUNNER FATAL ERROR]:", err);
  process.exit(1);
});
