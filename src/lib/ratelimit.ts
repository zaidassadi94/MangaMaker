// ─────────────────────────────────────────────────────────────────────────────
// Per-IP rate limiting. In-memory sliding window by default; Upstash Redis REST
// when configured (UPSTASH_REDIS_REST_URL/TOKEN, or an https REDIS_URL). Never
// let an unauthenticated request trigger unbounded generation.
// ─────────────────────────────────────────────────────────────────────────────

export interface RateResult {
  ok: boolean;
  remaining: number;
  limit: number;
  resetMs: number;
}

const memory = new Map<string, number[]>();

function memoryWindow(key: string, limit: number, windowMs: number): RateResult {
  const now = Date.now();
  const cutoff = now - windowMs;
  const hits = (memory.get(key) ?? []).filter((t) => t > cutoff);
  const ok = hits.length < limit;
  if (ok) hits.push(now);
  memory.set(key, hits);
  // opportunistic cleanup
  if (memory.size > 5000) {
    for (const [k, v] of memory) {
      if (v.every((t) => t <= cutoff)) memory.delete(k);
    }
  }
  return { ok, remaining: Math.max(0, limit - hits.length), limit, resetMs: windowMs };
}

function restBase(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? (process.env.REDIS_URL?.startsWith("https") ? process.env.REDIS_URL : undefined);
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) return { url: url.replace(/\/+$/, ""), token };
  return null;
}

async function upstashWindow(key: string, limit: number, windowMs: number): Promise<RateResult> {
  const base = restBase()!;
  const windowSec = Math.ceil(windowMs / 1000);
  const redisKey = `rl:${key}:${Math.floor(Date.now() / windowMs)}`;
  const headers = { Authorization: `Bearer ${base.token}` };
  // pipeline: INCR then EXPIRE
  const res = await fetch(`${base.url}/pipeline`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify([
      ["INCR", redisKey],
      ["EXPIRE", redisKey, String(windowSec)],
    ]),
  });
  if (!res.ok) return memoryWindow(key, limit, windowMs);
  const data = (await res.json()) as Array<{ result: number }>;
  const count = data[0]?.result ?? 1;
  return { ok: count <= limit, remaining: Math.max(0, limit - count), limit, resetMs: windowMs };
}

export async function rateLimit(
  key: string,
  opts: { limit: number; windowMs: number },
): Promise<RateResult> {
  if (restBase()) {
    try {
      return await upstashWindow(key, opts.limit, opts.windowMs);
    } catch {
      return memoryWindow(key, opts.limit, opts.windowMs);
    }
  }
  return memoryWindow(key, opts.limit, opts.windowMs);
}

// Default budgets for generation routes.
export const GEN_RATE = { limit: 30, windowMs: 60_000 };
export const STORY_RATE = { limit: 12, windowMs: 60_000 };
