import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { revokeAdminInvitation } from "@/lib/repositories/userRepository";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentSession(request);
    if (!session || session.role !== "admin") {
      return NextResponse.json(
        { error: "Accès refusé. Réservé aux administrateurs système." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const revoked = await revokeAdminInvitation(id);

    return NextResponse.json({
      success: true,
      message: "Invitation administrateur révoquée.",
      invitation: revoked,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Erreur lors de la révocation de l'invitation" },
      { status: 500 }
    );
  }
}
