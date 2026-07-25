import type { PanelShape } from "@/lib/types";

// ─────────────────────────────────────────────────────────────────────────────
// Page layout templates as PURE DATA. Panels are {x,y,w,h,shape} in 0..1 page
// coordinates. Each template stores a `readingOrder` (indices into `slots`) in
// right-to-left manga order; reading-order.ts flips it for LTR projects.
// ─────────────────────────────────────────────────────────────────────────────

export type LayoutFamily =
  | "grid"
  | "yonkoma"
  | "action"
  | "dialogue"
  | "dramatic"
  | "webtoon"
  | "mixed";

export interface LayoutSlot {
  x: number;
  y: number;
  w: number;
  h: number;
  shape: PanelShape;
}

export interface LayoutTemplate {
  id: string;
  name: string;
  family: LayoutFamily;
  description: string;
  slots: LayoutSlot[];
  readingOrder: number[]; // RTL order, indices into slots
  webtoon?: boolean;
}

const M = 0.03; // outer page margin
const G = 0.02; // gutter between panels

/** Regular grid helper. Returns row-major slots (TL→TR then next row). */
function grid(cols: number, rows: number, shape: PanelShape = "rect"): LayoutSlot[] {
  const totalW = 1 - 2 * M - (cols - 1) * G;
  const totalH = 1 - 2 * M - (rows - 1) * G;
  const cw = totalW / cols;
  const ch = totalH / rows;
  const slots: LayoutSlot[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      slots.push({
        x: M + c * (cw + G),
        y: M + r * (ch + G),
        w: cw,
        h: ch,
        shape,
      });
    }
  }
  return slots;
}

/** RTL reading order for row-major slots: each row right→left, rows top→bottom. */
function gridReadingOrderRTL(cols: number, rows: number): number[] {
  const order: number[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = cols - 1; c >= 0; c--) {
      order.push(r * cols + c);
    }
  }
  return order;
}

function seq(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i);
}

const grid2x2: LayoutTemplate = {
  id: "grid-2x2",
  name: "2×2 Grid",
  family: "grid",
  description: "Balanced four-panel grid.",
  slots: grid(2, 2),
  readingOrder: gridReadingOrderRTL(2, 2),
};

const grid2x3: LayoutTemplate = {
  id: "grid-2x3",
  name: "2×3 Grid",
  family: "grid",
  description: "Six panels, two columns.",
  slots: grid(2, 3),
  readingOrder: gridReadingOrderRTL(2, 3),
};

const grid3x3: LayoutTemplate = {
  id: "grid-3x3",
  name: "3×3 Grid",
  family: "grid",
  description: "Dense nine-panel montage.",
  slots: grid(3, 3),
  readingOrder: gridReadingOrderRTL(3, 3),
};

const strip4h: LayoutTemplate = {
  id: "strip-4-horizontal",
  name: "4-Strip Horizontal",
  family: "grid",
  description: "Four wide horizontal bands.",
  slots: grid(1, 4),
  readingOrder: seq(4),
};

const strip3v: LayoutTemplate = {
  id: "strip-3-vertical",
  name: "3-Strip Vertical",
  family: "grid",
  description: "Three tall vertical columns.",
  slots: grid(3, 1),
  readingOrder: gridReadingOrderRTL(3, 1),
};

const yonkoma: LayoutTemplate = {
  id: "yonkoma",
  name: "Yonkoma (4-Koma)",
  family: "yonkoma",
  description: "Classic vertical 4-panel gag strip.",
  slots: grid(1, 4),
  readingOrder: seq(4),
};

const splashFull: LayoutTemplate = {
  id: "action-splash-full",
  name: "Full-Bleed Splash",
  family: "action",
  description: "One dramatic full-bleed image.",
  slots: [{ x: 0, y: 0, w: 1, h: 1, shape: "bleed" }],
  readingOrder: [0],
};

const splash2Inset: LayoutTemplate = {
  id: "action-splash-2-inset",
  name: "Splash + 2 Insets",
  family: "action",
  description: "Big splash with two overlapping insets.",
  slots: [
    { x: 0, y: 0, w: 1, h: 1, shape: "bleed" },
    { x: 0.62, y: 0.06, w: 0.32, h: 0.24, shape: "rect" },
    { x: 0.06, y: 0.7, w: 0.32, h: 0.24, shape: "rect" },
  ],
  readingOrder: [0, 1, 2],
};

