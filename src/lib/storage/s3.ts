import { AwsClient } from "aws4fetch";
import type { StorageAdapter } from "@/lib/storage/types";

// S3-compatible adapter (R2, Backblaze B2, MinIO, AWS S3). Uses aws4fetch for
// SigV4 so it works anywhere `fetch` does, with no heavyweight SDK.
export class S3Storage implements StorageAdapter {
  name = "s3";
  private client: AwsClient;
  private endpoint: string;
  private bucket: string;
  private publicUrl: string;

  constructor() {
    const accessKeyId = required("S3_ACCESS_KEY_ID");
    const secretAccessKey = required("S3_SECRET_ACCESS_KEY");
    this.endpoint = required("S3_ENDPOINT").replace(/\/+$/, "");
    this.bucket = required("S3_BUCKET");
    this.publicUrl = (process.env.S3_PUBLIC_URL ?? `${this.endpoint}/${this.bucket}`).replace(/\/+$/, "");
    this.client = new AwsClient({
      accessKeyId,
      secretAccessKey,
      region: process.env.S3_REGION ?? "auto",
      service: "s3",
    });
  }

  private objectUrl(key: string): string {
    return `${this.endpoint}/${this.bucket}/${encodeURI(key)}`;
  }

  async put(key: string, bytes: Uint8Array, contentType = "application/octet-stream"): Promise<string> {
    const res = await this.client.fetch(this.objectUrl(key), {
      method: "PUT",
      body: bytes as unknown as BodyInit,
      headers: { "Content-Type": contentType },
    });
    if (!res.ok) {
      throw new Error(`S3 put failed (${res.status}): ${await res.text()}`);
    }
    return `${this.publicUrl}/${encodeURI(key)}`;
  }

  async get(key: string): Promise<Uint8Array | null> {
    const res = await this.client.fetch(this.objectUrl(key));
    if (!res.ok) return null;
    return new Uint8Array(await res.arrayBuffer());
  }

  async delete(key: string): Promise<void> {
    await this.client.fetch(this.objectUrl(key), { method: "DELETE" });
  }
}

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is required when STORAGE_ADAPTER=s3`);
  return v;
}
