"use client";

import { create } from "zustand";
import { temporal } from "zundo";
import { useStore } from "zustand";
import type { Bubble, BubbleType, Character, Panel, PageWithPanels, Project, ProjectFull, Sfx } from "@/lib/types";
import { newPanelId, newBubbleId, newSfxId, newPageId } from "@/lib/ids";
import { BUBBLE_DEFAULTS } from "@/lib/bubbles";
import { getLayout } from "@/lib/layouts";
import { reflowPanels } from "@/lib/layout-reflow";
import { clamp } from "@/lib/utils";

export type Selection =
  | { type: "none" }
  | { type: "panel"; panelId: string }
  | { type: "bubble"; panelId: string; id: string }
  | { type: "sfx"; panelId: string; id: string };

export type SaveState = "idle" | "saving" | "saved" | "error";

interface Meta {
  id: string;
  title: string;
  styleGuide: Project["styleGuide"];
  readingDirection: Project["readingDirection"];
  pageSize: Project["pageSize"];
}

export interface EditorState {
  meta: Meta | null;
  characters: Character[];
  pages: PageWithPanels[]; // tracked slice
  currentPageId: string | null;
  selection: Selection;
  saveState: SaveState;

  load: (project: ProjectFull) => void;
  setPage: (pageId: string) => void;
  select: (sel: Selection) => void;
  clearSelection: () => void;
  setSaveState: (s: SaveState) => void;

  patchPanel: (panelId: string, patch: Partial<Panel>) => void;
  patchBubble: (panelId: string, bubbleId: string, patch: Partial<Bubble>) => void;
  patchSfx: (panelId: string, sfxId: string, patch: Partial<Sfx>) => void;

  addBubble: (panelId: string, type: BubbleType) => void;
  addSfx: (panelId: string) => void;
  addPanel: (pageId?: string) => void;
  duplicateSelected: () => void;
  deleteSelected: () => void;

  setLayout: (pageId: string, templateId: string) => void;
  setCharacters: (chars: Character[]) => void;
  patchCharacter: (id: string, patch: Partial<Character>) => void;

  addPage: () => void;
  duplicatePage: (pageId: string) => void;
  deletePage: (pageId: string) => void;
  reorderPages: (from: number, to: number) => void;

  restorePanelVersion: (panelId: string, url: string) => void;
}

function mapPanels(pages: PageWithPanels[], panelId: string, fn: (p: Panel) => Panel): PageWithPanels[] {
  return pages.map((page) => ({
    ...page,
    panels: page.panels.map((p) => (p.id === panelId ? fn(p) : p)),
  }));
}

