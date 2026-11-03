import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentSession } from "@/lib/auth/session";
import {
  createAdminInvitation,
  listAdminInvitations,
} from "@/lib/repositories/userRepository";

const createInvitationSchema = z.object({
  email: z.string().email("Format d'e-mail invalide"),
  fullName: z.string().optional(),
  department: z.string().optional(),
  expiresInHours: z.number().int().min(1).max(168).optional(), // Up to 7 days
});

export async function GET(request: Request) {
  try {
    const session = await getCurrentSession(request);
    if (!session || session.role !== "admin") {
      return NextResponse.json(
        { error: "Accès refusé. Réservé aux administrateurs système." },
        { status: 403 }
      );
    }

    const rawInvitations = await listAdminInvitations();

    // Security: Return only necessary invitation metadata; NEVER expose raw tokens or token hashes
    const invitations = rawInvitations.map((inv) => ({
      id: inv.id,
      email: inv.email,
      fullName: inv.fullName,
      department: inv.department,
      status: inv.status,
      expiresAt: inv.expiresAt,
      createdAt: inv.createdAt,
      acceptedAt: inv.acceptedAt,
    }));

    return NextResponse.json({
      success: true,
      count: invitations.length,
      invitations,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Erreur lors de la récupération des invitations", message: err.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getCurrentSession(request);
    if (!session || session.role !== "admin") {
      return NextResponse.json(
        { error: "Accès refusé. Réservé aux administrateurs système." },
        { status: 403 }
      );
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Format de requête invalide (JSON requis)" },
        { status: 400 }
      );
    }

    const parsed = createInvitationSchema.safeParse(body);
    if (!parsed.success) {
      const issues = parsed.error.issues || (parsed.error as any).errors || [];
      return NextResponse.json(
        { error: issues[0]?.message || "Données d'invitation invalides" },
        { status: 400 }
      );
    }

    const inv = await createAdminInvitation({
      email: parsed.data.email,
      fullName: parsed.data.fullName,
      department: parsed.data.department,
      invitedById: session.userId,
      expiresInHours: parsed.data.expiresInHours || 48,
    });

    const origin =
      request.headers.get("origin") ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://balleghai.vercel.app";
    const invitationLink = `${origin}/admin/accept-invitation?token=${inv.token}`;

    return NextResponse.json(
      {
        success: true,
        message: "Lien d'invitation administrateur généré avec succès.",
        invitation: {
          id: inv.id,
          email: inv.email,
          fullName: inv.fullName,
          department: inv.department,
          status: inv.status,
          expiresAt: inv.expiresAt,
          createdAt: inv.createdAt,
        },
        rawToken: inv.token,
        invitationLink,
      },
      { status: 201 }
    );
  } catch (err: any) {
    const isConflict =
      err.message?.includes("déjà") ||
      err.message?.includes("P2002") ||
      err.message?.includes("Unique constraint");

    return NextResponse.json(
      {
        error: isConflict ? err.message : "Erreur lors de la création de l'invitation",
        message: err.message,
      },
      { status: isConflict ? 409 : 500 }
    );
  }
}
