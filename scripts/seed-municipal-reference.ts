import { PrismaClient } from "@prisma/client";
import * as path from "path";
import * as fs from "fs";

// Load .env.local natively without external dependencies
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

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
  log: ["error"],
});

export const MUNICIPAL_SERVICES_REFERENCE = [
  {
    code: "DVRD-TUNIS",
    nameFr: "Direction de la Voirie et des Réseaux Divers",
    nameAr: "إدارة الطرقات والشبكات المختلفة",
    department: "Direction Générale des Services Techniques",
    contactEmail: "voirie.technique@commune-tunis.gov.tn",
    phone: "+216 71 340 210",
    headOfService: "M. Hichem Guesmi",
    averageSlaDays: 3,
  },
  {
    code: "DEP-ECL-TUNIS",
    nameFr: "Division Éclairage Public et Énergie",
    nameAr: "قسم الإنارة العمومية والطاقة",
    department: "Direction Générale des Services Techniques",
    contactEmail: "eclairage.public@commune-tunis.gov.tn",
    phone: "+216 71 340 320",
    headOfService: "Mme Leila Ben Salem",
    averageSlaDays: 2,
  },
  {
    code: "DAEP-TUNIS",
    nameFr: "Direction de l'Assainissement et des Eaux Pluviales",
    nameAr: "إدارة التطهير وتصريف مياه الأمطار",
    department: "Cellule de Crise et Eaux Pluviales",
    contactEmail: "eaux.pluviales@commune-tunis.gov.tn",
    phone: "+216 71 340 450",
    headOfService: "M. Mohamed Dridi",
    averageSlaDays: 1,
  },
];

export async function seedMunicipalReferenceData() {
  console.log("🏛️  Seeding Municipal Reference Data (Commune de Tunis)...");
  const seeded = [];

  for (const srv of MUNICIPAL_SERVICES_REFERENCE) {
    const record = await prisma.municipalService.upsert({
      where: { code: srv.code },
      update: {
        nameFr: srv.nameFr,
        nameAr: srv.nameAr,
        department: srv.department,
        contactEmail: srv.contactEmail,
        phone: srv.phone,
        headOfService: srv.headOfService,
        averageSlaDays: srv.averageSlaDays,
      },
      create: srv,
    });
    seeded.push(record);
    console.log(`  [OK] ${srv.code} — ${srv.nameFr}`);
  }

  console.log(`✅ ${seeded.length} municipal services reference records successfully seeded.`);
  return seeded;
}

if (require.main === module) {
  seedMunicipalReferenceData()
    .catch((err) => {
      console.error("❌ Error seeding municipal reference:", err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
