export type Language = "fr" | "ar";
export type Direction = "ltr" | "rtl";

export type UserRole = "citizen" | "municipal_agent" | "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  avatarUrl?: string;
  district?: string;
  organization?: string;
}

export type IssueCategory = "pothole" | "lighting" | "flooding";

export type ReportStatus =
  | "received"           // Reçu
  | "ai_analyzed"        // Analysé par l'IA
  | "human_validated"    // Validé par le responsable
  | "forwarded"          // Transmis au service
  | "in_progress"        // En cours d'intervention
  | "resolved"           // Résolu
  | "rejected";          // Rejeté

export type SeverityLevel = 1 | 2 | 3; // 1 = Faible, 2 = Moyen, 3 = Critique

export type HumanDecision = "pending" | "accepted" | "modified" | "rejected";

export interface AIAnalysis {
  predictedCategory: IssueCategory;
  confidenceScore: number; // 0.0 to 1.0
  estimatedSeverity: SeverityLevel;
  severityRationale: {
    fr: string;
    ar: string;
  };
  priorityScore: number; // 0 to 100
  priorityFactors: {
    baseSeverityWeight: number;
    densityWeight: number;
    sensitiveZoneProximity: boolean;
    agingWeight: number;
  };
  duplicateDetection: {
    isLikelyDuplicate: boolean;
    similarityScore: number; // 0.0 to 1.0
    duplicateClusterId?: string;
    relatedReportIds: string[];
    explanation: {
      fr: string;
      ar: string;
    };
  };
  suggestedServiceCode: string;
  generatedEmailDraft: {
    recipientDepartment: string;
    recipientEmail: string;
    subject: string;
    body: string;
  };
}

export interface ReportTimelineEvent {
  id: string;
  status: ReportStatus;
  timestamp: string;
  author: string;
  authorRole: UserRole | "system_ai";
  comment?: {
    fr: string;
    ar: string;
  };
}

export interface Report {
  id: string;
  referenceNumber: string; // e.g. "BLG-2026-TUN-0142"
  title: {
    fr: string;
    ar: string;
  };
  description: {
    fr: string;
    ar: string;
  };
  category: IssueCategory;
  status: ReportStatus;
  urgency: "low" | "medium" | "high" | "critical";
  createdAt: string;
  updatedAt: string;
  
  // Location
  location: {
    governorate: "Tunis";
    municipality: string; // e.g., "Commune de Tunis"
    district: string;     // e.g., "Bab Souika", "Montplaisir", "Carthage"
    streetAddress: string;
    latitude: number;
    longitude: number;
    landmark?: string;
  };

  // Media
  photos: {
    id: string;
    url: string;
    caption?: string;
    uploadedAt: string;
  }[];

  // Citizen submitter
  submittedBy: {
    id: string;
    name: string;
    phone: string;
    isAnonymous: boolean;
  };

  // AI & Municipal Processing
  aiAnalysis: AIAnalysis;
  humanReview?: {
    reviewedBy: string;
    reviewedAt: string;
    decision: HumanDecision;
    decisionNotes?: string;
    adjustedCategory?: IssueCategory;
    adjustedSeverity?: SeverityLevel;
    adjustedPriority?: number;
    assignedService?: string;
  };

  // Communication & Status
  officialEmailSent?: boolean;
  officialEmailSentAt?: string;
  resolutionConfirmedByCitizen?: boolean;
  timeline: ReportTimelineEvent[];
}

export interface MunicipalService {
  id: string;
  code: string;
  name: {
    fr: string;
    ar: string;
  };
  department: string;
  contactEmail: string;
  phone: string;
  headOfService: string;
  supportedCategories: IssueCategory[];
  averageResponseTimeDays: number;
}
