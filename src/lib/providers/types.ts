// ─────────────────────────────────────────────────────────────────────────────
// Image provider abstraction. Adapters: mock (default, zero-key), gemini, fal.
// Selected via IMAGE_PROVIDER. Every adapter returns a URL (never base64).
// ─────────────────────────────────────────────────────────────────────────────

export interface GenerateMeta {
  projectId?: string;
  panelId?: string;
  shotType?: string;
  cameraAngle?: string;
  characterNames?: string[];
  index?: number;
}

export interface GenerateOpts {
  prompt: string;
  negativePrompt?: string;
  referenceImages?: string[]; // character reference sheets
  seed?: number;
  aspectRatio: string; // e.g. "3:4"
  meta?: GenerateMeta; // used by the mock provider for legible placeholders
}

export interface GenerateResult {
  url: string;
  seed: number;
}

export interface EditOpts {
  baseImage: string;
  instruction: string;
  maskImage?: string; // for inpainting
  referenceImages?: string[];
  seed?: number;
  aspectRatio?: string;
  meta?: GenerateMeta;
}

export interface EditResult {
  url: string;
}

export interface ImageProvider {
  name: string;
  generate(opts: GenerateOpts): Promise<GenerateResult>;
  edit(opts: EditOpts): Promise<EditResult>;
}

export function aspectToDims(aspectRatio: string, base = 768): { w: number; h: number } {
  const [aRaw, bRaw] = aspectRatio.split(":");
  const a = Number(aRaw) || 3;
  const b = Number(bRaw) || 4;
  if (a >= b) return { w: base, h: Math.round((base * b) / a) };
  return { w: Math.round((base * a) / b), h: base };
}
