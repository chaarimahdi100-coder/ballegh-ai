import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import * as path from "path";
import * as fs from "fs";
import { resolveSupabaseUrl } from "./test-db-connection";

export const AUTHORIZED_ADMIN_EMAIL = "admin@ballegh.tn";
export const LOCAL_LOCK_FILE = ".bootstrap.lock";
export const DB_LOCK_KEY = "PLATFORM_INITIALIZATION_LOCK";
export const DB_BOOTSTRAP_LOCKED_KEY = "BOOTSTRAP_LOCKED";

export function loadEnvConfig(): { databaseUrl: string; authSecret: string } {
  const envPath = path.resolve(process.cwd(), ".env.local");
  let databaseUrl = "";
  let authSecret = "";

  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8");
    for (const line of content.split(/\r?\n/)) {
      const t = line.trim();
      if (t.startsWith("DATABASE_URL=")) {
        databaseUrl = t.split("=")[1].replace(/["']/g, "").trim();
      }
      if (t.startsWith("AUTH_SECRET=")) {
        authSecret = t.split("=")[1].replace(/["']/g, "").trim();
      }
    }
  }

  databaseUrl = databaseUrl || process.env.DATABASE_URL || "";
  authSecret = authSecret || process.env.AUTH_SECRET || "";

  return { databaseUrl, authSecret };
}

/**
 * Computes the authorized bootstrap authorization secret derived from infrastructure master secret.
 */
export function deriveAuthorizedBootstrapSecret(authSecret: string): string {
  if (!authSecret || authSecret.length < 16) {
    throw new Error("AUTH_SECRET introuvable ou insuffisant pour dériver la clé d'autorisation de bootstrap.");
  }
  return crypto
    .createHmac("sha256", authSecret)
    .update("ballegh:root-admin-bootstrap:authorization:v1")
    .digest("hex");
}

/**
 * Validates the provided bootstrap authorization secret against configured authorization controls.
 * Rejects arbitrary random secrets that lack cryptographic authorization proof.
 */
export function verifyBootstrapSecretAuthorization(
  providedSecret: string | undefined,
  authSecret: string,
  dbConfiguredHash?: string | null
): { authorized: boolean; reason?: string } {
  if (!providedSecret || providedSecret.trim().length === 0) {
    return {
      authorized: false,
      reason: "La variable d'environnement ADMIN_BOOTSTRAP_SECRET est obligatoire.",
    };
  }

  const trimmed = providedSecret.trim();

  // Basic length and entropy check
  if (trimmed.length < 32) {
    return {
      authorized: false,
      reason: `ADMIN_BOOTSTRAP_SECRET doit comporter au moins 32 caractères (longueur actuelle: ${trimmed.length}).`,
    };
  }

  const uniqueChars = new Set(trimmed.split("")).size;
  if (uniqueChars < 8) {
    return {
      authorized: false,
      reason: "ADMIN_BOOTSTRAP_SECRET présente une entropie insuffisante.",
    };
  }

  const providedHash = crypto.createHash("sha256").update(trimmed).digest("hex");

  // Control 1: Database-stored one-time challenge hash
  if (dbConfiguredHash && dbConfiguredHash.length === 64) {
    const dbMatch = crypto.timingSafeEqual(
      Buffer.from(providedHash, "utf-8"),
      Buffer.from(dbConfiguredHash, "utf-8")
    );
    if (dbMatch) return { authorized: true };
  }

  // Control 2: Environment pre-configured hash (ADMIN_BOOTSTRAP_SECRET_HASH)
  const envHash = process.env.ADMIN_BOOTSTRAP_SECRET_HASH?.trim();
  if (envHash && envHash.length === 64) {
    const envHashMatch = crypto.timingSafeEqual(
      Buffer.from(providedHash, "utf-8"),
      Buffer.from(envHash, "utf-8")
    );
    if (envHashMatch) return { authorized: true };
  }

  // Control 3: Explicit expected secret in environment (EXPECTED_BOOTSTRAP_SECRET)
  const explicitExpected = process.env.EXPECTED_BOOTSTRAP_SECRET?.trim();
  if (explicitExpected && explicitExpected.length >= 32) {
    const explicitExpectedHash = crypto.createHash("sha256").update(explicitExpected).digest("hex");
    const explicitMatch = crypto.timingSafeEqual(
      Buffer.from(providedHash, "utf-8"),
      Buffer.from(explicitExpectedHash, "utf-8")
    );
    if (explicitMatch) return { authorized: true };
  }

  // Control 4: Cryptographic key derivation from master AUTH_SECRET
  if (authSecret && authSecret.length >= 16) {
    const derivedAuthorized = deriveAuthorizedBootstrapSecret(authSecret);
    const derivedMatch = crypto.timingSafeEqual(
      Buffer.from(providedHash, "utf-8"),
      Buffer.from(crypto.createHash("sha256").update(derivedAuthorized).digest("hex"), "utf-8")
    );
    if (derivedMatch) return { authorized: true };
  }

  return {
    authorized: false,
    reason:
      "Clé d'autorisation de bootstrap non reconnue. La clé fournie ne correspond pas au secret d'autorisation configuré pour cette infrastructure. Un secret généré arbitrairement ne constitue pas une preuve d'autorisation.",
  };
}

export async function checkDatabaseBootstrapLock(prisma: PrismaClient): Promise<{
  isLocked: boolean;
  rootAdminExists: boolean;
  lockDetails?: any;
}> {
  // Check SystemSetting lock records
  const [dbLock, bootstrapLocked, existingAdmin] = await Promise.all([
    prisma.systemSetting.findUnique({ where: { key: DB_LOCK_KEY } }),
    prisma.systemSetting.findUnique({ where: { key: DB_BOOTSTRAP_LOCKED_KEY } }),
    prisma.user.findUnique({ where: { email: AUTHORIZED_ADMIN_EMAIL } }),
  ]);

  const hasDbLock =
    (dbLock !== null && dbLock.value.includes("INITIALIZED")) ||
    (bootstrapLocked !== null && bootstrapLocked.value === "true");

  const rootAdminActive =
    existingAdmin !== null &&
    existingAdmin.role === "ADMIN" &&
    existingAdmin.status === "ACTIVE";

  let lockDetails: any = null;
  if (dbLock) {
    try {
      lockDetails = JSON.parse(dbLock.value);
    } catch {
      lockDetails = { raw: dbLock.value };
    }
  }

  return {
    isLocked: hasDbLock || rootAdminActive,
    rootAdminExists: existingAdmin !== null,
    lockDetails,
  };
}

export async function bootstrapAdmin() {
  const { databaseUrl, authSecret } = loadEnvConfig();
  if (!databaseUrl) {
    console.error("❌ ERREUR: DATABASE_URL introuvable dans .env.local.");
    process.exit(1);
  }

  const poolerUrl = resolveSupabaseUrl(databaseUrl);
  const prisma = new PrismaClient({ datasources: { db: { url: poolerUrl } } });

  try {
    // 1. Escort Flag: Support generating authorized token for authorized operator
    if (process.argv.includes("--show-auth-token") || process.argv.includes("--token-preview")) {
      if (!authSecret) {
        console.error("❌ ERREUR: AUTH_SECRET absent.");
        process.exit(1);
      }
      const token = deriveAuthorizedBootstrapSecret(authSecret);
      console.log("ℹ️  Jeton d'autorisation dérivé de AUTH_SECRET disponible en mémoire.");
      console.log(`   Longueur: ${token.length} car. Empreinte SHA256: ${crypto.createHash("sha256").update(token).digest("hex").slice(0, 16)}...`);
      return;
    }

    // 2. Anti-Escalation Gate: Strictly enforce target account
    const targetEmail = (process.env.ADMIN_EMAIL || process.argv[2] || AUTHORIZED_ADMIN_EMAIL).trim().toLowerCase();
    if (targetEmail !== AUTHORIZED_ADMIN_EMAIL) {
      console.error(`❌ SÉCURITÉ: Le mécanisme de bootstrap est strictement restreint au compte racine officiel '${AUTHORIZED_ADMIN_EMAIL}'.`);
      console.error(`   Tentative de surclassement de privilèges bloquée pour l'adresse: '${targetEmail}'.`);
      process.exit(1);
    }

    // 3. Database Guard: Check persistent database-backed initialization lock
    const dbStatus = await checkDatabaseBootstrapLock(prisma);
    if (dbStatus.isLocked) {
      console.error("❌ SÉCURITÉ: Le compte racine administrateur a déjà été initialisé en base de données.");
      console.error("   Le verrou persistant en base de données (system_settings) interdit formellement toute ré-exécution.");
      console.error("   Un administrateur actif existant ne peut jamais voir ses identifiants écrasés ou réinitialisés par le bootstrap.");
      console.error("   Pour gérer les comptes ou réinitialiser un mot de passe légitimement, utilisez la console /admin/users.");
      process.exit(1);
    }

    // 4. Local Lock File Guard (Defense-in-depth)
    const localLockPath = path.resolve(process.cwd(), LOCAL_LOCK_FILE);
    if (fs.existsSync(localLockPath)) {
      console.error(`❌ SÉCURITÉ: Le fichier de verrouillage local '${LOCAL_LOCK_FILE}' est présent.`);
      console.error("   Le mécanisme de bootstrap a déjà été exécuté sur cette machine.");
      process.exit(1);
    }

    // 5. Authorization Control Gate: Validate ADMIN_BOOTSTRAP_SECRET proof
    const providedSecret = process.env.ADMIN_BOOTSTRAP_SECRET;
    const dbAuthSetting = await prisma.systemSetting.findUnique({
      where: { key: "BOOTSTRAP_AUTH_CHALLENGE_HASH" },
    });

    const authCheck = verifyBootstrapSecretAuthorization(
      providedSecret,
      authSecret,
      dbAuthSetting?.value
    );

    if (!authCheck.authorized) {
      console.error("❌ SÉCURITÉ: Clé d'autorisation de bootstrap invalide ou refusée.");
      console.error(`   Raison: ${authCheck.reason}`);
      process.exit(1);
    }

    // 6. Password Robustness Gate
    const password = process.env.ADMIN_PASSWORD || process.env.NEW_PASSWORD || process.argv[3];
    if (!password || password.length < 10) {
      console.error("❌ ERREUR: Un mot de passe administrateur robuste d'au moins 10 caractères est requis.");
      console.error("   Usage: ADMIN_PASSWORD=\"<mot-de-passe-robuste>\" ADMIN_BOOTSTRAP_SECRET=\"...\" npx tsx scripts/bootstrap-admin.ts");
      process.exit(1);
    }

    // 7. Atomic Transaction: Provision root Admin and persist database-backed lock
    const passwordHash = await bcrypt.hash(password, 12);
    const now = new Date();
    const secretHash = crypto.createHash("sha256").update(providedSecret!.trim()).digest("hex");

    await prisma.$transaction(async (tx) => {
      // Guard against race conditions within transaction
      const existing = await tx.user.findUnique({ where: { email: AUTHORIZED_ADMIN_EMAIL } });
      if (existing) {
        throw new Error(`Le compte racine '${AUTHORIZED_ADMIN_EMAIL}' existe déjà. Écrasement interdit.`);
      }

      // Provision root admin
      const createdAdmin = await tx.user.create({
        data: {
          fullName: "Karim Mansour (Administration Ballegh AI)",
          email: AUTHORIZED_ADMIN_EMAIL,
          phone: "+216 71 890 123",
          passwordHash,
          role: "ADMIN",
          status: "ACTIVE",
          district: "Arrondissement Central",
          organization: "Direction des Systèmes d'Information — Ballegh AI",
        },
      });

      // Atomically record database-backed initialization lock
      await tx.systemSetting.create({
        data: {
          key: DB_LOCK_KEY,
          value: JSON.stringify({
            status: "INITIALIZED",
            rootAdminEmail: AUTHORIZED_ADMIN_EMAIL,
            rootAdminId: createdAdmin.id,
            initializedAt: now.toISOString(),
            mechanism: "DATABASE_BACKED_INITIALIZATION_GUARD",
          }),
        },
      });

      await tx.systemSetting.create({
        data: {
          key: DB_BOOTSTRAP_LOCKED_KEY,
          value: "true",
        },
      });

      await tx.systemSetting.create({
        data: {
          key: "BOOTSTRAP_INITIALIZED_AT",
          value: now.toISOString(),
        },
      });

      await tx.systemSetting.create({
        data: {
          key: "BOOTSTRAP_SECRET_HASH",
          value: secretHash,
        },
      });
    });

    // 8. Write local lock file (defense-in-depth)
    const localPayload = {
      bootstrappedAt: now.toISOString(),
      targetEmail: AUTHORIZED_ADMIN_EMAIL,
      lockSignature: crypto.createHash("sha256").update(AUTHORIZED_ADMIN_EMAIL + now.getTime()).digest("hex"),
      status: "PERMANENTLY_LOCKED",
    };
    fs.writeFileSync(localLockPath, JSON.stringify(localPayload, null, 2), "utf-8");

    console.log(`✅ Compte administrateur racine provisionné avec succès: ${AUTHORIZED_ADMIN_EMAIL}`);
    console.log("   Verrou persistant enregistré de manière atomique en base de données (system_settings).");
    console.log(`   Verrou local consigné (${LOCAL_LOCK_FILE}).`);
    console.log("   Zéro mot de passe ni secret affiché ou consigné.");
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  bootstrapAdmin().catch((err) => {
    console.error("❌ Erreur d'exécution du bootstrap:", err.message);
    process.exit(1);
  });
}
