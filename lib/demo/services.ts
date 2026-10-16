import type { MunicipalService } from "@/lib/types";

export const MUNICIPAL_SERVICES: MunicipalService[] = [
  {
    id: "srv_dvrd",
    code: "DVRD-TUNIS",
    name: {
      fr: "Direction de la Voirie et des Réseaux Divers",
      ar: "إدارة الطرقات والشبكات المختلفة",
    },
    department: "Direction Générale des Services Techniques",
    contactEmail: "voirie.technique@commune-tunis.gov.tn",
    phone: "+216 71 340 210",
    headOfService: "M. Hichem Guesmi",
    supportedCategories: ["pothole"],
    averageResponseTimeDays: 3,
  },
  {
    id: "srv_eclairage",
    code: "DEP-ECL-TUNIS",
    name: {
      fr: "Division Éclairage Public et Énergie",
      ar: "قسم الإنارة العمومية والطاقة",
    },
    department: "Direction Générale des Services Techniques",
    contactEmail: "eclairage.public@commune-tunis.gov.tn",
    phone: "+216 71 340 320",
    headOfService: "Mme Leila Ben Salem",
    supportedCategories: ["lighting"],
    averageResponseTimeDays: 2,
  },
  {
    id: "srv_assainissement",
    code: "DAEP-TUNIS",
    name: {
      fr: "Direction de l'Assainissement et des Eaux Pluviales",
      ar: "إدارة التطهير وتصريف مياه الأمطار",
    },
    department: "Cellule de Crise et Eaux Pluviales",
    contactEmail: "eaux.pluviales@commune-tunis.gov.tn",
    phone: "+216 71 340 450",
    headOfService: "M. Mohamed Dridi",
    supportedCategories: ["flooding"],
    averageResponseTimeDays: 1,
  },
];
