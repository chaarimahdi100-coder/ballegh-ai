import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";

function isDemoModeAllowed(): boolean {
  if (process.env.ALLOW_DEMO_SWITCH === "false") return false;
  if (process.env.ALLOW_DEMO_SWITCH === "true") return true;
  return process.env.NODE_ENV !== "production";
}

export async function GET(request: Request) {
  const session = await getCurrentSession(request);
  const demoAllowed = isDemoModeAllowed();

  if (!session) {
    return NextResponse.json(
      {
        authenticated: false,
        demoModeAllowed: demoAllowed,
        user: null,
      },
      { status: 401 }
    );
  }

  return NextResponse.json({
    authenticated: true,
    demoModeAllowed: demoAllowed,
    user: {
      id: session.userId,
      name: session.fullName,
      email: session.email,
      phone: session.phone,
      role: session.role,
      district: session.district,
      organization: session.organization,
    },
  });
}
