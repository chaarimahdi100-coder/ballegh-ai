import { NextResponse } from "next/server";
import { z } from "zod";
import { DEMO_USERS } from "@/lib/demo/users";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/jwt";
import type { UserRole } from "@/lib/types";

const demoSwitchSchema = z.object({
  role: z.enum(["citizen", "municipal_agent", "admin"]),
});

export async function POST(request: Request) {
  try {
    // 1. Protection contre l'escalade de privilèges en environnement public / production
    const isProduction = process.env.NODE_ENV === "production";
    const allowDemo = process.env.ALLOW_DEMO_SWITCH === "true";
    const disallowExplicit = process.env.ALLOW_DEMO_SWITCH === "false";

    if (disallowExplicit || (isProduction && !allowDemo)) {
      return NextResponse.json(
        {
          error: "Action refusée. Le basculement de compte démo est strictement désactivé sur cet environnement public ou de production.",
          code: "DEMO_SWITCH_FORBIDDEN",
        },
        { status: 403 }
      );
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Requête invalide", code: "INVALID_JSON" },
        { status: 400 }
      );
    }

    const parsed = demoSwitchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Rôle invalide. Rôles acceptés: citizen, municipal_agent, admin.", code: "INVALID_ROLE" },
        { status: 400 }
      );
    }

    const targetRole = parsed.data.role as UserRole;
    const user = DEMO_USERS.find((u) => u.role === targetRole) || DEMO_USERS[0];

    // Création d'un token sécurisé marqué explicitement comme démo
    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      fullName: user.name,
      phone: user.phone,
      role: user.role,
      district: user.district,
      organization: user.organization,
      isDemo: true,
    });

    const response = NextResponse.json({
      success: true,
      user,
    });

    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { error: "Erreur lors du changement de session", message: err.message },
      { status: 500 }
    );
  }
}
