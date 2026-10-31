import { SignJWT, jwtVerify } from "jose";
import type { UserRole } from "@/lib/types";

export interface SessionPayload {
  userId: string;
  email: string;
  fullName: string;
  phone?: string;
  role: UserRole;
  district?: string;
  organization?: string;
  isDemo?: boolean;
}

function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET || process.env.JWT_SECRET;
  if (!secret || secret.trim().length < 32) {
    throw new Error(
      "SÉCURITÉ: La variable d'environnement AUTH_SECRET (au moins 32 caractères) est obligatoire."
    );
  }
  return new TextEncoder().encode(secret.trim());
}

export const SESSION_COOKIE_NAME = "ballegh_session";
const SESSION_EXPIRY = "7d"; // 7 days session duration

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  const key = getSecretKey();
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_EXPIRY)
    .setSubject(payload.userId)
    .sign(key);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const key = getSecretKey();
    const { payload } = await jwtVerify(token, key, {
      algorithms: ["HS256"],
    });

    return {
      userId: payload.sub as string,
      email: payload.email as string,
      fullName: payload.fullName as string,
      phone: payload.phone as string | undefined,
      role: payload.role as UserRole,
      district: payload.district as string | undefined,
      organization: payload.organization as string | undefined,
      isDemo: Boolean(payload.isDemo),
    };
  } catch {
    return null;
  }
}
