import assert from "node:assert/strict";
import * as path from "node:path";
import * as fs from "node:fs";

// Charger .env.local de façon isolée
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
delete process.env.DATABASE_URL; // Isoler les tests unitaires / RBAC pour ne pas altérer la base distante

import { normalizeTunisianPhone, registerInputSchema } from "../lib/auth/validation";
import { POST as registerHandler } from "../app/api/auth/register/route";
import { POST as demoSwitchHandler } from "../app/api/auth/demo-switch/route";
import { GET as meHandler } from "../app/api/auth/me/route";
import { GET as usersGetHandler } from "../app/api/users/route";
import { createSessionToken, verifySessionToken, SESSION_COOKIE_NAME } from "../lib/auth/jwt";

function buildJsonRequest(url: string, method: string, body?: any, cookie?: string): Request {
  const headers = new Headers();
  headers.set("Content-Type", "application/json");
  if (cookie) {
    headers.set("Cookie", `${SESSION_COOKIE_NAME}=${cookie}`);
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
  const match = setCookie.match(/ballegh_session=([^;]+)/);
  return match ? match[1] : null;
}

async function runPhase1Tests() {
  console.log("\n========================================================");
  console.log(" BALLEGH AI — PHASE 1 VALIDATION & SECURITY TEST SUITE");
  console.log("========================================================\n");

  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`  [PASS] ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  [FAIL] ${name}:`, err.message);
      failed++;
    }
  }

  // -----------------------------------------------------------------
  // 1. Validation & Normalisation du Téléphone Tunisien
  // -----------------------------------------------------------------
  console.log("--- 1. Validation & Normalisation du Téléphone Tunisien ---");

  await test("Normalise un numéro à 8 chiffres standard (ex: 98123456)", async () => {
    const res = normalizeTunisianPhone("98123456");
    assert.equal(res.isValid, true);
    assert.equal(res.normalized, "+216 98 123 456");
  });

  await test("Normalise un numéro avec zéro initial (ex: 098 123 456)", async () => {
    const res = normalizeTunisianPhone("098 123 456");
    assert.equal(res.isValid, true);
    assert.equal(res.normalized, "+216 98 123 456");
  });

  await test("Normalise un numéro avec espaces (ex: 98 123 456)", async () => {
    const res = normalizeTunisianPhone("98 123 456");
    assert.equal(res.isValid, true);
    assert.equal(res.normalized, "+216 98 123 456");
  });

  await test("Normalise un numéro avec préfixe +216", async () => {
    const res = normalizeTunisianPhone("+216 98 123 456");
    assert.equal(res.isValid, true);
    assert.equal(res.normalized, "+216 98 123 456");
  });

  await test("Normalise un numéro avec préfixe 00216", async () => {
    const res = normalizeTunisianPhone("00216 71 345 678");
    assert.equal(res.isValid, true);
    assert.equal(res.normalized, "+216 71 345 678");
  });

  await test("Normalise un numéro avec séparateurs tirets et points", async () => {
    const res = normalizeTunisianPhone("50-123.456");
    assert.equal(res.isValid, true);
    assert.equal(res.normalized, "+216 50 123 456");
  });

  await test("Rejette un numéro commençant par 0 ou 1 (non attribué en Tunisie)", async () => {
    const res = normalizeTunisianPhone("12 345 678");
    assert.equal(res.isValid, false);
    assert.ok(res.error?.includes("Numéro de téléphone tunisien invalide"));
  });

  await test("Rejette un numéro trop court (7 chiffres)", async () => {
    const res = normalizeTunisianPhone("98 123 45");
    assert.equal(res.isValid, false);
  });

  await test("Rejette un numéro contenant des lettres", async () => {
    const res = normalizeTunisianPhone("98 123 abc");
    assert.equal(res.isValid, false);
  });

  // -----------------------------------------------------------------
  // 2. Schéma Zod d'Inscription & Tolérance des Noms de Champs
  // -----------------------------------------------------------------
  console.log("\n--- 2. Schéma Zod d'Inscription & Tolérance de Noms de Champs ---");

  await test("Valide un payload utilisant le champ 'fullName'", async () => {
    const parsed = registerInputSchema.safeParse({
      fullName: "Yassine Ben Amor",
      email: "Yassine@Tunis.tn",
      phone: "98 123 456",
      district: "Bab Souika",
      password: "Password123!",
    });
    assert.equal(parsed.success, true);
  });

  await test("Valide un payload utilisant le champ 'name' (tolérance frontend)", async () => {
    const parsed = registerInputSchema.safeParse({
      name: "Sarra Trabelsi",
      email: "sarra@example.tn",
      phone: "+216 22 345 678",
      password: "Password123!",
    });
    assert.equal(parsed.success, true);
  });

  await test("Rejette si le nom fait moins de 2 caractères", async () => {
    const parsed = registerInputSchema.safeParse({
      fullName: "A",
      email: "sarra@example.tn",
      phone: "+216 22 345 678",
      password: "Password123!",
    });
    assert.equal(parsed.success, false);
  });

  await test("Rejette si le mot de passe fait moins de 6 caractères", async () => {
    const parsed = registerInputSchema.safeParse({
      fullName: "Sarra Trabelsi",
      email: "sarra@example.tn",
      phone: "+216 22 345 678",
      password: "123",
    });
    assert.equal(parsed.success, false);
  });

  await test("Rejette si l'email a un format invalide", async () => {
    const parsed = registerInputSchema.safeParse({
      fullName: "Sarra Trabelsi",
      email: "not-an-email",
      phone: "+216 22 345 678",
      password: "Password123!",
    });
    assert.equal(parsed.success, false);
  });

  // -----------------------------------------------------------------
  // 3. Route API POST /api/auth/register
  // -----------------------------------------------------------------
  console.log("\n--- 3. Route API POST /api/auth/register ---");

  const uniqueCitizenEmail = `citoyen.test.${Date.now()}@tunis.tn`;

  await test("Inscription réussie avec 'name' et téléphone non-formaté (201 Created)", async () => {
    const req = buildJsonRequest("http://localhost:3000/api/auth/register", "POST", {
      name: "Tarak Dakhli",
      email: uniqueCitizenEmail,
      phone: "98111222",
      district: "El Menzah 1",
      password: "SecurePassword2026!",
    });

    const res = await registerHandler(req);
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.user.email, uniqueCitizenEmail);
    assert.equal(body.user.phone, "+216 98 111 222"); // Phone normalisé
    assert.equal(body.user.role, "citizen");
    assert.equal(body.user.passwordHash, undefined, "Le hash du mot de passe ne doit jamais être exposé");

    const cookie = extractCookieToken(res);
    assert.ok(cookie, "Le cookie HTTP-only ballegh_session doit être émis");
    const session = await verifySessionToken(cookie!);
    assert.equal(session?.role, "citizen");
  });

  await test("Rejette la création avec un email déjà utilisé (409 Conflict)", async () => {
    const req = buildJsonRequest("http://localhost:3000/api/auth/register", "POST", {
      name: "Autre Citoyen",
      email: uniqueCitizenEmail,
      phone: "98 333 444",
      password: "SecurePassword2026!",
    });

    const res = await registerHandler(req);
    assert.equal(res.status, 409);
    const body = await res.json();
    assert.ok(body.error?.includes("déjà associé à un compte"));
  });

  await test("Rejette l'inscription avec message explicite sur téléphone invalide (400)", async () => {
    const req = buildJsonRequest("http://localhost:3000/api/auth/register", "POST", {
      name: "Test Citoyen",
      email: `test.${Date.now()}@tunis.tn`,
      phone: "12345", // Invalide
      password: "SecurePassword2026!",
    });

    const res = await registerHandler(req);
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.ok(body.error?.includes("Numéro de téléphone tunisien invalide"));
    assert.ok(body.message?.includes("Numéro de téléphone tunisien invalide"));
    assert.ok(body.fieldErrors?.phone);
  });

  // -----------------------------------------------------------------
  // 4. Sécurité des Rôles & Sélecteur de Démonstration
  // -----------------------------------------------------------------
  console.log("\n--- 4. Sécurité des Rôles & Sélecteur de Démonstration ---");

  await test("Interdit le basculement démo en production sans ALLOW_DEMO_SWITCH (403)", async () => {
    const origEnv = process.env.NODE_ENV;
    const origAllow = process.env.ALLOW_DEMO_SWITCH;

    try {
      (process.env as any).NODE_ENV = "production";
      delete process.env.ALLOW_DEMO_SWITCH;

      const req = buildJsonRequest("http://localhost:3000/api/auth/demo-switch", "POST", {
        role: "admin",
      });

      const res = await demoSwitchHandler(req);
      assert.equal(res.status, 403);
      const body = await res.json();
      assert.equal(body.code, "DEMO_SWITCH_FORBIDDEN");
    } finally {
      (process.env as any).NODE_ENV = origEnv;
      if (origAllow) process.env.ALLOW_DEMO_SWITCH = origAllow;
      else delete process.env.ALLOW_DEMO_SWITCH;
    }
  });

  await test("Interdit le basculement démo si ALLOW_DEMO_SWITCH='false' même en dev (403)", async () => {
    const origAllow = process.env.ALLOW_DEMO_SWITCH;

    try {
      process.env.ALLOW_DEMO_SWITCH = "false";

      const req = buildJsonRequest("http://localhost:3000/api/auth/demo-switch", "POST", {
        role: "admin",
      });

      const res = await demoSwitchHandler(req);
      assert.equal(res.status, 403);
      const body = await res.json();
      assert.equal(body.code, "DEMO_SWITCH_FORBIDDEN");
    } finally {
      if (origAllow) process.env.ALLOW_DEMO_SWITCH = origAllow;
      else delete process.env.ALLOW_DEMO_SWITCH;
    }
  });

  await test("Autorise le basculement en mode démo explicite (200 OK)", async () => {
    const origAllow = process.env.ALLOW_DEMO_SWITCH;

    try {
      process.env.ALLOW_DEMO_SWITCH = "true";

      const req = buildJsonRequest("http://localhost:3000/api/auth/demo-switch", "POST", {
        role: "municipal_agent",
      });

      const res = await demoSwitchHandler(req);
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.user.role, "municipal_agent");

      const cookie = extractCookieToken(res);
      assert.ok(cookie);
      const session = await verifySessionToken(cookie!);
      assert.equal(session?.role, "municipal_agent");
      assert.equal(session?.isDemo, true);
    } finally {
      if (origAllow) process.env.ALLOW_DEMO_SWITCH = origAllow;
      else delete process.env.ALLOW_DEMO_SWITCH;
    }
  });

  // -----------------------------------------------------------------
  // 5. GET /api/auth/me & Exposition Sécurisée du Statut Démo
  // -----------------------------------------------------------------
  console.log("\n--- 5. GET /api/auth/me & Exposition Sécurisée du Statut Démo ---");

  await test("Retourne demoModeAllowed: false en production sans drapeau", async () => {
    const origEnv = process.env.NODE_ENV;
    const origAllow = process.env.ALLOW_DEMO_SWITCH;

    try {
      (process.env as any).NODE_ENV = "production";
      delete process.env.ALLOW_DEMO_SWITCH;

      const req = new Request("http://localhost:3000/api/auth/me");
      const res = await meHandler(req);
      assert.equal(res.status, 401);
      const body = await res.json();
      assert.equal(body.demoModeAllowed, false);
      assert.equal(body.authenticated, false);
    } finally {
      (process.env as any).NODE_ENV = origEnv;
      if (origAllow) process.env.ALLOW_DEMO_SWITCH = origAllow;
      else delete process.env.ALLOW_DEMO_SWITCH;
    }
  });

  await test("Retourne l'utilisateur authentifié sans divulguer d'informations sensibles", async () => {
    const token = await createSessionToken({
      userId: "usr_citizen_verified",
      email: "citoyen.auth@tunis.tn",
      fullName: "Citoyen Vérifié",
      phone: "+216 98 000 111",
      role: "citizen",
      district: "Carthage",
    });

    const req = buildJsonRequest("http://localhost:3000/api/auth/me", "GET", undefined, token);
    const res = await meHandler(req);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.authenticated, true);
    assert.equal(body.user.name, "Citoyen Vérifié");
    assert.equal(body.user.role, "citizen");
    assert.equal(body.user.passwordHash, undefined);
  });

  // -----------------------------------------------------------------
  // 6. Défense Contre l'Élévation de Privilèges Côté Serveur (RBAC)
  // -----------------------------------------------------------------
  console.log("\n--- 6. Défense Contre l'Élévation de Privilèges Côté Serveur (RBAC) ---");

  await test("Refuse l'accès à GET /api/users à un citoyen (403 Forbidden)", async () => {
    const citizenToken = await createSessionToken({
      userId: "usr_attacker",
      email: "attacker@tunis.tn",
      fullName: "Hacker Tentative",
      role: "citizen",
    });

    const req = buildJsonRequest("http://localhost:3000/api/users", "GET", undefined, citizenToken);
    const res = await usersGetHandler(req);
    assert.equal(res.status, 403, "Seul l'administrateur peut lister les utilisateurs");
  });

  await test("Refuse l'accès à GET /api/users sans authentification (403 Forbidden)", async () => {
    const req = new Request("http://localhost:3000/api/users");
    const res = await usersGetHandler(req);
    assert.equal(res.status, 403);
  });

  console.log("\n========================================================");
  console.log(` RÉSULTATS PHASE 1 : ${passed} TESTS PASSÉS, ${failed} ÉCHECS`);
  console.log("========================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase1Tests().catch((err) => {
  console.error("Test suite execution crashed:", err);
  process.exit(1);
});
