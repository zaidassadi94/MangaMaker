import { ok, fail, fromError, readJson } from "@/lib/api";
import { z } from "zod";
import {
  getProject, getChapterByProject, listCharacters, persistScript,
} from "@/lib/db/queries";
import { generateScript } from "@/lib/ai/claude";
import type { StoryBibleOutput } from "@/lib/validation";
import { rateLimit, STORY_RATE } from "@/lib/ratelimit";
import { ipHash } from "@/lib/request-ctx";

export const runtime = "nodejs";

function maxPages(): number {
  const n = Number(process.env.MAX_PAGES_PER_CHAPTER ?? "24");
  return Number.isFinite(n) && n > 0 ? n : 24;
}

const bodySchema = z.object({
  projectId: z.string(),
  pageCount: z.number().int().min(1),
  pacing: z.number().min(0).max(1).default(0.5),
});

export async function POST(req: Request): Promise<Response> {
  try {
    const rl = await rateLimit(`script:${ipHash(req)}`, STORY_RATE);
    if (!rl.ok) return fail("Too many requests — slow down a moment.", 429);

    const input = bodySchema.parse(await readJson(req));
    const cap = maxPages();
    if (input.pageCount > cap) {
      return fail(`Chapter length is capped at ${cap} pages.`, 400);
    }

    const project = await getProject(input.projectId);
    if (!project) return fail("Project not found", 404);
    const chapter = await getChapterByProject(input.projectId);
    if (!chapter) return fail("Chapter not found", 404);
    const chars = await listCharacters(input.projectId);
    if (chars.length === 0) return fail("Commit a story bible with characters first.", 400);

    const bible: StoryBibleOutput = {
      title: project.title,
      synopsis: project.synopsis,
      tone: project.genre,
      setting: chapter.premise || project.synopsis,
      genre: project.genre || "action",
      characters: chars.map((c) => ({
        name: c.name,
        role: c.role,
        appearanceDescription: c.appearanceDescription,
        personality: c.personality,
      })),
      beats: chapter.beats.length ? chapter.beats : [
        { act: 1, title: "Setup", summary: project.synopsis },
        { act: 2, title: "Rising", summary: "The conflict deepens." },
        { act: 3, title: "Climax", summary: "The confrontation." },
        { act: 4, title: "Turn", summary: "The aftermath." },
      ],
    };

    const { script, source } = await generateScript({
      bible,
      pageCount: input.pageCount,
      pacing: input.pacing,
      pageSizeForLayouts: project.pageSize,
    });
    await persistScript(project, chapter, script, chars);

    return ok({ pages: script.pages.length, source });
  } catch (err) {
    return fromError(err);
  }
}
