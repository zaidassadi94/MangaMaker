// ─────────────────────────────────────────────────────────────────────────────
// MangaForge domain types. Single source of truth for the shape of the data that
// flows between the DB, the API boundary (Zod-validated), and the client store.
// ─────────────────────────────────────────────────────────────────────────────

export type ReadingDirection = "rtl" | "ltr";
export type PageSize = "b5" | "a4" | "webtoon";
export type Medium = "manga" | "comic";

export type PanelShape = "rect" | "skew" | "circle" | "burst" | "bleed";

export type ShotType =
  | "establishing"
  | "wide"
  | "medium"
  | "closeup"
  | "extreme-closeup"
  | "over-shoulder"
  | "pov"
  | "insert";

export type CameraAngle = "eye" | "low" | "high" | "dutch" | "birdseye" | "worms";

export type PanelStatus = "empty" | "queued" | "rendering" | "done" | "failed";

export type BubbleType =
  | "speech"
  | "thought"
  | "shout"
  | "whisper"
  | "narration"
  | "offpanel"
  | "aside";

export type SfxStyle = "impact" | "soft" | "jagged" | "motion";

export type CharacterRole =
  | "protagonist"
  | "deuteragonist"
  | "antagonist"
  | "rival"
  | "mentor"
  | "support"
  | "comic-relief"
  | "love-interest";

export type JobKind =
  | "bible"
  | "script"
  | "character-sheet"
  | "panel"
  | "chapter-render"
  | "export";

export type JobStatus = "pending" | "running" | "done" | "failed" | "cancelled";

export type ExportFormat = "png" | "pdf" | "cbz" | "webtoon";

// ── Style DNA ────────────────────────────────────────────────────────────────
export interface StyleGuide {
  id: string;
  name: string;
  presetId: string;
  positivePrompt: string;
  negativePrompt: string;
  seed: number;
  lineWeight: number; // 0..1
  toneDensity: number; // 0..1
  inkContrast: number; // 0..1
  // Medium fields are optional so pre-existing projects keep working (default = manga).
  medium?: Medium;
  styleSuffix?: string; // appended to every panel prompt for this project
  mono?: boolean; // black-and-white (manga) vs colour (comic)
}

// ── Characters ───────────────────────────────────────────────────────────────
export interface Character {
  id: string;
  projectId: string;
  name: string;
  role: CharacterRole;
  appearanceDescription: string;
  personality: string;
  sheetImageUrls: string[]; // 3-view + expression sheet frames
  refImageUrl: string | null; // canonical reference passed to the image model
  seedToken: string; // stable token injected into every prompt for consistency
  locked: boolean;
  createdAt: number;
}

// ── Story structure ──────────────────────────────────────────────────────────
export interface Beat {
  act: number;
  title: string;
  summary: string;
}

export interface StoryBible {
  title: string;
  synopsis: string;
  tone: string;
  setting: string;
  genre: string;
  characters: Array<{
    name: string;
    role: CharacterRole;
    appearanceDescription: string;
    personality: string;
  }>;
  beats: Beat[];
}

export interface Chapter {
  id: string;
  projectId: string;
  number: number;
  title: string;
  premise: string;
  beats: Beat[];
}

// ── Page & panels ────────────────────────────────────────────────────────────
export interface Page {
  id: string;
  chapterId: string;
  index: number;
  layoutTemplateId: string;
  backgroundColor: string;
}

export interface Bubble {
  id: string;
  panelId: string;
  type: BubbleType;
  text: string;
  x: number; // 0..1 relative to panel
  y: number;
  w: number;
  h: number;
  tailX: number; // 0..1 relative to panel; tail tip
  tailY: number;
  fontSize: number;
  fontFamily: string;
  rotation: number;
  flipTail: boolean;
  speakerId: string | null;
  autoTail: boolean;
}

export interface Sfx {
  id: string;
  panelId: string;
  text: string;
  x: number; // 0..1 relative to panel
  y: number;
  rotation: number;
  scale: number;
  style: SfxStyle;
}

export interface Panel {
  id: string;
  pageId: string;
  index: number;
  x: number; // 0..1 of page
  y: number;
  w: number;
  h: number;
  shape: PanelShape;
  borderWidth: number;
  gutter: number;
  description: string;
  shotType: ShotType;
  cameraAngle: CameraAngle;
  emotion: string;
  setting: string;
  characterIds: string[];
  imagePrompt: string;
  imageUrl: string | null;
  seed: number | null;
  status: PanelStatus;
  version: number;
  history: string[]; // prior imageUrls, newest last
  bubbles: Bubble[];
  sfx: Sfx[];
}

export interface Project {
  id: string;
  title: string;
  synopsis: string;
  genre: string;
  styleGuide: StyleGuide;
  readingDirection: ReadingDirection;
  pageSize: PageSize;
  coverUrl: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface Asset {
  id: string;
  projectId: string;
  kind: string;
  url: string;
  meta: Record<string, unknown>;
}

export interface Job {
  id: string;
  projectId: string;
  kind: JobKind;
  status: JobStatus;
  progress: number; // 0..1
  payload: Record<string, unknown>;
  error: string | null;
  createdAt: number;
  updatedAt: number;
}

// ── Composite views returned to the client ──────────────────────────────────
export interface PageWithPanels extends Page {
  panels: Panel[];
}

export interface ChapterWithPages extends Chapter {
  pages: PageWithPanels[];
}

export interface ProjectFull extends Project {
  characters: Character[];
  chapters: ChapterWithPages[];
}
