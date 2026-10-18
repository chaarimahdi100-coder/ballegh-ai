import { PrismaClient } from "@prisma/client";
import * as path from "node:path";
import * as fs from "node:fs";
import {
  uploadPhotoToStorage,
  detectImageMimeType,
  validateImageBuffer,
} from "../lib/storage/supabaseStorage";

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

export interface MigrationSummary {
  scanned: number;
  base64Found: number;
  migrated: number;
  skipped: number;
  errors: number;
  details: Array<{
    photoId: string;
    reportId: string;
    status: "migrated" | "skipped" | "error";
    storagePath?: string;
    reason?: string;
  }>;
}

export async function migrateLegacyPhotos(options: { dryRun?: boolean } = {}): Promise<MigrationSummary> {
  const isDryRun = Boolean(options.dryRun || process.argv.includes("--dry-run"));
  console.log("========================================================");
  console.log(" BALLEGH AI — BASE64 TO SUPABASE STORAGE MIGRATION");
  console.log(` Mode: ${isDryRun ? "DRY-RUN (Audit sans modification)" : "LIVE MIGRATION"}`);
  console.log("========================================================\n");

  const summary: MigrationSummary = {
    scanned: 0,
    base64Found: 0,
    migrated: 0,
    skipped: 0,
    errors: 0,
    details: [],
  };

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl || dbUrl.includes("placeholder_password")) {
    console.log("ℹ️ Base de données PostgreSQL non configurée. Aucune photo en base à migrer.");
    return summary;
  }

  const prisma = new PrismaClient();

  try {
    const allPhotos = await prisma.reportPhoto.findMany({
      include: { report: { select: { referenceNumber: true } } },
    });

    summary.scanned = allPhotos.length;
    console.log(`• Total photos en base de données : ${allPhotos.length}`);

    for (const photo of allPhotos) {
      const isBase64 = photo.url.startsWith("data:image/");
      const isStorageBased = Boolean(photo.storagePath);
      const isExternalCdn = photo.url.startsWith("http://") || photo.url.startsWith("https://");

      if (!isBase64) {
        summary.skipped++;
        summary.details.push({
          photoId: photo.id,
          reportId: photo.reportId,
          status: "skipped",
          reason: isStorageBased
            ? "Déjà stockée dans Supabase Storage"
            : isExternalCdn
            ? "URL CDN externe préservée"
            : "Format non-Base64",
        });
        continue;
      }

      summary.base64Found++;
      console.log(`\n🔍 Photo Base64 détectée [ID: ${photo.id}] (Signalement: ${photo.report.referenceNumber})`);

      try {
        const matches = photo.url.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
        if (!matches) {
          throw new Error("Format Base64 non conforme.");
        }

        const buffer = Buffer.from(matches[2], "base64");
        const validation = validateImageBuffer(buffer);
        if (!validation.valid || !validation.detectedMimeType) {
          throw new Error(`Validation échouée: ${validation.error}`);
        }

        console.log(`  - Taille décodée : ${(buffer.length / 1024).toFixed(1)} Ko`);
        console.log(`  - Format détecté : ${validation.detectedMimeType}`);

        if (isDryRun) {
          console.log("  [DRY-RUN] Prête pour migration (non modifiée)");
          summary.migrated++;
          summary.details.push({
            photoId: photo.id,
            reportId: photo.reportId,
            status: "migrated",
            reason: "Dry-run validation réussie",
          });
          continue;
        }

        // Upload to storage
        const uploadRes = await uploadPhotoToStorage(buffer);
        console.log(`  - Téléversée vers : ${uploadRes.storagePath}`);

        // Update database record safely
        await prisma.reportPhoto.update({
          where: { id: photo.id },
          data: {
            storagePath: uploadRes.storagePath,
            mimeType: uploadRes.mimeType,
            fileSizeBytes: uploadRes.fileSizeBytes,
            url: `/api/reports/${photo.reportId}/photo`,
          },
        });

        console.log("  ✅ Fiche photo mise à jour avec succès");
        summary.migrated++;
        summary.details.push({
          photoId: photo.id,
          reportId: photo.reportId,
          status: "migrated",
          storagePath: uploadRes.storagePath,
        });
      } catch (err: any) {
        summary.errors++;
        console.error(`  ❌ Erreur de migration pour la photo ${photo.id}:`, err.message);
        summary.details.push({
          photoId: photo.id,
          reportId: photo.reportId,
          status: "error",
          reason: err.message,
        });
      }
    }
  } catch (err: any) {
    console.error("❌ Erreur de connexion lors de la migration:", err.message);
  } finally {
    await prisma.$disconnect();
  }

  console.log("\n========================================================");
  console.log(" BILAN DE LA MIGRATION");
  console.log(` • Photos analysées : ${summary.scanned}`);
  console.log(` • Photos Base64 détectées : ${summary.base64Found}`);
  console.log(` • Photos migrées avec succès : ${summary.migrated}`);
  console.log(` • Photos ignorées (déjà conformes) : ${summary.skipped}`);
  console.log(` • Erreurs : ${summary.errors}`);
  console.log("========================================================\n");

  return summary;
}

if (require.main === module || process.argv[1]?.endsWith("migrate-photos-to-storage.ts")) {
  migrateLegacyPhotos().catch(console.error);
}
