"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { Report, User, UserRole, IssueCategory, ReportStatus, SeverityLevel } from "@/lib/types";
import { INITIAL_DEMO_REPORTS } from "./reports";
import { DEMO_USERS } from "./users";

export interface DemoContextType {
  reports: Report[];
  activeUser: User;
  isLoading: boolean;
  error: string | null;
  setActiveRole: (role: UserRole) => Promise<void>;
  refreshReports: () => Promise<void>;
  getReportById: (id: string) => Report | undefined;
  fetchReportById: (id: string) => Promise<Report | null>;
  createReport: (newReportData: {
    category: IssueCategory;
    title: string;
    description: string;
    district: string;
    streetAddress: string;
    photoUrl?: string;
    photoStorage?: {
      storagePath: string;
      mimeType: string;
      fileSizeBytes: number;
    };
  }) => Promise<string>;
  updateHumanReview: (
    reportId: string,
    decision: "accepted" | "modified" | "rejected",
    notes?: string,
    modifications?: {
      category?: IssueCategory;
      severity?: SeverityLevel;
      priority?: number;
    }
  ) => Promise<Report | null>;
  sendOfficialEmail: (reportId: string) => Promise<Report | null>;
  updateReportStatus: (
    reportId: string,
    status: ReportStatus,
    comment?: { fr: string; ar: string }
  ) => Promise<Report | null>;
  confirmCitizenResolution: (reportId: string) => Promise<Report | null>;
  resetDemoData: () => Promise<void>;
}

