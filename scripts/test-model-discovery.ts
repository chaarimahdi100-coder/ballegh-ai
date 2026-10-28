import * as path from "node:path";
import * as fs from "node:fs";
import { GoogleGenAI, Type } from "@google/genai";

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

async function discoverSupportedGeminiModels() {
  console.log("==================================================");
  console.log("🔍 LIVE DISCOVERY OF SUPPORTED GEMINI MODELS");
  console.log("==================================================");

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY is not set.");
    process.exit(1);
  }

  // 1. Fetch available models from REST API
  try {
    const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (listRes.ok) {
      const data = await listRes.json();
      console.log(`\n📋 Models available to this API key from Google API endpoint:`);
      const flashModels = (data.models || [])
        .map((m: any) => m.name.replace("models/", ""))
        .filter((name: string) => name.includes("flash") || name.includes("gemini"));
      
      console.log(`Total models: ${data.models?.length}`);
      console.log(`Flash/Gemini models:\n  ${flashModels.slice(0, 20).join("\n  ")}`);
    } else {
      console.log(`List API status: ${listRes.status} ${listRes.statusText}`);
    }
  } catch (err: any) {
    console.log(`List API fetch error: ${err.message}`);
  }

  // 2. Test specific candidates live with generateContent & structured output
  const candidates = [
    "gemini-flash-lite-latest",
    "gemini-flash-latest",
    "gemini-3-flash-preview",
    "gemini-3.1-flash-lite",
    "gemini-2.5-flash-lite",
    "gemini-2.5-flash",
    "gemini-3.8-flash",
  ];

  const ai = new GoogleGenAI({ apiKey });

  console.log("\n🧪 Testing live structured JSON generation per candidate:");
  for (const model of candidates) {
    process.stdout.write(`• Testing '${model}'... `);
    const start = Date.now();
    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Timeout (3s)")), 3000)
      );

      const callPromise = ai.models.generateContent({
        model,
        contents: "Classify this report: 'Water pipe burst on Rue de Rome'. Return JSON: { \"category\": \"flooding\", \"severity\": 3 }",
        config: {
          responseMimeType: "application/json",
          responseJsonSchema: {
            type: Type.OBJECT,
            properties: {
              category: { type: Type.STRING },
              severity: { type: Type.INTEGER },
            },
            required: ["category", "severity"],
          },
        },
      });

      const res = (await Promise.race([callPromise, timeoutPromise])) as any;
      const elapsed = Date.now() - start;
      const text = res.text?.trim() || "";
      console.log(`✅ SUCCESS (${elapsed}ms) -> Output: ${text.slice(0, 60)}`);
    } catch (err: any) {
      const elapsed = Date.now() - start;
      console.log(`❌ FAILED (${elapsed}ms) -> ${err.message?.slice(0, 100)}`);
    }
  }

  console.log("\n==================================================");
}

discoverSupportedGeminiModels();
