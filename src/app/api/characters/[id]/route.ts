import { ok, fail, fromError, readJson } from "@/lib/api";
import { getCharacter, updateCharacter } from "@/lib/db/queries";
import { assertPromptAllowed } from "@/lib/guardrails";
import { z } from "zod";
import { characterRole } from "@/lib/validation";

export const runtime = "nodejs";

const patchSchema = z.object({
  name: z.string().min(1).max(60).optional(),
  role: characterRole.optional(),
  appearanceDescription: z.string().max(2000).optional(),
  personality: z.string().max(1000).optional(),
  locked: z.boolean().optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx): Promise<Response> {
  try {
    const { id } = await params;
    const patch = patchSchema.parse(await readJson(req));
    if (patch.appearanceDescription) assertPromptAllowed(patch.appearanceDescription);
    if (patch.name) assertPromptAllowed(patch.name);
    const existing = await getCharacter(id);
    if (!existing) return fail("Character not found", 404);
    await updateCharacter(id, patch);
    return ok({ character: { ...existing, ...patch } });
  } catch (err) {
    return fromError(err);
  }
}
