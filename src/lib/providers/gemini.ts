import { seedFromString } from "@/lib/ids";
import { persistBytes } from "@/lib/storage";
import type { EditOpts, EditResult, GenerateOpts, GenerateResult, ImageProvider } from "@/lib/providers/types";

// ─────────────────────────────────────────────────────────────────────────────
// Google Gemini adapter (gemini-2.5-flash-image). Best multi-reference character
// consistency + natural-language editing. Returns inline base64 image data,
// which we immediately persist via the storage adapter and reference by URL.
// ─────────────────────────────────────────────────────────────────────────────

const MODEL = process.env.GEMINI_IMAGE_MODEL ?? "gemini-2.5-flash-image";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

interface InlinePart {
  inlineData?: { mimeType: string; data: string };
  text?: string;
}

async function toInlineImage(url: string): Promise<InlinePart | null> {
  try {
    const abs = url.startsWith("http") ? url : `${process.env.APP_URL ?? "http://localhost:3000"}${url}`;
    const res = await fetch(abs);
    if (!res.ok) return null;
    const mimeType = res.headers.get("content-type") ?? "image/png";
    const buf = Buffer.from(await res.arrayBuffer());
    return { inlineData: { mimeType, data: buf.toString("base64") } };
  } catch {
    return null;
  }
}

function extractImage(json: unknown): { bytes: Uint8Array; mime: string } | null {
  const candidates = (json as { candidates?: Array<{ content?: { parts?: InlinePart[] } }> }).candidates;
  const parts = candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    if (part.inlineData?.data) {
      return {
        bytes: new Uint8Array(Buffer.from(part.inlineData.data, "base64")),
        mime: part.inlineData.mimeType || "image/png",
      };
    }
  }
  return null;
}

async function call(parts: InlinePart[]): Promise<{ bytes: Uint8Array; mime: string }> {
  const key = process.env.GOOGLE_API_KEY;
  if (!key) throw new Error("GOOGLE_API_KEY is required when IMAGE_PROVIDER=gemini");
  const res = await fetch(`${ENDPOINT}?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts }],
      generationConfig: { responseModalities: ["IMAGE"] },
    }),
  });
  if (!res.ok) {
    throw new Error(`Gemini image error (${res.status}): ${await res.text()}`);
  }
  const img = extractImage(await res.json());
  if (!img) throw new Error("Gemini returned no image data");
  return img;
}

function keyFor(meta: GenerateOpts["meta"], seed: number, ext: string): string {
  const project = meta?.projectId ?? "adhoc";
  const panel = meta?.panelId ?? "img";
  return `${project}/${panel}-${seed}-${Date.now()}.${ext}`;
}

export class GeminiProvider implements ImageProvider {
  name = "gemini";

  async generate(opts: GenerateOpts): Promise<GenerateResult> {
    const seed = opts.seed ?? seedFromString(opts.prompt);
    const parts: InlinePart[] = [
      {
        text: `${opts.prompt}\n\nNegative: ${opts.negativePrompt ?? ""}\nAspect ratio: ${opts.aspectRatio}. Black and white manga panel only.`,
      },
    ];
    for (const ref of opts.referenceImages ?? []) {
      const inline = await toInlineImage(ref);
      if (inline) parts.push(inline);
    }
    const { bytes, mime } = await call(parts);
    const url = await persistBytes(bytes, keyFor(opts.meta, seed, mime.split("/")[1] ?? "png"), mime);
    return { url, seed };
  }

  async edit(opts: EditOpts): Promise<EditResult> {
    const seed = opts.seed ?? seedFromString(opts.baseImage);
    const parts: InlinePart[] = [{ text: `Edit this manga panel: ${opts.instruction}. Keep the same character design and monochrome manga style.` }];
    const base = await toInlineImage(opts.baseImage);
    if (base) parts.push(base);
    if (opts.maskImage) {
      const mask = await toInlineImage(opts.maskImage);
      if (mask) parts.push({ text: "Apply the edit only within the masked (white) region." }, mask);
    }
    for (const ref of opts.referenceImages ?? []) {
      const inline = await toInlineImage(ref);
      if (inline) parts.push(inline);
    }
    const { bytes, mime } = await call(parts);
    const url = await persistBytes(bytes, keyFor(opts.meta, seed, mime.split("/")[1] ?? "png"), mime);
    return { url };
  }
}
