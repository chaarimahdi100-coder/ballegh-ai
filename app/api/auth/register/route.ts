import { NextResponse } from "next/server";
import { z } from "zod";
import { createUser, findUserByEmail } from "@/lib/repositories/userRepository";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/jwt";

const registerSchema = z.object({
  fullName: z.string().min(2, "Le nom doit comporter au moins 2 caractères"),
  email: z.string().email("Format d'e-mail invalide"),
  password: z.string().min(6, "Le mot de passe doit comporter au moins 6 caractères"),
  phone: z.string().min(8, "Numéro de téléphone requis"),
  district: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation échouée", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { fullName, email, password, phone, district } = parsed.data;

    const existing = await findUserByEmail(email);
    if (existing) {
      return NextResponse.json(
        { error: "Cet e-mail est déjà associé à un compte existant" },
        { status: 409 }
      );
    }

    const newUser = await createUser({
      fullName,
      email,
      password,
      phone,
      district: district || "Tunis",
      role: "citizen",
    });

    const token = await createSessionToken({
      userId: newUser.id,
      email: newUser.email,
      fullName: newUser.name,
      role: "citizen",
      district: newUser.district,
    });

    const response = NextResponse.json({
      success: true,
      user: newUser,
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
      { error: "Erreur lors de l'inscription", message: err.message },
      { status: 500 }
    );
  }
}
