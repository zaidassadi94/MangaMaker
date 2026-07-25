import { customAlphabet } from "nanoid";

// URL-safe, human-readable-ish ids. Prefixed by entity for debuggability.
const nano = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 12);

export function id(prefix: string): string {
  return `${prefix}_${nano()}`;
}

export const newProjectId = () => id("prj");
export const newStyleGuideId = () => id("sty");
export const newCharacterId = () => id("chr");
export const newChapterId = () => id("cha");
export const newPageId = () => id("pag");
export const newPanelId = () => id("pnl");
export const newBubbleId = () => id("bub");
export const newSfxId = () => id("sfx");
export const newAssetId = () => id("ast");
export const newJobId = () => id("job");

/** Deterministic 31-bit seed derived from a string (mulberry-ish hash). */
export function seedFromString(input: string): number {
  let h = 1779033703 ^ input.length;
  for (let i = 0; i < input.length; i++) {
    h = Math.imul(h ^ input.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 1; // positive 31-bit
}

/** Seeded deterministic PRNG (mulberry32). Returns floats in [0,1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
