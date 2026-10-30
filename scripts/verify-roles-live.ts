import assert from "assert";

const PROD_URL = process.env.PRODUCTION_URL || "https://balleghai.vercel.app";

interface TestContext {
  citizenCookie?: string;
  agentCookie?: string;
  adminCookie?: string;
  newAgentCookie?: string;
}

const ctx: TestContext = {};

function extractSessionCookie(res: Response): string | undefined {
  const setCookie = res.headers.get("set-cookie");
  if (!setCookie) return undefined;
  const match = setCookie.match(/ballegh_session=([^;]+)/);
  return match ? `ballegh_session=${match[1]}` : undefined;
}

async function run() {
  console.log(`\n======================================================`);
  console.log(` Ballegh AI — Production RBAC & Role Access Live Audit`);
  console.log(` Target: ${PROD_URL}`);
  console.log(` Timestamp: ${new Date().toISOString()}`);
  console.log(`======================================================\n`);

  // -------------------------------------------------------------------------
  // 1. Citizen Role Verification
  // -------------------------------------------------------------------------
  console.log(`--- [1/5] Testing Citizen Experience & Route Isolation ---`);
  
  // Register a distinct verification citizen to test clean state
  const testCitizenEmail = `citoyen.audit.${Date.now()}@ballegh.test`;
  console.log(`Registering new citizen: ${testCitizenEmail}`);
  const regRes = await fetch(`${PROD_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fullName: "Citoyen Audit Role",
      email: testCitizenEmail,
      password: "ChangeMe2026!",
      phone: "+216 98 111 222",
      district: "Bab Souika",
      // Attacking field injection test: trying to escalate to ADMIN
      role: "ADMIN",
    }),
  });

  assert.strictEqual(regRes.status, 201, `Citizen registration failed: ${regRes.statusText}`);
  ctx.citizenCookie = extractSessionCookie(regRes);
  assert.ok(ctx.citizenCookie, "Citizen session cookie missing from register response");

  // Check /api/auth/me to verify assigned role is strictly CITIZEN (privilege escalation blocked)
  const meCitizenRes = await fetch(`${PROD_URL}/api/auth/me`, {
    headers: { Cookie: ctx.citizenCookie },
  });
  assert.strictEqual(meCitizenRes.status, 200, "Citizen /api/auth/me failed");
  const meCitizenData = await meCitizenRes.json();
  assert.strictEqual(meCitizenData.user.role, "citizen", "CRITICAL: Privilege escalation allowed in registration!");
  console.log(`[PASS] Citizen registered; role is strictly "citizen" (role parameter was sanitized/ignored).`);

  // Verify Citizen Dashboard (200 OK)
  const citizenDashRes = await fetch(`${PROD_URL}/citizen/dashboard`, {
    headers: { Cookie: ctx.citizenCookie },
    redirect: "manual",
  });
  assert.strictEqual(citizenDashRes.status, 200, "Citizen dashboard access failed");
  console.log(`[PASS] Citizen successfully accessed /citizen/dashboard (HTTP 200)`);

  // Verify Citizen CANNOT access /municipal/dashboard (must redirect to /citizen/dashboard)
  const citizenToMunicipalRes = await fetch(`${PROD_URL}/municipal/dashboard`, {
    headers: { Cookie: ctx.citizenCookie },
    redirect: "manual",
  });
  assert.ok(
    citizenToMunicipalRes.status === 307 || citizenToMunicipalRes.status === 308,
    `Citizen was not redirected from /municipal/dashboard! Status: ${citizenToMunicipalRes.status}`
  );
  const munRedirectLocation = citizenToMunicipalRes.headers.get("location");
  assert.ok(
    munRedirectLocation?.includes("/citizen/dashboard"),
    `Citizen redirected to unexpected location: ${munRedirectLocation}`
  );
  console.log(`[PASS] Citizen access to /municipal/dashboard blocked by middleware -> redirected to /citizen/dashboard`);

  // Verify Citizen CANNOT access /admin/dashboard (must redirect to /)
  const citizenToAdminRes = await fetch(`${PROD_URL}/admin/dashboard`, {
    headers: { Cookie: ctx.citizenCookie },
    redirect: "manual",
  });
  assert.ok(
    citizenToAdminRes.status === 307 || citizenToAdminRes.status === 308,
    `Citizen was not redirected from /admin/dashboard! Status: ${citizenToAdminRes.status}`
  );
  const adminRedirectLocation = citizenToAdminRes.headers.get("location");
  assert.ok(
    adminRedirectLocation === "/" || adminRedirectLocation?.endsWith("/"),
    `Citizen redirected to unexpected location: ${adminRedirectLocation}`
  );
  console.log(`[PASS] Citizen access to /admin/dashboard blocked by middleware -> redirected to /`);

  // Verify Citizen CANNOT call Admin API GET /api/users (403 Forbidden)
  const citizenUsersApiRes = await fetch(`${PROD_URL}/api/users`, {
    headers: { Cookie: ctx.citizenCookie },
  });
  assert.strictEqual(citizenUsersApiRes.status, 403, "Citizen was not forbidden from GET /api/users");
  console.log(`[PASS] Citizen access to GET /api/users forbidden (HTTP 403)`);

  // Verify Citizen CANNOT create users via POST /api/users (403 Forbidden)
  const citizenPostUsersRes = await fetch(`${PROD_URL}/api/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: ctx.citizenCookie },
    body: JSON.stringify({
      fullName: "Escalated Admin",
      email: "hacked@ballegh.test",
      password: "HackedPassword2026!",
      phone: "+216 99 999 999",
      role: "admin",
    }),
  });
  assert.strictEqual(citizenPostUsersRes.status, 403, "Citizen was not forbidden from POST /api/users");
  console.log(`[PASS] Citizen access to POST /api/users forbidden (HTTP 403)`);


  // -------------------------------------------------------------------------
  // 2. Municipal Agent Role Verification
  // -------------------------------------------------------------------------
  console.log(`\n--- [2/5] Testing Municipal Agent Experience & Route Isolation ---`);
  
  // Login with seeded Municipal Agent
  const agentLoginRes = await fetch(`${PROD_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "agent@commune-tunis.gov.tn",
      password: "ChangeMe2026!",
    }),
  });
  assert.strictEqual(agentLoginRes.status, 200, `Municipal Agent login failed: ${agentLoginRes.statusText}`);
  const agentLoginData = await agentLoginRes.json();
  assert.strictEqual(agentLoginData.user.role, "municipal_agent", "Agent role mismatch");
  ctx.agentCookie = extractSessionCookie(agentLoginRes);
  assert.ok(ctx.agentCookie, "Agent session cookie missing");
  console.log(`[PASS] Municipal Agent (agent@commune-tunis.gov.tn) authenticated successfully. Role: "municipal_agent"`);

  // Verify /api/auth/me for Municipal Agent
  const meAgentRes = await fetch(`${PROD_URL}/api/auth/me`, {
    headers: { Cookie: ctx.agentCookie },
  });
  assert.strictEqual(meAgentRes.status, 200, "Agent /api/auth/me failed");
  const meAgentData = await meAgentRes.json();
  assert.strictEqual(meAgentData.user.role, "municipal_agent");
  console.log(`[PASS] Municipal Agent session verified via /api/auth/me: ${meAgentData.user.name} (${meAgentData.user.email})`);

  // Verify Municipal Agent can access /municipal/dashboard (200 OK)
  const agentDashRes = await fetch(`${PROD_URL}/municipal/dashboard`, {
    headers: { Cookie: ctx.agentCookie },
    redirect: "manual",
  });
  assert.strictEqual(agentDashRes.status, 200, "Municipal Agent dashboard access failed");
  console.log(`[PASS] Municipal Agent accessed /municipal/dashboard (HTTP 200)`);

  // Verify Municipal Agent can access /municipal/reports (200 OK)
  const agentReportsRes = await fetch(`${PROD_URL}/municipal/reports`, {
    headers: { Cookie: ctx.agentCookie },
    redirect: "manual",
  });
  assert.strictEqual(agentReportsRes.status, 200, "Municipal Agent reports queue access failed");
  console.log(`[PASS] Municipal Agent accessed /municipal/reports (HTTP 200)`);

  // Verify Municipal Agent can access /municipal/map (200 OK)
  const agentMapRes = await fetch(`${PROD_URL}/municipal/map`, {
    headers: { Cookie: ctx.agentCookie },
    redirect: "manual",
  });
  assert.strictEqual(agentMapRes.status, 200, "Municipal Agent map access failed");
  console.log(`[PASS] Municipal Agent accessed /municipal/map (HTTP 200)`);

  // Verify Municipal Agent CANNOT access /admin/dashboard (must redirect to /)
  const agentToAdminRes = await fetch(`${PROD_URL}/admin/dashboard`, {
    headers: { Cookie: ctx.agentCookie },
    redirect: "manual",
  });
  assert.ok(
    agentToAdminRes.status === 307 || agentToAdminRes.status === 308,
    `Agent was not redirected from /admin/dashboard! Status: ${agentToAdminRes.status}`
  );
  console.log(`[PASS] Municipal Agent access to /admin/dashboard blocked by middleware -> redirected to /`);

  // Verify Municipal Agent CANNOT call GET /api/users (403 Forbidden)
  const agentUsersApiRes = await fetch(`${PROD_URL}/api/users`, {
    headers: { Cookie: ctx.agentCookie },
  });
  assert.strictEqual(agentUsersApiRes.status, 403, "Municipal Agent was not forbidden from GET /api/users");
  console.log(`[PASS] Municipal Agent access to GET /api/users forbidden (HTTP 403)`);


  // -------------------------------------------------------------------------
  // 3. Admin Role Verification
  // -------------------------------------------------------------------------
  console.log(`\n--- [3/5] Testing Admin Experience & Route Isolation ---`);

  // Login with seeded Admin
  const adminLoginRes = await fetch(`${PROD_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "admin@ballegh.tn",
      password: "ChangeMe2026!",
    }),
  });
  assert.strictEqual(adminLoginRes.status, 200, `Admin login failed: ${adminLoginRes.statusText}`);
  const adminLoginData = await adminLoginRes.json();
  assert.strictEqual(adminLoginData.user.role, "admin", "Admin role mismatch");
  ctx.adminCookie = extractSessionCookie(adminLoginRes);
  assert.ok(ctx.adminCookie, "Admin session cookie missing");
  console.log(`[PASS] Admin (admin@ballegh.tn) authenticated successfully. Role: "admin"`);

  // Verify /api/auth/me for Admin
  const meAdminRes = await fetch(`${PROD_URL}/api/auth/me`, {
    headers: { Cookie: ctx.adminCookie },
  });
  assert.strictEqual(meAdminRes.status, 200, "Admin /api/auth/me failed");
  const meAdminData = await meAdminRes.json();
  assert.strictEqual(meAdminData.user.role, "admin");
  console.log(`[PASS] Admin session verified via /api/auth/me: ${meAdminData.user.name} (${meAdminData.user.email})`);

  // Verify Admin can access /admin/dashboard (200 OK)
  const adminDashRes = await fetch(`${PROD_URL}/admin/dashboard`, {
    headers: { Cookie: ctx.adminCookie },
    redirect: "manual",
  });
  assert.strictEqual(adminDashRes.status, 200, "Admin dashboard access failed");
  console.log(`[PASS] Admin accessed /admin/dashboard (HTTP 200)`);

  // Verify Admin can access /admin/users (200 OK)
  const adminUsersPageRes = await fetch(`${PROD_URL}/admin/users`, {
    headers: { Cookie: ctx.adminCookie },
    redirect: "manual",
  });
  assert.strictEqual(adminUsersPageRes.status, 200, "Admin users page access failed");
  console.log(`[PASS] Admin accessed /admin/users (HTTP 200)`);

  // Verify Admin can access /admin/settings (200 OK)
  const adminSettingsPageRes = await fetch(`${PROD_URL}/admin/settings`, {
    headers: { Cookie: ctx.adminCookie },
    redirect: "manual",
  });
  assert.strictEqual(adminSettingsPageRes.status, 200, "Admin settings page access failed");
  console.log(`[PASS] Admin accessed /admin/settings (HTTP 200)`);

  // Verify Admin can also access /municipal/dashboard (200 OK oversight)
  const adminMunDashRes = await fetch(`${PROD_URL}/municipal/dashboard`, {
    headers: { Cookie: ctx.adminCookie },
    redirect: "manual",
  });
  assert.strictEqual(adminMunDashRes.status, 200, "Admin municipal oversight access failed");
  console.log(`[PASS] Admin accessed /municipal/dashboard for supervisory oversight (HTTP 200)`);

  // Verify Admin can call GET /api/users (200 OK)
  const adminListUsersRes = await fetch(`${PROD_URL}/api/users`, {
    headers: { Cookie: ctx.adminCookie },
  });
  assert.strictEqual(adminListUsersRes.status, 200, "Admin GET /api/users failed");
  const usersListData = await adminListUsersRes.json();
  assert.strictEqual(usersListData.success, true);
  assert.ok(usersListData.count > 0, "No users returned to admin");
  console.log(`[PASS] Admin GET /api/users successful: ${usersListData.count} total users returned`);


  // -------------------------------------------------------------------------
  // 4. Secure Account Provisioning Verification
  // -------------------------------------------------------------------------
  console.log(`\n--- [4/5] Testing Account Provisioning Flow (Admin -> Municipal Agent) ---`);

  const newAgentEmail = `agent.prov.${Date.now()}@commune-tunis.gov.tn`;
  const newAgentPassword = "ProvisionedSecure2026!";
  console.log(`Provisioning new Municipal Agent account via Admin API: ${newAgentEmail}`);

  const provRes = await fetch(`${PROD_URL}/api/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: ctx.adminCookie },
    body: JSON.stringify({
      fullName: "Ing. Mehdi Provisioned Agent",
      email: newAgentEmail,
      password: newAgentPassword,
      phone: "+216 71 888 999",
      district: "Direction de la Voirie et Travaux",
      role: "municipal_agent",
      organization: "Commune de Tunis",
    }),
  });

  assert.strictEqual(provRes.status, 201, `Failed to provision user: ${provRes.statusText}`);
  const provData = await provRes.json();
  assert.strictEqual(provData.success, true);
  assert.strictEqual(provData.user.role, "municipal_agent");
  console.log(`[PASS] Admin successfully provisioned user: ID=${provData.user.id}, Role=${provData.user.role}`);

  // Test that the newly provisioned agent can authenticate immediately
  const newAgentLoginRes = await fetch(`${PROD_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: newAgentEmail,
      password: newAgentPassword,
    }),
  });
  assert.strictEqual(newAgentLoginRes.status, 200, "New agent login failed");
  const newAgentLoginData = await newAgentLoginRes.json();
  assert.strictEqual(newAgentLoginData.user.role, "municipal_agent");
  ctx.newAgentCookie = extractSessionCookie(newAgentLoginRes);
  assert.ok(ctx.newAgentCookie, "New agent cookie missing");
  console.log(`[PASS] Newly provisioned agent successfully logged in with assigned credentials.`);

  // Test that the new agent can access the Municipal Dashboard
  const newAgentDashRes = await fetch(`${PROD_URL}/municipal/dashboard`, {
    headers: { Cookie: ctx.newAgentCookie },
    redirect: "manual",
  });
  assert.strictEqual(newAgentDashRes.status, 200, "New agent dashboard access failed");
  console.log(`[PASS] Newly provisioned agent accessed /municipal/dashboard (HTTP 200)`);


  // -------------------------------------------------------------------------
  // 5. Workflows & Lifecycle RBAC Verification
  // -------------------------------------------------------------------------
  console.log(`\n--- [5/5] Testing Report Lifecycle RBAC ---`);

  // Fetch report list
  const reportsListRes = await fetch(`${PROD_URL}/api/reports`, {
    headers: { Cookie: ctx.adminCookie },
  });
  const reportsData = await reportsListRes.json();
  const targetReport = reportsData.reports[0];
  assert.ok(targetReport, "No report available for lifecycle test");
  console.log(`Target report for RBAC validation: Ref=${targetReport.referenceNumber}, ID=${targetReport.id}`);

  // Citizen attempting human review must be REJECTED (403)
  const citizenReviewAttempt = await fetch(`${PROD_URL}/api/reports/${targetReport.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: ctx.citizenCookie },
    body: JSON.stringify({
      action: "human_review",
      decision: "accepted",
      notes: "Malicious citizen review attempt",
    }),
  });
  assert.strictEqual(citizenReviewAttempt.status, 403, "Citizen was not forbidden from human_review");
  console.log(`[PASS] Citizen attempting human_review on report blocked with HTTP 403 Forbidden.`);

  // Unauthenticated user attempting photo access must be REJECTED (401)
  const unauthPhotoRes = await fetch(`${PROD_URL}/api/reports/${targetReport.id}/photo`);
  assert.strictEqual(unauthPhotoRes.status, 401, "Unauthenticated photo access allowed");
  console.log(`[PASS] Unauthenticated access to report photo blocked with HTTP 401.`);

  // Municipal Agent accessing photo must SUCCEED (200)
  const agentPhotoRes = await fetch(`${PROD_URL}/api/reports/${targetReport.id}/photo`, {
    headers: { Cookie: ctx.agentCookie },
  });
  assert.strictEqual(agentPhotoRes.status, 200, "Agent photo access failed");
  console.log(`[PASS] Municipal Agent access to report photo succeeded with HTTP 200.`);

  console.log(`\n======================================================`);
  console.log(` ALL PRODUCTION ROLE & RBAC CHECKS PASSED (100%)`);
  console.log(`======================================================\n`);
}

run().catch((err) => {
  console.error("\n❌ ROLE AUDIT TEST FAILED:", err);
  process.exit(1);
});
