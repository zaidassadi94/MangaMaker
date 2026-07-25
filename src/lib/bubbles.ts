import type { BubbleType } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// Bubble auto-sizing. Bubbles grow to fit their text up to a max width, then
// wrap. Measurement is font-metric-free (approximated from font size) so it
// runs identically on server and in tests; the Konva layer refines visually.
// ─────────────────────────────────────────────────────────────────────────────

export interface AutoSizeOptions {
  fontSize: number;
  maxWidth: number;
  paddingX?: number;
  paddingY?: number;
  lineHeightFactor?: number;
  charWidthFactor?: number;
}

export interface AutoSizeResult {
  width: number;
  height: number;
  lines: string[];
}

export function wrapText(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (word.length > maxCharsPerLine) {
      // Hard-break very long tokens.
      if (current) {
        lines.push(current);
        current = "";
      }
      let rest = word;
      while (rest.length > maxCharsPerLine) {
        lines.push(rest.slice(0, maxCharsPerLine));
        rest = rest.slice(maxCharsPerLine);
      }
      current = rest;
      continue;
    }
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxCharsPerLine) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

export function autoSizeBubble(text: string, opts: AutoSizeOptions): AutoSizeResult {
  const {
    fontSize,
    maxWidth,
    paddingX = fontSize * 1.1,
    paddingY = fontSize * 0.9,
    lineHeightFactor = 1.3,
    charWidthFactor = 0.55,
  } = opts;

  const charWidth = Math.max(1, fontSize * charWidthFactor);
  const innerMax = Math.max(charWidth, maxWidth - paddingX * 2);
  const maxChars = Math.max(1, Math.floor(innerMax / charWidth));

  const lines = wrapText(text.trim() || " ", maxChars);
  const longest = lines.reduce((m, l) => Math.max(m, l.length), 0);
  const textWidth = longest * charWidth;
  const width = Math.min(maxWidth, textWidth + paddingX * 2);
  const lineHeight = fontSize * lineHeightFactor;
  const height = lines.length * lineHeight + paddingY * 2;

  return { width, height, lines };
}

export interface BubbleTypeDefaults {
  fontFamily: string;
  fontSize: number;
  maxWidth: number; // px at 1x panel scale reference (600px panel)
}

export const BUBBLE_DEFAULTS: Record<BubbleType, BubbleTypeDefaults> = {
  speech: { fontFamily: "var(--font-dialogue)", fontSize: 18, maxWidth: 220 },
  thought: { fontFamily: "var(--font-dialogue)", fontSize: 17, maxWidth: 210 },
  shout: { fontFamily: "var(--font-sfx)", fontSize: 26, maxWidth: 240 },
  whisper: { fontFamily: "var(--font-dialogue)", fontSize: 15, maxWidth: 190 },
  narration: { fontFamily: "var(--font-narration)", fontSize: 16, maxWidth: 260 },
  offpanel: { fontFamily: "var(--font-dialogue)", fontSize: 18, maxWidth: 220 },
  aside: { fontFamily: "var(--font-dialogue)", fontSize: 14, maxWidth: 170 },
};

/**
 * Direction from a bubble centre toward a speaker centre, both in the same
 * coordinate space. Returns the tail-tip position clamped just outside the
 * bubble box toward the speaker.
 */
export function computeTailTip(
  bubbleCx: number,
  bubbleCy: number,
  speakerCx: number,
  speakerCy: number,
  reach = 1.4,
): { x: number; y: number } {
  const dx = speakerCx - bubbleCx;
  const dy = speakerCy - bubbleCy;
  const len = Math.hypot(dx, dy) || 1;
  return {
    x: bubbleCx + (dx / len) * reach * 40,
    y: bubbleCy + (dy / len) * reach * 40,
  };
}
