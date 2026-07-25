"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getProject } from "@/lib/client-api";
import { useEditorStore, undo, redo } from "@/store/editor";
import { useAutosave } from "@/hooks/use-autosave";
import { Toolbar } from "@/components/editor/toolbar";
import { LeftRail } from "@/components/editor/left-rail";
import { Inspector } from "@/components/editor/inspector";
import { Loader2 } from "lucide-react";

const EditorCanvas = dynamic(() => import("@/components/editor/canvas").then((m) => m.EditorCanvas), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center text-[var(--color-fg-dim)]">
      <Loader2 className="h-6 w-6 animate-spin" />
    </div>
  ),
});

export function EditorShell({ projectId }: { projectId: string }) {
  const router = useRouter();
  const load = useEditorStore((s) => s.load);
  const [showReadingOrder, setShowReadingOrder] = useState(false);
  useAutosave();

  const { data, isLoading, error } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => getProject(projectId),
  });

  useEffect(() => {
    if (data) load(data);
  }, [data, load]);

  // Global keyboard shortcuts.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const typing = !!target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      const store = useEditorStore.getState();
      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        store.duplicateSelected();
        return;
      }
      if (mod && e.key.toLowerCase() === "e") {
        e.preventDefault();
        router.push(`/project/${projectId}/export`);
        return;
      }
      if (typing) return;

      const pages = store.pages;
      const idx = pages.findIndex((p) => p.id === store.currentPageId);
      switch (e.key) {
        case "v":
        case "V":
          store.clearSelection();
          break;
        case "p":
        case "P":
          store.addPanel();
          break;
        case "b":
        case "B": {
          const pid = store.selection.type !== "none" ? store.selection.panelId : pages[idx]?.panels[0]?.id;
          if (pid) store.addBubble(pid, "speech");
          break;
        }
        case "s":
        case "S": {
          const pid = store.selection.type !== "none" ? store.selection.panelId : pages[idx]?.panels[0]?.id;
          if (pid) store.addSfx(pid);
          break;
        }
        case "Delete":
        case "Backspace":
          if (store.selection.type !== "none") {
            e.preventDefault();
            store.deleteSelected();
          }
          break;
        case "[":
          if (idx > 0) store.setPage(pages[idx - 1]!.id);
          break;
        case "]":
          if (idx < pages.length - 1) store.setPage(pages[idx + 1]!.id);
          break;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [projectId, router]);

  if (isLoading) {
    return <div className="grid min-h-screen place-items-center text-[var(--color-fg-dim)]"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }
  if (error || !data) {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="text-center">
          <p className="text-[var(--color-vermilion)]">Couldn&apos;t load this project.</p>
          <button onClick={() => router.push("/")} className="mt-2 text-sm underline">Back to dashboard</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      <Toolbar projectId={projectId} showReadingOrder={showReadingOrder} onToggleReadingOrder={() => setShowReadingOrder((v) => !v)} />
      <div className="grid min-h-0 flex-1 grid-cols-[220px_1fr_300px]">
        <aside className="min-h-0 border-r border-[var(--color-line)] bg-[var(--color-surround)]">
          <LeftRail />
        </aside>
        <section className="min-h-0">
          <EditorCanvas showReadingOrder={showReadingOrder} />
        </section>
        <aside className="min-h-0 border-l border-[var(--color-line)] bg-[var(--color-surround)]">
          <Inspector />
        </aside>
      </div>
    </div>
  );
}
