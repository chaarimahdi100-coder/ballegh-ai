import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import {
  uploadPhotoToStorage,
  validateImageBuffer,
  MAX_FILE_SIZE_BYTES,
} from "@/lib/storage/supabaseStorage";

export async function POST(request: Request) {
  try {
    // 1. Authentication enforcement (Only authenticated citizens, agents, and admins)
    const session = await getCurrentSession(request);
    if (!session) {
      return NextResponse.json(
        { error: "Authentification requise pour téléverser une photo." },
        { status: 401 }
      );
    }

    // 2. Extract multipart form data
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json(
        { error: "Fichier manquant dans le champ 'file'." },
        { status: 400 }
      );
    }

    const blob = file as Blob;

    // Quick size pre-check
    if (blob.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        {
          error: "Fichier trop volumineux. La taille maximale autorisée est de 5 Mo.",
          code: "FILE_TOO_LARGE",
        },
        { status: 413 }
      );
    }

    // Read file buffer
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 3. Strict content inspection & magic bytes validation
    const validation = validateImageBuffer(buffer);
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: validation.error || "Type de fichier non autorisé.",
          code: "INVALID_FILE_TYPE",
        },
        { status: 400 }
      );
    }

    // 4. Secure upload to Supabase Storage bucket 'ballegh-reports'
    const uploadResult = await uploadPhotoToStorage(buffer);

    return NextResponse.json(
      {
        success: true,
        photo: {
          storagePath: uploadResult.storagePath,
          mimeType: uploadResult.mimeType,
          fileSizeBytes: uploadResult.fileSizeBytes,
          isSimulated: uploadResult.isSimulated,
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("[api/upload] Erreur lors du téléversement:", err.message);
    return NextResponse.json(
      { error: "Erreur serveur lors du téléversement de la photo", message: err.message },
      { status: 500 }
    );
  }
}
