import { seedFromString } from "@/lib/ids";
import type { EditOpts, EditResult, GenerateOpts, GenerateResult, ImageProvider } from "@/lib/providers/types";

// ─────────────────────────────────────────────────────────────────────────────
// Mock provider — the zero-key default. Returns a URL to the /api/mock-image
// route which renders a deterministic SVG placeholder from query params. No
// base64, no storage writes, works on read-only serverless filesystems.
// ─────────────────────────────────────────────────────────────────────────────

function buildUrl(params: Record<string, string | number | undefined>): string {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") usp.set(k, String(v));
  }
  return `/api/mock-image?${usp.toString()}`;
}

export class MockProvider implements ImageProvider {
  name = "mock";

  async generate(opts: GenerateOpts): Promise<GenerateResult> {
    const seed = opts.seed ?? seedFromString(opts.prompt);
    const url = buildUrl({
      seed,
      ar: opts.aspectRatio,
      shot: opts.meta?.shotType,
      angle: opts.meta?.cameraAngle,
      chars: (opts.meta?.characterNames ?? []).join(","),
      mono: opts.meta?.mono === false ? "0" : undefined,
      v: 0,
    });
    return { url, seed };
  }

  async edit(opts: EditOpts): Promise<EditResult> {
    // Deterministically derive a new variant from the instruction so the edit
    // visibly changes while remaining reproducible.
    const seed = opts.seed ?? seedFromString(opts.baseImage);
    const variant = (seedFromString(opts.instruction) % 997) + 1;
    const url = buildUrl({
      seed,
      ar: opts.aspectRatio ?? "3:4",
      label: opts.instruction.slice(0, 40),
      v: variant,
    });
    return { url };
  }
}