const diagonalSlash: LayoutTemplate = {
  id: "action-diagonal-slash",
  name: "Diagonal Slash 3",
  family: "action",
  description: "Three panels cut on a dynamic diagonal.",
  slots: [
    { x: M, y: M, w: 1 - 2 * M, h: 0.34, shape: "skew" },
    { x: M, y: 0.37, w: 1 - 2 * M, h: 0.3, shape: "skew" },
    { x: M, y: 0.69, w: 1 - 2 * M, h: 1 - M - 0.69, shape: "skew" },
  ],
  readingOrder: [0, 1, 2],
};

const explosive5: LayoutTemplate = {
  id: "action-explosive-5",
  name: "Explosive Irregular 5",
  family: "action",
  description: "Five irregular shards for a burst beat.",
  slots: [
    { x: M, y: M, w: 0.5, h: 0.4, shape: "skew" },
    { x: 0.56, y: M, w: 1 - M - 0.56, h: 0.26, shape: "skew" },
    { x: 0.56, y: 0.31, w: 1 - M - 0.56, h: 0.28, shape: "burst" },
    { x: M, y: 0.44, w: 0.5, h: 1 - M - 0.44, shape: "skew" },
    { x: 0.56, y: 0.62, w: 1 - M - 0.56, h: 1 - M - 0.62, shape: "skew" },
  ],
  readingOrder: [1, 0, 2, 3, 4],
};

const talkingHeads6: LayoutTemplate = {
  id: "dialogue-6-heads",
  name: "6-Panel Talking Heads",
  family: "dialogue",
  description: "Six equal panels for a dialogue-heavy page.",
  slots: grid(2, 3),
  readingOrder: gridReadingOrderRTL(2, 3),
};

const establishing4React: LayoutTemplate = {
  id: "dialogue-establish-4-react",
  name: "Establishing + 4 Reactions",
  family: "dialogue",
  description: "Wide establishing shot over four reaction panels.",
  slots: [
    { x: M, y: M, w: 1 - 2 * M, h: 0.4, shape: "rect" },
    ...grid(2, 2)
      .map((s) => ({ ...s, y: s.y * 0.42 + 0.46, h: s.h * 0.5 })),
  ],
  readingOrder: [0, 2, 1, 4, 3],
};

const tallReveal: LayoutTemplate = {
  id: "dramatic-tall-reveal",
  name: "Tall Reveal + 2 Narrow",
  family: "dramatic",
  description: "Full-height reveal beside two stacked narrows.",
  slots: [
    { x: M, y: M, w: 0.6, h: 1 - 2 * M, shape: "rect" },
    { x: 0.65, y: M, w: 1 - M - 0.65, h: 0.46, shape: "rect" },
    { x: 0.65, y: 0.54, w: 1 - M - 0.65, h: 1 - M - 0.54, shape: "rect" },
  ],
  readingOrder: [1, 2, 0],
};

const centeredWide: LayoutTemplate = {
  id: "dramatic-centered",
  name: "Centered Panel",
  family: "dramatic",
  description: "A single centered panel with wide margins.",
  slots: [{ x: 0.16, y: 0.22, w: 0.68, h: 0.56, shape: "rect" }],
  readingOrder: [0],
};

const webtoonStack: LayoutTemplate = {
  id: "webtoon-stack",
  name: "Webtoon Stack",
  family: "webtoon",
  description: "Vertical infinite-scroll stack with generous gutters.",
  webtoon: true,
  slots: [
    { x: 0.04, y: 0.02, w: 0.92, h: 0.16, shape: "rect" },
    { x: 0.04, y: 0.22, w: 0.92, h: 0.2, shape: "rect" },
    { x: 0.04, y: 0.46, w: 0.92, h: 0.16, shape: "rect" },
    { x: 0.04, y: 0.66, w: 0.92, h: 0.14, shape: "rect" },
    { x: 0.04, y: 0.84, w: 0.92, h: 0.14, shape: "rect" },
  ],
  readingOrder: seq(5),
};

