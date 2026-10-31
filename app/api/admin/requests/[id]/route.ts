import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { reviewMunicipalAccessRequest } from "@/lib/repositories/userRepository";

export async function PATCH(
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
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Format de requête invalide (JSON requis)" },
        { status: 400 }
      );
    }

    const { decision, rejectionReason } = body;
    if (decision !== "APPROVED" && decision !== "REJECTED") {
      return NextResponse.json(
        { error: "Décision invalide. Les valeurs acceptées sont 'APPROVED' ou 'REJECTED'." },
        { status: 400 }
      );
    }

    const result = await reviewMunicipalAccessRequest({
      requestId: id,
      reviewerId: session.userId,
      decision,
      rejectionReason,
    });

    return NextResponse.json({
      success: true,
      message:
        decision === "APPROVED"
          ? "Demande approuvée. Le compte agent municipal a été créé et activé."
          : "Demande d'accès rejetée avec motif enregistré.",
      result,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Erreur lors du traitement de la demande" },
      { status: 500 }
    );
  }
}
