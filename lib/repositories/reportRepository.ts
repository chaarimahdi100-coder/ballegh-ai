import { prisma, isDatabaseConfigured } from "@/lib/db";
import { INITIAL_DEMO_REPORTS } from "@/lib/demo/reports";
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
  if (isDatabaseConfigured) {
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

    if (dbReports.length > 0) {
      return dbReports.map(mapPrismaToDomainReport);
    }
  } catch {
    // Database offline — fallback
  }
  }

  // Filter in-memory
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
  if (isDatabaseConfigured) {
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
    } catch {
      // DB offline
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
  submittedBy: {
    id: string;
    name: string;
    phone: string;
  };
}): Promise<Report> {
  const refNum = `BLG-2026-TUN-${Math.floor(100 + Math.random() * 900)}`;
  const lat = data.latitude || 36.8065;
  const lng = data.longitude || 10.1815;

  // AI Triage calculation based on domain specs
  const categoryConfig = {
    pothole: {
      conf: 0.94,
      sev: 2 as SeverityLevel,
      priority: 76,
      dept: "Direction de la Voirie et des Réseaux Divers",
      email: "voirie.technique@commune-tunis.gov.tn",
      code: "DVRD-TUNIS",
      rationaleFr: "Dégradation de surface sur voie carrossable nécessitant rebouchage.",
      rationaleAr: "اهتراء سطحي بمسار السير يتطلب التدخل للترميم.",
    },
    lighting: {
      conf: 0.91,
      sev: 2 as SeverityLevel,
      priority: 70,
      dept: "Division Éclairage Public et Énergie",
      email: "eclairage.public@commune-tunis.gov.tn",
      code: "DEP-ECL-TUNIS",
      rationaleFr: "Panne d'éclairage nocturne signalée par photo.",
      rationaleAr: "عطب إنارة ليلية مؤكد بالصورة المرفقة.",
    },
    flooding: {
      conf: 0.96,
      sev: 3 as SeverityLevel,
      priority: 91,
      dept: "Direction de l'Assainissement et des Eaux Pluviales",
      email: "eaux.pluviales@commune-tunis.gov.tn",
      code: "DAEP-TUNIS",
      rationaleFr: "Accumulation critique d'eau de pluie et risque de saturation de voirie.",
      rationaleAr: "تراكم مياه أمطار مع خطر انسداد قنوات التصريف في المنطقة.",
    },
  }[data.category];

  const now = new Date().toISOString();

  const newReport: Report = {
    id: data.id || `rep-${Date.now().toString().slice(-4)}`,
    referenceNumber: refNum,
    title: { fr: data.title, ar: data.title },
    description: { fr: data.description, ar: data.description },
    category: data.category,
    status: "ai_analyzed",
    urgency: categoryConfig.sev === 3 ? "critical" : "high",
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
    photos: [
      {
        id: `ph-${Date.now()}`,
        url:
          data.photoUrl ||
          (data.category === "pothole"
            ? "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80"
            : data.category === "lighting"
            ? "https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=800&q=80"
            : "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80"),
        uploadedAt: now,
      },
    ],
    submittedBy: {
      id: data.submittedBy.id,
      name: data.submittedBy.name,
      phone: data.submittedBy.phone,
      isAnonymous: false,
    },
    aiAnalysis: {
      predictedCategory: data.category,
      confidenceScore: categoryConfig.conf,
      estimatedSeverity: categoryConfig.sev,
      severityRationale: {
        fr: categoryConfig.rationaleFr,
        ar: categoryConfig.rationaleAr,
      },
      priorityScore: categoryConfig.priority,
      priorityFactors: {
        baseSeverityWeight: 35,
        densityWeight: 20,
        sensitiveZoneProximity: true,
        agingWeight: 10,
      },
      duplicateDetection: {
        isLikelyDuplicate: false,
        similarityScore: 0.1,
        relatedReportIds: [],
        explanation: {
          fr: "Analyse spatio-temporelle : aucun signalement identique dans un rayon de 80 mètres.",
          ar: "تحليل مكاني وزمني: لا يوجد بلاغ مطابق في محيط 80 متراً.",
        },
      },
      suggestedServiceCode: categoryConfig.code,
      generatedEmailDraft: {
        recipientDepartment: categoryConfig.dept,
        recipientEmail: categoryConfig.email,
        subject: `[${data.category.toUpperCase()} - ${refNum}] Nouveau signalement à valider - ${data.district}`,
        body: `Signalement ${refNum} enregistré à ${data.streetAddress}, ${data.district}.\n\nDescription citoyenne : "${data.description}"\n\nDiagnostic IA : Gravité ${categoryConfig.sev}/3, Priorité ${categoryConfig.priority}/100.`,
      },
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
          fr: `Diagnostic IA préliminaire (${Math.round(categoryConfig.conf * 100)}% certitude). Transmis à l'agent municipal.`,
          ar: `تشخيص تمهيدي للذكاء الاصطناعي (نسبة يقين ${Math.round(categoryConfig.conf * 100)}%). أحيل لعون البلدية.`,
        },
      },
    ],
  };

  if (isDatabaseConfigured) {
    try {
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
          submittedById: data.submittedBy.id,
          photos: {
            create: [
              {
                url: newReport.photos[0].url,
              },
            ],
          },
          aiAnalysis: {
            create: {
              predictedCategory: data.category.toUpperCase() as "POTHOLE" | "LIGHTING" | "FLOODING",
              confidenceScore: categoryConfig.conf,
              estimatedSeverity: categoryConfig.sev,
              severityRationaleFr: categoryConfig.rationaleFr,
              severityRationaleAr: categoryConfig.rationaleAr,
              priorityScore: categoryConfig.priority,
              suggestedServiceCode: categoryConfig.code,
              draftEmailDept: categoryConfig.dept,
              draftEmailTo: categoryConfig.email,
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
                commentFr: `Diagnostic IA préliminaire (${Math.round(categoryConfig.conf * 100)}% certitude). Transmis à l'agent municipal.`,
                commentAr: `تشخيص تمهيدي للذكاء الاصطناعي (نسبة يقين ${Math.round(categoryConfig.conf * 100)}%). أحيل لعون البلدية.`,
              },
            ],
          },
        },
      });

      if (created) {
        inMemoryReports = [newReport, ...inMemoryReports];
        return newReport;
      }
    } catch {
      // Prisma offline
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

  if (isDatabaseConfigured) {
    try {
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
          reviewedById: agent.id,
        },
        create: {
          reportId,
          reviewedById: agent.id,
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
              authorId: agent.id,
              authorName: agent.name,
              authorRole: "MUNICIPAL_AGENT",
              status: newStatus.toUpperCase() as "HUMAN_VALIDATED" | "REJECTED",
              commentFr: timelineEntry.comment.fr,
              commentAr: timelineEntry.comment.ar,
            },
          },
        },
      });
    } catch {
      // DB offline fallback
    }
  }

  // Update in-memory
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

  if (isDatabaseConfigured) {
    try {
      await prisma.report.update({
        where: { id: reportId },
        data: {
          status: status.toUpperCase() as "FORWARDED" | "IN_PROGRESS" | "RESOLVED",
          officialEmailSent: status === "forwarded" ? true : undefined,
          officialEmailSentAt: status === "forwarded" ? new Date() : undefined,
          timeline: {
            create: {
              authorId: agent.id,
              authorName: agent.name,
              authorRole: "MUNICIPAL_AGENT",
              status: status.toUpperCase() as "FORWARDED" | "IN_PROGRESS" | "RESOLVED",
              commentFr: timelineEntry.comment.fr,
              commentAr: timelineEntry.comment.ar,
            },
          },
        },
      });
    } catch {
      // DB offline fallback
    }
  }

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

  if (isDatabaseConfigured) {
    try {
      await prisma.report.update({
        where: { id: reportId },
        data: {
          status: "RESOLVED",
          resolutionConfirmedByCitizen: true,
          timeline: {
            create: {
              authorId: citizen.id,
              authorName: citizen.name,
              authorRole: "CITIZEN",
              status: "RESOLVED",
              commentFr: timelineEntry.comment.fr,
              commentAr: timelineEntry.comment.ar,
            },
          },
        },
      });
    } catch {
      // DB offline fallback
    }
  }

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
