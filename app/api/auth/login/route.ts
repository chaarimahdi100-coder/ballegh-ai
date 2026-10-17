import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { findUserByEmail } from "@/lib/repositories/userRepository";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/jwt";

const loginSchema = z.object({
  email: z.string().email("Format d'e-mail invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation échouée", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;
    const user = await findUserByEmail(email);

    if (!user) {
      return NextResponse.json(
        { error: "Identifiants invalides (e-mail ou mot de passe incorrect)" },
        { status: 401 }
      );
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { error: "Identifiants invalides (e-mail ou mot de passe incorrect)" },
        { status: 401 }
      );
    }

    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      fullName: user.name,
      role: user.role,
      district: user.district,
      organization: user.organization,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        district: user.district,
        organization: user.organization,
      },
    });

    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { error: "Erreur serveur lors de la connexion", message: err.message },
      { status: 500 }
    );
  }
}
