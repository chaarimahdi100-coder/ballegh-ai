import { z } from "zod";

/**
 * Normalise et valide un numéro de téléphone tunisien.
 * Formats acceptés :
 * - 8 chiffres : 98123456, 20123456, 50123456, 71123456, etc.
 * - Avec espaces ou séparateurs : "98 123 456", "98-123-456", "98.123.456"
 * - Avec indicatif international : "+216 98 123 456", "+21698123456", "0021698123456", "21698123456"
 *
 * Normalisation de sortie : "+216 XX XXX XXX"
 */
export function normalizeTunisianPhone(raw: string): {
  isValid: boolean;
  normalized?: string;
  error?: string;
  errorAr?: string;
} {
  if (!raw || typeof raw !== "string") {
    return {
      isValid: false,
      error: "Le numéro de téléphone est requis.",
      errorAr: "رقم الهاتف مطلوب.",
    };
  }

  // Nettoyage de tous les séparateurs courants
  let clean = raw.trim().replace(/[\s\-\.\(\)]/g, "");

  // Retrait des préfixes internationaux
  if (clean.startsWith("+216")) {
    clean = clean.slice(4);
  } else if (clean.startsWith("00216")) {
    clean = clean.slice(5);
  } else if (clean.startsWith("216") && clean.length === 11) {
    clean = clean.slice(3);
  }

  // En Tunisie, les numéros ont 8 chiffres et commencent par 2, 3, 4, 5, 7 ou 9
  // (2/4/5/9 = mobiles, 7 = fixe, 3 = VoIP)
  if (!/^[2-9]\d{7}$/.test(clean)) {
    return {
      isValid: false,
      error: "Numéro de téléphone tunisien invalide. 8 chiffres requis (ex: 98 123 456 ou +216 98 123 456).",
      errorAr: "رقم هاتف تونسي غير صالح. يجب أن يتكون من 8 أرقام (مثال: 98 123 456 أو 21698123456+).",
    };
  }

  const formatted = `+216 ${clean.slice(0, 2)} ${clean.slice(2, 5)} ${clean.slice(5)}`;
  return {
    isValid: true,
    normalized: formatted,
  };
}

/**
 * Schéma Zod robuste pour l'inscription citoyen.
 * Tolère à la fois "fullName" et "name" pour éviter toute désynchronisation frontend/API.
 */
export const registerInputSchema = z
  .object({
    fullName: z
      .string()
      .min(2, "Le nom doit comporter au moins 2 caractères.")
      .max(100, "Le nom ne doit pas dépasser 100 caractères.")
      .optional(),
    name: z
      .string()
      .min(2, "Le nom doit comporter au moins 2 caractères.")
      .max(100, "Le nom ne doit pas dépasser 100 caractères.")
      .optional(),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("Format d'adresse e-mail invalide (ex: citoyen@tunis.tn)."),
    password: z
      .string()
      .min(6, "Le mot de passe doit comporter au moins 6 caractères.")
      .max(100, "Le mot de passe est trop long."),
    phone: z.string().min(1, "Le numéro de téléphone est requis."),
    district: z.string().trim().max(100).optional(),
  })
  .superRefine((data, ctx) => {
    // 1. Validation du nom (fullName ou name obligatoire)
    const effectiveName = (data.fullName || data.name || "").trim();
    if (effectiveName.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Le nom complet doit comporter au moins 2 caractères.",
        path: ["fullName"],
      });
    }

    // 2. Validation et normalisation du téléphone tunisien
    const phoneValidation = normalizeTunisianPhone(data.phone);
    if (!phoneValidation.isValid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: phoneValidation.error || "Numéro de téléphone tunisien invalide.",
        path: ["phone"],
      });
    }
  });

export type RegisterInput = z.infer<typeof registerInputSchema>;
