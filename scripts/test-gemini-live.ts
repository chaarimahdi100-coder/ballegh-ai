import * as path from "node:path";
import * as fs from "node:fs";
import { GoogleGenAI } from "@google/genai";
import { geminiCivicAnalysisSchema } from "../lib/services/aiService";

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
  console.log(`\n• Clé API détectée : ${maskedKey} (valeur secrète masquée)`);
  console.log("• Modèle cible : gemini-2.5-flash");
  console.log("• Exécution d'un appel d'inférence réel...");

  try {
    const start = Date.now();
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Vous êtes le moteur de triage de Ballegh AI pour Tunis. Répondez au format JSON avec category ('pothole', 'lighting' ou 'flooding'), confidenceScore (0..1), estimatedSeverity (1..3), severityRationaleFr, severityRationaleAr, priorityScore (0..100) pour un signalement de crevasse dangereuse sur la voirie de Bab Bhar.",
      config: {
        responseMimeType: "application/json",
      },
    });

    const elapsed = Date.now() - start;
    const text = response.text || "{}";
    const parsed = JSON.parse(text);
    const validated = geminiCivicAnalysisSchema.safeParse(parsed);

    console.log(`\n✅ Inférence Gemini 2.5 Flash réussie en ${elapsed}ms !`);
    console.log(`• Catégorie inférée : ${parsed.category}`);
    console.log(`• Sévérité : ${parsed.estimatedSeverity}/3`);
    console.log(`• Score de priorité : ${parsed.priorityScore}/100`);
    console.log(`• Confiance : ${Math.round((parsed.confidenceScore || 0) * 100)}%`);
    console.log(`• Justification FR : ${parsed.severityRationaleFr}`);
    console.log(`• Conforme au schéma Zod : ${validated.success ? "✅ OUI" : "⚠️ Non conforme : " + validated.error?.message}`);
  } catch (err: any) {
    console.error(`\n❌ Échec de l'appel Gemini API :`, err.message);
  }
}

testLiveGemini();
