import { ok, fail, fromError, readJson } from "@/lib/api";
import { variationsSchema } from "@/lib/validation";
import { panelProject } from "@/lib/db/queries";
import { renderVariations } from "@/lib/render";
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

    const input = variationsSchema.parse(await readJson(req));
    const found = await panelProject(id);
    if (!found) return fail("Panel not found", 404);
    const { panel, project, characters } = found;

    if (input.promptOverride) assertPromptAllowed(input.promptOverride);
    assertPromptAllowed(panel.description);

    const reserve = await reservePanels(hash, input.count);
    if (!reserve.ok) return fail(`Daily generation cap reached (${reserve.state.limit}). Try again tomorrow.`, 429, { quota: reserve.state });

    const variations = await renderVariations(panel, project, characters, input.count, input.promptOverride);
    return ok({ variations, quota: reserve.state });
  } catch (err) {
    return fromError(err);
  }
}
