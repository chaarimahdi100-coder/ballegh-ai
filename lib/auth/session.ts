import { cookies } from "next/headers";
import { verifySessionToken, SESSION_COOKIE_NAME, type SessionPayload } from "./jwt";
import type { UserRole } from "@/lib/types";

export async function getCurrentSession(request?: Request): Promise<SessionPayload | null> {
  let token: string | undefined;

  // 1. Direct request header inspection (for API handlers and test suites)
  if (request) {
    const cookieHeader = request.headers.get("cookie");
    if (cookieHeader) {
      const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE_NAME}=([^;]+)`));
      if (match) {
        token = decodeURIComponent(match[1]);
      }
    }

    if (!token) {
      const authHeader = request.headers.get("authorization");
      if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
        token = authHeader.substring(7).trim();
      }
    }
  }

  // 2. Next.js server runtime cookies() helper
  if (!token) {
    try {
      const cookieStore = await cookies();
      token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    } catch {
      // In isolated environments (e.g. CLI tests) cookies() throws outside request scope
    }
  }

  if (!token) return null;
  return verifySessionToken(token);
}

export async function requireAuth(request?: Request): Promise<SessionPayload> {
  const session = await getCurrentSession(request);
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

export async function requireRole(allowedRoles: UserRole[], request?: Request): Promise<SessionPayload> {
  const session = await requireAuth(request);
  if (!allowedRoles.includes(session.role)) {
    throw new Error("FORBIDDEN");
  }
  return session;
}
