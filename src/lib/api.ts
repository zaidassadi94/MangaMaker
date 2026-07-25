import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { GuardrailError } from "@/lib/guardrails";

// ─────────────────────────────────────────────────────────────────────────────
// Shared API helpers. Typed JSON responses + consistent error → toast mapping.
// ─────────────────────────────────────────────────────────────────────────────

export function ok<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json(data, init);
}

export function fail(message: string, status = 400, extra?: Record<string, unknown>): NextResponse {
  return NextResponse.json({ error: message, ...extra }, { status });
}

export function fromError(err: unknown): NextResponse {
  if (err instanceof GuardrailError) {
    return fail(err.message, 422, { code: "guardrail", category: err.category, match: err.match });
  }
  if (err instanceof ZodError) {
    const first = err.issues[0];
    return fail(first ? `${first.path.join(".")}: ${first.message}` : "Invalid request", 400, {
      code: "validation",
      issues: err.issues,
    });
  }
  const message = err instanceof Error ? err.message : "Unexpected error";
  console.error("[api] error:", message);
  return fail(message, 500, { code: "internal" });
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return {};
  }
}