const DemoContext = createContext<DemoContextType | undefined>(undefined);

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [reports, setReports] = useState<Report[]>([]);
  const [activeUser, setActiveUser] = useState<User>(DEMO_USERS[0]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refreshReports = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/reports");
      if (res.ok) {
        const data = await res.json();
        if (data.reports && Array.isArray(data.reports)) {
          setReports(data.reports);
          return;
        }
      }
      // If endpoint failed or offline, fall back to initial demo reports
      setReports((prev) => (prev.length > 0 ? prev : INITIAL_DEMO_REPORTS));
    } catch (err: any) {
      console.warn("[DemoStore] Failed to fetch /api/reports, using memory cache:", err.message);
      setError("Connexion à l'API impossible, mode hors ligne activé.");
      setReports((prev) => (prev.length > 0 ? prev : INITIAL_DEMO_REPORTS));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const syncUserSession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.user) {
          setActiveUser(data.user);
          return;
        }
      }
      // Check saved demo role fallback
      const savedRole = localStorage.getItem("ballegh_active_role") as UserRole;
      if (savedRole) {
        const found = DEMO_USERS.find((u) => u.role === savedRole);
        if (found) setActiveUser(found);
      }
    } catch {
      // offline fallback
    }
  }, []);

  useEffect(() => {
    Promise.allSettled([syncUserSession(), refreshReports()]);
  }, [syncUserSession, refreshReports]);

  const setActiveRole = async (role: UserRole) => {
    const found = DEMO_USERS.find((u) => u.role === role) || DEMO_USERS[0];
    setActiveUser(found);
    localStorage.setItem("ballegh_active_role", role);

    try {
      await fetch("/api/auth/demo-switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      // Refresh reports to apply role-specific visibility rules
      await refreshReports();
    } catch {
      // offline fallback
    }
  };

  const getReportById = (id: string): Report | undefined => {
    return reports.find((r) => r.id === id);
  };

  const fetchReportById = async (id: string): Promise<Report | null> => {
    try {
      const res = await fetch(`/api/reports/${id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.report) {
          // Update in local cache
          setReports((prev) => {
            const exists = prev.some((r) => r.id === id);
            return exists ? prev.map((r) => (r.id === id ? data.report : r)) : [data.report, ...prev];
          });
          return data.report;
        }
      }
    } catch (err: any) {
      console.warn(`[DemoStore] Error fetching report ${id}:`, err.message);
    }
    return getReportById(id) || null;
  };

  const createReport = async (data: {
    category: IssueCategory;
    title: string;
    description: string;
    district: string;
    streetAddress: string;
    photoUrl?: string;
    photoStorage?: {
      storagePath: string;
      mimeType: string;
      fileSizeBytes: number;
    };
  }): Promise<string> => {
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        const result = await res.json();
        if (result.report) {
          setReports((prev) => [result.report, ...prev]);
          return result.report.id;
        }
      }
    } catch (err: any) {
      console.warn("[DemoStore] Failed to post report to server API, creating locally:", err.message);
    }

    // Offline / fallback creation
    const fallbackId = `rep-${Date.now().toString().slice(-4)}`;
    const fallbackReport: Report = {
      id: fallbackId,
      referenceNumber: `BLG-2026-TUN-${Math.floor(100 + Math.random() * 900)}`,
      title: { fr: data.title, ar: data.title },
      description: { fr: data.description, ar: data.description },
      category: data.category,
      status: "ai_analyzed",
      urgency: "high",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      location: {
        governorate: "Tunis",
        municipality: "Commune de Tunis",
        district: data.district,
        streetAddress: data.streetAddress,
        latitude: 36.8005,
        longitude: 10.1805,
      },
      photos: [
        {
          id: `ph-${Date.now()}`,
          url: data.photoStorage
            ? `/api/reports/${fallbackId}/photo`
            : data.photoUrl || "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80",
          storagePath: data.photoStorage?.storagePath,
          mimeType: data.photoStorage?.mimeType,
          fileSizeBytes: data.photoStorage?.fileSizeBytes,
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
        confidenceScore: 0.92,
        estimatedSeverity: 2,
        severityRationale: {
          fr: "Diagnostic préliminaire local.",
          ar: "تشخيص محلي أولي.",
        },
        priorityScore: 75,
        priorityFactors: {
          baseSeverityWeight: 35,
          densityWeight: 20,
          sensitiveZoneProximity: true,
          agingWeight: 10,
        },
        duplicateDetection: {
          isLikelyDuplicate: false,
          similarityScore: 0.0,
          relatedReportIds: [],
          explanation: { fr: "Aucun doublon détecté.", ar: "لا يوجد تشابه." },
        },
        suggestedServiceCode: "DVRD-TUNIS",
        generatedEmailDraft: {
          recipientDepartment: "Services Techniques",
          recipientEmail: "services.techniques@commune-tunis.gov.tn",
          subject: `[SIGNALEMENT] ${data.title}`,
          body: data.description,
        },
      },
      timeline: [
        {
          id: `tl-rec-${Date.now()}`,
          status: "received",
          timestamp: new Date().toISOString(),
          author: activeUser.name,
          authorRole: "citizen",
          comment: { fr: "Signalement initial soumis.", ar: "تم تقديم البلاغ الأولي." },
        },
      ],
    };

    setReports((prev) => [fallbackReport, ...prev]);
    return fallbackId;
  };

  const updateHumanReview = async (
    reportId: string,
    decision: "accepted" | "modified" | "rejected",
    notes?: string,
    modifications?: {
      category?: IssueCategory;
      severity?: SeverityLevel;
      priority?: number;
    }
  ): Promise<Report | null> => {
    try {
      const res = await fetch(`/api/reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "human_review",
          decision,
          notes,
          modifications,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        if (result.report) {
          setReports((prev) => prev.map((r) => (r.id === reportId ? result.report : r)));
          return result.report;
        }
      }
    } catch (err: any) {
      console.warn("[DemoStore] Failed to PATCH review to server:", err.message);
    }

    // Local fallback update
    const newStatus = decision === "rejected" ? ("rejected" as const) : ("human_validated" as const);
    let updatedReport: Report | null = null;

    setReports((prev) =>
      prev.map((r) => {
        if (r.id !== reportId) return r;
        updatedReport = {
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
          timeline: [
            ...r.timeline,
            {
              id: `tl-rev-${Date.now()}`,
              status: newStatus,
              timestamp: new Date().toISOString(),
              author: activeUser.name,
              authorRole: activeUser.role,
              comment: {
                fr: `Décision de l'agent : ${decision.toUpperCase()}. ${notes || ""}`,
                ar: `قرار العون البلدي: ${decision.toUpperCase()}. ${notes || ""}`,
              },
            },
          ],
        };
        return updatedReport;
      })
    );

    return updatedReport;
  };

  const sendOfficialEmail = async (reportId: string): Promise<Report | null> => {
    try {
      const res = await fetch(`/api/reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send_email" }),
      });

      if (res.ok) {
        const result = await res.json();
        if (result.report) {
          setReports((prev) => prev.map((r) => (r.id === reportId ? result.report : r)));
          return result.report;
        }
      } else {
        const errData = await res.json();
        throw new Error(errData.error || "Échec de l'envoi de l'e-mail officiel");
      }
    } catch (err: any) {
      console.error("[DemoStore] sendOfficialEmail error:", err.message);
      throw err;
    }
    return null;
  };

  const updateReportStatus = async (
    reportId: string,
    status: ReportStatus,
    comment?: { fr: string; ar: string }
  ): Promise<Report | null> => {
    try {
      const res = await fetch(`/api/reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "advance_status",
          status,
          comment,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        if (result.report) {
          setReports((prev) => prev.map((r) => (r.id === reportId ? result.report : r)));
          return result.report;
        }
      }
    } catch (err: any) {
      console.warn("[DemoStore] Failed to PATCH advance_status to server:", err.message);
    }

    let updatedReport: Report | null = null;
    setReports((prev) =>
      prev.map((r) => {
        if (r.id !== reportId) return r;
        updatedReport = {
          ...r,
          status,
          updatedAt: new Date().toISOString(),
          timeline: [
            ...r.timeline,
            {
              id: `tl-stat-${Date.now()}`,
              status,
              timestamp: new Date().toISOString(),
              author: activeUser.name,
              authorRole: activeUser.role,
              comment: comment || {
                fr: `Statut mis à jour à : ${status}`,
                ar: `تم تحديث الحالة إلى: ${status}`,
              },
            },
          ],
        };
        return updatedReport;
      })
    );

    return updatedReport;
  };

  const confirmCitizenResolution = async (reportId: string): Promise<Report | null> => {
    try {
      const res = await fetch(`/api/reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "confirm_resolution" }),
      });

      if (res.ok) {
        const result = await res.json();
        if (result.report) {
          setReports((prev) => prev.map((r) => (r.id === reportId ? result.report : r)));
          return result.report;
        }
      } else {
        const errData = await res.json();
        throw new Error(errData.error || "Confirmation de résolution impossible");
      }
    } catch (err: any) {
      console.error("[DemoStore] confirmCitizenResolution error:", err.message);
      throw err;
    }
    return null;
  };

  const resetDemoData = async () => {
    localStorage.removeItem("ballegh_active_role");
    setActiveUser(DEMO_USERS[0]);
    try {
      await fetch("/api/auth/demo-switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "citizen" }),
      });
      await refreshReports();
    } catch {
      setReports(INITIAL_DEMO_REPORTS);
    }
  };

  return (
    <DemoContext.Provider
      value={{
        reports,
        activeUser,
        isLoading,
        error,
        setActiveRole,
        refreshReports,
        getReportById,
        fetchReportById,
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
