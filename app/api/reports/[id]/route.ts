import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentSession } from "@/lib/auth/session";
import {
  getReportById,
  updateHumanReview,
  advanceReportStatus,
  confirmCitizenResolution,
} from "@/lib/repositories/reportRepository";
import type { IssueCategory, SeverityLevel, HumanDecision, ReportStatus } from "@/lib/types";

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

    return NextResponse.json({ success: true, report });
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
    const session = await getCurrentSession();

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

      const updated = await advanceReportStatus(
        id,
        { id: session.userId, name: session.fullName, role: session.role },
        "forwarded",
        {
          fr: "Courriel officiel validé et transmis au service technique référent.",
          ar: "تمت المصادقة على المراسلة الرسمية وتوجيهها للمصلحة الفنية المعنية.",
        }
      );

      return NextResponse.json({ success: true, report: updated });
    }

    // 3. Advance Status (In progress / Resolved)
    if (data.action === "advance_status") {
      if (session.role !== "municipal_agent" && session.role !== "admin") {
        return NextResponse.json(
          { error: "Action réservée aux agents municipaux habilités et administrateurs" },
          { status: 403 }
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
      // Must be the citizen who submitted or an admin
      if (session.role === "citizen" && report.submittedBy.id !== session.userId) {
        return NextResponse.json(
          { error: "Seul l'auteur du signalement peut confirmer sa résolution sur le terrain" },
          { status: 403 }
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
