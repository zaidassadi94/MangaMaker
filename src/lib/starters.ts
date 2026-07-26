import type { Medium, ReadingDirection } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// Genre starter templates. One click → pre-filled premise, style preset, pacing,
// medium (manga/comic), and reading direction. Used by the dashboard gallery and
// the wizard.
// ─────────────────────────────────────────────────────────────────────────────

export interface Starter {
  id: string;
  name: string;
  emoji: string;
  medium: Medium;
  genre: string;
  styleId: string;
  pacing: number; // 0 talky .. 1 action
  readingDirection: ReadingDirection;
  premise: string;
}

export const STARTERS: Starter[] = [
  // ── Manga (right-to-left, monochrome) ──────────────────────────────────────
  {
    id: "shonen-tournament",
    name: "Shonen Tournament",
    emoji: "🥊",
    medium: "manga",
    genre: "shonen action",
    styleId: "shonen-action",
    pacing: 0.85,
    readingDirection: "rtl",
    premise:
      "A scrappy underdog with an unrefined but explosive fighting style enters a legendary martial arts tournament to prove they belong, facing a prodigy rival who has never lost.",
  },
  {
    id: "slice-of-life",
    name: "Slice of Life",
    emoji: "🍵",
    medium: "manga",
    genre: "slice of life",
    styleId: "retro-90s",
    pacing: 0.2,
    readingDirection: "rtl",
    premise:
      "Two roommates running a tiny late-night noodle stand navigate small joys and quiet worries over the course of one long, warm summer evening.",
  },
  {
    id: "isekai-reincarnation",
    name: "Isekai Reincarnation",
    emoji: "🌌",
    medium: "manga",
    genre: "isekai fantasy",
    styleId: "isekai-fantasy",
    pacing: 0.6,
    readingDirection: "rtl",
    premise:
      "A burned-out office worker dies and wakes in a world of guilds and magic circles — reborn with a strange, underestimated skill that everyone else discarded as useless.",
  },
  {
    id: "mystery-thriller",
    name: "Mystery Thriller",
    emoji: "🕵️",
    medium: "manga",
    genre: "mystery thriller",
    styleId: "seinen-gritty",
    pacing: 0.45,
    readingDirection: "rtl",
    premise:
      "A sharp but disgraced detective is pulled back for one case: a locked-room disappearance in a rain-soaked coastal town where everyone is lying about the same night.",
  },
  {
    id: "sports-rivalry",
    name: "Sports Rivalry",
    emoji: "🏀",
    medium: "manga",
    genre: "sports",
    styleId: "shonen-action",
    pacing: 0.75,
    readingDirection: "rtl",
    premise:
      "A talented benchwarmer and the team's cold star ace are forced to play together in the final tournament — and discover their only path to the title runs through each other.",
  },
  {
    id: "romance-confession",
    name: "Romance Confession",
    emoji: "🌸",
    medium: "manga",
    genre: "shojo romance",
    styleId: "shojo-romance",
    pacing: 0.3,
    readingDirection: "rtl",
    premise:
      "On the last day before graduation, a shy student finally decides to confess to the friend they've loved for three years — if they can survive one chaotic, rainy afternoon.",
  },
  {
    id: "horror-short",
    name: "Horror Short",
    emoji: "🕯️",
    medium: "manga",
    genre: "horror",
    styleId: "seinen-gritty",
    pacing: 0.5,
    readingDirection: "rtl",
    premise:
      "A group exploring an abandoned subway station realizes the trains still run at 3:33 AM — and something steps off at every stop, one car closer.",
  },
  {
    id: "4koma-comedy",
    name: "4-Koma Comedy",
    emoji: "😆",
    medium: "manga",
    genre: "comedy",
    styleId: "chibi-4koma",
    pacing: 0.4,
    readingDirection: "rtl",
    premise:
      "An overachieving cat cafe manager and their perpetually napping business-partner cat run schemes to attract customers — each ending in gentle disaster.",
  },
  // ── Comic (left-to-right, colour) ──────────────────────────────────────────
  {
    id: "superhero-origin",
    name: "Superhero Origin",
    emoji: "🦸",
    medium: "comic",
    genre: "superhero",
    styleId: "american-superhero",
    pacing: 0.8,
    readingDirection: "ltr",
    premise:
      "A cynical city bike courier gains the power to briefly rewind the last ten seconds — and must decide what kind of hero to be when a bridge collapse gives them one chance to get it right.",
  },
  {
    id: "space-opera",
    name: "Space Opera",
    emoji: "🚀",
    medium: "comic",
    genre: "sci-fi adventure",
    styleId: "ligne-claire",
    pacing: 0.6,
    readingDirection: "ltr",
    premise:
      "The last salvage crew of a decommissioned deep-space tug answers a distress call from a derelict liner — and finds a stowaway who insists the ship was never supposed to exist.",
  },
  {
    id: "crime-noir",
    name: "Crime Noir",
    emoji: "🌆",
    medium: "comic",
    genre: "crime noir",
    styleId: "graphic-novel",
    pacing: 0.4,
    readingDirection: "ltr",
    premise:
      "A tired fixer who cleans up other people's mistakes takes one last job in a rain-slick harbor city, only to recognize the face in the case file as someone they buried years ago.",
  },
  {
    id: "all-ages-adventure",
    name: "All-Ages Adventure",
    emoji: "🗺️",
    medium: "comic",
    genre: "adventure",
    styleId: "retro-pulp",
    pacing: 0.65,
    readingDirection: "ltr",
    premise:
      "Two kids and a grumpy talking crow follow a half-burned treasure map out of their sleepy town and into a valley the grown-ups swear isn't on any map.",
  },
];

export function getStarter(id: string): Starter | undefined {
  return STARTERS.find((s) => s.id === id);
}