const tLayout: LayoutTemplate = {
  id: "mixed-t",
  name: "T-Layout",
  family: "mixed",
  description: "Wide top bar over three columns.",
  slots: [
    { x: M, y: M, w: 1 - 2 * M, h: 0.36, shape: "rect" },
    { x: M, y: 0.4, w: (1 - 2 * M - 2 * G) / 3, h: 1 - M - 0.4, shape: "rect" },
    { x: M + (1 - 2 * M - 2 * G) / 3 + G, y: 0.4, w: (1 - 2 * M - 2 * G) / 3, h: 1 - M - 0.4, shape: "rect" },
    { x: M + 2 * ((1 - 2 * M - 2 * G) / 3 + G), y: 0.4, w: (1 - 2 * M - 2 * G) / 3, h: 1 - M - 0.4, shape: "rect" },
  ],
  readingOrder: [0, 3, 2, 1],
};

const lLayout: LayoutTemplate = {
  id: "mixed-l",
  name: "L-Layout",
  family: "mixed",
  description: "Large hero panel wrapped by an L of smaller panels.",
  slots: [
    { x: M, y: M, w: 0.64, h: 0.64, shape: "rect" },
    { x: 0.69, y: M, w: 1 - M - 0.69, h: 0.31, shape: "rect" },
    { x: 0.69, y: 0.35, w: 1 - M - 0.69, h: 0.29, shape: "rect" },
    { x: M, y: 0.68, w: 1 - 2 * M, h: 1 - M - 0.68, shape: "rect" },
  ],
  readingOrder: [1, 2, 0, 3],
};

const staircase: LayoutTemplate = {
  id: "mixed-staircase",
  name: "Staircase",
  family: "mixed",
  description: "Descending stepped panels.",
  slots: [
    { x: M, y: M, w: 0.5, h: 0.3, shape: "rect" },
    { x: 0.34, y: 0.35, w: 0.5, h: 0.3, shape: "rect" },
    { x: 0.47, y: 0.69, w: 1 - M - 0.47, h: 1 - M - 0.69, shape: "rect" },
  ],
  readingOrder: [0, 1, 2],
};

const insetOverlap: LayoutTemplate = {
  id: "mixed-inset-overlap",
  name: "Inset Overlap",
  family: "mixed",
  description: "A small panel overlapping a large one.",
  slots: [
    { x: M, y: M, w: 1 - 2 * M, h: 1 - 2 * M, shape: "rect" },
    { x: 0.6, y: 0.58, w: 0.3, h: 0.34, shape: "circle" },
  ],
  readingOrder: [0, 1],
};

const heroTwo: LayoutTemplate = {
  id: "dramatic-hero-two",
  name: "Hero + Two Wide",
  family: "dramatic",
  description: "A tall hero shot over two wide panels.",
  slots: [
    { x: M, y: M, w: 1 - 2 * M, h: 0.52, shape: "rect" },
    { x: M, y: 0.56, w: (1 - 2 * M - G) / 2, h: 1 - M - 0.56, shape: "rect" },
    { x: M + (1 - 2 * M - G) / 2 + G, y: 0.56, w: (1 - 2 * M - G) / 2, h: 1 - M - 0.56, shape: "rect" },
  ],
  readingOrder: [0, 2, 1],
};

const webtoonWide: LayoutTemplate = {
  id: "webtoon-wide",
  name: "Webtoon Wide Beats",
  family: "webtoon",
  description: "Alternating wide beats for vertical scroll.",
  webtoon: true,
  slots: [
    { x: 0.04, y: 0.02, w: 0.92, h: 0.28, shape: "rect" },
    { x: 0.04, y: 0.34, w: 0.92, h: 0.3, shape: "rect" },
    { x: 0.04, y: 0.68, w: 0.92, h: 0.3, shape: "rect" },
  ],
  readingOrder: seq(3),
};

export const LAYOUT_TEMPLATES: LayoutTemplate[] = [
  grid2x2,
  grid2x3,
  grid3x3,
  strip4h,
  strip3v,
  yonkoma,
  splashFull,
  splash2Inset,
  diagonalSlash,
  explosive5,
  talkingHeads6,
  establishing4React,
  tallReveal,
  centeredWide,
  heroTwo,
  webtoonStack,
  webtoonWide,
  tLayout,
  lLayout,
  staircase,
  insetOverlap,
];

export function getLayout(id: string): LayoutTemplate {
  return LAYOUT_TEMPLATES.find((t) => t.id === id) ?? grid2x2;
}

export function layoutsForPageSize(pageSize: "b5" | "a4" | "webtoon"): LayoutTemplate[] {
  if (pageSize === "webtoon") {
    return LAYOUT_TEMPLATES.filter((t) => t.webtoon);
  }
  return LAYOUT_TEMPLATES.filter((t) => !t.webtoon);
}
