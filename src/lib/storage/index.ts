import type { StorageAdapter } from "@/lib/storage/types";
import { LocalStorage } from "@/lib/storage/local";
import { S3Storage } from "@/lib/storage/s3";

let cached: StorageAdapter | null = null;

export function getStorage(): StorageAdapter {
  if (cached) return cached;
  const adapter = (process.env.STORAGE_ADAPTER ?? "local").toLowerCase();
  cached = adapter === "s3" ? new S3Storage() : new LocalStorage();
  return cached;
}

/** Fetch remote bytes and persist them via the configured storage adapter. */
export async function persistRemoteImage(
  sourceUrl: string,
  key: string,
): Promise<string> {
  const res = await fetch(sourceUrl);
  if (!res.ok) throw new Error(`Failed to fetch generated image: ${res.status}`);
  const contentType = res.headers.get("content-type") ?? "image/png";
  const bytes = new Uint8Array(await res.arrayBuffer());
  return getStorage().put(key, bytes, contentType);
}

/** Persist raw bytes (e.g. base64 returned inline by a provider). */
export async function persistBytes(
  bytes: Uint8Array,
  key: string,
  contentType: string,
): Promise<string> {
  return getStorage().put(key, bytes, contentType);
}

export type { StorageAdapter };
