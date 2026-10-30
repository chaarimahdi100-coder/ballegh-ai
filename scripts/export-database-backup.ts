import * as fs from "fs";
import * as path from "path";
import { PrismaClient } from "@prisma/client";
import { resolveSupabaseUrl } from "./test-db-connection";

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

async function exportBackup() {
  console.log("==================================================");
  console.log("💾 BALLEGH AI — DATABASE BACKUP & EXPORT TOOL");
  console.log("==================================================");

  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  const activeUrl = resolveSupabaseUrl(rawUrl);
  const prisma = new PrismaClient({
    datasources: { db: { url: activeUrl } },
    log: ["error"],
  });

  try {
    await prisma.$connect();
    console.log("• Connected to Supabase PostgreSQL.");

    const backupDir = path.resolve(process.cwd(), "backups");
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupFile = path.join(backupDir, `ballegh_backup_${timestamp}.json`);

    console.log("• Exporting all public tables...");

    const backupData: Record<string, any> = {
      exportedAt: new Date().toISOString(),
      projectRef: "gtfvnxajbnkvpdxvjtyl",
      tables: {}
    };

    backupData.tables.users = await prisma.user.findMany();
    backupData.tables.reports = await prisma.report.findMany();
    backupData.tables.reportPhotos = await prisma.reportPhoto.findMany();
    backupData.tables.aiAnalyses = await prisma.aIAnalysis.findMany();
    backupData.tables.humanReviews = await prisma.humanReview.findMany();
    backupData.tables.timelineEvents = await prisma.timelineEvent.findMany();
    backupData.tables.municipalServices = await prisma.municipalService.findMany();
    backupData.tables.duplicateClusters = await prisma.duplicateCluster.findMany();

    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2), "utf-8");
    const stats = fs.statSync(backupFile);

    console.log(`✅ Backup successfully created!`);
    console.log(`• Destination: backups/${path.basename(backupFile)}`);
    console.log(`• File size  : ${(stats.size / 1024).toFixed(2)} KB`);
    console.log(`• Counts     :`);
    console.log(`  - users            : ${backupData.tables.users.length}`);
    console.log(`  - reports          : ${backupData.tables.reports.length}`);
    console.log(`  - report_photos    : ${backupData.tables.reportPhotos.length}`);
    console.log(`  - ai_analyses      : ${backupData.tables.aiAnalyses.length}`);
    console.log(`  - human_reviews    : ${backupData.tables.humanReviews.length}`);
    console.log(`  - timeline_events  : ${backupData.tables.timelineEvents.length}`);
    console.log(`  - municipal_services: ${backupData.tables.municipalServices.length}`);
  } catch (err: any) {
    console.error("❌ Export failed:", err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

exportBackup();
