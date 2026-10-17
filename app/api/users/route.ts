import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { listAllUsers, createUser } from "@/lib/repositories/userRepository";

export async function GET(request: Request) {
  try {
    const session = await getCurrentSession(request);

    // Only Admin can list users
    if (!session || session.role !== "admin") {
      return NextResponse.json(
        { error: "Accès refusé. Réservé aux administrateurs système." },
        { status: 403 }
      );
    }

    const users = await listAllUsers();
    return NextResponse.json({ success: true, count: users.length, users });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Erreur lors de la récupération des utilisateurs", message: err.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getCurrentSession(request);

    // Only Admin can create users directly
    if (!session || session.role !== "admin") {
      return NextResponse.json(
        { error: "Accès refusé. Réservé aux administrateurs système." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { fullName, email, password, phone, district, role, organization } = body;

    if (!fullName || !email || !password || !phone) {
      return NextResponse.json(
        { error: "Nom, e-mail, mot de passe et téléphone sont requis." },
        { status: 400 }
      );
    }

    const user = await createUser({
      fullName,
      email,
      password,
      phone,
      district,
      role: role || "citizen",
    });

    return NextResponse.json(
      { success: true, message: "Utilisateur créé avec succès", user },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: "Erreur lors de la création de l'utilisateur", message: err.message },
      { status: 500 }
    );
  }
}

