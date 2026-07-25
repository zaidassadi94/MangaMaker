"use client";

import { useEffect, useRef } from "react";
import { useEditorStore } from "@/store/editor";
import { savePage } from "@/lib/client-api";
import type { PageWithPanels } from "@/lib/types";

// Debounced autosave (800ms). Diffs each page against its last-saved snapshot
// and PATCHes only what changed — so undo/redo (which replaces state directly)
// is saved too. Surfaces a "Saved" indicator via the store's saveState.
export function useAutosave() {
  const snapshots = useRef<Map<string, string>>(new Map());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    const flush = async (pages: PageWithPanels[]) => {
      const changed = pages.filter((p) => {
        const ser = JSON.stringify({ panels: p.panels, layoutTemplateId: p.layoutTemplateId, backgroundColor: p.backgroundColor });
        return snapshots.current.get(p.id) !== ser;
      });
      if (changed.length === 0) return;
      useEditorStore.getState().setSaveState("saving");
      try {
        await Promise.all(
          changed.map((p) =>
            savePage(p.id, { panels: p.panels, layoutTemplateId: p.layoutTemplateId, backgroundColor: p.backgroundColor }).then(() => {
              snapshots.current.set(p.id, JSON.stringify({ panels: p.panels, layoutTemplateId: p.layoutTemplateId, backgroundColor: p.backgroundColor }));
            }),
          ),
        );
        useEditorStore.getState().setSaveState("saved");
      } catch {
        useEditorStore.getState().setSaveState("error");
      }
    };

    const unsub = useEditorStore.subscribe((state) => {
      // Seed snapshots on first population so we don't re-save freshly loaded data.
      if (!initialized.current && state.pages.length > 0) {
        initialized.current = true;
        for (const p of state.pages) {
          snapshots.current.set(p.id, JSON.stringify({ panels: p.panels, layoutTemplateId: p.layoutTemplateId, backgroundColor: p.backgroundColor }));
        }
        return;
      }
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => flush(useEditorStore.getState().pages), 800);
    });

    return () => {
      if (timer.current) clearTimeout(timer.current);
      unsub();
    };
  }, []);
}
