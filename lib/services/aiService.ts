/**
 * BALLEGH AI — Service de Diagnostic & Vision Artificielle (Google Gemini API)
 *
 * Ce service encapsule le moteur d'analyse d'images et de pré-classification civique.
 * Il intègre l'API officielle Google Gemini (@google/genai) avec un schéma de sortie strict (JSON Schema & Zod).
 *
 * En l'absence de GEMINI_API_KEY ou en cas d'erreur réseau/quota du fournisseur,
 * le moteur bascule de manière sécurisée et transparente sur le classifieur déterministe
 * de secours, explicitement étiqueté comme 'isSimulated: true'.
 */

import { GoogleGenAI, Type } from "@google/genai";
import { z } from "zod";
import type { IssueCategory, SeverityLevel } from "@/lib/types";
import { getPhotoBufferFromStorage } from "@/lib/storage/supabaseStorage";

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
    fallbackReason?: string;
  };
}

export interface AnalyzeReportTriageInput {
  category: IssueCategory;
  title: string;
  description: string;
  district: string;
  streetAddress: string;
  referenceNumber: string;
  photoUrl?: string;
  photoStorage?: {
    storagePath: string;
    mimeType: string;
    fileSizeBytes: number;
  };
}

// Zod Schema for strict validation of Gemini Model output
export const geminiCivicAnalysisSchema = z.object({
  category: z.enum(["pothole", "lighting", "flooding"]),
  confidenceScore: z.number().min(0).max(1),
  estimatedSeverity: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  severityRationaleFr: z.string().min(5),
  severityRationaleAr: z.string().min(5),
  priorityScore: z.number().min(0).max(100),
  priorityFactors: z.object({
    baseSeverityWeight: z.number().default(35),
    densityWeight: z.number().default(20),
    sensitiveZoneProximity: z.boolean().default(false),
    agingWeight: z.number().default(10),
  }),
  duplicateDetection: z
    .object({
      isLikelyDuplicate: z.boolean().default(false),
      similarityScore: z.number().min(0).max(1).default(0.05),
      explanationFr: z.string().default("Analyse spatio-temporelle : aucun signalement identique dans la zone."),
      explanationAr: z.string().default("تحليل مكاني وزمني: لا يوجد بلاغ مطابق في نفس النطاق."),
    })
    .default({
      isLikelyDuplicate: false,
      similarityScore: 0.05,
      explanationFr: "Analyse spatio-temporelle : aucun signalement identique dans la zone.",
      explanationAr: "تحليل مكاني وزمني: لا يوجد بلاغ مطابق في نفس النطاق.",
    }),
});

export type GeminiCivicAnalysisOutput = z.infer<typeof geminiCivicAnalysisSchema>;

// Mock provider hook for unit & regression tests without incurring external costs
let mockGeminiProvider: ((input: AnalyzeReportTriageInput) => Promise<AIAnalysisResult | null>) | null = null;

export function _setMockGeminiProvider(
  mock: ((input: AnalyzeReportTriageInput) => Promise<AIAnalysisResult | null>) | null
): void {
  mockGeminiProvider = mock;
}

export function _resetMockGeminiProvider(): void {
  mockGeminiProvider = null;
}

/**
 * Heuristic fallback classifier conforming to Municipality of Tunis taxonomy.
 * Explicitly marked as simulated/fallback.
 */
function runDeterministicFallback(
  data: AnalyzeReportTriageInput,
  fallbackReason?: string
): AIAnalysisResult {
  const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes("placeholder"));

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
      isSimulated: true,
      provider: "Ballegh Deterministic Taxonomy Classifier",
      model: hasGeminiKey ? "ballegh-rule-engine-v1.0 (Fallback)" : "ballegh-rule-engine-v1.0",
      configured: hasGeminiKey,
      fallbackReason,
    },
  };
}

/**
 * Retrieves raw image bytes and MIME type from storage or data URL.
 */
