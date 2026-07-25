import { mulberry32, seedFromString } from "@/lib/ids";
import type { CameraAngle, ShotType } from "@/lib/types";
import type { ScriptOutput, StoryBibleOutput } from "@/lib/validation";
import { layoutsForPageSize } from "@/lib/layouts";

// ─────────────────────────────────────────────────────────────────────────────
// Deterministic mock story generator — the zero-key fallback for Claude. Produces
// a valid StoryBible and page script from a premise so the whole pipeline is
// exercisable offline. Original characters only.
// ─────────────────────────────────────────────────────────────────────────────

const CHAR_SEEDS = [
  { role: "protagonist" as const, look: "wind-swept dark hair, sharp determined eyes, a worn traveller's jacket over a high collar, a thin scar across one eyebrow, athletic teenage build", trait: "reckless but fiercely loyal" },
  { role: "rival" as const, look: "pale slicked-back silver hair, cold grey eyes, an immaculate long dark coat, a silver ring on the left hand, tall and lean", trait: "arrogant, secretly principled" },
  { role: "deuteragonist" as const, look: "short bob of braided hair, round expressive eyes, practical layered clothing with many pouches, a small satchel, compact and quick", trait: "clever, warm, quietly brave" },
  { role: "mentor" as const, look: "greying beard, deep weathered face, a heavy cloak with a fur collar, one clouded eye, broad and stooped", trait: "gruff, wise, hiding regret" },
  { role: "antagonist" as const, look: "elaborate braided hair crowned with an ornament, hooded piercing eyes, ornate flowing robes with angular patterns, statuesque", trait: "calm, merciless, utterly certain" },
  { role: "comic-relief" as const, look: "wild frizzy hair, huge round glasses, an oversized coat with rolled sleeves, mismatched boots, small and springy", trait: "anxious, inventive, unexpectedly clutch" },
];

