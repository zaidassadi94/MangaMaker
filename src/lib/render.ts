import type { Character, Panel, Project } from "@/lib/types";
import { getImageProvider } from "@/lib/providers";
import { promptForPanel } from "@/lib/prompt";
import { seedFromString } from "@/lib/ids";

// ─────────────────────────────────────────────────────────────────────────────
// Rendering helpers that bridge domain objects → the image provider. Assembles
// prompts, passes character reference sheets, and derives per-panel aspect.
// ─────────────────────────────────────────────────────────────────────────────

const PAGE_ASPECT: Record<Project["pageSize"], number> = {
  b5: 0.707,
  a4: 0.707,
  webtoon: 0.5,
};

export function panelAspectRatio(panel: Pick<Panel, "w" | "h">, pageSize: Project["pageSize"]): string {
  const pageW = 1000;
  const pageH = pageW / PAGE_ASPECT[pageSize];
  const wPx = Math.max(1, Math.round(panel.w * pageW));
  const hPx = Math.max(1, Math.round(panel.h * pageH));
  return `${wPx}:${hPx}`;
}

function refImages(characters: Character[]): string[] {
  return characters.map((c) => c.refImageUrl).filter((u): u is string => Boolean(u));
}

export interface RenderResult {
  imageUrl: string;
  seed: number;
  prompt: string;
}

export async function renderPanel(
  panel: Panel,
  project: Project,
  characters: Character[],
  opts: { promptOverride?: string; seed?: number } = {},
): Promise<RenderResult> {
  const provider = getImageProvider();
  const involved = characters.filter((c) => panel.characterIds.includes(c.id));
  const prompt =
    opts.promptOverride?.trim() ||
    panel.imagePrompt ||
    promptForPanel(panel, project.styleGuide, involved);
  const seed = opts.seed ?? panel.seed ?? seedFromString(project.styleGuide.seed + panel.id);

  const result = await provider.generate({
    prompt,
    negativePrompt: project.styleGuide.negativePrompt,
    referenceImages: refImages(involved),
    seed,
    aspectRatio: panelAspectRatio(panel, project.pageSize),
    meta: {
      projectId: project.id,
      panelId: panel.id,
      shotType: panel.shotType,
      cameraAngle: panel.cameraAngle,
      characterNames: involved.map((c) => c.name),
      mono: project.styleGuide.mono ?? true,
    },
  });
  return { imageUrl: result.url, seed: result.seed, prompt };
}

export async function renderVariations(
  panel: Panel,
  project: Project,
  characters: Character[],
  count: number,
  promptOverride?: string,
): Promise<Array<{ imageUrl: string; seed: number }>> {
  const out: Array<{ imageUrl: string; seed: number }> = [];
  const baseSeed = panel.seed ?? seedFromString(project.styleGuide.seed + panel.id);
  for (let i = 0; i < count; i++) {
    const r = await renderPanel(panel, project, characters, {
      promptOverride,
      seed: baseSeed + i * 7919 + 1,
    });
    out.push({ imageUrl: r.imageUrl, seed: r.seed });
  }
  return out;
}

export async function editPanel(
  panel: Panel,
  project: Project,
  characters: Character[],
  instruction: string,
  maskImage?: string,
): Promise<{ imageUrl: string }> {
  const provider = getImageProvider();
  const involved = characters.filter((c) => panel.characterIds.includes(c.id));
  if (!panel.imageUrl) {
    // Nothing to edit yet — generate from the instruction as prompt.
    const r = await renderPanel(panel, project, characters, { promptOverride: `${panel.imagePrompt}, ${instruction}` });
    return { imageUrl: r.imageUrl };
  }
  const result = await provider.edit({
    baseImage: panel.imageUrl,
    instruction,
    maskImage,
    referenceImages: refImages(involved),
    seed: panel.seed ?? undefined,
    aspectRatio: panelAspectRatio(panel, project.pageSize),
    meta: { projectId: project.id, panelId: panel.id },
  });
  return { imageUrl: result.url };
}

export async function renderCharacterSheet(character: Character, project: Project): Promise<string> {
  const provider = getImageProvider();
  const styleSuffix = project.styleGuide.styleSuffix ?? "clean manga linework, screentone shading, no color, monochrome, no text, no watermark";
  const prompt =
    `${project.styleGuide.positivePrompt}, character model sheet, front view, three-quarter view, and three expression headshots of ONE original character, ` +
    `${character.name}: ${character.appearanceDescription} [ref:${character.seedToken}], plain white background, full body reference, consistent design, ` +
    styleSuffix;
  const result = await provider.generate({
    prompt,
    negativePrompt: project.styleGuide.negativePrompt,
    seed: seedFromString(project.styleGuide.seed + character.seedToken),
    aspectRatio: "4:3",
    meta: { projectId: project.id, panelId: `sheet-${character.id}`, characterNames: [character.name], shotType: "model-sheet", mono: project.styleGuide.mono ?? true },
  });
  return result.url;
}