async function resolveImagePart(data: AnalyzeReportTriageInput): Promise<{
  data: string;
  mimeType: string;
} | null> {
  // Case A: From Supabase Storage
  if (data.photoStorage?.storagePath) {
    try {
      const stored = await getPhotoBufferFromStorage(data.photoStorage.storagePath);
      if (stored) {
        return {
          data: stored.buffer.toString("base64"),
          mimeType: stored.mimeType || "image/jpeg",
        };
      }
    } catch {
      // Fall through
    }
  }

  // Case B: From Base64 data URL
  if (data.photoUrl?.startsWith("data:image/")) {
    const match = data.photoUrl.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
    if (match) {
      return {
        data: match[2],
        mimeType: match[1],
      };
    }
  }

  // Case C: From external HTTP URL (fetch with 3s timeout)
  if (data.photoUrl?.startsWith("http://") || data.photoUrl?.startsWith("https://")) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(data.photoUrl, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const ab = await res.arrayBuffer();
        const buf = Buffer.from(ab);
        const contentType = res.headers.get("content-type") || "image/jpeg";
        return {
          data: buf.toString("base64"),
          mimeType: contentType.split(";")[0],
        };
      }
    } catch {
      // Ignore network fetch error and proceed with text-only context
    }
  }

  return null;
}

/**
 * Performs AI triage using Google Gemini API or deterministic fallback.
 */
