import { NextResponse } from "next/server";
import { createUser, findUserByEmail } from "@/lib/repositories/userRepository";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/jwt";
import { registerInputSchema, normalizeTunisianPhone } from "@/lib/auth/validation";

export async function POST(request: Request) {
  try {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          error: "Format de requête invalide",
          message: "Le corps de la requête doit être un JSON valide.",
        },
        { status: 400 }
      );
    }

    const parsed = registerInputSchema.safeParse(body);

    if (!parsed.success) {
      const issues = parsed.error.issues || (parsed.error as any).errors || [];
      const firstErrorMessage =
        issues[0]?.message || "Données d'inscription invalides.";
      const flattened = typeof parsed.error.flatten === "function" ? parsed.error.flatten() : { fieldErrors: {} };

      // Journalisation diagnostique sécurisée (sans mots de passe, ni secrets, ni données complètes)
      console.warn("[register] Échec de validation du formulaire citoyen:", {
        issuesCount: issues.length,
        failedFields: Object.keys(flattened.fieldErrors || {}),
        firstError: firstErrorMessage,
      });

      return NextResponse.json(
        {
          error: firstErrorMessage,
          message: firstErrorMessage,
          fieldErrors: flattened.fieldErrors,
        },
        { status: 400 }
      );
    }

    const rawData = parsed.data;
    const effectiveName = (rawData.fullName || rawData.name || "").trim();
    const normalizedEmail = rawData.email.trim().toLowerCase();
    const phoneResult = normalizeTunisianPhone(rawData.phone);
    const normalizedPhone = phoneResult.normalized || rawData.phone.trim();
    const district = rawData.district?.trim() || "Bab Souika";

    // Vérification de collision d'email
    try {
      const existing = await findUserByEmail(normalizedEmail);
      if (existing) {
        return NextResponse.json(
          {
            error: "Cet e-mail est déjà associé à un compte existant",
            message: "Un compte existe déjà avec cette adresse e-mail. Veuillez vous connecter.",
          },
          { status: 409 }
        );
      }
    } catch (dbErr: any) {
      console.error("[register/route] Erreur lors de la vérification email:", dbErr.message);
      // En cas de panne de base de données, ne pas divulguer les détails techniques
      return NextResponse.json(
        {
          error: "Service temporairement indisponible",
          message: "Impossible de vérifier la disponibilité du compte. Veuillez réessayer ultérieurement.",
        },
        { status: 503 }
      );
    }

    // Création de l'utilisateur citoyen
    let newUser;
    try {
      newUser = await createUser({
        fullName: effectiveName,
        email: normalizedEmail,
        password: rawData.password,
        phone: normalizedPhone,
        district,
        role: "citizen",
      });
    } catch (createErr: any) {
      // Détection de contrainte unique Prisma P2002
      if (createErr.message?.includes("P2002") || createErr.message?.includes("Unique constraint")) {
        return NextResponse.json(
          {
            error: "Cet e-mail est déjà associé à un compte existant",
            message: "Un compte existe déjà avec cette adresse e-mail. Veuillez vous connecter.",
          },
          { status: 409 }
        );
      }
      console.error("[register/route] Erreur lors de la création de l'utilisateur:", createErr.message);
      return NextResponse.json(
        {
          error: "Erreur lors de l'inscription",
          message: "Une erreur est survenue lors de l'enregistrement de votre compte.",
        },
        { status: 500 }
      );
    }

    // Création du jeton de session cryptographique HS256
    const token = await createSessionToken({
      userId: newUser.id,
      email: newUser.email,
      fullName: newUser.name,
      phone: newUser.phone,
      role: "citizen",
      district: newUser.district,
    });

    const response = NextResponse.json(
      {
        success: true,
        message: "Compte citoyen créé avec succès.",
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          phone: newUser.phone,
          district: newUser.district,
          role: newUser.role,
        },
      },
      { status: 201 }
    );

    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (err: any) {
    console.error("[register/route] Exception inattendue:", err.message);
    return NextResponse.json(
      {
        error: "Erreur interne du serveur",
        message: "Une erreur inattendue est survenue lors de l'inscription.",
      },
      { status: 500 }
    );
  }
}
