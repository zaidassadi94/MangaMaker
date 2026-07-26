import type { Medium } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// Style presets — the "popular manga/comic" look. Each preset is a generic
// aesthetic ONLY (no franchise references). `medium` selects manga (monochrome)
// vs comic (colour), which drives the shared suffix + negative prompt.
// ─────────────────────────────────────────────────────────────────────────────

export interface StylePreset {
  id: string;
  name: string;
  blurb: string;
  medium: Medium;
  mono: boolean;
  positiveCore: string;
  /** default line weight / tone density / ink contrast in 0..1 */
  lineWeight: number;
  toneDensity: number;
  inkContrast: number;
  /** swatch gradient for the picker card (CSS) */
  swatch: string;
}

// Manga: black-and-white, screentone.
export const MANGA_STYLE_SUFFIX =
  "clean manga linework, screentone shading, no color, monochrome, single panel, no text, no speech bubbles, no watermark, no signature";
export const MANGA_NEGATIVE_PROMPT =
  "color, photorealistic, 3d render, cgi, text, letters, watermark, signature, blurry, low detail, extra fingers, deformed hands, cropped, jpeg artifacts, frame border";

// Comic: full colour, bold inking.
export const COMIC_STYLE_SUFFIX =
  "bold clean comic-book inking, vibrant flat cel-shaded color, dynamic lighting, single panel, no text, no speech bubbles, no watermark, no signature";
export const COMIC_NEGATIVE_PROMPT =
  "monochrome, grayscale, desaturated, photorealistic, 3d render, cgi, text, letters, watermark, signature, blurry, low detail, extra fingers, deformed hands, cropped, jpeg artifacts, frame border";

// Backwards-compatible aliases (default = manga) used by older code paths/tests.
export const SHARED_STYLE_SUFFIX = MANGA_STYLE_SUFFIX;
export const SHARED_NEGATIVE_PROMPT = MANGA_NEGATIVE_PROMPT;

export function styleSuffixFor(medium: Medium): string {
  return medium === "comic" ? COMIC_STYLE_SUFFIX : MANGA_STYLE_SUFFIX;
}
export function negativePromptFor(medium: Medium): string {
  return medium === "comic" ? COMIC_NEGATIVE_PROMPT : MANGA_NEGATIVE_PROMPT;
}

export const STYLE_PRESETS: StylePreset[] = [
  // ── Manga (monochrome) ─────────────────────────────────────────────────────
  {
    id: "shonen-action",
    name: "Shonen Action",
    blurb: "Bold inking, speed lines, dynamic energy.",
    medium: "manga",
    mono: true,
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
    medium: "manga",
    mono: true,
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
    medium: "manga",
    mono: true,
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
    medium: "manga",
    mono: true,
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
    medium: "manga",
    mono: true,
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
    medium: "manga",
    mono: true,
    positiveCore:
      "black and white manga panel, 1990s anime aesthetic, rounded character design, hand-drawn imperfect linework, halftone dot screentone, VHS-era styling",
    lineWeight: 0.5,
    toneDensity: 0.5,
    inkContrast: 0.6,
    swatch: "radial-gradient(circle,#111 1px,transparent 1px) 0 0/6px 6px,#eaeaea",
  },
  // ── Comic (colour) ─────────────────────────────────────────────────────────
  {
    id: "american-superhero",
    name: "American Superhero",
    blurb: "Bold outlines, saturated cel color, action.",
    medium: "comic",
    mono: false,
    positiveCore:
      "vibrant American superhero comic book art, bold black ink outlines, dynamic cel shading, saturated primary colors, halftone highlight accents, action-packed heroic composition, modern cape-comic aesthetic",
    lineWeight: 0.75,
    toneDensity: 0.4,
    inkContrast: 0.8,
    swatch: "linear-gradient(135deg,#1b4dd6 0%,#e03131 55%,#f4c020 100%)",
  },
  {
    id: "graphic-novel",
    name: "Graphic Novel",
    blurb: "Brush inks, muted palette, cinematic.",
    medium: "comic",
    mono: false,
    positiveCore:
      "modern graphic novel illustration, expressive brush inks, muted naturalistic color palette, atmospheric lighting, cinematic panel composition, painterly indie comic aesthetic",
    lineWeight: 0.55,
    toneDensity: 0.5,
    inkContrast: 0.65,
    swatch: "linear-gradient(135deg,#3a4a5a 0%,#8a6f5a 60%,#c9a27a 100%)",
  },
  {
    id: "retro-pulp",
    name: "Retro Pulp",
    blurb: "Ben-Day dots, primary inks, silver age.",
    medium: "comic",
    mono: false,
    positiveCore:
      "retro 1960s pulp comic art, thick ink outlines, Ben-Day halftone dot shading, limited bright primary color palette, vintage newsprint texture, silver-age comic aesthetic",
    lineWeight: 0.85,
    toneDensity: 0.45,
    inkContrast: 0.7,
    swatch: "repeating-radial-gradient(circle,#e03131 0 2px,transparent 2px 6px),#1b4dd6",
  },
  {
    id: "ligne-claire",
    name: "Ligne Claire (BD)",
    blurb: "Clean uniform lines, flat vivid color.",
    medium: "comic",
    mono: false,
    positiveCore:
      "European bande dessinée ligne claire, clean uniform line weight, flat vibrant colors, no cross-hatching, detailed backgrounds, Franco-Belgian comic aesthetic",
    lineWeight: 0.6,
    toneDensity: 0.2,
    inkContrast: 0.6,
    swatch: "linear-gradient(135deg,#12a5b0 0%,#f4c020 50%,#e0553b 100%)",
  },
];

export function getPreset(id: string): StylePreset {
  return STYLE_PRESETS.find((p) => p.id === id) ?? STYLE_PRESETS[0]!;
}

export function presetsForMedium(medium: Medium): StylePreset[] {
  return STYLE_PRESETS.filter((p) => p.medium === medium);
}