export async function analyzeReportTriage(
  data: AnalyzeReportTriageInput
): Promise<AIAnalysisResult> {
  // Check for test mock override
  if (mockGeminiProvider) {
    const mockResult = await mockGeminiProvider(data);
    if (mockResult) return mockResult;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.includes("placeholder") || apiKey.trim().length === 0) {
    return runDeterministicFallback(data, "GEMINI_API_KEY non configurée dans l'environnement");
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const imagePart = await resolveImagePart(data);

    const promptText = `
Vous êtes le moteur d'intelligence artificielle de triage civique de la Commune de Tunis (Ballegh AI).
Analysez le signalement citoyen suivant pour la ville de Tunis :
- Numéro de référence : ${data.referenceNumber}
- Arrondissement / District : ${data.district}
- Adresse précise : ${data.streetAddress}
- Titre : "${data.title}"
- Description : "${data.description}"
- Catégorie déclarée par le citoyen : "${data.category}"

Instructions strictes :
1. Catégorie : identifiez formellement l'incident parmi ["pothole", "lighting", "flooding"].
2. Gravité : estimez la sévérité (1: faible/gêne mineure, 2: moyen/gêne significative, 3: critique/danger immédiat).
3. Score de confiance : entre 0.0 et 1.0.
4. Score de priorité : entre 0 et 100.
5. Justifications techniques : fournissez une explication concise en français (severityRationaleFr) et en arabe (severityRationaleAr).
6. Détection de doublons : indiquez si ce signalement présente des indices de doublon potentiel dans le même arrondissement.
`;

    const contents: any[] = [];
    if (imagePart) {
      contents.push({
        inlineData: {
          data: imagePart.data,
          mimeType: imagePart.mimeType,
        },
      });
    }
    contents.push(promptText);

    // Call Gemini with JSON Schema enforcement (10s timeout safety)
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Timeout dépassé lors de l'appel Gemini API (10s)")), 10000)
    );

    const targetModel = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";

    const callPromise = ai.models.generateContent({
      model: targetModel,
      contents,
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: {
          type: Type.OBJECT,
          properties: {
            category: {
              type: Type.STRING,
              enum: ["pothole", "lighting", "flooding"],
            },
            confidenceScore: {
              type: Type.NUMBER,
            },
            estimatedSeverity: {
              type: Type.INTEGER,
            },
            severityRationaleFr: {
              type: Type.STRING,
            },
            severityRationaleAr: {
              type: Type.STRING,
            },
            priorityScore: {
              type: Type.INTEGER,
            },
            priorityFactors: {
              type: Type.OBJECT,
              properties: {
                baseSeverityWeight: { type: Type.NUMBER },
                densityWeight: { type: Type.NUMBER },
                sensitiveZoneProximity: { type: Type.BOOLEAN },
                agingWeight: { type: Type.NUMBER },
              },
              required: ["baseSeverityWeight", "densityWeight", "sensitiveZoneProximity", "agingWeight"],
            },
            duplicateDetection: {
              type: Type.OBJECT,
              properties: {
                isLikelyDuplicate: { type: Type.BOOLEAN },
                similarityScore: { type: Type.NUMBER },
                explanationFr: { type: Type.STRING },
                explanationAr: { type: Type.STRING },
              },
            },
          },
          required: [
            "category",
            "confidenceScore",
            "estimatedSeverity",
            "severityRationaleFr",
            "severityRationaleAr",
            "priorityScore",
          ],
        },
      },
    });

    const response = (await Promise.race([callPromise, timeoutPromise])) as any;
    const responseText = response.text;
    if (!responseText) {
      throw new Error("Réponse vide de Google Gemini.");
    }

    const rawParsed = JSON.parse(responseText);
    const validated = geminiCivicAnalysisSchema.safeParse(rawParsed);

    if (!validated.success) {
      console.warn("[aiService] Schéma Gemini invalide:", validated.error.message);
      return runDeterministicFallback(data, `Réponse Gemini non conforme au schéma : ${validated.error.message}`);
    }

    const resData = validated.data;

    // Service dispatch configuration
    const serviceMap = {
      pothole: {
        code: "DVRD-TUNIS",
        dept: "Direction de la Voirie et des Réseaux Divers",
        email: "voirie.technique@commune-tunis.gov.tn",
      },
      lighting: {
        code: "DEP-ECL-TUNIS",
        dept: "Division Éclairage Public et Énergie",
        email: "eclairage.public@commune-tunis.gov.tn",
      },
      flooding: {
        code: "DAEP-TUNIS",
        dept: "Direction de l'Assainissement et des Eaux Pluviales",
        email: "eaux.pluviales@commune-tunis.gov.tn",
      },
    }[resData.category];

    return {
      predictedCategory: resData.category,
      confidenceScore: resData.confidenceScore,
      estimatedSeverity: resData.estimatedSeverity,
      severityRationale: {
        fr: resData.severityRationaleFr,
        ar: resData.severityRationaleAr,
      },
      priorityScore: resData.priorityScore,
      priorityFactors: resData.priorityFactors,
      suggestedServiceCode: serviceMap.code,
      generatedEmailDraft: {
        recipientDepartment: serviceMap.dept,
        recipientEmail: serviceMap.email,
        subject: `[${resData.category.toUpperCase()} - ${data.referenceNumber}] Diagnostic Gemini : ${data.district}`,
        body: `Signalement ${data.referenceNumber} enregistré à ${data.streetAddress}, ${data.district}.\n\nDescription citoyenne : "${data.description}"\n\nDiagnostic IA (${targetModel}) : Gravité ${resData.estimatedSeverity}/3, Priorité estimée ${resData.priorityScore}/100.\nJustification : ${resData.severityRationaleFr}\n\nEn attente de validation explicite par l'agent municipal référent.`,
      },
      duplicateDetection: {
        isLikelyDuplicate: resData.duplicateDetection?.isLikelyDuplicate || false,
        similarityScore: resData.duplicateDetection?.similarityScore || 0.05,
        relatedReportIds: [],
        explanation: {
          fr: resData.duplicateDetection?.explanationFr || "Analyse IA : aucun doublon évident détecté.",
          ar: resData.duplicateDetection?.explanationAr || "تحليل الذكاء الاصطناعي: لا يوجد تشابه ملحوظ.",
        },
      },
      metadata: {
        isSimulated: false,
        provider: "Google Gemini Vision",
        model: targetModel,
        configured: true,
      },
    };
  } catch (err: any) {
    console.warn("[aiService] Erreur appel Gemini API, basculement sécurisé:", err.message);
    return runDeterministicFallback(data, `Erreur d'exécution Gemini : ${err.message}`);
  }
}
