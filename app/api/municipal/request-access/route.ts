import { NextResponse } from "next/server";
import { z } from "zod";
import { createMunicipalAccessRequest } from "@/lib/repositories/userRepository";
import { normalizeTunisianPhone } from "@/lib/auth/validation";

const requestAccessSchema = z.object({
  fullName: z.string().min(2, "Le nom complet doit comporter au moins 2 caractères"),
  email: z.string().email("Format d'e-mail professionnel invalide"),
  phone: z.string().min(8, "Numéro de téléphone invalide"),
  municipality: z.string().min(2, "La municipalité est requise"),
  department: z.string().min(2, "Le service municipal est requis"),
  jobTitle: z.string().min(2, "La fonction / poste est requise"),
  password: z.string().min(8, "Le mot de passe doit comporter au moins 8 caractères"),
  notes: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Format de requête invalide (JSON requis)" },
        { status: 400 }
      );
    }

    const parsed = requestAccessSchema.safeParse(body);
    if (!parsed.success) {
      const issues = parsed.error.issues || (parsed.error as any).errors || [];
      return NextResponse.json(
        {
          error: issues[0]?.message || "Données de formulaire invalides",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const phoneResult = normalizeTunisianPhone(data.phone);
    const normalizedPhone = phoneResult.normalized || data.phone.trim();

    const accessReq = await createMunicipalAccessRequest({
      fullName: data.fullName.trim(),
      email: data.email.trim().toLowerCase(),
      phone: normalizedPhone,
      municipality: data.municipality.trim(),
      department: data.department.trim(),
      jobTitle: data.jobTitle.trim(),
      password: data.password,
      notes: data.notes?.trim(),
    });

    return NextResponse.json(
      {
        success: true,
        message:
          "Votre demande d'accès agent municipal a été enregistrée avec succès. Elle sera examinée par la Direction Municipale avant activation.",
        request: {
          id: accessReq.id,
          fullName: accessReq.fullName,
          email: accessReq.email,
          municipality: accessReq.municipality,
          department: accessReq.department,
          status: accessReq.status,
          createdAt: accessReq.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    const isConflict =
      err.message?.includes("déjà") ||
      err.message?.includes("P2002") ||
      err.message?.includes("Unique constraint");

    return NextResponse.json(
      {
        error: isConflict ? err.message : "Erreur lors de l'enregistrement de la demande",
        message: err.message,
      },
      { status: isConflict ? 409 : 500 }
    );
  }
}
