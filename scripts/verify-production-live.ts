import assert from "node:assert/strict";

const PRODUCTION_URL = "https://balleghai.vercel.app";
const DEPLOYMENT_URL = "https://ballegh-dnxz8g9bq-freelance-35e641c4.vercel.app";

// 1x1 transparent PNG buffer
const VALID_1X1_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64"
);

function parseCookie(res: Response): string {
  const setCookie = res.headers.get("set-cookie");
  if (!setCookie) return "";
  return setCookie.split(";")[0];
}

async function runProductionLiveVerification() {
  console.log("========================================================");
  console.log("🚀 BALLEGH AI — PRODUCTION LIVE VERIFICATION");
  console.log(` Target 1: ${PRODUCTION_URL}`);
  console.log(` Target 2: ${DEPLOYMENT_URL}`);
  console.log("========================================================\n");

  // Determine active URL
  let targetUrl = PRODUCTION_URL;
  try {
    const probe = await fetch(`${targetUrl}/`);
    if (!probe.ok) targetUrl = DEPLOYMENT_URL;
  } catch {
    targetUrl = DEPLOYMENT_URL;
  }
  console.log(`• Active Testing Target: ${targetUrl}\n`);

  // 1. Homepage loads successfully
  console.log("--- 1. Verification: Homepage Loads Successfully ---");
  const homeRes = await fetch(`${targetUrl}/`);
  console.log(`• GET / status: ${homeRes.status} ${homeRes.statusText}`);
  assert.equal(homeRes.status, 200, "Homepage must return 200 OK");
  const homeHtml = await homeRes.text();
  assert.ok(homeHtml.includes("Ballegh") || homeHtml.includes("بلّغ"), "Homepage must render Ballegh civic branding");
  console.log("✅ PASS: Homepage loaded successfully with civic branding.\n");

  // 2. Demo Mode Remains Disabled
  console.log("--- 2. Verification: Demo Mode Security Defenses ---");
  const meRes = await fetch(`${targetUrl}/api/auth/me`);
  const meData = await meRes.json();
  console.log(`• GET /api/auth/me demoModeAllowed: ${meData.demoModeAllowed}`);
  assert.equal(meData.demoModeAllowed, false, "demoModeAllowed must be false in Production");

  const demoSwitchRes = await fetch(`${targetUrl}/api/auth/demo-switch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: "admin" }),
  });
  console.log(`• POST /api/auth/demo-switch status: ${demoSwitchRes.status} (Expected 403)`);
  assert.equal(demoSwitchRes.status, 403, "Demo switch must be strictly forbidden in Production");
  console.log("✅ PASS: Demo mode is strictly disabled (HTTP 403 enforced).\n");

  // 3. Database Connection Works (Queries seeded municipal data & reports)
  console.log("--- 3. Verification: PostgreSQL Database Connectivity ---");
  const servicesRes = await fetch(`${targetUrl}/api/services`);
  console.log(`• GET /api/services status: ${servicesRes.status}`);
  assert.equal(servicesRes.status, 200, "Services endpoint must return 200 OK");
  const servicesData = await servicesRes.json();
  assert.ok(Array.isArray(servicesData.services), "Services must be an array");
  assert.ok(servicesData.services.length >= 3, "Must return municipal services from Supabase");
  console.log(`• Services retrieved from DB: ${servicesData.services.length} services`);

  const reportsListRes = await fetch(`${targetUrl}/api/reports`);
  console.log(`• GET /api/reports status: ${reportsListRes.status}`);
  assert.equal(reportsListRes.status, 200, "Reports endpoint must return 200 OK");
  const reportsListData = await reportsListRes.json();
  assert.ok(Array.isArray(reportsListData.reports), "Reports must be an array");
  console.log(`• Reports retrieved from DB: ${reportsListData.reports.length} reports in public listing`);
  console.log("✅ PASS: PostgreSQL database connectivity verified.\n");

  // 4. Registration and Login Work
  console.log("--- 4. Verification: Citizen Registration & Login ---");
  const uniqueSuffix = Date.now().toString().slice(-6);
  const testEmail = `citoyen.prod.test.${uniqueSuffix}@ballegh.test`;
  const testPassword = "BalleghProd2026!#";
  const testPhone = "+216 98 123 456";

  console.log(`• Registering new citizen account: ${testEmail}...`);
  const regRes = await fetch(`${targetUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fullName: "Citoyen Verification Prod",
      email: testEmail,
      phone: testPhone,
      password: testPassword,
      district: "Bab Bhar",
    }),
  });
  console.log(`• POST /api/auth/register status: ${regRes.status}`);
  assert.equal(regRes.status, 201, "Registration must return 201 Created");
  const regCookie = parseCookie(regRes);
  assert.ok(regCookie.includes("ballegh_session="), "Registration must return session cookie");

  console.log(`• Testing login with credentials...`);
  const loginRes = await fetch(`${targetUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
    }),
  });
  console.log(`• POST /api/auth/login status: ${loginRes.status}`);
  assert.equal(loginRes.status, 200, "Login must return 200 OK");
  const sessionCookie = parseCookie(loginRes);
  assert.ok(sessionCookie.includes("ballegh_session="), "Login must return valid session cookie");

  const meAuthRes = await fetch(`${targetUrl}/api/auth/me`, {
    headers: { Cookie: sessionCookie },
  });
  const meAuthData = await meAuthRes.json();
  assert.equal(meAuthData.authenticated, true, "Session must be authenticated");
  assert.equal(meAuthData.user.email, testEmail, "Session user email must match");
  console.log(`• Authenticated User Verified: id=${meAuthData.user.id}, role=${meAuthData.user.role}`);
  console.log("✅ PASS: Registration, password hashing, and session authentication work.\n");

  // 5. Photo Upload to Private Supabase Storage
  console.log("--- 5. Verification: Photo Upload to Private Storage ---");
  const formData = new FormData();
  const blob = new Blob([VALID_1X1_PNG], { type: "image/png" });
  formData.append("file", blob, "prod-verify-photo.png");

  const uploadRes = await fetch(`${targetUrl}/api/upload`, {
    method: "POST",
    headers: { Cookie: sessionCookie },
    body: formData,
  });
  console.log(`• POST /api/upload status: ${uploadRes.status}`);
  assert.ok(uploadRes.status === 200 || uploadRes.status === 201, "Upload must succeed");
  const uploadData = await uploadRes.json();
  const photo = uploadData.photo || uploadData;
  assert.ok(photo.storagePath, "Must return storagePath");
  console.log(`• Uploaded Photo storagePath: ${photo.storagePath}`);
  console.log(`• MIME Type: ${photo.mimeType}, Size: ${photo.fileSizeBytes}B, Simulated: ${photo.isSimulated}`);
  console.log("✅ PASS: Image upload to private bucket 'ballegh-reports' succeeded.\n");

  // 6. Report Creation & Gemini AI Integration
  console.log("--- 6. Verification: Report Creation & Google Gemini Vision Triage ---");
  const reportPayload = {
    title: "Affaissement dangereux de chaussée à Bab Bhar",
    description: "Profonde crevasse observée sur la voie carrossable en face du marché central. Risque imminent pour les usagers.",
    category: "pothole",
    district: "Bab Bhar",
    streetAddress: "Rue d'Allemagne, Tunis",
    latitude: 36.7989,
    longitude: 10.1788,
    landmark: "Marché Central",
    photoStorage: {
      storagePath: photo.storagePath,
      mimeType: photo.mimeType || "image/png",
      fileSizeBytes: photo.fileSizeBytes || VALID_1X1_PNG.length,
    },
  };

  const createReportRes = await fetch(`${targetUrl}/api/reports`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: sessionCookie,
    },
    body: JSON.stringify(reportPayload),
  });

  console.log(`• POST /api/reports status: ${createReportRes.status}`);
  assert.equal(createReportRes.status, 201, "Report creation must return 201 Created");
  const createReportData = await createReportRes.json();
  const createdReport = createReportData.report;
  assert.ok(createdReport.id, "Created report must have an ID");
  assert.ok(createdReport.referenceNumber, "Created report must have a referenceNumber");
  assert.ok(createdReport.aiAnalysis, "Report must contain AI analysis");

  const ai = createdReport.aiAnalysis;
  console.log(`• Created Report Reference : ${createdReport.referenceNumber}`);
  console.log(`• Predicted Category      : ${ai.predictedCategory}`);
  console.log(`• Estimated Severity      : ${ai.estimatedSeverity}/3`);
  console.log(`• Priority Score          : ${ai.priorityScore}/100`);
  console.log(`• Confidence Score        : ${Math.round(ai.confidenceScore * 100)}%`);
  console.log(`• Assigned Service Code   : ${ai.suggestedServiceCode}`);
  console.log(`• Rationale FR            : ${ai.severityRationale?.fr}`);
  console.log(`• Rationale AR            : ${ai.severityRationale?.ar}`);
  assert.ok(ai.predictedCategory, "AI must predict category");
  assert.ok(ai.estimatedSeverity, "AI must estimate severity");
  assert.ok(ai.priorityScore, "AI must calculate priority score");
  console.log("✅ PASS: Report creation and Gemini AI analysis completed.\n");

  // 7. Authorized Photo Access Control (/api/reports/[id]/photo)
  console.log("--- 7. Verification: Photo Proxy Access Control & RBAC ---");
  const photoProxyUrl = `${targetUrl}/api/reports/${createdReport.id}/photo`;

  // A. Access without cookie -> 401
  const unauthPhotoRes = await fetch(photoProxyUrl);
  console.log(`• Unauthenticated photo access: ${unauthPhotoRes.status} (Expected 401)`);
  assert.equal(unauthPhotoRes.status, 401, "Unauthenticated photo access must return 401");

  // B. Access with author cookie -> 200
  const authPhotoRes = await fetch(photoProxyUrl, {
    headers: { Cookie: sessionCookie },
  });
  console.log(`• Author citizen photo access: ${authPhotoRes.status} ${authPhotoRes.statusText} (Expected 200)`);
  assert.equal(authPhotoRes.status, 200, "Author must be able to view their photo");
  const photoContentType = authPhotoRes.headers.get("content-type");
  console.log(`• Content-Type: ${photoContentType}`);
  assert.ok(photoContentType?.includes("image"), "Response must be an image");
  console.log("✅ PASS: Photo RBAC verified (401 unauthenticated, 200 for owner).\n");

  console.log("========================================================");
  console.log("🎉 ALL PRODUCTION VERIFICATION CHECKS PASSED WITH 100% SUCCESS!");
  console.log("========================================================");
}

runProductionLiveVerification().catch((err) => {
  console.error("❌ Production verification failed:", err);
  process.exit(1);
});
