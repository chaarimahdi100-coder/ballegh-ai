import { NextResponse } from "next/server";
import { listMunicipalServices } from "@/lib/repositories/serviceRepository";

export async function GET(request: Request) {
  try {
    const services = await listMunicipalServices();
    return NextResponse.json({ success: true, count: services.length, services });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Impossible de récupérer les services municipaux", message: err.message },
      { status: 500 }
    );
  }
}
