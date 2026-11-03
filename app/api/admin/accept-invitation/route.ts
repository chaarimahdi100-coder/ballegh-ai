import { NextResponse } from "next/server";
import { z } from "zod";
import {
  findAdminInvitationByToken,
  acceptAdminInvitation,
} from "@/lib/repositories/userRepository";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/jwt";

const acceptSchema = z.object({
  token: z.string().min(1, "Jeton d'invitation requis"),
  password: z.string().min(8, "Le mot de passe doit comporter au moins 8 caractères"),
  phone: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        {
          valid: false,
          errorCode: "TOKEN_MISSING",
          error: "Jeton d'invitation manquant. Veuillez fournir un jeton valide.",
        },
        { status: 400 }
      );
    }

    const inv = await findAdminInvitationByToken(token);
    if (!inv) {
      return NextResponse.json(
        {
          valid: false,
          errorCode: "TOKEN_NOT_FOUND",
          error: "Jeton d'invitation introuvable ou incorrect. Vérifiez qu'aucun caractère n'a été tronqué lors de la copie.",
        },
        { status: 404 }
      );
    }

    if (inv.status === "accepted") {
      return NextResponse.json(
        {
          valid: false,
          errorCode: "TOKEN_ALREADY_ACCEPTED",
          error: "Cette invitation a déjà été utilisée. Par mesure de sécurité anti-rejeu, un jeton d'invitation ne peut servir qu'une seule fois.",
        },
        { status: 410 }
      );
    }

    if (inv.status === "expired" || new Date(inv.expiresAt) < new Date()) {
      return NextResponse.json(
        {
          valid: false,
          errorCode: "TOKEN_EXPIRED",
          error: "Cette invitation a expiré (validité maximale de 48 heures dépassée). Veuillez demander une nouvelle invitation à un administrateur.",
        },
        { status: 410 }
      );
    }

    if (inv.status === "revoked") {
      return NextResponse.json(
        {
          valid: false,
          errorCode: "TOKEN_REVOKED",
          error: "Cette invitation a été révoquée par un administrateur système.",
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      valid: true,
      email: inv.email,
      fullName: inv.fullName,
      department: inv.department,
      expiresAt: inv.expiresAt,
    });
  } catch (err: any) {
    return NextResponse.json(
      { valid: false, error: "Erreur lors de la vérification de l'invitation", message: err.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Format de requête invalide (JSON requis)" },
        { status: 400 }
      );
    }

    const parsed = acceptSchema.safeParse(body);
    if (!parsed.success) {
      const issues = parsed.error.issues || (parsed.error as any).errors || [];
      return NextResponse.json(
        { error: issues[0]?.message || "Données invalides" },
        { status: 400 }
      );
    }

    const { token, password, phone } = parsed.data;

    const result = await acceptAdminInvitation({
      token,
      password,
      phone,
    });

    // Auto-create session token for direct login
    const sessionToken = await createSessionToken({
      userId: result.user.id,
      email: result.user.email,
      fullName: result.user.name,
      phone: result.user.phone,
      role: result.user.role,
      district: result.user.district,
      organization: result.user.organization,
    });

    const response = NextResponse.json({
      success: true,
      message: "Votre compte administrateur a été activé avec succès.",
      user: result.user,
    });

    response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Erreur lors de l'activation du compte administrateur" },
      { status: 400 }
    );
  }
}
