import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// Zod schemas for every API boundary + the Claude structured outputs.
// ─────────────────────────────────────────────────────────────────────────────

export const readingDirection = z.enum(["rtl", "ltr"]);
export const pageSize = z.enum(["b5", "a4", "webtoon"]);
export const shotType = z.enum([
  "establishing", "wide", "medium", "closeup", "extreme-closeup",
  "over-shoulder", "pov", "insert",
]);
export const cameraAngle = z.enum(["eye", "low", "high", "dutch", "birdseye", "worms"]);
export const bubbleType = z.enum([
  "speech", "thought", "shout", "whisper", "narration", "offpanel", "aside",
]);
export const sfxStyle = z.enum(["impact", "soft", "jagged", "motion"]);
export const characterRole = z.enum([
  "protagonist", "deuteragonist", "antagonist", "rival", "mentor",
  "support", "comic-relief", "love-interest",
]);

// ── Story bible (Claude structured output) ──────────────────────────────────
export const beatSchema = z.object({
  act: z.number().int().min(1).max(4),
  title: z.string().min(1),
  summary: z.string().min(1),
});

export const bibleCharacterSchema = z.object({
  name: z.string().min(1).max(60),
  role: characterRole.catch("support"),
  appearanceDescription: z.string().min(1),
  personality: z.string().min(1),
});

export const storyBibleSchema = z.object({
  title: z.string().min(1),
  synopsis: z.string().min(1),
  tone: z.string().min(1),
  setting: z.string().min(1),
  genre: z.string().min(1),
  characters: z.array(bibleCharacterSchema).min(3).max(6),
  beats: z.array(beatSchema).min(4).max(8),
});

// ── Script (Claude structured output) ───────────────────────────────────────
export const scriptDialogueSchema = z.object({
  type: bubbleType.catch("speech"),
  speaker: z.string().optional(),
  text: z.string().min(1),
});

export const scriptSfxSchema = z.object({
  text: z.string().min(1).max(24),
  style: sfxStyle.catch("impact"),
});

export const scriptPanelSchema = z.object({
  description: z.string().min(1),
  shotType: shotType.catch("medium"),
  cameraAngle: cameraAngle.catch("eye"),
  emotion: z.string().default("neutral"),
  setting: z.string().default(""),
  characterNames: z.array(z.string()).default([]),
  dialogue: z.array(scriptDialogueSchema).default([]),
  sfx: z.array(scriptSfxSchema).default([]),
});

export const scriptPageSchema = z.object({
  layoutTemplateId: z.string().min(1),
  panels: z.array(scriptPanelSchema).min(3).max(7),
});

export const scriptSchema = z.object({
  pages: z.array(scriptPageSchema).min(1),
});

// ── Request bodies ───────────────────────────────────────────────────────────
export const createProjectSchema = z.object({
  title: z.string().min(1).max(120).default("Untitled Manga"),
  premise: z.string().max(4000).default(""),
  genre: z.string().max(60).default(""),
  styleId: z.string().default("shonen-action"),
  readingDirection: readingDirection.default("rtl"),
  pageSize: pageSize.default("b5"),
});

export const bibleRequestSchema = z.object({
  premise: z.string().min(3).max(4000),
  genre: z.string().max(60).default(""),
  styleId: z.string().default("shonen-action"),
});

export const scriptRequestSchema = z.object({
  projectId: z.string(),
  bible: storyBibleSchema,
  pageCount: z.number().int().min(1).max(48).default(8),
  pacing: z.number().min(0).max(1).default(0.5),
  readingDirection: readingDirection.default("rtl"),
  styleId: z.string().default("shonen-action"),
});

export const generatePanelSchema = z.object({
  promptOverride: z.string().max(2000).optional(),
  seed: z.number().int().optional(),
});

export const variationsSchema = z.object({
  count: z.number().int().min(1).max(4).default(4),
  promptOverride: z.string().max(2000).optional(),
});

export const editPanelSchema = z.object({
  instruction: z.string().min(1).max(600),
  maskImage: z.string().optional(),
});

export const characterSheetSchema = z.object({
  projectId: z.string(),
});

export const exportSchema = z.object({
  format: z.enum(["png", "pdf", "cbz", "webtoon"]),
  printReady: z.boolean().default(false),
});

// ── Editor autosave (full panel state) ──────────────────────────────────────
export const panelShape = z.enum(["rect", "skew", "circle", "burst", "bleed"]);

export const bubbleSchema = z.object({
  id: z.string(),
  panelId: z.string(),
  type: bubbleType,
  text: z.string(),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  tailX: z.number(),
  tailY: z.number(),
  fontSize: z.number(),
  fontFamily: z.string(),
  rotation: z.number(),
  flipTail: z.boolean(),
  speakerId: z.string().nullable(),
  autoTail: z.boolean(),
});

export const sfxSchema = z.object({
  id: z.string(),
  panelId: z.string(),
  text: z.string(),
  x: z.number(),
  y: z.number(),
  rotation: z.number(),
  scale: z.number(),
  style: sfxStyle,
});

export const panelSchema = z.object({
  id: z.string(),
  pageId: z.string(),
  index: z.number().int(),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  shape: panelShape,
  borderWidth: z.number(),
  gutter: z.number(),
  description: z.string(),
  shotType,
  cameraAngle,
  emotion: z.string(),
  setting: z.string(),
  characterIds: z.array(z.string()),
  imagePrompt: z.string(),
  imageUrl: z.string().nullable(),
  seed: z.number().nullable(),
  status: z.enum(["empty", "queued", "rendering", "done", "failed"]),
  version: z.number().int(),
  history: z.array(z.string()),
  bubbles: z.array(bubbleSchema),
  sfx: z.array(sfxSchema),
});

export const savePageSchema = z.object({
  panels: z.array(panelSchema),
  layoutTemplateId: z.string().optional(),
  backgroundColor: z.string().optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type BibleRequest = z.infer<typeof bibleRequestSchema>;
export type ScriptRequest = z.infer<typeof scriptRequestSchema>;
export type ScriptOutput = z.infer<typeof scriptSchema>;
export type StoryBibleOutput = z.infer<typeof storyBibleSchema>;