const useEditorStoreBase = create<EditorState>()(
  temporal(
    (set, get) => ({
      meta: null,
      characters: [],
      pages: [],
      currentPageId: null,
      selection: { type: "none" },
      saveState: "idle",

      load: (project) => {
        const pages = project.chapters.flatMap((c) => c.pages).sort((a, b) => a.index - b.index);
        set({
          meta: {
            id: project.id,
            title: project.title,
            styleGuide: project.styleGuide,
            readingDirection: project.readingDirection,
            pageSize: project.pageSize,
          },
          characters: project.characters,
          pages,
          currentPageId: pages[0]?.id ?? null,
          selection: { type: "none" },
        });
        useEditorStoreBase.temporal.getState().clear();
      },

      setPage: (pageId) => set({ currentPageId: pageId, selection: { type: "none" } }),
      select: (selection) => set({ selection }),
      clearSelection: () => set({ selection: { type: "none" } }),
      setSaveState: (saveState) => set({ saveState }),

      patchPanel: (panelId, patch) => set({ pages: mapPanels(get().pages, panelId, (p) => ({ ...p, ...patch })) }),

      patchBubble: (panelId, bubbleId, patch) =>
        set({
          pages: mapPanels(get().pages, panelId, (p) => ({
            ...p,
            bubbles: p.bubbles.map((b) => (b.id === bubbleId ? { ...b, ...patch } : b)),
          })),
        }),

      patchSfx: (panelId, sfxId, patch) =>
        set({
          pages: mapPanels(get().pages, panelId, (p) => ({
            ...p,
            sfx: p.sfx.map((s) => (s.id === sfxId ? { ...s, ...patch } : s)),
          })),
        }),

      addBubble: (panelId, type) => {
        const def = BUBBLE_DEFAULTS[type];
        const bubble: Bubble = {
          id: newBubbleId(),
          panelId,
          type,
          text: type === "narration" ? "Narration…" : type === "shout" ? "WHAT?!" : "New line…",
          x: 0.3,
          y: 0.15,
          w: 0.4,
          h: 0.22,
          tailX: 0.5,
          tailY: 0.55,
          fontSize: def.fontSize,
          fontFamily: def.fontFamily,
          rotation: 0,
          flipTail: false,
          speakerId: null,
          autoTail: true,
        };
        set({ pages: mapPanels(get().pages, panelId, (p) => ({ ...p, bubbles: [...p.bubbles, bubble] })) });
        set({ selection: { type: "bubble", panelId, id: bubble.id } });
      },

      addSfx: (panelId) => {
        const sfx: Sfx = {
          id: newSfxId(),
          panelId,
          text: "DOON",
          x: 0.5,
          y: 0.5,
          rotation: -8,
          scale: 1,
          style: "impact",
        };
        set({ pages: mapPanels(get().pages, panelId, (p) => ({ ...p, sfx: [...p.sfx, sfx] })) });
        set({ selection: { type: "sfx", panelId, id: sfx.id } });
      },

      addPanel: (pageId) => {
        const pid = pageId ?? get().currentPageId;
        if (!pid) return;
        set({
          pages: get().pages.map((page) => {
            if (page.id !== pid) return page;
            const panel: Panel = {
              id: newPanelId(),
              pageId: pid,
              index: page.panels.length,
              x: 0.3,
              y: 0.3,
              w: 0.4,
              h: 0.3,
              shape: "rect",
              borderWidth: 3,
              gutter: 0.012,
              description: "New panel",
              shotType: "medium",
              cameraAngle: "eye",
              emotion: "neutral",
              setting: "",
              characterIds: [],
              imagePrompt: "",
              imageUrl: null,
              seed: null,
              status: "empty",
              version: 0,
              history: [],
              bubbles: [],
              sfx: [],
            };
            return { ...page, panels: [...page.panels, panel] };
          }),
        });
      },

      duplicateSelected: () => {
        const { selection, pages } = get();
        if (selection.type === "panel") {
          set({
            pages: pages.map((page) => {
              const src = page.panels.find((p) => p.id === selection.panelId);
              if (!src) return page;
              const copy: Panel = {
                ...src,
                id: newPanelId(),
                index: page.panels.length,
                x: clamp(src.x + 0.03, 0, 1 - src.w),
                y: clamp(src.y + 0.03, 0, 1 - src.h),
                bubbles: src.bubbles.map((b) => ({ ...b, id: newBubbleId() })),
                sfx: src.sfx.map((s) => ({ ...s, id: newSfxId() })),
              };
              return { ...page, panels: [...page.panels, copy] };
            }),
          });
        } else if (selection.type === "bubble") {
          set({
            pages: mapPanels(pages, selection.panelId, (p) => {
              const src = p.bubbles.find((b) => b.id === selection.id);
              if (!src) return p;
              return { ...p, bubbles: [...p.bubbles, { ...src, id: newBubbleId(), x: src.x + 0.04, y: src.y + 0.04 }] };
            }),
          });
        } else if (selection.type === "sfx") {
          set({
            pages: mapPanels(pages, selection.panelId, (p) => {
              const src = p.sfx.find((s) => s.id === selection.id);
              if (!src) return p;
              return { ...p, sfx: [...p.sfx, { ...src, id: newSfxId(), x: src.x + 0.04, y: src.y + 0.04 }] };
            }),
          });
        }
      },

      deleteSelected: () => {
        const { selection, pages } = get();
        if (selection.type === "panel") {
          set({ pages: pages.map((page) => ({ ...page, panels: page.panels.filter((p) => p.id !== selection.panelId) })) });
        } else if (selection.type === "bubble") {
          set({ pages: mapPanels(pages, selection.panelId, (p) => ({ ...p, bubbles: p.bubbles.filter((b) => b.id !== selection.id) })) });
        } else if (selection.type === "sfx") {
          set({ pages: mapPanels(pages, selection.panelId, (p) => ({ ...p, sfx: p.sfx.filter((s) => s.id !== selection.id) })) });
        }
        set({ selection: { type: "none" } });
      },

      setLayout: (pageId, templateId) => {
        const meta = get().meta;
        const template = getLayout(templateId);
        set({
          pages: get().pages.map((page) => {
            if (page.id !== pageId) return page;
            const reflowed = reflowPanels(page.panels, template, meta?.readingDirection ?? "rtl", (slot, index): Panel => ({
              id: newPanelId(),
              pageId,
              index,
              x: slot.x,
              y: slot.y,
              w: slot.w,
              h: slot.h,
              shape: slot.shape,
              borderWidth: 3,
              gutter: 0.012,
              description: "New panel",
              shotType: "medium",
              cameraAngle: "eye",
              emotion: "neutral",
              setting: "",
              characterIds: [],
              imagePrompt: "",
              imageUrl: null,
              seed: null,
              status: "empty",
              version: 0,
              history: [],
              bubbles: [],
              sfx: [],
            }));
            return { ...page, layoutTemplateId: templateId, panels: reflowed };
          }),
        });
      },

      setCharacters: (characters) => set({ characters }),
      patchCharacter: (id, patch) => set({ characters: get().characters.map((c) => (c.id === id ? { ...c, ...patch } : c)) }),

      addPage: () => {
        const { pages, meta } = get();
        const chapterId = pages[0]?.chapterId;
        if (!chapterId) return;
        const page: PageWithPanels = {
          id: newPageId(),
          chapterId,
          index: pages.length,
          layoutTemplateId: meta?.pageSize === "webtoon" ? "webtoon-stack" : "grid-2x2",
          backgroundColor: "#ffffff",
          panels: [],
        };
        const withDefault = { ...page };
        set({ pages: [...pages, withDefault], currentPageId: page.id });
        get().setLayout(page.id, page.layoutTemplateId);
      },

      duplicatePage: (pageId) => {
        const { pages } = get();
        const src = pages.find((p) => p.id === pageId);
        if (!src) return;
        const newPid = newPageId();
        const copy: PageWithPanels = {
          ...src,
          id: newPid,
          index: pages.length,
          panels: src.panels.map((p) => ({
            ...p,
            id: newPanelId(),
            pageId: newPid,
            bubbles: p.bubbles.map((b) => ({ ...b, id: newBubbleId() })),
            sfx: p.sfx.map((s) => ({ ...s, id: newSfxId() })),
          })),
        };
        const idx = pages.findIndex((p) => p.id === pageId);
        const next = [...pages.slice(0, idx + 1), copy, ...pages.slice(idx + 1)].map((p, i) => ({ ...p, index: i }));
        set({ pages: next, currentPageId: newPid });
      },

      deletePage: (pageId) => {
        const { pages, currentPageId } = get();
        if (pages.length <= 1) return;
        const next = pages.filter((p) => p.id !== pageId).map((p, i) => ({ ...p, index: i }));
        const nextCurrent = currentPageId === pageId ? next[0]?.id ?? null : currentPageId;
        set({ pages: next, currentPageId: nextCurrent });
      },

      reorderPages: (from, to) => {
        const pages = [...get().pages];
        if (from < 0 || from >= pages.length || to < 0 || to >= pages.length) return;
        const [moved] = pages.splice(from, 1);
        if (!moved) return;
        pages.splice(to, 0, moved);
        set({ pages: pages.map((p, i) => ({ ...p, index: i })) });
      },

      restorePanelVersion: (panelId, url) =>
        set({
          pages: mapPanels(get().pages, panelId, (p) => ({
            ...p,
            history: p.imageUrl && p.imageUrl !== url ? [...p.history.filter((h) => h !== url), p.imageUrl] : p.history,
            imageUrl: url,
            status: "done",
          })),
        }),
    }),
    {
      limit: 120,
      partialize: (state) => ({ pages: state.pages }),
      equality: (a, b) => JSON.stringify(a.pages) === JSON.stringify(b.pages),
    },
  ),
);

export const useEditorStore = useEditorStoreBase;

export function useTemporal<T>(selector: (s: { pastStates: unknown[]; futureStates: unknown[]; undo: () => void; redo: () => void; clear: () => void }) => T): T {
  return useStore(useEditorStoreBase.temporal, selector);
}

export function undo() {
  useEditorStoreBase.temporal.getState().undo();
}
export function redo() {
  useEditorStoreBase.temporal.getState().redo();
}

export function currentPage(state: EditorState): PageWithPanels | null {
  return state.pages.find((p) => p.id === state.currentPageId) ?? null;
}
