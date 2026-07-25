import { ok, fail, fromError, readJson } from "@/lib/api";
import { storyBibleSchema } from "@/lib/validation";
import { assertPromptAllowed } from "@/lib/guardrails";
import {
  getProject, updateProject, getChapterByProject, updateChapter,
  listCharacters, createCharacterFromBible,
} from "@/lib/db/queries";
import { db } from "@/lib/db";
import { characters as charactersTable } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

export const runtime = "nodejs";

const bodySchema = z.object({ bible: storyBibleSchema });

type Ctx = { params: Promise<{ id: string }> };

// Commit an (edited) story bible onto a project: updates metadata + chapter
// beats and (re)creates the character roster.
export async function POST(req: Request, { params }: Ctx): Promise<Response> {
  try {
    const { id } = await params;
    const { bible } = bodySchema.parse(await readJson(req));
    assertPromptAllowed(bible.synopsis + " " + bible.characters.map((c) => c.appearanceDescription).join(" "));

    const project = await getProject(id);
    if (!project) return fail("Project not found", 404);

    await updateProject(id, { title: bible.title, synopsis: bible.synopsis, genre: bible.genre });
    const chapter = await getChapterByProject(id);
    if (chapter) {
      await updateChapter(chapter.id, { title: bible.title, premise: bible.synopsis, beats: bible.beats });
    }

    // Replace existing characters with the committed roster.
    const existing = await listCharacters(id);
    for (const c of existing) await db.delete(charactersTable).where(eq(charactersTable.id, c.id));
    const created = [];
    for (const c of bible.characters) {
      created.push(await createCharacterFromBible(id, c));
    }

    return ok({ characters: created });
  } catch (err) {
    return fromError(err);
  }
}
