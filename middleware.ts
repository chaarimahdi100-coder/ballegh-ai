import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const DEFAULT_SECRET = "ballegh-ai-tunis-civic-secret-key-minimum-32-chars-2026-secure";

async function verifyToken(token: string) {
  try {
    const secret = process.env.AUTH_SECRET || process.env.JWT_SECRET || DEFAULT_SECRET;
    const key = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, key, {
      algorithms: ["HS256"],
    });
    return payload;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("ballegh_session")?.value;

  // 1. Municipal Agent Portal Protection
  if (pathname.startsWith("/municipal")) {
    if (!token) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    const payload = await verifyToken(token);
    if (!payload) {
      const loginUrl = new URL("/login", request.url);
      return NextResponse.redirect(loginUrl);
    }

    const role = (payload.role as string)?.toLowerCase();
    // Only municipal agents and admins can access /municipal
    if (role !== "municipal_agent" && role !== "admin") {
      const citizenUrl = new URL("/citizen/dashboard", request.url);
      return NextResponse.redirect(citizenUrl);
    }
  }

  // 2. Admin Portal Protection
  if (pathname.startsWith("/admin")) {
    if (!token) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    const payload = await verifyToken(token);
    if (!payload) {
      const loginUrl = new URL("/login", request.url);
      return NextResponse.redirect(loginUrl);
    }

    const role = (payload.role as string)?.toLowerCase();
    // Only admins can access /admin
    if (role !== "admin") {
      const homeUrl = new URL("/", request.url);
      return NextResponse.redirect(homeUrl);
    }
  }

  // 3. Citizen Portal Protection
  if (pathname.startsWith("/citizen")) {
    if (!token) {
      // In demo mode, if no session cookie exists, allow seamless redirect or check
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    const payload = await verifyToken(token);
    if (!payload) {
      const loginUrl = new URL("/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/citizen/:path*",
    "/municipal/:path*",
    "/admin/:path*",
  ],
};
