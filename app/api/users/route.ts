import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { listAllUsers } from "@/lib/repositories/userRepository";

export async function GET() {
  try {
    const session = await getCurrentSession();

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
