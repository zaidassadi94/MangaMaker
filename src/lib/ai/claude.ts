import { storyBibleSchema, scriptSchema, type ScriptOutput, type StoryBibleOutput } from "@/lib/validation";
import { mockBible, mockScript } from "@/lib/ai/mock-story";
import { LAYOUT_TEMPLATES } from "@/lib/layouts";

// ─────────────────────────────────────────────────────────────────────────────
// Claude story pipeline. Uses the Anthropic Messages API with structured JSON
// output. Falls back to the deterministic mock when ANTHROPIC_API_KEY is unset
// or a call fails/validates poorly — the pipeline always returns valid data.
// ─────────────────────────────────────────────────────────────────────────────

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";
const API = "https://api.anthropic.com/v1/messages";

export function hasClaude(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1]! : text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object in model output");
  return JSON.parse(raw.slice(start, end + 1));
}

async function callClaude(system: string, user: string, maxTokens = 4096): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY!;
  const res = await fetch(API, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) {
    throw new Error(`Anthropic error (${res.status}): ${await res.text()}`);
  }
  const json = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
  const text = (json.content ?? []).filter((b) => b.type === "text").map((b) => b.text ?? "").join("\n");
  if (!text) throw new Error("Empty Claude response");
  return text;
}

export async function generateBible(input: {
  premise: string;
  genre: string;
}): Promise<{ bible: StoryBibleOutput; source: "claude" | "mock" }> {
  if (!hasClaude()) return { bible: mockBible(input.premise, input.genre), source: "mock" };
  try {
    const system =
      "You are a comic and manga story editor. Return ONLY a JSON object for a chapter bible. " +
      "Create ORIGINAL characters — never reference real franchises, series, or real people. " +
      "Give each character a detailed VISUAL appearance (hair, eyes, build, clothing, distinguishing marks, age). " +
      'Shape: {"title","synopsis","tone","setting","genre","characters":[{"name","role","appearanceDescription","personality"}],"beats":[{"act","title","summary"}]}. ' +
      "Provide 3-6 characters and a 4-act beat sheet (acts 1..4). role is one of protagonist, deuteragonist, antagonist, rival, mentor, support, comic-relief, love-interest.";
    const user = `Premise: ${input.premise}\nGenre: ${input.genre || "any"}\nReturn the JSON bible now.`;
    const text = await callClaude(system, user);
    const parsed = storyBibleSchema.parse(extractJson(text));
    return { bible: parsed, source: "claude" };
  } catch (err) {
    console.warn("[claude] bible fell back to mock:", (err as Error).message);
    return { bible: mockBible(input.premise, input.genre), source: "mock" };
  }
}

export async function generateScript(input: {
  bible: StoryBibleOutput;
  pageCount: number;
  pacing: number;
  pageSizeForLayouts?: "b5" | "a4" | "webtoon";
}): Promise<{ script: ScriptOutput; source: "claude" | "mock" }> {
  const fallback = () => ({
    script: mockScript(input.bible, input.pageCount, input.pacing, input.pageSizeForLayouts),
    source: "mock" as const,
  });
  if (!hasClaude()) return fallback();
  try {
    const layoutIds = LAYOUT_TEMPLATES.map((l) => `${l.id} (${l.slots.length} panels, ${l.family})`).join(", ");
    const names = input.bible.characters.map((c) => c.name).join(", ");
    const system =
      "You are a comic and manga page-breakdown artist. Convert a beat sheet into pages and panels. " +
      "Return ONLY JSON of shape {\"pages\":[{\"layoutTemplateId\",\"panels\":[{\"description\",\"shotType\",\"cameraAngle\",\"emotion\",\"setting\",\"characterNames\":[],\"dialogue\":[{\"type\",\"speaker\",\"text\"}],\"sfx\":[{\"text\",\"style\"}]}]}]}. " +
      "Each page has 3-7 panels. shotType is one of establishing, wide, medium, closeup, extreme-closeup, over-shoulder, pov, insert. " +
      "cameraAngle is one of eye, low, high, dutch, birdseye, worms. dialogue.type is one of speech, thought, shout, whisper, narration, offpanel, aside. sfx.style is one of impact, soft, jagged, motion. " +
      "Choose layoutTemplateId per page from this library based on pacing (dense grids for talky pages, few large panels for action): " +
      layoutIds +
      ". characterNames must be drawn from: " +
      names +
      ".";
    const user = `Bible: ${JSON.stringify(input.bible)}\nTarget pages: ${input.pageCount}\nPacing (0 talky .. 1 action): ${input.pacing}\nReturn the JSON script now.`;
    const text = await callClaude(system, user, 8192);
    const parsed = scriptSchema.parse(extractJson(text));
    return { script: parsed, source: "claude" };
  } catch (err) {
    console.warn("[claude] script fell back to mock:", (err as Error).message);
    return fallback();
  }
}
