import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { usage } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// ─────────────────────────────────────────────────────────────────────────────
// Request context helpers: client IP (hashed for privacy) + server-enforced
// daily panel cap. The cap blocks a flood regardless of rate-limit windows.
// ─────────────────────────────────────────────────────────────────────────────

export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "0.0.0.0";
}

export function ipHash(req: Request): string {
  return createHash("sha256").update(clientIp(req)).digest("hex").slice(0, 16);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function maxPanelsPerDay(): number {
  const n = Number(process.env.MAX_PANELS_PER_DAY ?? "200");
  return Number.isFinite(n) && n > 0 ? n : 200;
}

export interface QuotaState {
  used: number;
  limit: number;
  remaining: number;
}

export async function getQuota(hash: string): Promise<QuotaState> {
  const bucket = `${today()}:${hash}`;
  const row = await db.select().from(usage).where(eq(usage.bucket, bucket)).get();
  const used = row?.panelCount ?? 0;
  const limit = maxPanelsPerDay();
  return { used, limit, remaining: Math.max(0, limit - used) };
}

/**
 * Reserve `count` panels against the daily cap. Returns false (and reserves
 * nothing) if it would exceed the cap.
 */
export async function reservePanels(hash: string, count: number): Promise<{ ok: boolean; state: QuotaState }> {
  const bucket = `${today()}:${hash}`;
  const limit = maxPanelsPerDay();
  const row = await db.select().from(usage).where(eq(usage.bucket, bucket)).get();
  const used = row?.panelCount ?? 0;
  if (used + count > limit) {
    return { ok: false, state: { used, limit, remaining: Math.max(0, limit - used) } };
  }
  const next = used + count;
  const now = Date.now();
  if (row) {
    await db.update(usage).set({ panelCount: next, updatedAt: now }).where(eq(usage.bucket, bucket));
  } else {
    await db.insert(usage).values({ bucket, day: today(), ipHash: hash, panelCount: next, updatedAt: now });
  }
  return { ok: true, state: { used: next, limit, remaining: Math.max(0, limit - next) } };
}
