import { seedFromString } from "@/lib/ids";
import { persistRemoteImage } from "@/lib/storage";
import { aspectToDims } from "@/lib/providers/types";
import type { EditOpts, EditResult, GenerateOpts, GenerateResult, ImageProvider } from "@/lib/providers/types";

// ─────────────────────────────────────────────────────────────────────────────
// fal.ai adapter. Generate via a Flux text-to-image endpoint; edit/inpaint via
// a Flux Kontext image-conditioned endpoint. fal returns hosted URLs; we
// re-persist them through the storage adapter so ownership/lifetime is ours.
// ─────────────────────────────────────────────────────────────────────────────

const GEN_MODEL = process.env.FAL_GEN_MODEL ?? "fal-ai/flux/dev";
const EDIT_MODEL = process.env.FAL_EDIT_MODEL ?? "fal-ai/flux-pro/kontext";

interface FalResponse {
  images?: Array<{ url: string }>;
  image?: { url: string };
}

async function callFal(model: string, body: Record<string, unknown>): Promise<string> {
  const key = process.env.FAL_KEY;
  if (!key) throw new Error("FAL_KEY is required when IMAGE_PROVIDER=fal");
  const res = await fetch(`https://fal.run/${model}`, {
    method: "POST",
    headers: {
      Authorization: `Key ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`fal error (${res.status}): ${await res.text()}`);
  }
  const json = (await res.json()) as FalResponse;
  const url = json.images?.[0]?.url ?? json.image?.url;
  if (!url) throw new Error("fal returned no image url");
  return url;
}

function keyFor(meta: GenerateOpts["meta"], seed: number): string {
  const project = meta?.projectId ?? "adhoc";
  const panel = meta?.panelId ?? "img";
  return `${project}/${panel}-${seed}-${Date.now()}.png`;
}

export class FalProvider implements ImageProvider {
  name = "fal";

  async generate(opts: GenerateOpts): Promise<GenerateResult> {
    const seed = opts.seed ?? seedFromString(opts.prompt);
    const { w, h } = aspectToDims(opts.aspectRatio);
    const url = await callFal(GEN_MODEL, {
      prompt: opts.prompt,
      image_size: { width: w, height: h },
      seed,
      num_images: 1,
      enable_safety_checker: true,
    });
    const stored = await persistRemoteImage(url, keyFor(opts.meta, seed));
    return { url: stored, seed };
  }

  async edit(opts: EditOpts): Promise<EditResult> {
    const seed = opts.seed ?? seedFromString(opts.baseImage);
    const base = opts.baseImage.startsWith("http")
      ? opts.baseImage
      : `${process.env.APP_URL ?? "http://localhost:3000"}${opts.baseImage}`;
    const url = await callFal(EDIT_MODEL, {
      prompt: opts.instruction,
      image_url: base,
      ...(opts.maskImage ? { mask_url: opts.maskImage } : {}),
      seed,
      num_images: 1,
    });
    const stored = await persistRemoteImage(url, keyFor(opts.meta, seed));
    return { url: stored };
  }
}
