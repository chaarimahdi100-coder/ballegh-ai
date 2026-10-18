import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { getReportById } from "@/lib/repositories/reportRepository";
import { getPhotoBufferFromStorage } from "@/lib/storage/supabaseStorage";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    // 1. Authentication check
    const session = await getCurrentSession(request);
    if (!session) {
      return NextResponse.json(
        { error: "Authentification requise pour accéder aux photos des signalements." },
        { status: 401 }
      );
    }

    // 2. Fetch report
    const report = await getReportById(id);
    if (!report) {
      return NextResponse.json({ error: "Signalement non trouvé" }, { status: 404 });
    }

    // 3. Authorization check (Privacy by default)
    // Municipal staff & Admins can inspect any report photo
    // Citizens can ONLY view photos of their own submitted reports
    const isStaff = session.role === "municipal_agent" || session.role === "admin";
    const isAuthor = report.submittedBy.id === session.userId;

    if (!isStaff && !isAuthor) {
      return NextResponse.json(
        { error: "Accès refusé. Les photos de signalements sont strictement privées." },
        { status: 403 }
      );
    }

    if (!report.photos || report.photos.length === 0) {
      return NextResponse.json({ error: "Aucune photo associée à ce signalement." }, { status: 404 });
    }

    const primaryPhoto = report.photos[0];

    // Case A: Stored in Supabase Storage or local secure storage
    if (primaryPhoto.storagePath) {
      const stored = await getPhotoBufferFromStorage(primaryPhoto.storagePath);
      if (stored) {
        return new Response(new Uint8Array(stored.buffer), {
          status: 200,
          headers: {
            "Content-Type": stored.mimeType || "image/jpeg",
            "Cache-Control": "private, max-age=3600",
            "X-Content-Type-Options": "nosniff",
          },
        });
      }
    }

    // Case B: Legacy Base64 Data URL (backward compatibility with earlier drafts)
    if (primaryPhoto.url.startsWith("data:image/")) {
      const matches = primaryPhoto.url.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
      if (matches) {
        const mimeType = matches[1];
        const buffer = Buffer.from(matches[2], "base64");
        return new Response(new Uint8Array(buffer), {
          status: 200,
          headers: {
            "Content-Type": mimeType,
            "Cache-Control": "private, max-age=3600",
            "X-Content-Type-Options": "nosniff",
          },
        });
      }
    }

    // Case C: External CDN / HTTP URL (e.g. Unsplash demo presets)
    if (primaryPhoto.url.startsWith("http://") || primaryPhoto.url.startsWith("https://")) {
      return NextResponse.redirect(primaryPhoto.url, { status: 307 });
    }

    return NextResponse.json({ error: "Fichier photo introuvable." }, { status: 404 });
  } catch (err: any) {
    console.error("[api/reports/[id]/photo] Erreur d'accès à la photo:", err.message);
    return NextResponse.json(
      { error: "Erreur serveur lors de la récupération de la photo", message: err.message },
      { status: 500 }
    );
  }
}
