// ─────────────────────────────────────────────────────────────────────────────
// Art style presets — the "popular manga" look. Each preset is generic manga
// aesthetic ONLY (no franchise references). See guardrails.ts for the filter.
// ─────────────────────────────────────────────────────────────────────────────

export interface StylePreset {
  id: string;
  name: string;
  blurb: string;
  positiveCore: string;
  /** default line weight / tone density / ink contrast in 0..1 */
  lineWeight: number;
  toneDensity: number;
  inkContrast: number;
  /** swatch gradient for the picker card (CSS) */
  swatch: string;
}

export const SHARED_STYLE_SUFFIX =
  "clean manga linework, screentone shading, no color, monochrome, single panel, no text, no speech bubbles, no watermark, no signature";

export const SHARED_NEGATIVE_PROMPT =
  "color, photorealistic, 3d render, cgi, text, letters, watermark, signature, blurry, low detail, extra fingers, deformed hands, cropped, jpeg artifacts, frame border";

export const STYLE_PRESETS: StylePreset[] = [
  {
    id: "shonen-action",
    name: "Shonen Action",
    blurb: "Bold inking, speed lines, dynamic energy.",
    positiveCore:
      "high-contrast black and white manga panel, bold confident inking, heavy screentone shading, dramatic speed lines, dynamic foreshortening, spiky expressive hair, intense eyes, weekly shonen magazine aesthetic",
    lineWeight: 0.8,
    toneDensity: 0.6,
    inkContrast: 0.85,
    swatch: "linear-gradient(135deg,#111 0%,#111 45%,#fff 45%,#fff 55%,#111 55%)",
  },
  {
    id: "shojo-romance",
    name: "Shojo Romance",
    blurb: "Feathered lines, sparkles, airy space.",
    positiveCore:
      "delicate black and white manga panel, fine feathered linework, large luminous eyes with detailed highlights, floral and sparkle screentone, soft flowing hair, airy negative space, shojo magazine aesthetic",
    lineWeight: 0.35,
    toneDensity: 0.35,
    inkContrast: 0.5,
    swatch: "radial-gradient(circle at 30% 30%,#fff 0%,#eee 40%,#cfcfcf 100%)",
  },
  {
    id: "seinen-gritty",
    name: "Seinen Gritty",
    blurb: "Cross-hatching, heavy blacks, realism.",
    positiveCore:
      "detailed black and white manga panel, dense cross-hatching, realistic proportions and anatomy, heavy blacks, cinematic composition, weathered textures, mature seinen aesthetic",
    lineWeight: 0.6,
    toneDensity: 0.85,
    inkContrast: 0.95,
    swatch: "repeating-linear-gradient(45deg,#000 0 2px,#333 2px 4px)",
  },
  {
    id: "chibi-4koma",
    name: "Chibi 4-Koma",
    blurb: "Super-deformed gags, thick outlines.",
    positiveCore:
      "simple black and white manga panel, chibi super-deformed proportions, thick uniform outlines, minimal shading, exaggerated comedic expressions, sweat drops and emotion marks, yonkoma gag strip aesthetic",
    lineWeight: 0.9,
    toneDensity: 0.2,
    inkContrast: 0.7,
    swatch: "linear-gradient(180deg,#fff 0%,#fff 60%,#111 60%,#111 100%)",
  },
  {
    id: "isekai-fantasy",
    name: "Isekai Fantasy",
    blurb: "Ornate costumes, magic circles, scale.",
    positiveCore:
      "black and white manga panel, ornate fantasy costume detail, sweeping capes, magic circle motifs, layered screentone, epic scale backgrounds, light novel adaptation aesthetic",
    lineWeight: 0.55,
    toneDensity: 0.7,
    inkContrast: 0.75,
    swatch: "conic-gradient(from 45deg,#111,#666,#111,#999,#111)",
  },
  {
    id: "retro-90s",
    name: "Retro 90s",
    blurb: "Rounded design, halftone dots, VHS grain.",
    positiveCore:
      "black and white manga panel, 1990s anime aesthetic, rounded character design, hand-drawn imperfect linework, halftone dot screentone, VHS-era styling",
    lineWeight: 0.5,
    toneDensity: 0.5,
    inkContrast: 0.6,
    swatch: "radial-gradient(circle,#111 1px,transparent 1px) 0 0/6px 6px,#eaeaea",
  },
];

export function getPreset(id: string): StylePreset {
  return STYLE_PRESETS.find((p) => p.id === id) ?? STYLE_PRESETS[0]!;
}
