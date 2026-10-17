import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentSession } from "@/lib/auth/session";
import {
  getReportById,
  updateHumanReview,
  advanceReportStatus,
  confirmCitizenResolution,
} from "@/lib/repositories/reportRepository";
import { dispatchOfficialEmail } from "@/lib/services/emailService";
import type { HumanDecision, ReportStatus } from "@/lib/types";

const patchActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("human_review"),
    decision: z.enum(["accepted", "modified", "rejected"]),
    notes: z.string().optional(),
    modifications: z
      .object({
        category: z.enum(["pothole", "lighting", "flooding"]).optional(),
        severity: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
        priority: z.number().min(0).max(100).optional(),
      })
      .optional(),
  }),
  z.object({
    action: z.literal("send_email"),
    customSubject: z.string().optional(),
    customBody: z.string().optional(),
  }),
  z.object({
    action: z.literal("advance_status"),
    status: z.enum(["forwarded", "in_progress", "resolved"]),
    comment: z
      .object({
        fr: z.string(),
        ar: z.string(),
      })
      .optional(),
  }),
  z.object({
    action: z.literal("confirm_resolution"),
  }),
]);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const report = await getReportById(id);

    if (!report) {
      return NextResponse.json({ error: "Signalement non trouvé" }, { status: 404 });
    }

    const session = await getCurrentSession(request);
    const isStaff = session?.role === "municipal_agent" || session?.role === "admin";
    const isAuthor = session?.userId === report.submittedBy.id;

    // Protection de la vie privée : masquage des coordonnées pour les tiers
    const sanitizedReport = isStaff || isAuthor
      ? report
      : {
          ...report,
          submittedBy: {
            ...report.submittedBy,
            phone: "+216 ** *** ***",
          },
        };

    return NextResponse.json({ success: true, report: sanitizedReport });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Erreur lors de la récupération du signalement", message: err.message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getCurrentSession(request);

    if (!session) {
      return NextResponse.json(
        { error: "Authentification requise pour modifier un signalement" },
        { status: 401 }
      );
    }

    const report = await getReportById(id);
    if (!report) {
      return NextResponse.json({ error: "Signalement non trouvé" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = patchActionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Action ou données invalides", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // 1. Human Review (Accept / Modify / Reject)
    if (data.action === "human_review") {
      if (session.role !== "municipal_agent" && session.role !== "admin") {
        return NextResponse.json(
          { error: "Action réservée aux agents municipaux habilités et administrateurs" },
          { status: 403 }
        );
      }

      const updated = await updateHumanReview(
        id,
        { id: session.userId, name: session.fullName, role: session.role },
        data.decision as HumanDecision,
        data.notes,
        data.modifications
      );

      return NextResponse.json({ success: true, report: updated });
    }

    // 2. Dispatch Official Email
    if (data.action === "send_email") {
      if (session.role !== "municipal_agent" && session.role !== "admin") {
        return NextResponse.json(
          { error: "Action réservée aux agents municipaux habilités et administrateurs" },
          { status: 403 }
        );
      }

      // Règle métier stricte : validation humaine explicite obligatoire préalable
      if (report.status !== "human_validated" && report.status !== "forwarded") {
        return NextResponse.json(
          {
            error: "Transmission officielle impossible : ce dossier requiert une validation humaine préalable par l'agent municipal.",
            code: "HUMAN_VALIDATION_REQUIRED",
          },
          { status: 422 }
        );
      }

      // Appel du service d'expédition officiel (avec marquage explicite du transport)
      const dispatchResult = await dispatchOfficialEmail({
        report,
        agentName: session.fullName,
        agentRole: session.role,
        customSubject: data.customSubject,
        customBody: data.customBody,
      });

      const updated = await advanceReportStatus(
        id,
        { id: session.userId, name: session.fullName, role: session.role },
        "forwarded",
        {
          fr: dispatchResult.notes,
          ar: `تمت المصادقة على المراسلة الرسمية وإحالتها للمصلحة الفنية المعنية. (${dispatchResult.transportStatus})`,
        }
      );

      return NextResponse.json({
        success: true,
        report: updated,
        dispatch: dispatchResult,
      });
    }

    // 3. Advance Status (In progress / Resolved)
    if (data.action === "advance_status") {
      if (session.role !== "municipal_agent" && session.role !== "admin") {
        return NextResponse.json(
          { error: "Action réservée aux agents municipaux habilités et administrateurs" },
          { status: 403 }
        );
      }

      if (report.status === "rejected") {
        return NextResponse.json(
          { error: "Impossible de modifier le statut d'un signalement rejeté.", code: "REPORT_REJECTED" },
          { status: 422 }
        );
      }

      const updated = await advanceReportStatus(
        id,
        { id: session.userId, name: session.fullName, role: session.role },
        data.status as ReportStatus,
        data.comment
      );

      return NextResponse.json({ success: true, report: updated });
    }

    // 4. Confirm Citizen Resolution
    if (data.action === "confirm_resolution") {
      // Seul le citoyen auteur du signalement (ou l'administrateur système) peut confirmer
      if (session.role !== "admin" && (session.role !== "citizen" || report.submittedBy.id !== session.userId)) {
        return NextResponse.json(
          { error: "Seul le citoyen auteur du signalement peut confirmer sa résolution sur le terrain" },
          { status: 403 }
        );
      }

      // Le rapport doit être préalablement résolu par la municipalité
      if (report.status !== "resolved") {
        return NextResponse.json(
          {
            error: "La confirmation citoyenne requiert que l'intervention municipale ait préalablement été déclarée résolue.",
            code: "NOT_YET_RESOLVED",
          },
          { status: 422 }
        );
      }

      const updated = await confirmCitizenResolution(id, {
        id: session.userId,
        name: session.fullName,
      });

      return NextResponse.json({ success: true, report: updated });
    }

    return NextResponse.json({ error: "Action non gérée" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Erreur serveur lors de la mise à jour", message: err.message },
      { status: 500 }
    );
  }
}
