import { prisma, getIsDatabaseConfigured } from "@/lib/db";
import { MUNICIPAL_SERVICES } from "@/lib/demo/services";
import type { MunicipalService } from "@/lib/types";

export async function listMunicipalServices(): Promise<MunicipalService[]> {
  if (getIsDatabaseConfigured()) {
    try {
      const dbServices = await prisma.municipalService.findMany({
        orderBy: { code: "asc" },
      });

      if (dbServices.length > 0) {
        return dbServices.map((s) => {
          const matchingDemo = MUNICIPAL_SERVICES.find((m) => m.code === s.code);
          return {
            id: s.id,
            code: s.code,
            name: {
              fr: s.nameFr,
              ar: s.nameAr,
            },
            department: s.department,
            contactEmail: s.contactEmail,
            phone: s.phone,
            headOfService: s.headOfService,
            supportedCategories: matchingDemo?.supportedCategories || (
              s.code.includes("DVRD")
                ? ["pothole"]
                : s.code.includes("ECL")
                ? ["lighting"]
                : ["flooding"]
            ),
            averageResponseTimeDays: s.averageSlaDays,
          };
        });
      }
    } catch (err: any) {
      console.error("[serviceRepository] Error listing municipal services:", err.message);
      throw new Error(`Database error while listing municipal services: ${err.message}`);
    }
  }

  // Fallback to demo services when DB is not configured
  return MUNICIPAL_SERVICES;
}
