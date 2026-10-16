import { PrismaClient, UserRole, IssueCategory, ReportStatus, UrgencyLevel, HumanDecisionType, TimelineAuthorRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting Ballegh AI Database Seeding...");

  // 1. Seed Municipal Services
  const services = [
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

  for (const srv of services) {
    await prisma.municipalService.upsert({
      where: { code: srv.code },
      update: srv,
      create: srv,
    });
  }
  console.log("✅ Municipal Services seeded.");

  // 2. Seed Initial Users with Secure Hashed Passwords
  const defaultPassword = "ChangeMe2026!";
  const passwordHash = await bcrypt.hash(defaultPassword, 12);

  const users = [
    {
      email: "citoyen@tunis.tn",
      passwordHash,
      fullName: "Yassine Ben Amor",
      phone: "+216 98 421 890",
      role: UserRole.CITIZEN,
      district: "Bab Souika",
      organization: "Citoyen de Tunis",
    },
    {
      email: "agent@commune-tunis.gov.tn",
      passwordHash,
      fullName: "Ing. Samira Trabelsi",
      phone: "+216 71 345 678",
      role: UserRole.MUNICIPAL_AGENT,
      district: "Direction de la Voirie et Travaux",
      organization: "Commune de Tunis",
    },
    {
      email: "admin@ballegh.tn",
      passwordHash,
      fullName: "Karim Mansour",
      phone: "+216 71 890 123",
      role: UserRole.ADMIN,
      district: "Arrondissement Central",
      organization: "Direction des Systèmes d'Information — Ville de Tunis",
    },
  ];

  const createdUsers: Record<string, string> = {};
  for (const u of users) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: u,
      create: u,
    });
    createdUsers[u.role] = user.id;
  }
  console.log("✅ Core Users (Citizen, Municipal Agent, Admin) seeded.");

  // 3. Seed Initial Demo Report (Pothole - Centre-Ville)
  const dvrdService = await prisma.municipalService.findUnique({
    where: { code: "DVRD-TUNIS" },
  });

  const rep1 = await prisma.report.upsert({
    where: { referenceNumber: "BLG-2026-TUN-001" },
    update: {},
    create: {
      referenceNumber: "BLG-2026-TUN-001",
      titleFr: "Nid-de-poule profond sur voie de circulation principale",
      titleAr: "حفرة عميقة وخطيرة بوسط مسلك المرور الرئيسي",
      descriptionFr: "Un trou d'environ 15 cm de profondeur et 60 cm de large s'est formé au carrefour. Plusieurs voitures ont déjà endommagé leurs jantes.",
      descriptionAr: "حفرة بعمق 15 سم وعرض 60 سم تقريباً تشكلت عند مفترق الطرق. تعرضت عدة سيارات لأضرار في العجلات.",
      category: IssueCategory.POTHOLE,
      status: ReportStatus.AI_ANALYZED,
      urgency: UrgencyLevel.HIGH,
      governorate: "Tunis",
      municipality: "Commune de Tunis",
      district: "Centre-Ville",
      streetAddress: "Angle Rue Charles de Gaulle & Rue d'Angleterre",
      latitude: 36.7992,
      longitude: 10.1795,
      landmark: "Près de la station de métro Place de Barcelone",
      submittedById: createdUsers[UserRole.CITIZEN],
      assignedServiceId: dvrdService?.id,
      photos: {
        create: [
          {
            url: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80",
            caption: "Nid-de-poule sur la voie centrale",
          },
        ],
      },
      aiAnalysis: {
        create: {
          predictedCategory: IssueCategory.POTHOLE,
          confidenceScore: 0.94,
          estimatedSeverity: 3,
          severityRationaleFr: "Profondeur critique (> 12 cm) sur axe de fort trafic urbain avec risque immédiat d'embardée.",
          severityRationaleAr: "عمق خطير يفوق 12 سم على مسار ذي كثافة مرورية عالية مع خطر مباشر لوقوع حوادث.",
          priorityScore: 89,
          baseSeverityWeight: 40,
          densityWeight: 25,
          sensitiveZoneProximity: true,
          agingWeight: 14,
          isLikelyDuplicate: true,
          duplicateSimilarity: 0.88,
          duplicateExplanationFr: "2 autres signalements enregistrés à moins de 60 mètres au cours des dernières 48h.",
          duplicateExplanationAr: "تم تسجيل بلاغين آخرين في دائرة قطرها 60 متراً خلال الـ 48 ساعة الماضية.",
          suggestedServiceCode: "DVRD-TUNIS",
          draftEmailDept: "Direction de la Voirie et des Réseaux Divers",
          draftEmailTo: "voirie.technique@commune-tunis.gov.tn",
          draftEmailSubject: "[URGENCE VOIRIE - BLG-2026-TUN-001] Signalement prioritaire - Centre-Ville",
          draftEmailBody: "Madame, Monsieur,\n\nIntervention de réfection requise sous 48h...",
        },
      },
      timeline: {
        create: [
          {
            authorId: createdUsers[UserRole.CITIZEN],
            authorName: "Yassine Ben Amor",
            authorRole: TimelineAuthorRole.CITIZEN,
            status: ReportStatus.RECEIVED,
            commentFr: "Signalement initial soumis via l'application web mobile.",
            commentAr: "تم إرسال البلاغ الأولي عبر التطبيق الجوال.",
          },
          {
            authorName: "Ballegh AI Engine v1.2",
            authorRole: TimelineAuthorRole.SYSTEM_AI,
            status: ReportStatus.AI_ANALYZED,
            commentFr: "Classification automatique : Nid-de-poule (94%). Gravité 3/3. Score: 89.",
            commentAr: "فرز آلي: حفرة طريق (94%). خطورة 3/3. أولوية 89.",
          },
        ],
      },
    },
  });

  console.log("✅ Seed completed successfully.");
}

main()
  .catch((e) => {
    console.error("❌ Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
