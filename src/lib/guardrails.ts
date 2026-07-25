// ─────────────────────────────────────────────────────────────────────────────
// Content & copyright guardrails. MangaForge makes ORIGINAL characters only.
// We reject prompts naming well-known franchises/characters, and run a basic
// content filter (sexual content involving minors, extreme gore, real public
// figures). Rejections are surfaced to the user and logged — never silently
// mangled. This is a good-faith filter, not a legal guarantee (see NOTICE.md).
// ─────────────────────────────────────────────────────────────────────────────

export type GuardrailCategory = "franchise" | "csam" | "gore" | "real-person";

export interface GuardrailResult {
  ok: boolean;
  category?: GuardrailCategory;
  match?: string;
  message?: string;
}

// Common franchise + character names people reflexively reach for. Not
// exhaustive; extendable in CONTRIBUTING. Matched as whole words, case-insensitive.
export const FRANCHISE_BLOCKLIST: string[] = [
  "naruto", "sasuke", "sakura haruno", "kakashi", "hokage",
  "goku", "vegeta", "dragon ball", "super saiyan", "kamehameha",
  "luffy", "one piece", "zoro", "nami", "gear five",
  "ichigo", "bleach", "soul reaper", "zangetsu",
  "tanjiro", "nezuko", "demon slayer", "kimetsu",
  "eren", "mikasa", "levi ackerman", "attack on titan", "titan shifter",
  "deku", "izuku midoriya", "all might", "my hero academia", "one for all",
  "gojo", "sukuna", "jujutsu kaisen", "itadori",
  "light yagami", "death note", "ryuk", "shinigami notebook",
  "edward elric", "fullmetal alchemist", "alphonse elric",
  "spike spiegel", "cowboy bebop",
  "saitama", "one punch man", "genos",
  "asta", "black clover",
  "yugi", "yu-gi-oh", "kaiba",
  "ash ketchum", "pikachu", "pokemon", "pokémon",
  "sailor moon", "usagi tsukino",
  "totoro", "studio ghibli", "chihiro", "howl's moving castle",
  "astro boy", "sailor scout",
  "gundam", "evangelion", "shinji ikari", "asuka langley",
  "inuyasha", "kagome",
  "vinland saga", "thorfinn",
  "berserk", "guts", "griffith",
  "jojo", "jotaro", "dio brando", "stand user",
  "spy x family", "anya forger", "loid forger",
  "chainsaw man", "denji", "makima", "power",
  "frieren", "solo leveling", "sung jinwoo",
  // western capes people also try
  "spider-man", "spiderman", "batman", "superman", "iron man",
  "mickey mouse", "hello kitty", "pikmin",
];

const CSAM_TERMS = [
  "child", "minor", "underage", "loli", "shota", "toddler", "preteen",
  "elementary schooler", "kindergarten",
];
const CSAM_SEXUAL = [
  "nude", "naked", "sexual", "sex", "nsfw", "erotic", "lewd", "explicit",
  "topless", "lingerie", "seductive", "provocative",
];

const GORE_TERMS = [
  "dismember", "decapitat", "disembowel", "gore", "mutilat", "torture",
  "beheading", "gutted", "entrails", "flayed",
];

// A tiny sample of real public figures. Extendable in CONTRIBUTING.
const REAL_PEOPLE = [
  "donald trump", "joe biden", "barack obama", "kamala harris",
  "elon musk", "vladimir putin", "xi jinping", "taylor swift",
  "kim jong un", "narendra modi", "pope francis",
];

function normalize(s: string): string {
  return ` ${s.toLowerCase().replace(/[^\p{L}\p{N}'-]+/gu, " ").replace(/\s+/g, " ")} `;
}

function containsPhrase(haystack: string, phrase: string): boolean {
  // haystack is already normalised with leading/trailing spaces.
  const p = phrase.toLowerCase();
  if (p.includes(" ")) return haystack.includes(` ${p} `) || haystack.includes(` ${p} `.trimEnd() + " ");
  return haystack.includes(` ${p} `);
}

export function checkPrompt(prompt: string): GuardrailResult {
  const h = normalize(prompt);

  for (const name of FRANCHISE_BLOCKLIST) {
    if (containsPhrase(h, name)) {
      return {
        ok: false,
        category: "franchise",
        match: name,
        message:
          'MangaForge creates original characters — describe the look you want instead (e.g. "a spiky-haired swordsman in a torn red coat").',
      };
    }
  }

  const mentionsMinor = CSAM_TERMS.some((t) => h.includes(t));
  const mentionsSexual = CSAM_SEXUAL.some((t) => h.includes(t));
  if (mentionsMinor && mentionsSexual) {
    return {
      ok: false,
      category: "csam",
      message: "This request was blocked by the content filter and cannot be generated.",
    };
  }

  for (const t of GORE_TERMS) {
    if (h.includes(t)) {
      return {
        ok: false,
        category: "gore",
        match: t,
        message:
          "Extreme gore is blocked. Manga violence is fine — describe the action stylistically instead (impact, motion, shock lines).",
      };
    }
  }

  for (const person of REAL_PEOPLE) {
    if (containsPhrase(h, person)) {
      return {
        ok: false,
        category: "real-person",
        match: person,
        message:
          "MangaForge does not depict real public figures. Describe an original character instead.",
      };
    }
  }

  return { ok: true };
}

/** Convenience: throws a tagged error usable by API routes. */
export class GuardrailError extends Error {
  category: GuardrailCategory;
  match?: string;
  constructor(result: GuardrailResult) {
    super(result.message ?? "Prompt rejected by guardrails.");
    this.name = "GuardrailError";
    this.category = result.category ?? "franchise";
    this.match = result.match;
  }
}

export function assertPromptAllowed(prompt: string): void {
  const r = checkPrompt(prompt);
  if (!r.ok) throw new GuardrailError(r);
}