function pickTitle(premise: string, rand: () => number): string {
  const words = premise.replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter((w) => w.length > 3);
  const nouns = words.length ? words : ["Ashen", "Verse"];
  const a = nouns[Math.floor(rand() * nouns.length)] ?? "Ashen";
  const templates = [
    `The ${cap(a)} Oath`,
    `${cap(a)} & Ember`,
    `Chronicles of ${cap(a)}`,
    `The Last ${cap(a)}`,
    `${cap(a)}: First Cut`,
  ];
  return templates[Math.floor(rand() * templates.length)] ?? `The ${cap(a)} Oath`;
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

const NAMES = ["Kaede", "Ren", "Aoi", "Haru", "Mira", "Sora", "Kite", "Yuna", "Jin", "Rei", "Nao", "Toma"];

export function mockBible(premise: string, genre: string): StoryBibleOutput {
  const seed = seedFromString(premise + genre);
  const rand = mulberry32(seed);
  const count = 3 + Math.floor(rand() * 2); // 3–4
  const usedNames = new Set<string>();
  const characters = CHAR_SEEDS.slice(0, count).map((c) => {
    let name = NAMES[Math.floor(rand() * NAMES.length)] ?? "Ren";
    while (usedNames.has(name)) name = NAMES[Math.floor(rand() * NAMES.length)] ?? `${name}i`;
    usedNames.add(name);
    return {
      name,
      role: c.role,
      appearanceDescription: `${c.look}. Age around ${16 + Math.floor(rand() * 10)}.`,
      personality: c.trait,
    };
  });

  const hero = characters[0]?.name ?? "Kaede";
  const foe = characters.find((c) => c.role === "antagonist" || c.role === "rival")?.name ?? "Ren";
  const g = genre || "action";

  return {
    title: pickTitle(premise, rand),
    synopsis: `${premise.trim() || "A young outsider discovers a hidden power."} Drawn into a conflict larger than themselves, ${hero} must master a dangerous gift while ${foe} closes in.`,
    tone: `${g}, high-stakes, character-driven with bursts of humour`,
    setting: "A layered world of crowded stone streets, distant spires, and a wilderness that remembers old power.",
    genre: g,
    characters,
    beats: [
      { act: 1, title: "The Ordinary Broken", summary: `${hero}'s routine shatters when the hidden power surfaces in public, drawing dangerous attention.` },
      { act: 2, title: "Into the Deep", summary: `${hero} is pulled into the conflict and meets allies, learning the first rule of the gift.` },
      { act: 3, title: "The Cost", summary: `A confrontation with ${foe} reveals the true stakes and a painful sacrifice.` },
      { act: 4, title: "Turning", summary: `${hero} makes a defining choice, setting the trajectory for what comes next.` },
    ],
  };
}

const SHOTS: ShotType[] = ["establishing", "wide", "medium", "closeup", "over-shoulder", "pov", "insert", "extreme-closeup"];
const ANGLES: CameraAngle[] = ["eye", "low", "high", "dutch", "birdseye", "worms"];
const EMOTIONS = ["tense", "determined", "shocked", "wistful", "furious", "hopeful", "calm", "afraid"];

export function mockScript(
  bible: StoryBibleOutput,
  pageCount: number,
  pacing: number,
  pageSizeForLayouts: "b5" | "a4" | "webtoon" = "b5",
): ScriptOutput {
  const rand = mulberry32(seedFromString(bible.title + pageCount + pacing));
  const layouts = layoutsForPageSize(pageSizeForLayouts);
  const dense = layouts.filter((l) => l.slots.length >= 5).map((l) => l.id);
  const sparse = layouts.filter((l) => l.slots.length <= 3).map((l) => l.id);
  const mid = layouts.filter((l) => l.slots.length === 4).map((l) => l.id);
  const names = bible.characters.map((c) => c.name);

  const pages: ScriptOutput["pages"] = [];
  for (let p = 0; p < pageCount; p++) {
    const progress = p / Math.max(1, pageCount - 1);
    // High pacing → sparser action pages; low pacing → denser talky pages.
    const actiony = rand() < pacing * 0.6 + progress * 0.3;
    const pool = actiony ? sparse.concat(mid) : dense.concat(mid);
    const layoutTemplateId = pool[Math.floor(rand() * pool.length)] ?? layouts[0]!.id;
    const layoutSlots = layouts.find((l) => l.id === layoutTemplateId)?.slots.length ?? 4;
    const panelCount = Math.min(7, Math.max(3, layoutSlots));

    const panels: ScriptOutput["pages"][number]["panels"] = [];
    for (let i = 0; i < panelCount; i++) {
      const shot = actiony && i === 0 ? "establishing" : (SHOTS[Math.floor(rand() * SHOTS.length)] ?? "medium");
      const angle = ANGLES[Math.floor(rand() * ANGLES.length)] ?? "eye";
      const emotion = EMOTIONS[Math.floor(rand() * EMOTIONS.length)] ?? "tense";
      const castN = 1 + Math.floor(rand() * Math.min(2, names.length));
      const cast = shuffle(names, rand).slice(0, castN);
      const speaker = cast[0] ?? names[0] ?? "Kaede";

      const dialogue =
        rand() > 0.35
          ? [
              {
                type: (["speech", "thought", "shout", "narration"] as const)[Math.floor(rand() * 4)] ?? "speech",
                speaker,
                text: sampleLine(rand),
              },
            ]
          : [];
      const sfx = actiony && rand() > 0.5 ? [{ text: sampleSfx(rand), style: (["impact", "motion", "jagged"] as const)[Math.floor(rand() * 3)] ?? "impact" }] : [];

      panels.push({
        description: `${cast.join(" and ") || "the scene"} — ${sampleAction(rand)}`,
        shotType: shot,
        cameraAngle: angle,
        emotion,
        setting: bible.setting.split(",")[0] ?? "the city",
        characterNames: cast,
        dialogue,
        sfx,
      });
    }
    pages.push({ layoutTemplateId, panels });
  }
  return { pages };
}

function shuffle<T>(arr: T[], rand: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

const ACTIONS = [
  "stands at the threshold as light spills past them",
  "whirls around, coat snapping in the wind",
  "reaches out, fingertips almost touching",
  "recoils as the ground fractures underfoot",
  "leans in close, voice dropping to a whisper",
  "raises a hand, energy coiling around the wrist",
  "looks back over one shoulder, eyes narrowed",
  "sprints across the rooftops toward the tower",
];
const LINES = [
  "I'm not running. Not this time.",
  "You have no idea what you've started.",
  "Stay behind me — whatever happens.",
  "So this is the power everyone feared.",
  "Then we do it together, or not at all.",
  "It's already too late for that.",
];
const SFX = ["DOON", "KRAK", "SHF", "GOOO", "BA-DMP", "SLASH", "WHRR", "TMP"];

function sampleAction(rand: () => number): string {
  return ACTIONS[Math.floor(rand() * ACTIONS.length)] ?? ACTIONS[0]!;
}
function sampleLine(rand: () => number): string {
  return LINES[Math.floor(rand() * LINES.length)] ?? LINES[0]!;
}
function sampleSfx(rand: () => number): string {
  return SFX[Math.floor(rand() * SFX.length)] ?? "DOON";
}
