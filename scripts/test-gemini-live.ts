import * as path from "node:path";
import * as fs from "node:fs";
import { GoogleGenAI, Type } from "@google/genai";
import { geminiCivicAnalysisSchema, analyzeReportTriage } from "../lib/services/aiService";

// Fully valid 1x1 pixel PNG image (transparent RGBA)
const VALID_IMAGE_PNG_BUFFER = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64"
);

function loadEnvLocal(): void {
  const envLocalPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envLocalPath)) {
    const content = fs.readFileSync(envLocalPath, "utf-8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        process.env[key] = val;
      }
    }
  }
}

loadEnvLocal();

async function testLiveGemini() {
  console.log("==================================================");
  console.log("🔍 BALLEGH AI — GOOGLE GEMINI API LIVE HEALTHCHECK");
  console.log("==================================================");

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.includes("placeholder") || apiKey.trim().length === 0) {
    console.log("\n⚠️ GEMINI_API_KEY n'est pas configurée dans .env.local.");
    console.log("Pour activer l'analyse IA réelle par vision artificielle :");
    console.log("1. Ouvrez votre fichier local .env.local");
    console.log("2. Ajoutez la ligne :");
    console.log("   GEMINI_API_KEY=\"AIzaSy...votre_cle_officielle_google\"");
    console.log("3. Relancez 'npm run test:gemini'");
    console.log("\nℹ️ En l'absence de clé, Ballegh AI utilise le classifieur déterministe de secours (isSimulated: true).");
    return;
  }

  const maskedKey = apiKey.slice(0, 6) + "..." + apiKey.slice(-4);
  const targetModel = process.env.GEMINI_MODEL || "gemini-3.8-flash";
  console.log(`\n• Clé API détectée : ${maskedKey} (valeur secrète masquée)`);
  console.log(`• Modèle cible : ${targetModel}`);

  // -------------------------------------------------------------
  // Test 1 : Inférence Multimodale via Service Ballegh AI
  // -------------------------------------------------------------
  console.log("\n📸 [1/2] Test du service complet d'inférence multimodale (Image + Contexte)...");
  try {
    const startTime = Date.now();
    const testDataUrl = `data:image/png;base64,${VALID_IMAGE_PNG_BUFFER.toString("base64")}`;

    const analysis = await analyzeReportTriage({
      referenceNumber: "BLG-LIVE-GEMINI-TEST",
      district: "Bab Bhar",
      streetAddress: "Avenue Habib Bourguiba, Tunis",
      category: "pothole",
      title: "Nid-de-poule dangereux sur chaussée",
      description: "Cavité béante constatée sur la voie droite en face du théâtre municipal.",
      photoUrl: testDataUrl,
    });

    const elapsed = Date.now() - startTime;

    console.log(`\n✅ Inférence multimodale Ballegh AI exécutée en ${elapsed}ms :`);
    console.log(`• Mode d'inférence      : ${analysis.metadata.isSimulated ? "⚠️ Simulation / Fallback" : "✅ RÉEL (Google Gemini Vision)"}`);
    console.log(`• Modèle effectif       : ${analysis.metadata.model}`);
    console.log(`• Catégorie prédite     : ${analysis.predictedCategory}`);
    console.log(`• Sévérité estimée      : ${analysis.estimatedSeverity}/3`);
    console.log(`• Score de priorité     : ${analysis.priorityScore}/100`);
    console.log(`• Score de confiance    : ${Math.round(analysis.confidenceScore * 100)}%`);
    console.log(`• Service municipal     : ${analysis.generatedEmailDraft.recipientDepartment}`);
    console.log(`• Justification FR      : ${analysis.severityRationale.fr}`);
    console.log(`• Justification AR      : ${analysis.severityRationale.ar}`);

    if (analysis.metadata.isSimulated) {
      console.log(`\n⚠️ Note : Le service est passé en mode secours. Motif : ${analysis.metadata.provider}`);
    } else {
      console.log(`\n🎉 SUCCÈS : L'analyse multimodale avec vision réelle fonctionne parfaitement !`);
    }
  } catch (err: any) {
    console.error(`\n❌ Échec du service multimodale :`, err.message);
  }

  // -------------------------------------------------------------
  // Test 2 : Appel direct SDK @google/genai pour validation schéma JSON
  // -------------------------------------------------------------
  console.log("\n🧪 [2/2] Test direct SDK @google/genai & validation schéma JSON strict...");
  try {
    const startDirect = Date.now();
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: targetModel,
      contents: "Vous êtes le moteur de triage de Ballegh AI pour Tunis. Répondez au format JSON avec category ('pothole', 'lighting' ou 'flooding'), confidenceScore (0..1), estimatedSeverity (1..3), severityRationaleFr, severityRationaleAr, priorityScore (0..100) et priorityFactors (baseSeverityWeight, densityWeight, sensitiveZoneProximity, agingWeight) pour un signalement de crevasse dangereuse sur la voirie de Bab Bhar.",
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING, enum: ["pothole", "lighting", "flooding"] },
            confidenceScore: { type: Type.NUMBER },
            estimatedSeverity: { type: Type.INTEGER },
            severityRationaleFr: { type: Type.STRING },
            severityRationaleAr: { type: Type.STRING },
            priorityScore: { type: Type.INTEGER },
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
          },
          required: ["category", "confidenceScore", "estimatedSeverity", "severityRationaleFr", "severityRationaleAr", "priorityScore", "priorityFactors"],
        },
      },
    });

    const elapsedDirect = Date.now() - startDirect;
    const text = response.text || "{}";
    const parsed = JSON.parse(text);
    const validated = geminiCivicAnalysisSchema.safeParse(parsed);

    console.log(`✅ Réponse directe reçue en ${elapsedDirect}ms`);
    console.log(`• Conforme au schéma Zod : ${validated.success ? "✅ OUI (Schéma civique validé)" : "⚠️ Erreurs de schéma : " + validated.error?.message}`);
  } catch (err: any) {
    console.error(`❌ Échec de l'appel direct Gemini API :`, err.message);
  }

  console.log("\n==================================================");
}

testLiveGemini().catch((err) => {
  console.error("FATAL ERROR in Gemini live test:", err);
  process.exit(1);
});
