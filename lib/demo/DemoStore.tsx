"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import type { Report, User, UserRole, IssueCategory, ReportStatus } from "@/lib/types";
import { INITIAL_DEMO_REPORTS } from "./reports";
import { DEMO_USERS } from "./users";

interface DemoContextType {
  reports: Report[];
  activeUser: User;
  setActiveRole: (role: UserRole) => void;
  getReportById: (id: string) => Report | undefined;
  createReport: (newReportData: {
    category: IssueCategory;
    title: string;
    description: string;
    district: string;
    streetAddress: string;
    photoUrl?: string;
  }) => string; // returns new report ID
  updateHumanReview: (
    reportId: string,
    decision: "accepted" | "modified" | "rejected",
    notes?: string,
    modifications?: {
      category?: IssueCategory;
      severity?: 1 | 2 | 3;
      priority?: number;
    }
  ) => void;
  sendOfficialEmail: (reportId: string) => void;
  updateReportStatus: (
    reportId: string,
    status: ReportStatus,
    comment?: { fr: string; ar: string }
  ) => void;
  confirmCitizenResolution: (reportId: string) => void;
  resetDemoData: () => void;
}

const DemoContext = createContext<DemoContextType | undefined>(undefined);

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [reports, setReports] = useState<Report[]>(INITIAL_DEMO_REPORTS);
  const [activeUser, setActiveUser] = useState<User>(DEMO_USERS[0]); // default: Citizen

  useEffect(() => {
    const savedReports = localStorage.getItem("ballegh_demo_reports");
    if (savedReports) {
      try {
        setReports(JSON.parse(savedReports));
      } catch {
        // ignore fallback
      }
    }
    const savedRole = localStorage.getItem("ballegh_active_role") as UserRole;
    if (savedRole) {
      const found = DEMO_USERS.find((u) => u.role === savedRole);
      if (found) setActiveUser(found);
    }
  }, []);

  const saveReports = (newReports: Report[]) => {
    setReports(newReports);
    localStorage.setItem("ballegh_demo_reports", JSON.stringify(newReports));
  };

  const setActiveRole = (role: UserRole) => {
    const found = DEMO_USERS.find((u) => u.role === role) || DEMO_USERS[0];
    setActiveUser(found);
    localStorage.setItem("ballegh_active_role", role);
  };

  const getReportById = (id: string) => {
    return reports.find((r) => r.id === id);
  };

  const createReport = (data: {
    category: IssueCategory;
    title: string;
    description: string;
    district: string;
    streetAddress: string;
    photoUrl?: string;
  }): string => {
    const newId = `rep-${Date.now().toString().slice(-4)}`;
    const refNum = `BLG-2026-TUN-${(reports.length + 1).toString().padStart(3, "0")}`;

    // Simulated AI Processing based on category
    const categoryDefaults = {
      pothole: {
        conf: 0.93,
        sev: 2 as const,
        score: 76,
        dept: "Direction de la Voirie et des Réseaux Divers",
        email: "voirie.technique@commune-tunis.gov.tn",
        rationaleFr: "Dégradation de surface sur voie carrossable nécessitant rebouchage.",
        rationaleAr: "اهتراء سطحي بمسار السير يتطلب التدخل للترميم.",
      },
      lighting: {
        conf: 0.91,
        sev: 2 as const,
        score: 70,
        dept: "Division Éclairage Public et Énergie",
        email: "eclairage.public@commune-tunis.gov.tn",
        rationaleFr: "Panne d'éclairage nocturne signalée par photo.",
        rationaleAr: "عطب إنارة ليلية مؤكد بالصورة المرفقة.",
      },
      flooding: {
        conf: 0.95,
        sev: 3 as const,
        score: 88,
        dept: "Direction de l'Assainissement et des Eaux Pluviales",
        email: "eaux.pluviales@commune-tunis.gov.tn",
        rationaleFr: "Accumulation critique d'eau de pluie et risque de saturation de voirie.",
        rationaleAr: "تراكم مياه أمطار مع خطر انسداد قنوات التصريف في المنطقة.",
      },
    };

    const sim = categoryDefaults[data.category];

    const newReport: Report = {
      id: newId,
      referenceNumber: refNum,
      title: {
        fr: data.title,
        ar: data.title,
      },
      description: {
        fr: data.description,
        ar: data.description,
      },
      category: data.category,
      status: "ai_analyzed",
      urgency: sim.sev === 3 ? "critical" : "high",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      location: {
        governorate: "Tunis",
        municipality: "Commune de Tunis",
        district: data.district || "Centre-Ville",
        streetAddress: data.streetAddress || "Avenue Habib Bourguiba",
        latitude: 36.8005,
        longitude: 10.1805,
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
          uploadedAt: new Date().toISOString(),
        },
      ],
      submittedBy: {
        id: activeUser.id,
        name: activeUser.name,
        phone: activeUser.phone,
        isAnonymous: false,
      },
      aiAnalysis: {
        predictedCategory: data.category,
        confidenceScore: sim.conf,
        estimatedSeverity: sim.sev,
        severityRationale: {
          fr: sim.rationaleFr,
          ar: sim.rationaleAr,
        },
        priorityScore: sim.score,
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
            fr: "Analyse spatio-temporelle : aucun signalement identique dans les 100m.",
            ar: "تحليل مكاني وزمني: لا يوجد بلاغ مطابق في محيط 100 متر.",
          },
        },
        suggestedServiceCode:
          data.category === "pothole"
            ? "DVRD-TUNIS"
            : data.category === "lighting"
            ? "DEP-ECL-TUNIS"
            : "DAEP-TUNIS",
        generatedEmailDraft: {
          recipientDepartment: sim.dept,
          recipientEmail: sim.email,
          subject: `[${data.category.toUpperCase()} - ${refNum}] Nouveau signalement à valider - ${data.district}`,
          body: `Signalement ${refNum} enregistré le ${new Date().toLocaleDateString("fr-TN")} à ${data.streetAddress}, ${data.district}.\n\nDescription citoyenne : "${data.description}"\n\nDiagnostic IA : Gravité ${sim.sev}/3, Priorité estimée ${sim.score}/100.\n\nEn attente de validation par l'agent municipal référent.`,
        },
      },
      timeline: [
        {
          id: `tl-init-${Date.now()}`,
          status: "received",
          timestamp: new Date().toISOString(),
          author: activeUser.name,
          authorRole: "citizen",
          comment: {
            fr: "Signalement soumis par le citoyen.",
            ar: "تم تقديم البلاغ من طرف المواطن.",
          },
        },
        {
          id: `tl-ai-${Date.now()}`,
          status: "ai_analyzed",
          timestamp: new Date(Date.now() + 1000).toISOString(),
          author: "Ballegh AI Engine",
          authorRole: "system_ai",
          comment: {
            fr: `Diagnostic IA complété (${Math.round(sim.conf * 100)}% confiance). Recommandation transmise à l'agent de garde.`,
            ar: `اكتمل تشخيص الذكاء الاصطناعي (نسبة ثقة ${Math.round(sim.conf * 100)}%). أحيل الملف للمراجعة البلدية.`,
          },
        },
      ],
    };

    const updated = [newReport, ...reports];
    saveReports(updated);
    return newId;
  };

  const updateHumanReview = (
    reportId: string,
    decision: "accepted" | "modified" | "rejected",
    notes?: string,
    modifications?: {
      category?: IssueCategory;
      severity?: 1 | 2 | 3;
      priority?: number;
    }
  ) => {
    const updated = reports.map((r) => {
      if (r.id !== reportId) return r;

      const newStatus = decision === "rejected" ? ("rejected" as const) : ("human_validated" as const);

      const timelineEntry = {
        id: `tl-rev-${Date.now()}`,
        status: newStatus,
        timestamp: new Date().toISOString(),
        author: activeUser.name,
        authorRole: activeUser.role,
        comment: {
          fr: `Décision de l'agent : ${decision.toUpperCase()}. ${notes || ""}`,
          ar: `قرار العون البلدي: ${decision.toUpperCase()}. ${notes || ""}`,
        },
      };

      return {
        ...r,
        status: newStatus,
        updatedAt: new Date().toISOString(),
        humanReview: {
          reviewedBy: activeUser.name,
          reviewedAt: new Date().toISOString(),
          decision,
          decisionNotes: notes,
          adjustedCategory: modifications?.category || r.category,
          adjustedSeverity: modifications?.severity || r.aiAnalysis.estimatedSeverity,
          adjustedPriority: modifications?.priority || r.aiAnalysis.priorityScore,
        },
        timeline: [...r.timeline, timelineEntry],
      };
    });

    saveReports(updated);
  };

  const sendOfficialEmail = (reportId: string) => {
    const updated = reports.map((r) => {
      if (r.id !== reportId) return r;
      const timelineEntry = {
        id: `tl-mail-${Date.now()}`,
        status: "forwarded" as const,
        timestamp: new Date().toISOString(),
        author: activeUser.name,
        authorRole: activeUser.role,
        comment: {
          fr: `Courriel officiel approuvé et transmis au service technique référent.`,
          ar: `تمت المصادقة على البريد الرسمي وإحالته للمصلحة الفنية المعنية.`,
        },
      };

      return {
        ...r,
        status: "forwarded" as const,
        officialEmailSent: true,
        officialEmailSentAt: new Date().toISOString(),
        timeline: [...r.timeline, timelineEntry],
      };
    });

    saveReports(updated);
  };

  const updateReportStatus = (
    reportId: string,
    status: ReportStatus,
    comment?: { fr: string; ar: string }
  ) => {
    const updated = reports.map((r) => {
      if (r.id !== reportId) return r;
      const timelineEntry = {
        id: `tl-stat-${Date.now()}`,
        status,
        timestamp: new Date().toISOString(),
        author: activeUser.name,
        authorRole: activeUser.role,
        comment: comment || {
          fr: `Statut mis à jour à : ${status}`,
          ar: `تم تحديث الحالة إلى: ${status}`,
        },
      };

      return {
        ...r,
        status,
        updatedAt: new Date().toISOString(),
        timeline: [...r.timeline, timelineEntry],
      };
    });

    saveReports(updated);
  };

  const confirmCitizenResolution = (reportId: string) => {
    const updated = reports.map((r) => {
      if (r.id !== reportId) return r;
      const timelineEntry = {
        id: `tl-conf-${Date.now()}`,
        status: "resolved" as const,
        timestamp: new Date().toISOString(),
        author: activeUser.name,
        authorRole: "citizen" as const,
        comment: {
          fr: `Résolution sur le terrain confirmée par le citoyen.`,
          ar: `تم تأكيد الإصلاح الفعلي على الميدان من طرف المواطن.`,
        },
      };

      return {
        ...r,
        status: "resolved" as const,
        resolutionConfirmedByCitizen: true,
        updatedAt: new Date().toISOString(),
        timeline: [...r.timeline, timelineEntry],
      };
    });

    saveReports(updated);
  };

  const resetDemoData = () => {
    localStorage.removeItem("ballegh_demo_reports");
    localStorage.removeItem("ballegh_active_role");
    setReports(INITIAL_DEMO_REPORTS);
    setActiveUser(DEMO_USERS[0]);
  };

  return (
    <DemoContext.Provider
      value={{
        reports,
        activeUser,
        setActiveRole,
        getReportById,
        createReport,
        updateHumanReview,
        sendOfficialEmail,
        updateReportStatus,
        confirmCitizenResolution,
        resetDemoData,
      }}
    >
      {children}
    </DemoContext.Provider>
  );
}

export function useDemo() {
  const context = useContext(DemoContext);
  if (!context) {
    throw new Error("useDemo must be used within a DemoProvider");
  }
  return context;
}
