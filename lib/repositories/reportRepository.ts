import { prisma, getIsDatabaseConfigured } from "@/lib/db";
import { INITIAL_DEMO_REPORTS } from "@/lib/demo/reports";
import { analyzeReportTriage } from "@/lib/services/aiService";
import { deletePhotoFromStorage } from "@/lib/storage/supabaseStorage";
import type {
  Report,
  IssueCategory,
  ReportStatus,
  SeverityLevel,
  HumanDecision,
  UserRole,
} from "@/lib/types";

// In-memory reports storage fallback when database is offline
let inMemoryReports: Report[] = [...INITIAL_DEMO_REPORTS];

export interface ReportFilterOptions {
  category?: IssueCategory;
  status?: ReportStatus;
  district?: string;
  submittedById?: string;
  minPriority?: number;
  search?: string;
}

export async function listReports(filters: ReportFilterOptions = {}): Promise<Report[]> {
  if (getIsDatabaseConfigured()) {
    try {
      const where: Record<string, unknown> = {};

      if (filters.category) {
        where.category = filters.category.toUpperCase();
      }
      if (filters.status) {
        where.status = filters.status.toUpperCase();
      }
      if (filters.district) {
        where.district = { contains: filters.district, mode: "insensitive" };
      }
      if (filters.submittedById) {
        where.submittedById = filters.submittedById;
      }

      const dbReports = await prisma.report.findMany({
        where,
        include: {
          aiAnalysis: true,
          humanReview: {
            include: { reviewedBy: true },
          },
          photos: true,
          timeline: {
            orderBy: { timestamp: "asc" },
          },
          submittedBy: true,
          assignedService: true,
        },
        orderBy: { createdAt: "desc" },
      });

      return dbReports.map(mapPrismaToDomainReport);
    } catch (err: any) {
      console.error("[reportRepository] Database error in listReports:", err.message);
      throw new Error(`Database error while listing reports: ${err.message}`);
    }
  }

  // Filter in-memory ONLY when database is not configured
  return inMemoryReports.filter((r) => {
    if (filters.category && r.category !== filters.category) return false;
    if (filters.status && r.status !== filters.status) return false;
    if (filters.submittedById && r.submittedBy.id !== filters.submittedById) return false;
    if (filters.district && !r.location.district.toLowerCase().includes(filters.district.toLowerCase())) {
      return false;
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const match =
        r.title.fr.toLowerCase().includes(q) ||
        r.title.ar.toLowerCase().includes(q) ||
        r.referenceNumber.toLowerCase().includes(q) ||
        r.location.streetAddress.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });
}

export async function getReportById(id: string): Promise<Report | null> {
  if (getIsDatabaseConfigured()) {
    try {
      const r = await prisma.report.findUnique({
        where: { id },
        include: {
          aiAnalysis: true,
          humanReview: {
            include: { reviewedBy: true },
          },
          photos: true,
          timeline: {
            orderBy: { timestamp: "asc" },
          },
          submittedBy: true,
          assignedService: true,
        },
      });

      if (r) {
        return mapPrismaToDomainReport(r);
      }
      return null;
    } catch (err: any) {
      console.error("[reportRepository] Database error in getReportById:", err.message);
      throw new Error(`Database error while retrieving report: ${err.message}`);
    }
  }

  const found = inMemoryReports.find((rep) => rep.id === id);
  return found || null;
}

export async function createReport(data: {
  id?: string;
  category: IssueCategory;
  title: string;
  description: string;
  district: string;
  streetAddress: string;
  latitude?: number;
  longitude?: number;
  landmark?: string;
  photoUrl?: string;
  photoStorage?: {
    storagePath: string;
    mimeType: string;
    fileSizeBytes: number;
  };
  submittedBy: {
    id: string;
    name: string;
    phone: string;
  };
}): Promise<Report> {
  const refNum = `BLG-2026-TUN-${Math.floor(100 + Math.random() * 900)}`;
  const lat = data.latitude || 36.8065;
  const lng = data.longitude || 10.1815;

  // Diagnostic IA via le service dédié (marqué simulation tant que GEMINI_API_KEY est absent)
  const aiTriage = await analyzeReportTriage({
    category: data.category,
    title: data.title,
    description: data.description,
    district: data.district,
    streetAddress: data.streetAddress,
    referenceNumber: refNum,
    photoUrl: data.photoUrl,
    photoStorage: data.photoStorage,
  });

  const now = new Date().toISOString();
  const reportId = data.id || `rep-${Date.now().toString().slice(-4)}`;

  const defaultPhotoUrl =
    data.category === "pothole"
      ? "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80"
      : data.category === "lighting"
      ? "https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=800&q=80"
      : "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80";

  const resolvedPhoto = data.photoStorage
    ? {
        id: `ph-${Date.now()}`,
        url: `/api/reports/${reportId}/photo`,
        storagePath: data.photoStorage.storagePath,
        mimeType: data.photoStorage.mimeType,
        fileSizeBytes: data.photoStorage.fileSizeBytes,
        uploadedAt: now,
      }
    : {
        id: `ph-${Date.now()}`,
        url: data.photoUrl || defaultPhotoUrl,
        uploadedAt: now,
      };

  const newReport: Report = {
    id: reportId,
    referenceNumber: refNum,
    title: { fr: data.title, ar: data.title },
    description: { fr: data.description, ar: data.description },
    category: data.category,
    status: "ai_analyzed",
    urgency: aiTriage.estimatedSeverity === 3 ? "critical" : "high",
    officialEmailSent: false,
    resolutionConfirmedByCitizen: false,
    createdAt: now,
    updatedAt: now,
    location: {
      governorate: "Tunis",
      municipality: "Commune de Tunis",
      district: data.district,
      streetAddress: data.streetAddress,
      latitude: lat,
      longitude: lng,
      landmark: data.landmark,
    },
    photos: [resolvedPhoto],
    submittedBy: {
      id: data.submittedBy.id,
      name: data.submittedBy.name,
      phone: data.submittedBy.phone,
      isAnonymous: false,
    },
    aiAnalysis: {
      predictedCategory: aiTriage.predictedCategory,
      confidenceScore: aiTriage.confidenceScore,
      estimatedSeverity: aiTriage.estimatedSeverity,
      severityRationale: aiTriage.severityRationale,
      priorityScore: aiTriage.priorityScore,
      priorityFactors: aiTriage.priorityFactors,
      duplicateDetection: aiTriage.duplicateDetection,
      suggestedServiceCode: aiTriage.suggestedServiceCode,
      generatedEmailDraft: aiTriage.generatedEmailDraft,
    },
    timeline: [
      {
        id: `tl-rec-${Date.now()}`,
        status: "received",
        timestamp: now,
        author: data.submittedBy.name,
        authorRole: "citizen",
        comment: {
          fr: "Signalement initial soumis via l'interface citoyenne.",
          ar: "تم إرسال البلاغ الأولي عبر واجهة المواطن.",
        },
      },
      {
        id: `tl-ai-${Date.now() + 1}`,
        status: "ai_analyzed",
        timestamp: new Date(Date.now() + 500).toISOString(),
        author: "Ballegh AI Engine v1.2",
        authorRole: "system_ai",
        comment: {
          fr: `Diagnostic IA préliminaire (${Math.round(aiTriage.confidenceScore * 100)}% certitude). Transmis à l'agent municipal.`,
          ar: `تشخيص تمهيدي للذكاء الاصطناعي (نسبة يقين ${Math.round(aiTriage.confidenceScore * 100)}%). أحيل لعون البلدية.`,
        },
      },
    ],
  };

  if (getIsDatabaseConfigured()) {
    try {
      // Ensure the author exists in the DB so foreign key constraint is satisfied
      let author = await prisma.user.findUnique({ where: { id: data.submittedBy.id } });
      if (!author) {
        const citizenEmail = `${data.submittedBy.id}@ballegh-citizen.local`;
        author = await prisma.user.upsert({
          where: { email: citizenEmail },
          update: { fullName: data.submittedBy.name, phone: data.submittedBy.phone },
          create: {
            id: data.submittedBy.id,
            email: citizenEmail,
            fullName: data.submittedBy.name,
            phone: data.submittedBy.phone,
            passwordHash: "MANAGED_ACCOUNT",
            role: "CITIZEN",
          },
        });
      }

      const created = await prisma.report.create({
        data: {
          id: newReport.id,
          referenceNumber: newReport.referenceNumber,
          titleFr: newReport.title.fr,
          titleAr: newReport.title.ar,
          descriptionFr: newReport.description.fr,
          descriptionAr: newReport.description.ar,
          category: data.category.toUpperCase() as "POTHOLE" | "LIGHTING" | "FLOODING",
          status: "AI_ANALYZED",
          urgency: newReport.urgency.toUpperCase() as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
          district: newReport.location.district,
          streetAddress: newReport.location.streetAddress,
          latitude: lat,
          longitude: lng,
          landmark: data.landmark,
          submittedById: author.id,
          photos: {
            create: [
              {
                url: newReport.photos[0].url,
                storagePath: newReport.photos[0].storagePath,
                mimeType: newReport.photos[0].mimeType,
                fileSizeBytes: newReport.photos[0].fileSizeBytes,
              },
            ],
          },
          aiAnalysis: {
            create: {
              predictedCategory: data.category.toUpperCase() as "POTHOLE" | "LIGHTING" | "FLOODING",
              confidenceScore: aiTriage.confidenceScore,
              estimatedSeverity: aiTriage.estimatedSeverity,
              severityRationaleFr: aiTriage.severityRationale.fr,
              severityRationaleAr: aiTriage.severityRationale.ar,
              priorityScore: aiTriage.priorityScore,
              suggestedServiceCode: aiTriage.suggestedServiceCode,
              draftEmailDept: aiTriage.generatedEmailDraft.recipientDepartment,
              draftEmailTo: aiTriage.generatedEmailDraft.recipientEmail,
              draftEmailSubject: newReport.aiAnalysis.generatedEmailDraft.subject,
              draftEmailBody: newReport.aiAnalysis.generatedEmailDraft.body,
            },
          },
          timeline: {
            create: [
              {
                authorName: data.submittedBy.name,
                authorRole: "CITIZEN",
                status: "RECEIVED",
                commentFr: "Signalement initial soumis via l'interface citoyenne.",
                commentAr: "تم إرسال البلاغ الأولي عبر واجهة المواطن.",
              },
              {
                authorName: "Ballegh AI Engine v1.2",
                authorRole: "SYSTEM_AI",
                status: "AI_ANALYZED",
                commentFr: `Diagnostic IA préliminaire (${Math.round(aiTriage.confidenceScore * 100)}% certitude). Transmis à l'agent municipal.`,
                commentAr: `تشخيص تمهيدي للذكاء الاصطناعي (نسبة يقين ${Math.round(aiTriage.confidenceScore * 100)}%). أحيل لعون البلدية.`,
              },
            ],
          },
        },
        include: {
          aiAnalysis: true,
          humanReview: { include: { reviewedBy: true } },
          photos: true,
          timeline: { orderBy: { timestamp: "asc" } },
          submittedBy: true,
          assignedService: true,
        },
      });

      return mapPrismaToDomainReport(created);
    } catch (err: any) {
      if (data.photoStorage?.storagePath) {
        // Prevent orphaned storage files if database transaction fails
        await deletePhotoFromStorage(data.photoStorage.storagePath).catch(() => {});
      }
      console.error("[reportRepository] Database error in createReport:", err.message);
      throw new Error(`Database error while creating report: ${err.message}`);
    }
  }

  inMemoryReports = [newReport, ...inMemoryReports];
  return newReport;
}

export async function updateHumanReview(
  reportId: string,
  agent: { id: string; name: string; role: UserRole },
  decision: HumanDecision,
  notes?: string,
  modifications?: {
    category?: IssueCategory;
    severity?: SeverityLevel;
    priority?: number;
  }
): Promise<Report | null> {
  const newStatus: ReportStatus = decision === "rejected" ? "rejected" : "human_validated";
  const now = new Date().toISOString();

  const timelineEntry = {
    id: `tl-rev-${Date.now()}`,
    status: newStatus,
    timestamp: now,
    author: agent.name,
    authorRole: agent.role,
    comment: {
      fr: `Décision de l'agent : ${decision.toUpperCase()}. ${notes || ""}`,
      ar: `قرار العون البلدي: ${decision.toUpperCase()}. ${notes || ""}`,
    },
  };

  if (getIsDatabaseConfigured()) {
    try {
      // Ensure reviewing agent user exists in DB
      let agentUser = await prisma.user.findUnique({ where: { id: agent.id } });
      if (!agentUser) {
        const agentEmail = `${agent.id}@commune-tunis.gov.tn`;
        agentUser = await prisma.user.upsert({
          where: { email: agentEmail },
          update: { fullName: agent.name },
          create: {
            id: agent.id,
            email: agentEmail,
            fullName: agent.name,
            phone: "+216 71 340 000",
            passwordHash: "MANAGED_ACCOUNT",
            role: "MUNICIPAL_AGENT",
          },
        });
      }

      await prisma.humanReview.upsert({
        where: { reportId },
        update: {
          decision: decision.toUpperCase() as "ACCEPTED" | "MODIFIED" | "REJECTED",
          decisionNotes: notes,
          adjustedCategory: modifications?.category
            ? (modifications.category.toUpperCase() as "POTHOLE" | "LIGHTING" | "FLOODING")
            : undefined,
          adjustedSeverity: modifications?.severity,
          adjustedPriority: modifications?.priority,
          reviewedById: agentUser.id,
        },
        create: {
          reportId,
          reviewedById: agentUser.id,
          decision: decision.toUpperCase() as "ACCEPTED" | "MODIFIED" | "REJECTED",
          decisionNotes: notes,
          adjustedCategory: modifications?.category
            ? (modifications.category.toUpperCase() as "POTHOLE" | "LIGHTING" | "FLOODING")
            : undefined,
          adjustedSeverity: modifications?.severity,
          adjustedPriority: modifications?.priority,
        },
      });

      await prisma.report.update({
        where: { id: reportId },
        data: {
          status: newStatus.toUpperCase() as "HUMAN_VALIDATED" | "REJECTED",
          timeline: {
            create: {
              authorId: agentUser.id,
              authorName: agent.name,
              authorRole: "MUNICIPAL_AGENT",
              status: newStatus.toUpperCase() as "HUMAN_VALIDATED" | "REJECTED",
              commentFr: timelineEntry.comment.fr,
              commentAr: timelineEntry.comment.ar,
            },
          },
        },
      });

      return getReportById(reportId);
    } catch (err: any) {
      console.error("[reportRepository] Database error in updateHumanReview:", err.message);
      throw new Error(`Database error while updating human review: ${err.message}`);
    }
  }

  // Update in-memory ONLY when database is not configured
  inMemoryReports = inMemoryReports.map((r) => {
    if (r.id !== reportId) return r;
    return {
      ...r,
      status: newStatus,
      updatedAt: now,
      humanReview: {
        reviewedBy: agent.name,
        reviewedAt: now,
        decision,
        decisionNotes: notes,
        adjustedCategory: modifications?.category || r.category,
        adjustedSeverity: modifications?.severity || r.aiAnalysis.estimatedSeverity,
        adjustedPriority: modifications?.priority || r.aiAnalysis.priorityScore,
      },
      timeline: [...r.timeline, timelineEntry],
    };
  });

  return getReportById(reportId);
}

export async function advanceReportStatus(
  reportId: string,
  agent: { id: string; name: string; role: UserRole },
  status: ReportStatus,
  comment?: { fr: string; ar: string }
): Promise<Report | null> {
  const now = new Date().toISOString();
  const timelineEntry = {
    id: `tl-stat-${Date.now()}`,
    status,
    timestamp: now,
    author: agent.name,
    authorRole: agent.role,
    comment: comment || {
      fr: `Statut mis à jour à : ${status}`,
      ar: `تم تحديث الحالة إلى: ${status}`,
    },
  };

  if (getIsDatabaseConfigured()) {
    try {
      await prisma.report.update({
        where: { id: reportId },
        data: {
          status: status.toUpperCase() as "FORWARDED" | "IN_PROGRESS" | "RESOLVED",
          officialEmailSent: status === "forwarded" ? true : undefined,
          officialEmailSentAt: status === "forwarded" ? new Date() : undefined,
          timeline: {
            create: {
              authorName: agent.name,
              authorRole: "MUNICIPAL_AGENT",
              status: status.toUpperCase() as "FORWARDED" | "IN_PROGRESS" | "RESOLVED",
              commentFr: timelineEntry.comment.fr,
              commentAr: timelineEntry.comment.ar,
            },
          },
        },
      });

      return getReportById(reportId);
    } catch (err: any) {
      console.error("[reportRepository] Database error in advanceReportStatus:", err.message);
      throw new Error(`Database error while advancing report status: ${err.message}`);
    }
  }

  // Update in-memory ONLY when database is not configured
  inMemoryReports = inMemoryReports.map((r) => {
    if (r.id !== reportId) return r;
    return {
      ...r,
      status,
      updatedAt: now,
      officialEmailSent: status === "forwarded" ? true : r.officialEmailSent,
      officialEmailSentAt: status === "forwarded" ? now : r.officialEmailSentAt,
      resolutionConfirmedByCitizen: r.resolutionConfirmedByCitizen ?? false,
      timeline: [...r.timeline, timelineEntry],
    };
  });

  return getReportById(reportId);
}

export async function confirmCitizenResolution(
  reportId: string,
  citizen: { id: string; name: string }
): Promise<Report | null> {
  const now = new Date().toISOString();
  const timelineEntry = {
    id: `tl-conf-${Date.now()}`,
    status: "resolved" as const,
    timestamp: now,
    author: citizen.name,
    authorRole: "citizen" as const,
    comment: {
      fr: "Résolution sur le terrain confirmée par le citoyen.",
      ar: "تم تأكيد الإصلاح الفعلي على الميدان من طرف المواطن.",
    },
  };

  if (getIsDatabaseConfigured()) {
    try {
      await prisma.report.update({
        where: { id: reportId },
        data: {
          status: "RESOLVED",
          resolutionConfirmedByCitizen: true,
          timeline: {
            create: {
              authorName: citizen.name,
              authorRole: "CITIZEN",
              status: "RESOLVED",
              commentFr: timelineEntry.comment.fr,
              commentAr: timelineEntry.comment.ar,
            },
          },
        },
      });

      return getReportById(reportId);
    } catch (err: any) {
      console.error("[reportRepository] Database error in confirmCitizenResolution:", err.message);
      throw new Error(`Database error while confirming resolution: ${err.message}`);
    }
  }

  // Update in-memory ONLY when database is not configured
  inMemoryReports = inMemoryReports.map((r) => {
    if (r.id !== reportId) return r;
    return {
      ...r,
      status: "resolved",
      resolutionConfirmedByCitizen: true,
      updatedAt: now,
      timeline: [...r.timeline, timelineEntry],
    };
  });

  return getReportById(reportId);
}

// Internal Prisma-to-Domain mapper
function mapPrismaToDomainReport(r: any): Report {
  return {
    id: r.id,
    referenceNumber: r.referenceNumber,
    title: { fr: r.titleFr, ar: r.titleAr },
    description: { fr: r.descriptionFr, ar: r.descriptionAr },
    category: r.category.toLowerCase() as IssueCategory,
    status: r.status.toLowerCase() as ReportStatus,
    urgency: r.urgency.toLowerCase() as "low" | "medium" | "high" | "critical",
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    location: {
      governorate: r.governorate as "Tunis",
      municipality: r.municipality,
      district: r.district,
      streetAddress: r.streetAddress,
      latitude: r.latitude,
      longitude: r.longitude,
      landmark: r.landmark || undefined,
    },
    photos: r.photos.map((p: any) => ({
      id: p.id,
      url: p.url,
      storagePath: p.storagePath || undefined,
      mimeType: p.mimeType || undefined,
      fileSizeBytes: p.fileSizeBytes || undefined,
      caption: p.caption || undefined,
      uploadedAt: p.uploadedAt.toISOString(),
    })),
    submittedBy: {
      id: r.submittedBy.id,
      name: r.submittedBy.fullName,
      phone: r.submittedBy.phone,
      isAnonymous: false,
    },
    aiAnalysis: r.aiAnalysis
      ? {
          predictedCategory: r.aiAnalysis.predictedCategory.toLowerCase() as IssueCategory,
          confidenceScore: r.aiAnalysis.confidenceScore,
          estimatedSeverity: r.aiAnalysis.estimatedSeverity as SeverityLevel,
          severityRationale: {
            fr: r.aiAnalysis.severityRationaleFr,
            ar: r.aiAnalysis.severityRationaleAr,
          },
          priorityScore: r.aiAnalysis.priorityScore,
          priorityFactors: {
            baseSeverityWeight: r.aiAnalysis.baseSeverityWeight,
            densityWeight: r.aiAnalysis.densityWeight,
            sensitiveZoneProximity: r.aiAnalysis.sensitiveZoneProximity,
            agingWeight: r.aiAnalysis.agingWeight,
          },
          duplicateDetection: {
            isLikelyDuplicate: r.aiAnalysis.isLikelyDuplicate,
            similarityScore: r.aiAnalysis.duplicateSimilarity,
            relatedReportIds: [],
            explanation: {
              fr: r.aiAnalysis.duplicateExplanationFr || "",
              ar: r.aiAnalysis.duplicateExplanationAr || "",
            },
          },
          suggestedServiceCode: r.aiAnalysis.suggestedServiceCode,
          generatedEmailDraft: {
            recipientDepartment: r.aiAnalysis.draftEmailDept,
            recipientEmail: r.aiAnalysis.draftEmailTo,
            subject: r.aiAnalysis.draftEmailSubject,
            body: r.aiAnalysis.draftEmailBody,
          },
        }
      : ({} as any),
    humanReview: r.humanReview
      ? {
          reviewedBy: r.humanReview.reviewedBy.fullName,
          reviewedAt: r.humanReview.reviewedAt.toISOString(),
          decision: r.humanReview.decision.toLowerCase() as HumanDecision,
          decisionNotes: r.humanReview.decisionNotes || undefined,
          adjustedCategory: r.humanReview.adjustedCategory?.toLowerCase() as IssueCategory | undefined,
          adjustedSeverity: r.humanReview.adjustedSeverity as SeverityLevel | undefined,
          adjustedPriority: r.humanReview.adjustedPriority || undefined,
        }
      : undefined,
    officialEmailSent: r.officialEmailSent,
    officialEmailSentAt: r.officialEmailSentAt?.toISOString(),
    resolutionConfirmedByCitizen: r.resolutionConfirmedByCitizen,
    timeline: r.timeline.map((t: any) => ({
      id: t.id,
      status: t.status.toLowerCase() as ReportStatus,
      timestamp: t.timestamp.toISOString(),
      author: t.authorName,
      authorRole: t.authorRole.toLowerCase() as UserRole | "system_ai",
      comment: t.commentFr
        ? {
            fr: t.commentFr,
            ar: t.commentAr || t.commentFr,
          }
        : undefined,
    })),
  };
}
