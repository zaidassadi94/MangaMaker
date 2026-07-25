import { ok, fail, fromError } from "@/lib/api";
import { getCharacter, getProject, updateCharacter } from "@/lib/db/queries";
import { renderCharacterSheet } from "@/lib/render";
import { assertPromptAllowed } from "@/lib/guardrails";
import { rateLimit, GEN_RATE } from "@/lib/ratelimit";
import { ipHash, reservePanels } from "@/lib/request-ctx";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx): Promise<Response> {
  try {
    const { id } = await params;
    const hash = ipHash(req);
    const rl = await rateLimit(`gen:${hash}`, GEN_RATE);
    if (!rl.ok) return fail("Too many requests — slow down a moment.", 429);

    const character = await getCharacter(id);
    if (!character) return fail("Character not found", 404);
    if (character.locked) return fail("Character is locked. Unlock to regenerate.", 409);

    const project = await getProject(character.projectId);
    if (!project) return fail("Project not found", 404);

    assertPromptAllowed(character.appearanceDescription);

    const reserve = await reservePanels(hash, 1);
    if (!reserve.ok) return fail(`Daily generation cap reached (${reserve.state.limit}). Try again tomorrow.`, 429, { quota: reserve.state });

    const url = await renderCharacterSheet(character, project);
    await updateCharacter(id, { refImageUrl: url, sheetImageUrls: [url] });

    return ok({ character: { ...character, refImageUrl: url, sheetImageUrls: [url] }, quota: reserve.state });
  } catch (err) {
    return fromError(err);
  }
}
