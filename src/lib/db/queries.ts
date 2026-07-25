import { eq, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { ensureSchema } from "@/lib/db/ensure";
import { projects, characters, chapters, pages, panels, jobs } from "@/lib/db/schema";
import {
  newProjectId, newCharacterId, newChapterId, newPageId, newPanelId,
  newBubbleId, newSfxId, newJobId, id as makeId, seedFromString,
} from "@/lib/ids";
import { getPreset, SHARED_NEGATIVE_PROMPT } from "@/lib/styles";
import { getLayout } from "@/lib/layouts";
import { getReadingOrder } from "@/lib/reading-order";
import { promptForPanel } from "@/lib/prompt";
import { BUBBLE_DEFAULTS } from "@/lib/bubbles";
import type {
  Project, ProjectFull, Character, Chapter, Page, Panel, Bubble, Sfx,
  StyleGuide, ReadingDirection, PageSize, PageWithPanels, Job, JobKind,
} from "@/lib/types";
import type { StoryBibleOutput, ScriptOutput } from "@/lib/validation";

async function ready() {
  await ensureSchema();
}

// ── Style guide ──────────────────────────────────────────────────────────────
export function buildStyleGuide(styleId: string, seed?: number): StyleGuide {
  const preset = getPreset(styleId);
  return {
    id: makeId("sty"),
    name: preset.name,
    presetId: preset.id,
    positivePrompt: preset.positiveCore,
    negativePrompt: SHARED_NEGATIVE_PROMPT,
    seed: seed ?? seedFromString(preset.id + Date.now()),
    lineWeight: preset.lineWeight,
    toneDensity: preset.toneDensity,
    inkContrast: preset.inkContrast,
  };
}

// ── Projects ─────────────────────────────────────────────────────────────────
export async function createProject(input: {
  title: string;
  synopsis?: string;
  genre?: string;
  styleId: string;
  readingDirection: ReadingDirection;
  pageSize: PageSize;
}): Promise<{ project: Project; chapter: Chapter }> {
  await ready();
  const now = Date.now();
  const style = buildStyleGuide(input.styleId);
  const project: Project = {
    id: newProjectId(),
    title: input.title,
    synopsis: input.synopsis ?? "",
    genre: input.genre ?? "",
    styleGuide: style,
    readingDirection: input.readingDirection,
    pageSize: input.pageSize,
    coverUrl: null,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(projects).values(project);

  const chapter: Chapter = {
    id: newChapterId(),
    projectId: project.id,
    number: 1,
    title: input.title,
    premise: input.synopsis ?? "",
    beats: [],
  };
  await db.insert(chapters).values(chapter);

  return { project, chapter };
}

export async function listProjects(): Promise<Project[]> {
  await ready();
  return db.select().from(projects).orderBy(asc(projects.createdAt)).all();
}

export async function getProject(projectId: string): Promise<Project | null> {
  await ready();
  const row = await db.select().from(projects).where(eq(projects.id, projectId)).get();
  return row ?? null;
}

export async function updateProject(projectId: string, patch: Partial<Project>): Promise<void> {
  await ready();
  await db.update(projects).set({ ...patch, updatedAt: Date.now() }).where(eq(projects.id, projectId));
}

export async function deleteProject(projectId: string): Promise<void> {
  await ready();
  await db.delete(projects).where(eq(projects.id, projectId));
}

// ── Characters ───────────────────────────────────────────────────────────────
export async function createCharacterFromBible(
  projectId: string,
  c: StoryBibleOutput["characters"][number],
): Promise<Character> {
  await ready();
  const character: Character = {
    id: newCharacterId(),
    projectId,
    name: c.name,
    role: c.role,
    appearanceDescription: c.appearanceDescription,
    personality: c.personality,
    sheetImageUrls: [],
    refImageUrl: null,
    seedToken: `${c.name.toLowerCase().replace(/\s+/g, "-")}-${makeId("t").slice(2, 8)}`,
    locked: false,
    createdAt: Date.now(),
  };
  await db.insert(characters).values(character);
  return character;
}

export async function listCharacters(projectId: string): Promise<Character[]> {
  await ready();
  return db.select().from(characters).where(eq(characters.projectId, projectId)).orderBy(asc(characters.createdAt)).all();
}

export async function getCharacter(characterId: string): Promise<Character | null> {
  await ready();
  const row = await db.select().from(characters).where(eq(characters.id, characterId)).get();
  return row ?? null;
}

export async function updateCharacter(characterId: string, patch: Partial<Character>): Promise<void> {
  await ready();
  await db.update(characters).set(patch).where(eq(characters.id, characterId));
}

// ── Chapters / Pages / Panels ────────────────────────────────────────────────
export async function getChapterByProject(projectId: string): Promise<Chapter | null> {
  await ready();
  const row = await db.select().from(chapters).where(eq(chapters.projectId, projectId)).get();
  return row ?? null;
}

export async function updateChapter(chapterId: string, patch: Partial<Chapter>): Promise<void> {
  await ready();
  await db.update(chapters).set(patch).where(eq(chapters.id, chapterId));
}

function bubbleFromScript(panelId: string, d: { type: Bubble["type"]; speaker?: string; text: string }, i: number, total: number): Bubble {
  const def = BUBBLE_DEFAULTS[d.type];
  const y = total <= 1 ? 0.12 : 0.1 + (i / total) * 0.6;
  return {
    id: newBubbleId(),
    panelId,
    type: d.type,
    text: d.text,
    x: i % 2 === 0 ? 0.28 : 0.66,
    y,
    w: 0.4,
    h: 0.22,
    tailX: 0.5,
    tailY: y + 0.28,
    fontSize: def.fontSize,
    fontFamily: def.fontFamily,
    rotation: 0,
    flipTail: false,
    speakerId: null,
    autoTail: true,
  };
}

function sfxFromScript(panelId: string, s: { text: string; style: Sfx["style"] }, i: number): Sfx {
  return {
    id: newSfxId(),
    panelId,
    text: s.text,
    x: 0.5 + (i % 2 === 0 ? -0.15 : 0.15),
    y: 0.4,
    rotation: (i % 2 === 0 ? -1 : 1) * (8 + i * 4),
    scale: 1,
    style: s.style,
  };
}

/** Turn a validated script into pages + laid-out panels for a project. */
export async function persistScript(
  project: Project,
  chapter: Chapter,
  script: ScriptOutput,
  chars: Character[],
): Promise<void> {
  await ready();
  const nameToId = new Map(chars.map((c) => [c.name.toLowerCase(), c.id]));

  // Clear any existing pages for a clean regenerate.
  const existing = await db.select().from(pages).where(eq(pages.chapterId, chapter.id)).all();
  for (const p of existing) await db.delete(pages).where(eq(pages.id, p.id));

  for (let pi = 0; pi < script.pages.length; pi++) {
    const sp = script.pages[pi]!;
    const layout = getLayout(sp.layoutTemplateId);
    const order = getReadingOrder(layout, project.readingDirection);
    const orderedSlots = order.map((i) => layout.slots[i]).filter(Boolean);

    const page: Page = {
      id: newPageId(),
      chapterId: chapter.id,
      index: pi,
      layoutTemplateId: layout.id,
      backgroundColor: "#ffffff",
    };
    await db.insert(pages).values(page);

    for (let idx = 0; idx < sp.panels.length; idx++) {
      const panelData = sp.panels[idx]!;
      const slot = orderedSlots[idx] ?? orderedSlots[orderedSlots.length - 1] ?? { x: 0.06, y: 0.06, w: 0.4, h: 0.4, shape: "rect" as const };
      const overflow = idx >= orderedSlots.length ? 0.03 * (idx - orderedSlots.length + 1) : 0;
      const characterIds = panelData.characterNames
        .map((n) => nameToId.get(n.toLowerCase()))
        .filter((v): v is string => Boolean(v));
      const involved = chars.filter((c) => characterIds.includes(c.id));

      const panelId = newPanelId();
      const imagePrompt = promptForPanel(
        {
          shotType: panelData.shotType,
          cameraAngle: panelData.cameraAngle,
          emotion: panelData.emotion,
          description: panelData.description,
          setting: panelData.setting,
        },
        project.styleGuide,
        involved,
      );

      const bubbles = panelData.dialogue.map((d, i) => bubbleFromScript(panelId, d, i, panelData.dialogue.length));
      const sfx = panelData.sfx.map((s, i) => sfxFromScript(panelId, s, i));

      const panel: Panel = {
        id: panelId,
        pageId: page.id,
        index: idx,
        x: slot.x + overflow,
        y: slot.y + overflow,
        w: slot.w,
        h: slot.h,
        shape: slot.shape,
        borderWidth: 3,
        gutter: 0.012,
        description: panelData.description,
        shotType: panelData.shotType,
        cameraAngle: panelData.cameraAngle,
        emotion: panelData.emotion,
        setting: panelData.setting,
        characterIds,
        imagePrompt,
        imageUrl: null,
        seed: seedFromString(project.styleGuide.seed + panelId),
        status: "empty",
        version: 0,
        history: [],
        bubbles,
        sfx,
      };
      await db.insert(panels).values(panel);
    }
  }
}

export async function getProjectFull(projectId: string): Promise<ProjectFull | null> {
  await ready();
  const project = await getProject(projectId);
  if (!project) return null;
  const chars = await listCharacters(projectId);
  const chapterRows = await db.select().from(chapters).where(eq(chapters.projectId, projectId)).orderBy(asc(chapters.number)).all();

  const chaptersWithPages = [];
  for (const ch of chapterRows) {
    const pageRows = await db.select().from(pages).where(eq(pages.chapterId, ch.id)).orderBy(asc(pages.index)).all();
    const pagesWithPanels: PageWithPanels[] = [];
    for (const pg of pageRows) {
      const panelRows = await db.select().from(panels).where(eq(panels.pageId, pg.id)).orderBy(asc(panels.index)).all();
      pagesWithPanels.push({ ...pg, panels: panelRows });
    }
    chaptersWithPages.push({ ...ch, pages: pagesWithPanels });
  }

  return { ...project, characters: chars, chapters: chaptersWithPages };
}

export async function getPanel(panelId: string): Promise<Panel | null> {
  await ready();
  const row = await db.select().from(panels).where(eq(panels.id, panelId)).get();
  return row ?? null;
}

export async function updatePanel(panelId: string, patch: Partial<Panel>): Promise<void> {
  await ready();
  await db.update(panels).set(patch).where(eq(panels.id, panelId));
}

export async function panelProject(panelId: string): Promise<{ panel: Panel; project: Project; characters: Character[] } | null> {
  await ready();
  const panel = await getPanel(panelId);
  if (!panel) return null;
  const page = await db.select().from(pages).where(eq(pages.id, panel.pageId)).get();
  if (!page) return null;
  const chapter = await db.select().from(chapters).where(eq(chapters.id, page.chapterId)).get();
  if (!chapter) return null;
  const project = await getProject(chapter.projectId);
  if (!project) return null;
  const characters = await listCharacters(project.id);
  return { panel, project, characters };
}

/** Bulk-save a page's panels (autosave from the editor). */
export async function savePagePanels(pageId: string, incoming: Panel[]): Promise<void> {
  await ready();
  const existing = await db.select().from(panels).where(eq(panels.pageId, pageId)).all();
  const existingIds = new Set(existing.map((p) => p.id));
  const incomingIds = new Set(incoming.map((p) => p.id));

  for (const p of incoming) {
    if (existingIds.has(p.id)) {
      await db.update(panels).set(p).where(eq(panels.id, p.id));
    } else {
      await db.insert(panels).values({ ...p, pageId });
    }
  }
  for (const p of existing) {
    if (!incomingIds.has(p.id)) await db.delete(panels).where(eq(panels.id, p.id));
  }
}

export async function updatePage(pageId: string, patch: Partial<Page>): Promise<void> {
  await ready();
  await db.update(pages).set(patch).where(eq(pages.id, pageId));
}

export async function chapterPageCount(chapterId: string): Promise<number> {
  await ready();
  const rows = await db.select().from(pages).where(eq(pages.chapterId, chapterId)).all();
  return rows.length;
}

// ── Jobs ─────────────────────────────────────────────────────────────────────
export async function createJob(projectId: string, kind: JobKind, payload: Record<string, unknown> = {}): Promise<Job> {
  await ready();
  const now = Date.now();
  const job: Job = { id: newJobId(), projectId, kind, status: "pending", progress: 0, payload, error: null, createdAt: now, updatedAt: now };
  await db.insert(jobs).values(job);
  return job;
}

export async function updateJob(jobId: string, patch: Partial<Job>): Promise<void> {
  await ready();
  await db.update(jobs).set({ ...patch, updatedAt: Date.now() }).where(eq(jobs.id, jobId));
}

export async function getJob(jobId: string): Promise<Job | null> {
  await ready();
  const row = await db.select().from(jobs).where(eq(jobs.id, jobId)).get();
  return row ?? null;
}
