import { renderMockPanelSvg } from "@/lib/providers/mock-svg";

export const runtime = "nodejs";

// Deterministic SVG placeholder panels for the mock provider. Cacheable.
export function GET(req: Request): Response {
  const url = new URL(req.url);
  const q = url.searchParams;
  const svg = renderMockPanelSvg({
    seed: Number(q.get("seed") ?? "1") || 1,
    aspectRatio: q.get("ar") ?? "3:4",
    shotType: q.get("shot") ?? undefined,
    cameraAngle: q.get("angle") ?? undefined,
    characterNames: (q.get("chars") ?? "").split(",").map((s) => s.trim()).filter(Boolean),
    label: q.get("label") ?? undefined,
    variant: Number(q.get("v") ?? "0") || 0,
  });
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
