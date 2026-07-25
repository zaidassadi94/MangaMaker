import { ok, fail, fromError, readJson } from "@/lib/api";
import { bibleRequestSchema } from "@/lib/validation";
import { assertPromptAllowed } from "@/lib/guardrails";
import { generateBible } from "@/lib/ai/claude";
import { rateLimit, STORY_RATE } from "@/lib/ratelimit";
import { ipHash } from "@/lib/request-ctx";

export const runtime = "nodejs";

export async function POST(req: Request): Promise<Response> {
  try {
    const rl = await rateLimit(`bible:${ipHash(req)}`, STORY_RATE);
    if (!rl.ok) return fail("Too many requests — slow down a moment.", 429);

    const input = bibleRequestSchema.parse(await readJson(req));
    assertPromptAllowed(input.premise);
    const { bible, source } = await generateBible({ premise: input.premise, genre: input.genre });
    return ok({ bible, source });
  } catch (err) {
    return fromError(err);
  }
}
