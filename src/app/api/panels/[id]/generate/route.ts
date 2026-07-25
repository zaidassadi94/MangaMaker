import { ok, fail, fromError, readJson } from "@/lib/api";
import { generatePanelSchema } from "@/lib/validation";
import { panelProject, updatePanel } from "@/lib/db/queries";
import { renderPanel } from "@/lib/render";
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

    const input = generatePanelSchema.parse(await readJson(req));
    const found = await panelProject(id);
    if (!found) return fail("Panel not found", 404);
    const { panel, project, characters } = found;

    if (input.promptOverride) assertPromptAllowed(input.promptOverride);
    assertPromptAllowed(panel.description);

    const reserve = await reservePanels(hash, 1);
    if (!reserve.ok) return fail(`Daily generation cap reached (${reserve.state.limit}). Try again tomorrow.`, 429, { quota: reserve.state });

    await updatePanel(id, { status: "rendering" });
    const result = await renderPanel(panel, project, characters, {
      promptOverride: input.promptOverride,
      seed: input.seed,
    });

    const history = panel.imageUrl ? [...panel.history, panel.imageUrl].slice(-20) : panel.history;
    const patch = {
      imageUrl: result.imageUrl,
      seed: result.seed,
      imagePrompt: result.prompt,
      status: "done" as const,
      version: panel.version + 1,
      history,
    };
    await updatePanel(id, patch);

    return ok({ panel: { ...panel, ...patch }, quota: reserve.state });
  } catch (err) {
    return fromError(err);
  }
}
