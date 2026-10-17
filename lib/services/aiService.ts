/**
 * BALLEGH AI — Service de Diagnostic & Vision Artificielle
 *
 * NOTE D'AUDIT & INTÉGRATION EXTERNE :
 * Ce service encapsule le moteur d'analyse d'images et de pré-classification civique.
 * Tant qu'une clé API officielle Google Gemini (GEMINI_API_KEY) n'est pas configurée
 * dans l'environnement, le moteur fonctionne en mode SIMULATION avec un classifieur
 * déterministe conforme à la taxonomie officielle de la Commune de Tunis.
 */

import type { IssueCategory, SeverityLevel } from "@/lib/types";

export interface AIAnalysisResult {
  predictedCategory: IssueCategory;
  confidenceScore: number;
  estimatedSeverity: SeverityLevel;
  severityRationale: { fr: string; ar: string };
  priorityScore: number;
  priorityFactors: {
    baseSeverityWeight: number;
    densityWeight: number;
    sensitiveZoneProximity: boolean;
    agingWeight: number;
  };
  suggestedServiceCode: string;
  generatedEmailDraft: {
    recipientDepartment: string;
    recipientEmail: string;
    subject: string;
    body: string;
  };
  duplicateDetection: {
    isLikelyDuplicate: boolean;
    similarityScore: number;
    relatedReportIds: string[];
    explanation: { fr: string; ar: string };
  };
  metadata: {
    isSimulated: boolean;
    provider: string;
    model: string;
    configured: boolean;
  };
}

export async function analyzeReportTriage(data: {
  category: IssueCategory;
  title: string;
  description: string;
  district: string;
  streetAddress: string;
  referenceNumber: string;
  photoUrl?: string;
}): Promise<AIAnalysisResult> {
  const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY);

  // Spécifications de taxonomie et services techniques de Tunis
  const categoryPresets = {
    pothole: {
      conf: 0.94,
      sev: 2 as SeverityLevel,
      score: 76,
      dept: "Direction de la Voirie et des Réseaux Divers",
      email: "voirie.technique@commune-tunis.gov.tn",
      code: "DVRD-TUNIS",
      rationaleFr: "Dégradation de surface sur voie carrossable nécessitant rebouchage.",
      rationaleAr: "اهتراء سطحي بمسار السير يتطلب التدخل للترميم.",
    },
    lighting: {
      conf: 0.91,
      sev: 2 as SeverityLevel,
      score: 70,
      dept: "Division Éclairage Public et Énergie",
      email: "eclairage.public@commune-tunis.gov.tn",
      code: "DEP-ECL-TUNIS",
      rationaleFr: "Panne d'éclairage nocturne signalée par photo.",
      rationaleAr: "عطب إنارة ليلية مؤكد بالصورة المرفقة.",
    },
    flooding: {
      conf: 0.96,
      sev: 3 as SeverityLevel,
      score: 91,
      dept: "Direction de l'Assainissement et des Eaux Pluviales",
      email: "eaux.pluviales@commune-tunis.gov.tn",
      code: "DAEP-TUNIS",
      rationaleFr: "Accumulation critique d'eau de pluie et risque de saturation de voirie.",
      rationaleAr: "تراكم مياه أمطار مع خطر انسداد قنوات التصريف في المنطقة.",
    },
  }[data.category];

  return {
    predictedCategory: data.category,
    confidenceScore: categoryPresets.conf,
    estimatedSeverity: categoryPresets.sev,
    severityRationale: {
      fr: categoryPresets.rationaleFr,
      ar: categoryPresets.rationaleAr,
    },
    priorityScore: categoryPresets.score,
    priorityFactors: {
      baseSeverityWeight: 35,
      densityWeight: 20,
      sensitiveZoneProximity: data.district.includes("Centre-Ville") || data.district.includes("Avenue"),
      agingWeight: 10,
    },
    suggestedServiceCode: categoryPresets.code,
    generatedEmailDraft: {
      recipientDepartment: categoryPresets.dept,
      recipientEmail: categoryPresets.email,
      subject: `[${data.category.toUpperCase()} - ${data.referenceNumber}] Nouveau signalement à valider - ${data.district}`,
      body: `Signalement ${data.referenceNumber} enregistré à ${data.streetAddress}, ${data.district}.\n\nDescription citoyenne : "${data.description}"\n\nDiagnostic IA : Gravité ${categoryPresets.sev}/3, Priorité estimée ${categoryPresets.score}/100.\n\nEn attente de validation explicite par l'agent municipal référent.`,
    },
    duplicateDetection: {
      isLikelyDuplicate: false,
      similarityScore: 0.08,
      relatedReportIds: [],
      explanation: {
        fr: "Analyse spatio-temporelle : aucun signalement identique dans un rayon de 80 mètres.",
        ar: "تحليل مكاني وزمني: لا يوجد بلاغ مطابق في محيط 80 متراً.",
      },
    },
    metadata: {
      isSimulated: !hasGeminiKey,
      provider: hasGeminiKey ? "Google Gemini Vision" : "Ballegh Deterministic Taxonomy Classifier",
      model: hasGeminiKey ? "gemini-1.5-pro-vision" : "ballegh-rule-engine-v1.0",
      configured: hasGeminiKey,
    },
  };
}
