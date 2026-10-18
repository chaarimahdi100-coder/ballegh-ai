import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

export const BUCKET_NAME = "ballegh-reports";
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

// In-memory fallback for local development or testing when Supabase Storage credentials are not provided
const inMemoryStorage = new Map<
  string,
  { buffer: Buffer; mimeType: AllowedMimeType; fileSizeBytes: number; uploadedAt: string }
>();

function getSupabaseConfig(): { url: string; serviceRoleKey: string } | null {
  let url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url && process.env.DATABASE_URL) {
    // Attempt to extract project ref from DATABASE_URL
    const match = process.env.DATABASE_URL.match(/@(?:db\.)?([a-z0-9]+)\.supabase\.co/);
    if (match?.[1]) {
      url = `https://${match[1]}.supabase.co`;
    }
  }

  if (url && serviceRoleKey && !serviceRoleKey.includes("placeholder")) {
    return { url, serviceRoleKey };
  }
  return null;
}

let supabaseClientCache: SupabaseClient | null = null;

export function getSupabaseStorageClient(): SupabaseClient | null {
  if (supabaseClientCache) return supabaseClientCache;

  const config = getSupabaseConfig();
  if (!config) return null;

  supabaseClientCache = createClient(config.url, config.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  return supabaseClientCache;
}

/**
 * Inspects file buffer magic bytes to detect actual image MIME type.
 * Never relies on client-provided headers or filenames alone.
 */
export function detectImageMimeType(buffer: Buffer): AllowedMimeType | null {
  if (buffer.length < 12) return null;

  // JPEG: Starts with FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  // PNG: Starts with 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }

  // WebP: Starts with 'RIFF' and has 'WEBP' at offset 8-11
  const riff = buffer.toString("ascii", 0, 4);
  const webp = buffer.toString("ascii", 8, 12);
  if (riff === "RIFF" && webp === "WEBP") {
    return "image/webp";
  }

  return null;
}

export interface ImageValidationResult {
  valid: boolean;
  detectedMimeType?: AllowedMimeType;
  fileSizeBytes?: number;
  error?: string;
}

export function validateImageBuffer(buffer: Buffer): ImageValidationResult {
  if (!buffer || buffer.length === 0) {
    return { valid: false, error: "Le fichier image est vide ou manquant." };
  }

  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    const sizeMb = (buffer.length / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: `Taille de fichier excessive (${sizeMb} Mo). La limite stricte est de 5 Mo.`,
    };
  }

  const detected = detectImageMimeType(buffer);
  if (!detected) {
    return {
      valid: false,
      error: "Type de fichier invalide. Seuls les formats réels JPEG, PNG et WebP sont autorisés (vérification des octets magiques).",
    };
  }

  return {
    valid: true,
    detectedMimeType: detected,
    fileSizeBytes: buffer.length,
  };
}

/**
 * Generates a unique, non-guessable storage path.
 * Format: reports/YYYY/MM/<uuid>.<ext>
 */
export function generateSecureStoragePath(mimeType: AllowedMimeType): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const randomId = crypto.randomUUID();
  const extensionMap: Record<AllowedMimeType, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  const ext = extensionMap[mimeType] || "bin";
  return `reports/${year}/${month}/${randomId}.${ext}`;
}

export interface UploadPhotoResult {
  storagePath: string;
  mimeType: AllowedMimeType;
  fileSizeBytes: number;
  isSimulated: boolean;
}

/**
 * Uploads an image buffer to the dedicated private bucket 'ballegh-reports'.
 */
export async function uploadPhotoToStorage(
  buffer: Buffer,
  customPath?: string
): Promise<UploadPhotoResult> {
  const validation = validateImageBuffer(buffer);
  if (!validation.valid || !validation.detectedMimeType || !validation.fileSizeBytes) {
    throw new Error(validation.error || "Image invalide.");
  }

  const mimeType = validation.detectedMimeType;
  const storagePath = customPath || generateSecureStoragePath(mimeType);
  const client = getSupabaseStorageClient();

  if (client) {
    try {
      const { error } = await client.storage.from(BUCKET_NAME).upload(storagePath, buffer, {
        contentType: mimeType,
        upsert: false,
      });

      if (error) {
        // If the bucket doesn't exist yet, attempt to create it
        if (error.message.includes("not found") || (error as any).statusCode === 404) {
          await client.storage.createBucket(BUCKET_NAME, {
            public: false,
            fileSizeLimit: MAX_FILE_SIZE_BYTES,
            allowedMimeTypes: [...ALLOWED_MIME_TYPES],
          });
          const retry = await client.storage.from(BUCKET_NAME).upload(storagePath, buffer, {
            contentType: mimeType,
            upsert: false,
          });
          if (retry.error) throw new Error(`Échec Supabase Storage: ${retry.error.message}`);
        } else {
          throw new Error(`Échec Supabase Storage: ${error.message}`);
        }
      }

      return {
        storagePath,
        mimeType,
        fileSizeBytes: validation.fileSizeBytes,
        isSimulated: false,
      };
    } catch (err: any) {
      console.warn("[supabaseStorage] Erreur Supabase Storage, basculement mémoire local:", err.message);
    }
  }

  // Local fallback storage
  inMemoryStorage.set(storagePath, {
    buffer,
    mimeType,
    fileSizeBytes: validation.fileSizeBytes,
    uploadedAt: new Date().toISOString(),
  });

  return {
    storagePath,
    mimeType,
    fileSizeBytes: validation.fileSizeBytes,
    isSimulated: true,
  };
}

/**
 * Deletes a photo from storage. Used for rollbacks and cleanup of unattached files.
 */
export async function deletePhotoFromStorage(storagePath: string): Promise<boolean> {
  if (!storagePath) return false;

  const client = getSupabaseStorageClient();
  let deletedFromSupabase = false;

  if (client) {
    try {
      const { error } = await client.storage.from(BUCKET_NAME).remove([storagePath]);
      deletedFromSupabase = !error;
    } catch {
      deletedFromSupabase = false;
    }
  }

  const deletedFromMemory = inMemoryStorage.delete(storagePath);
  return deletedFromSupabase || deletedFromMemory;
}

/**
 * Retrieves the raw photo binary buffer and metadata.
 */
export async function getPhotoBufferFromStorage(
  storagePath: string
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  const client = getSupabaseStorageClient();

  if (client) {
    try {
      const { data, error } = await client.storage.from(BUCKET_NAME).download(storagePath);
      if (!error && data) {
        const arrayBuf = await data.arrayBuffer();
        const buffer = Buffer.from(arrayBuf);
        const detected = detectImageMimeType(buffer) || (data.type as AllowedMimeType) || "image/jpeg";
        return { buffer, mimeType: detected };
      }
    } catch {
      // Fallback to local memory
    }
  }

  const mem = inMemoryStorage.get(storagePath);
  if (mem) {
    return { buffer: mem.buffer, mimeType: mem.mimeType };
  }

  return null;
}

/**
 * Generates an authorized signed download URL for private photo display.
 */
export async function createSignedPhotoUrl(
  storagePath: string,
  expiresInSeconds: number = 300
): Promise<string | null> {
  const client = getSupabaseStorageClient();
  if (client) {
    try {
      const { data, error } = await client.storage
        .from(BUCKET_NAME)
        .createSignedUrl(storagePath, expiresInSeconds);
      if (!error && data?.signedUrl) {
        return data.signedUrl;
      }
    } catch {
      // Fallback
    }
  }
  return null;
}

/**
 * Resets in-memory storage (used exclusively by test suites).
 */
export function _resetInMemoryStorage(): void {
  inMemoryStorage.clear();
}
