import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { listMunicipalAccessRequests } from "@/lib/repositories/userRepository";

export async function GET(request: Request) {
  try {
    const session = await getCurrentSession(request);
    if (!session || session.role !== "admin") {
      return NextResponse.json(
        { error: "Accès refusé. Réservé aux administrateurs système." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const filterParam = searchParams.get("status")?.toUpperCase();
    const validFilter =
      filterParam === "PENDING" || filterParam === "APPROVED" || filterParam === "REJECTED"
        ? (filterParam as "PENDING" | "APPROVED" | "REJECTED")
        : undefined;

    const requests = await listMunicipalAccessRequests(validFilter);

    return NextResponse.json({
      success: true,
      count: requests.length,
      requests,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Erreur lors de la récupération des demandes d'accès", message: err.message },
      { status: 500 }
    );
  }
}
