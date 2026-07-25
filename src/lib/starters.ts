// ─────────────────────────────────────────────────────────────────────────────
// Genre starter templates. One click → pre-filled premise, style preset, and
// pacing. Used by the dashboard gallery and the wizard "surprise me" flow.
// ─────────────────────────────────────────────────────────────────────────────

export interface Starter {
  id: string;
  name: string;
  emoji: string;
  genre: string;
  styleId: string;
  pacing: number; // 0 talky .. 1 action
  premise: string;
}

export const STARTERS: Starter[] = [
  {
    id: "shonen-tournament",
    name: "Shonen Tournament",
    emoji: "🥊",
    genre: "shonen action",
    styleId: "shonen-action",
    pacing: 0.85,
    premise:
      "A scrappy underdog with an unrefined but explosive fighting style enters a legendary martial arts tournament to prove they belong, facing a prodigy rival who has never lost.",
  },
  {
    id: "slice-of-life",
    name: "Slice of Life",
    emoji: "🍵",
    genre: "slice of life",
    styleId: "retro-90s",
    pacing: 0.2,
    premise:
      "Two roommates running a tiny late-night noodle stand navigate small joys and quiet worries over the course of one long, warm summer evening.",
  },
  {
    id: "isekai-reincarnation",
    name: "Isekai Reincarnation",
    emoji: "🌌",
    genre: "isekai fantasy",
    styleId: "isekai-fantasy",
    pacing: 0.6,
    premise:
      "A burned-out office worker dies and wakes in a world of guilds and magic circles — reborn with a strange, underestimated skill that everyone else discarded as useless.",
  },
  {
    id: "mystery-thriller",
    name: "Mystery Thriller",
    emoji: "🕵️",
    genre: "mystery thriller",
    styleId: "seinen-gritty",
    pacing: 0.45,
    premise:
      "A sharp but disgraced detective is pulled back for one case: a locked-room disappearance in a rain-soaked coastal town where everyone is lying about the same night.",
  },
  {
    id: "sports-rivalry",
    name: "Sports Rivalry",
    emoji: "🏀",
    genre: "sports",
    styleId: "shonen-action",
    pacing: 0.75,
    premise:
      "A talented benchwarmer and the team's cold star ace are forced to play together in the final tournament — and discover their only path to the title runs through each other.",
  },
  {
    id: "romance-confession",
    name: "Romance Confession",
    emoji: "🌸",
    genre: "shojo romance",
    styleId: "shojo-romance",
    pacing: 0.3,
    premise:
      "On the last day before graduation, a shy student finally decides to confess to the friend they've loved for three years — if they can survive one chaotic, rainy afternoon.",
  },
  {
    id: "horror-short",
    name: "Horror Short",
    emoji: "🕯️",
    genre: "horror",
    styleId: "seinen-gritty",
    pacing: 0.5,
    premise:
      "A group exploring an abandoned subway station realizes the trains still run at 3:33 AM — and something steps off at every stop, one car closer.",
  },
  {
    id: "4koma-comedy",
    name: "4-Koma Comedy",
    emoji: "😆",
    genre: "comedy",
    styleId: "chibi-4koma",
    pacing: 0.4,
    premise:
      "An overachieving cat cafe manager and their perpetually napping business-partner cat run schemes to attract customers — each ending in gentle disaster.",
  },
];

export function getStarter(id: string): Starter | undefined {
  return STARTERS.find((s) => s.id === id);
}
