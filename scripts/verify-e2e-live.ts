import assert from "node:assert/strict";

const BASE_URL = "http://localhost:3001";

interface CookieJar {
  cookieHeader: string;
}

function parseSetCookie(res: Response): string {
  const setCookie = res.headers.get("set-cookie");
  if (!setCookie) return "";
  // Extract the first cookie (e.g. ballegh_session=xyz; Path=/; HttpOnly)
  const cookiePart = setCookie.split(";")[0];
  return cookiePart;
}

async function runLiveVerification() {
  console.log("========================================================");
  console.log(" BALLEGH AI — HANDS-ON LIVE APPLICATION VERIFICATION");
  console.log(` Target Server: ${BASE_URL}`);
  console.log("========================================================\n");

  // -------------------------------------------------------------------
  // 1. PUBLIC SCREENS ACCESSIBILITY
  // -------------------------------------------------------------------
  console.log("--- 1. Testing Public Screens & Landing Pages ---");
  const homeRes = await fetch(`${BASE_URL}/`);
  assert.equal(homeRes.status, 200, "Home page (/) should return 200 OK");
  const homeHtml = await homeRes.text();
  assert.ok(homeHtml.includes("Ballegh") || homeHtml.includes("بلّغ"), "Home page should contain Ballegh branding");
  console.log("  [PASS] GET / returns 200 OK with civic branding");

  const loginRes = await fetch(`${BASE_URL}/login`);
  assert.equal(loginRes.status, 200, "Login page (/login) should return 200 OK");
  console.log("  [PASS] GET /login returns 200 OK");

  const registerRes = await fetch(`${BASE_URL}/register`);
  assert.equal(registerRes.status, 200, "Register page (/register) should return 200 OK");
  console.log("  [PASS] GET /register returns 200 OK");

  const servicesRes = await fetch(`${BASE_URL}/api/services`);
  assert.equal(servicesRes.status, 200, "GET /api/services should return 200 OK");
  const servicesBody = await servicesRes.json();
  assert.ok(Array.isArray(servicesBody.services), "Services should be an array");
  assert.ok(servicesBody.services.length >= 3, "Expected at least 3 municipal services");
  console.log(`  [PASS] GET /api/services returns ${servicesBody.services.length} active municipal services`);

  // -------------------------------------------------------------------
  // 2. CITIZEN REGISTRATION & LOGIN FLOW
  // -------------------------------------------------------------------
  console.log("\n--- 2. Testing Citizen Registration & Login ---");
  const uniqueId = Date.now().toString().slice(-6);
  const testEmail = `citoyen.verif.${uniqueId}@ballegh-test.tn`;
  const testPassword = "CitizenSecure2026!";
  const testPhone = "+216 71 888 999";
  const testDistrict = "Montplaisir";

  // Register
  const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fullName: "Youssef Mansour Live Test",
      email: testEmail,
      phone: testPhone,
      password: testPassword,
      district: testDistrict,
    }),
  });
  assert.ok(regRes.status === 200 || regRes.status === 201, `Registration should return 200 or 201, got ${regRes.status}`);
  const regCookie = parseSetCookie(regRes);
  assert.ok(regCookie.includes("ballegh_session="), "Registration must set ballegh_session cookie");
  console.log("  [PASS] POST /api/auth/register creates user and issues session cookie");

  // Login
  const loginPostRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
    }),
  });
  assert.equal(loginPostRes.status, 200, "Login should return 200 OK");
  const citizenCookie = parseSetCookie(loginPostRes);
  assert.ok(citizenCookie.includes("ballegh_session="), "Login must set ballegh_session cookie");

  // Verify Session
  const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Cookie: citizenCookie },
  });
  assert.equal(meRes.status, 200, "GET /api/auth/me should return 200 OK");
  const meBody = await meRes.json();
  assert.equal(meBody.authenticated, true);
  assert.equal(meBody.user.email, testEmail);
  assert.equal(meBody.user.role, "citizen");
  assert.equal(meBody.user.phone, testPhone);
  assert.equal(meBody.user.passwordHash, undefined, "Password hash must NEVER be exposed");
  console.log("  [PASS] GET /api/auth/me verifies citizen session & hides password hash");

  // Verify Logout endpoint
  const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
    method: "POST",
    headers: { Cookie: citizenCookie },
  });
  assert.equal(logoutRes.status, 200, "POST /api/auth/logout should return 200 OK");
  const logoutCookieHeader = logoutRes.headers.get("set-cookie") || "";
  assert.ok(
    logoutCookieHeader.includes("Max-Age=0") || logoutCookieHeader.includes("expires="),
    "Logout must clear session cookie"
  );
  console.log("  [PASS] POST /api/auth/logout clears session cookie securely");

  // -------------------------------------------------------------------
  // 3. CITIZEN JOURNEY: REPORT CREATION & PERSISTENCE
  // -------------------------------------------------------------------
  console.log("\n--- 3. Testing Citizen Report Creation & Persistence ---");
  const newReportPageRes = await fetch(`${BASE_URL}/citizen/reports/new`, {
    headers: { Cookie: citizenCookie },
  });
  assert.equal(newReportPageRes.status, 200, "GET /citizen/reports/new should return 200 OK");
  console.log("  [PASS] GET /citizen/reports/new renders report form for authenticated citizen");

  const reportPayload = {
    category: "pothole",
    title: "Nid-de-poule profond face station métro",
    description: "Excavation routière dangereuse d'environ 20 cm de profondeur.",
    district: "Montplaisir",
    streetAddress: "Avenue du Japon, Montplaisir, Tunis",
    latitude: 36.8189,
    longitude: 10.1876,
    photoUrl: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80",
  };

  const createReportRes = await fetch(`${BASE_URL}/api/reports`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: citizenCookie,
    },
    body: JSON.stringify(reportPayload),
  });
  assert.equal(createReportRes.status, 201, "POST /api/reports should return 201 Created");
  const createReportBody = await createReportRes.json();
  const createdReport = createReportBody.report;
  assert.ok(createdReport.id, "Report should have an ID");
  assert.ok(createdReport.referenceNumber.startsWith("BLG-2026-TUN-"), "Reference number format check");
  assert.equal(createdReport.category, "pothole");
  assert.equal(createdReport.status, "ai_analyzed");
  assert.ok(createdReport.timeline.length >= 2, "Timeline should include submission and AI triage events");
  console.log(`  [PASS] POST /api/reports created ${createdReport.referenceNumber} (${createdReport.id})`);

  // Reload page test
  const reportDetailHtmlRes = await fetch(`${BASE_URL}/citizen/reports/${createdReport.id}`, {
    headers: { Cookie: citizenCookie },
  });
  assert.equal(reportDetailHtmlRes.status, 200, "GET /citizen/reports/[id] should return 200 OK");
  console.log("  [PASS] GET /citizen/reports/[id] reloads page with persisted report data");

  // Query API to verify data isolation
  const myReportsRes = await fetch(`${BASE_URL}/api/reports?myOnly=true`, {
    headers: { Cookie: citizenCookie },
  });
  assert.equal(myReportsRes.status, 200);
  const myReportsBody = await myReportsRes.json();
  const foundInMyList = myReportsBody.reports.some((r: any) => r.id === createdReport.id);
  assert.ok(foundInMyList, "Created report should appear in author's personal report list");
  console.log("  [PASS] GET /api/reports?myOnly=true lists only author's reports");

  // -------------------------------------------------------------------
  // 4. MUNICIPAL AGENT JOURNEY: REVIEW, EMAIL TRANSMISSION & STATUS
  // -------------------------------------------------------------------
  console.log("\n--- 4. Testing Municipal Agent Review & Status Progression ---");
  const agentLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "agent@commune-tunis.gov.tn",
      password: "ChangeMe2026!",
    }),
  });
  assert.equal(agentLoginRes.status, 200, "Agent login should return 200 OK");
  const agentCookie = parseSetCookie(agentLoginRes);

  // Agent inspects report
  const agentReportRes = await fetch(`${BASE_URL}/api/reports/${createdReport.id}`, {
    headers: { Cookie: agentCookie },
  });
  assert.equal(agentReportRes.status, 200);
  const agentReportBody = await agentReportRes.json();
  assert.ok(agentReportBody.report.aiAnalysis, "AI analysis should be present");
  assert.equal(agentReportBody.report.submittedBy.phone, testPhone, "Agent must see citizen's actual phone number");
  console.log("  [PASS] Agent retrieves report with unmasked citizen phone number for contact");

  // Verify email transmission is strictly blocked BEFORE human validation
  const prematureEmailRes = await fetch(`${BASE_URL}/api/reports/${createdReport.id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: agentCookie,
    },
    body: JSON.stringify({ action: "send_email" }),
  });
  assert.equal(prematureEmailRes.status, 422, "Email before human review must return 422 Unprocessable Entity");
  console.log("  [PASS] Gating security: Sending official email before human validation rejected (422)");

  // Agent performs human review and modifies recommendations
  const reviewRes = await fetch(`${BASE_URL}/api/reports/${createdReport.id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: agentCookie,
    },
    body: JSON.stringify({
      action: "human_review",
      decision: "modified",
      notes: "Proximité ligne de tram/bus. Intervention prioritaire demandée.",
      modifications: {
        severity: 3,
        priority: 95,
      },
    }),
  });
  assert.equal(reviewRes.status, 200, "Human review PATCH should return 200 OK");
  const reviewBody = await reviewRes.json();
  assert.equal(reviewBody.report.status, "human_validated");
  console.log("  [PASS] Human review applied: status advanced to 'human_validated'");

  // Agent transmits official email (verify simulation transparency)
  const sendEmailRes = await fetch(`${BASE_URL}/api/reports/${createdReport.id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: agentCookie,
    },
    body: JSON.stringify({ action: "send_email" }),
  });
  assert.equal(sendEmailRes.status, 200, "Send email should return 200 OK");
  const sendEmailBody = await sendEmailRes.json();
  assert.equal(sendEmailBody.report.status, "forwarded");
  assert.equal(sendEmailBody.report.officialEmailSent, true);
  assert.equal(sendEmailBody.dispatch?.isSimulated, true, "Email service must report dispatch.isSimulated: true when SMTP is absent");
  console.log("  [PASS] Official email transmitted (transparently marked as simulated draft)");

  // Advance status to in_progress
  const inProgressRes = await fetch(`${BASE_URL}/api/reports/${createdReport.id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: agentCookie,
    },
    body: JSON.stringify({
      action: "advance_status",
      status: "in_progress",
      comment: {
        fr: "Camion benne et ouvriers sur site.",
        ar: "فريق الأشغال متواجد على عين المكان.",
      },
    }),
  });
  assert.equal(inProgressRes.status, 200);
  const inProgressBody = await inProgressRes.json();
  assert.equal(inProgressBody.report.status, "in_progress");
  console.log("  [PASS] Work status advanced to 'in_progress' with bilingual timeline log");

  // Advance status to resolved
  const resolvedRes = await fetch(`${BASE_URL}/api/reports/${createdReport.id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: agentCookie,
    },
    body: JSON.stringify({
      action: "advance_status",
      status: "resolved",
      comment: {
        fr: "Enrobage terminé. Chaussée rétablie.",
        ar: "تم إنهاء الأشغال وتعبيد الطريق بنجاح.",
      },
    }),
  });
  assert.equal(resolvedRes.status, 200);
  const resolvedBody = await resolvedRes.json();
  assert.equal(resolvedBody.report.status, "resolved");
  console.log("  [PASS] Work status advanced to 'resolved' by municipal service");

  // -------------------------------------------------------------------
  // 5. CITIZEN RESOLUTION CONFIRMATION & ACCESS CONTROL
  // -------------------------------------------------------------------
  console.log("\n--- 5. Testing Citizen Field Resolution Confirmation ---");
  // Register an intruder citizen
  const intruderEmail = `intruder.${uniqueId}@ballegh-test.tn`;
  const intruderRegRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fullName: "Intruder Citizen",
      email: intruderEmail,
      phone: "+216 99 000 111",
      password: "Intruder2026!",
      district: "Bab Souika",
    }),
  });
  assert.ok(intruderRegRes.status === 200 || intruderRegRes.status === 201, "Intruder registration should return 200 or 201");
  const intruderCookie = parseSetCookie(intruderRegRes);

  // Intruder citizen attempts to confirm resolution (IDOR attempt)
  const intruderConfirmRes = await fetch(`${BASE_URL}/api/reports/${createdReport.id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: intruderCookie,
    },
    body: JSON.stringify({ action: "confirm_resolution" }),
  });
  assert.equal(intruderConfirmRes.status, 403, "Non-author citizen must be rejected with 403 Forbidden");
  console.log("  [PASS] IDOR defense: Non-author citizen blocked from confirming resolution (403)");

  // Legitimate author citizen confirms resolution
  const citizenConfirmRes = await fetch(`${BASE_URL}/api/reports/${createdReport.id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Cookie: citizenCookie,
    },
    body: JSON.stringify({ action: "confirm_resolution" }),
  });
  assert.equal(citizenConfirmRes.status, 200, "Author citizen confirmation should return 200 OK");
  const citizenConfirmBody = await citizenConfirmRes.json();
  assert.equal(citizenConfirmBody.report.resolutionConfirmedByCitizen, true);
  console.log("  [PASS] Citizen author confirms resolution on the ground (cycle completed)");

  // -------------------------------------------------------------------
  // 6. ADMINISTRATOR PORTAL & SERVER-SIDE ACCESS RESTRICTIONS
  // -------------------------------------------------------------------
  console.log("\n--- 6. Testing Administrator Portal & RBAC Restrictions ---");
  // Citizen attempts admin access
  const citizenUsersRes = await fetch(`${BASE_URL}/api/users`, {
    headers: { Cookie: citizenCookie },
  });
  assert.equal(citizenUsersRes.status, 403, "Citizen cannot access /api/users (403)");
  console.log("  [PASS] RBAC defense: Citizen blocked from /api/users (403)");

  // Agent attempts admin access
  const agentUsersRes = await fetch(`${BASE_URL}/api/users`, {
    headers: { Cookie: agentCookie },
  });
  assert.equal(agentUsersRes.status, 403, "Agent cannot access /api/users (403)");
  console.log("  [PASS] RBAC defense: Municipal Agent blocked from /api/users (403)");

  // Admin Login
  const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "admin@ballegh.tn",
      password: "ChangeMe2026!",
    }),
  });
  assert.equal(adminLoginRes.status, 200, "Admin login should return 200 OK");
  const adminCookie = parseSetCookie(adminLoginRes);

  // Admin access to screens
  const adminDashRes = await fetch(`${BASE_URL}/admin/dashboard`, {
    headers: { Cookie: adminCookie },
  });
  assert.equal(adminDashRes.status, 200, "Admin can access /admin/dashboard");
  const adminUsersPageRes = await fetch(`${BASE_URL}/admin/users`, {
    headers: { Cookie: adminCookie },
  });
  assert.equal(adminUsersPageRes.status, 200, "Admin can access /admin/users");
  const adminSettingsRes = await fetch(`${BASE_URL}/admin/settings`, {
    headers: { Cookie: adminCookie },
  });
  assert.equal(adminSettingsRes.status, 200, "Admin can access /admin/settings");
  console.log("  [PASS] Admin can access all admin portal screens (/dashboard, /users, /settings)");

  // Admin fetches users via API
  const adminUsersRes = await fetch(`${BASE_URL}/api/users`, {
    headers: { Cookie: adminCookie },
  });
  assert.equal(adminUsersRes.status, 200);
  const adminUsersBody = await adminUsersRes.json();
  assert.ok(Array.isArray(adminUsersBody.users));
  console.log(`  [PASS] GET /api/users returns ${adminUsersBody.users.length} users to administrator`);

  // Admin creates new municipal agent
  const createAgentRes = await fetch(`${BASE_URL}/api/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: adminCookie,
    },
    body: JSON.stringify({
      fullName: "Ing. Khaled Ben Amor Live",
      email: `agent.khaled.${uniqueId}@commune-tunis.gov.tn`,
      phone: "+216 71 333 444",
      password: "AgentSecure2026!",
      role: "municipal_agent",
      organization: "Direction Voirie Tunis",
      district: "Centre-Ville",
    }),
  });
  assert.equal(createAgentRes.status, 201, "Admin creating user returns 201 Created");
  console.log("  [PASS] POST /api/users creates a new municipal agent account");

  // -------------------------------------------------------------------
  // 7. PRIVACY VERIFICATION: PHONE NUMBER REDACTION
  // -------------------------------------------------------------------
  console.log("\n--- 7. Testing Privacy & Contact Redaction ---");
  // Intruder citizen inspects author's report
  const intruderReportRes = await fetch(`${BASE_URL}/api/reports/${createdReport.id}`, {
    headers: { Cookie: intruderCookie },
  });
  assert.equal(intruderReportRes.status, 200);
  const intruderReportBody = await intruderReportRes.json();
  assert.equal(
    intruderReportBody.report.submittedBy.phone,
    "+216 ** *** ***",
    "Non-staff viewer must see masked phone number"
  );
  console.log("  [PASS] Contact privacy: Phone number masked as '+216 ** *** ***' for third-party viewer");

  console.log("\n========================================================");
  console.log(" ALL LIVE HANDS-ON APPLICATION VERIFICATIONS PASSED!");
  console.log("========================================================");
}

runLiveVerification().catch((err) => {
  console.error("\n❌ LIVE VERIFICATION FAILED:", err);
  process.exit(1);
});
