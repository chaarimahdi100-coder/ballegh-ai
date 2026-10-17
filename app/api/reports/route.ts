import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentSession } from "@/lib/auth/session";
import { listReports, createReport } from "@/lib/repositories/reportRepository";
import type { IssueCategory, ReportStatus } from "@/lib/types";

const createReportSchema = z.object({
  id: z.string().optional(),
  category: z.enum(["pothole", "lighting", "flooding"], {
    message: "Catégorie invalide. Doit être pothole, lighting ou flooding.",
  }),
  title: z.string().min(3, "Titre requis (au moins 3 caractères)"),
  description: z.string().min(5, "Description détaillée requise (au moins 5 caractères)"),
  district: z.string().min(2, "Arrondissement requis"),
  streetAddress: z.string().min(2, "Adresse précise requise"),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  landmark: z.string().optional(),
  photoUrl: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") as IssueCategory | null;
    const status = searchParams.get("status") as ReportStatus | null;
    const district = searchParams.get("district") || undefined;
    const search = searchParams.get("search") || undefined;
    const myOnly = searchParams.get("myOnly") === "true";

    const session = await getCurrentSession(request);

    let submittedById: string | undefined = undefined;

    // Citizens requesting their own reports or forced by query
    if (myOnly && session) {
      submittedById = session.userId;
    } else if (session?.role === "citizen" && myOnly) {
      submittedById = session.userId;
    }

    const reports = await listReports({
      category: category || undefined,
      status: status || undefined,
      district,
      search,
      submittedById,
    });

    const isStaff = session?.role === "municipal_agent" || session?.role === "admin";

    // Protection de la vie privée : masquage des coordonnées des citoyens déclarants
    const sanitizedReports = reports.map((r) => {
      if (isStaff || (session && r.submittedBy.id === session.userId)) {
        return r;
      }
      return {
        ...r,
        submittedBy: {
          ...r.submittedBy,
          phone: "+216 ** *** ***",
        },
      };
    });

    return NextResponse.json({ success: true, count: sanitizedReports.length, reports: sanitizedReports });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Impossible de récupérer les signalements", message: err.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getCurrentSession(request);

    // Server-side authorization check: must be logged in
    if (!session) {
      return NextResponse.json(
        { error: "Authentification requise pour soumettre un signalement civique" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = createReportSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Données de signalement invalides", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const newReport = await createReport({
      ...parsed.data,
      submittedBy: {
        id: session.userId,
        name: session.fullName,
        phone: "+216 98 000 000",
      },
    });

    return NextResponse.json(
      { success: true, message: "Signalement créé et analysé par l'IA", report: newReport },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: "Erreur lors de la création du signalement", message: err.message },
      { status: 500 }
    );
  }
}
