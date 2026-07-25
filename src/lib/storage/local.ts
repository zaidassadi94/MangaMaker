import { mkdir, writeFile, readFile, unlink } from "node:fs/promises";
import path from "node:path";
import type { StorageAdapter } from "@/lib/storage/types";

// Local filesystem adapter. Writes under /public/generated so Next serves the
// bytes statically. Note: serverless filesystems are read-only/ephemeral — use
// the s3 adapter there. Fine as the `pnpm dev` default.
export class LocalStorage implements StorageAdapter {
  name = "local";
  private root = path.join(process.cwd(), "public", "generated");

  private full(key: string): string {
    const safe = key.replace(/\.\.+/g, "").replace(/^\/+/, "");
    return path.join(this.root, safe);
  }

  async put(key: string, bytes: Uint8Array): Promise<string> {
    const file = this.full(key);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, bytes);
    return `/generated/${key.replace(/^\/+/, "")}`;
  }

  async get(key: string): Promise<Uint8Array | null> {
    try {
      const buf = await readFile(this.full(key));
      return new Uint8Array(buf);
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await unlink(this.full(key));
    } catch {
      /* ignore missing */
    }
  }
}
