import { mulberry32 } from "@/lib/ids";
import { aspectToDims } from "@/lib/providers/types";

// ─────────────────────────────────────────────────────────────────────────────
// Deterministic SVG placeholder "manga panel" generator. Same seed → same art.
// Used by the mock provider (served via /api/mock-image) and by the seed script
// (written to /public/seed as static .svg). Pure — no DOM, no fetch.
// ─────────────────────────────────────────────────────────────────────────────

export interface MockPanelOptions {
  seed: number;
  aspectRatio?: string;
  shotType?: string;
  cameraAngle?: string;
  characterNames?: string[];
  label?: string; // free-text override (e.g. instruction for edits)
  variant?: number;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function renderMockPanelSvg(opts: MockPanelOptions): string {
  const { w, h } = aspectToDims(opts.aspectRatio ?? "3:4", 768);
  const rand = mulberry32((opts.seed ^ ((opts.variant ?? 0) * 0x9e3779b1)) >>> 0);
  const shot = opts.shotType ?? "medium";
  const angle = opts.cameraAngle ?? "eye";
  const names = (opts.characterNames ?? []).filter(Boolean);

  // Halftone dot field, density from seed.
  const dot = 12 + Math.floor(rand() * 8);
  const dotR = 1.4 + rand() * 1.2;

  // Abstract seeded "figure": a stack of silhouette blocks so different seeds
  // read as different compositions.
  const figures: string[] = [];
  const figureCount = shot.includes("wide") || shot === "establishing" ? 1 : names.length > 0 ? Math.min(names.length, 3) : 1;
  for (let i = 0; i < figureCount; i++) {
    const cx = w * (0.2 + (i + 0.5) * (0.6 / Math.max(1, figureCount)) + (rand() - 0.5) * 0.06);
    const scale = shot === "closeup" || shot === "extreme-closeup" ? 1.5 : shot === "establishing" ? 0.6 : 1;
    const headR = h * 0.07 * scale;
    const headY = h * (0.42 - scale * 0.05);
    const bodyW = headR * 2.1;
    const bodyH = h * 0.34 * scale;
    figures.push(`
      <g opacity="0.9">
        <circle cx="${cx.toFixed(1)}" cy="${headY.toFixed(1)}" r="${headR.toFixed(1)}" fill="#111"/>
        <path d="M ${(cx - bodyW / 2).toFixed(1)} ${(headY + headR + bodyH).toFixed(1)}
                 Q ${cx.toFixed(1)} ${(headY + headR - h * 0.02).toFixed(1)} ${(cx + bodyW / 2).toFixed(1)} ${(headY + headR + bodyH).toFixed(1)} Z"
              fill="#111"/>
      </g>`);
  }

  // Motion / speed lines for action-ish shots.
  const speedLines: string[] = [];
  if (shot === "pov" || angle === "dutch" || rand() > 0.6) {
    const lineCount = 8 + Math.floor(rand() * 8);
    for (let i = 0; i < lineCount; i++) {
      const y = (i / lineCount) * h;
      speedLines.push(`<line x1="0" y1="${y.toFixed(1)}" x2="${w}" y2="${(y + (rand() - 0.5) * 40).toFixed(1)}" stroke="#111" stroke-width="0.6" opacity="0.18"/>`);
    }
  }

  const nameChips = names
    .map(
      (n, i) =>
        `<g transform="translate(${(12).toFixed(0)}, ${(h - 30 - i * 26).toFixed(0)})">
          <rect x="0" y="0" rx="4" ry="4" width="${Math.min(w - 24, 24 + n.length * 8.5).toFixed(0)}" height="20" fill="#111"/>
          <text x="8" y="14" font-family="monospace" font-size="12" fill="#fff">${esc(n)}</text>
        </g>`,
    )
    .join("");

  const label = opts.label ?? `${shot} · ${angle}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}">
  <defs>
    <pattern id="halftone" width="${dot}" height="${dot}" patternUnits="userSpaceOnUse">
      <rect width="${dot}" height="${dot}" fill="#f7f5ef"/>
      <circle cx="${(dot / 2).toFixed(1)}" cy="${(dot / 2).toFixed(1)}" r="${dotR.toFixed(2)}" fill="#d9d5c8"/>
    </pattern>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#eceae2"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#sky)"/>
  <rect width="${w}" height="${h}" fill="url(#halftone)" opacity="0.5"/>
  ${speedLines.join("")}
  <rect x="0" y="${(h * 0.62).toFixed(0)}" width="${w}" height="${(h * 0.38).toFixed(0)}" fill="#e7e4da" opacity="0.6"/>
  ${figures.join("")}
  <rect x="2" y="2" width="${w - 4}" height="${h - 4}" fill="none" stroke="#111" stroke-width="4"/>
  <g transform="translate(${(w - 12).toFixed(0)}, 22)" text-anchor="end">
    <text font-family="monospace" font-size="13" fill="#111" opacity="0.75">${esc(label)}</text>
  </g>
  <text x="12" y="22" font-family="monospace" font-size="11" fill="#111" opacity="0.5">MangaForge · mock</text>
  ${nameChips}
</svg>`;
}
