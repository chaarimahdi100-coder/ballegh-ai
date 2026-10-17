import { SignJWT, jwtVerify } from "jose";
import type { UserRole } from "@/lib/types";

export interface SessionPayload {
  userId: string;
  email: string;
  fullName: string;
  role: UserRole;
  district?: string;
  organization?: string;
}

const DEFAULT_SECRET = "ballegh-ai-tunis-civic-secret-key-minimum-32-chars-2026-secure";

function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET || DEFAULT_SECRET;
  return new TextEncoder().encode(secret);
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
      role: payload.role as UserRole,
      district: payload.district as string | undefined,
      organization: payload.organization as string | undefined,
    };
  } catch {
    return null;
  }
}
