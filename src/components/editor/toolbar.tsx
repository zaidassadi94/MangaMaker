"use client";

import Link from "next/link";
import { Undo2, Redo2, SquarePlus, MessageSquarePlus, Zap, Grid3x3, Hash, BookOpen, Download, Check, Loader2, CloudOff } from "lucide-react";
import { useEditorStore, currentPage, undo, redo, useTemporal } from "@/store/editor";
import { Wordmark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/primitives";
import { layoutsForPageSize } from "@/lib/layouts";

export function Toolbar({ projectId, showReadingOrder, onToggleReadingOrder }: { projectId: string; showReadingOrder: boolean; onToggleReadingOrder: () => void }) {
  const meta = useEditorStore((s) => s.meta);
  const pages = useEditorStore((s) => s.pages);
  const currentPageId = useEditorStore((s) => s.currentPageId);
  const selection = useEditorStore((s) => s.selection);
  const addPanel = useEditorStore((s) => s.addPanel);
  const addBubble = useEditorStore((s) => s.addBubble);
  const addSfx = useEditorStore((s) => s.addSfx);
  const setLayout = useEditorStore((s) => s.setLayout);
  const saveState = useEditorStore((s) => s.saveState);

  const canUndo = useTemporal((s) => s.pastStates.length > 0);
  const canRedo = useTemporal((s) => s.futureStates.length > 0);

  const page = currentPage({ pages, currentPageId } as never);
  const activePanelId = selection.type === "none" ? page?.panels[0]?.id : selection.panelId;
  const layouts = layoutsForPageSize(meta?.pageSize ?? "b5");

  return (
    <header className="flex h-12 items-center gap-2 border-b border-[var(--color-line)] bg-[var(--color-surround)] px-3">
      <Wordmark />
      <div className="mx-1 h-5 w-px bg-[var(--color-line)]" />

      <Button size="icon" variant="ghost" onClick={undo} disabled={!canUndo} title="Undo (⌘Z)"><Undo2 className="h-4 w-4" /></Button>
      <Button size="icon" variant="ghost" onClick={redo} disabled={!canRedo} title="Redo (⌘⇧Z)"><Redo2 className="h-4 w-4" /></Button>
      <div className="mx-1 h-5 w-px bg-[var(--color-line)]" />

      <Button size="sm" variant="ghost" onClick={() => addPanel()} title="Add panel (P)"><SquarePlus className="h-4 w-4" /> Panel</Button>
      <Button size="sm" variant="ghost" onClick={() => activePanelId && addBubble(activePanelId, "speech")} disabled={!activePanelId} title="Add bubble (B)"><MessageSquarePlus className="h-4 w-4" /> Bubble</Button>
      <Button size="sm" variant="ghost" onClick={() => activePanelId && addSfx(activePanelId)} disabled={!activePanelId} title="Add SFX (S)"><Zap className="h-4 w-4" /> SFX</Button>

      <div className="mx-1 h-5 w-px bg-[var(--color-line)]" />
      <div className="flex items-center gap-1 text-xs text-[var(--color-fg-dim)]">
        <Grid3x3 className="h-4 w-4" />
        <Select
          value={page?.layoutTemplateId ?? ""}
          onChange={(e) => page && setLayout(page.id, e.target.value)}
          className="h-8 w-44"
        >
          {layouts.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </Select>
      </div>
      <Button size="icon" variant={showReadingOrder ? "secondary" : "ghost"} onClick={onToggleReadingOrder} title="Toggle reading order"><Hash className="h-4 w-4" /></Button>

      <div className="ml-auto flex items-center gap-2">
        <SaveIndicator state={saveState} />
        <Button asChild size="sm" variant="ghost"><Link href={`/project/${projectId}/read`}><BookOpen className="h-4 w-4" /> Read</Link></Button>
        <Button asChild size="sm"><Link href={`/project/${projectId}/export`}><Download className="h-4 w-4" /> Export</Link></Button>
      </div>
    </header>
  );
}

function SaveIndicator({ state }: { state: "idle" | "saving" | "saved" | "error" }) {
  if (state === "saving") return <span className="flex items-center gap-1 text-xs text-[var(--color-fg-dim)]"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…</span>;
  if (state === "error") return <span className="flex items-center gap-1 text-xs text-[var(--color-vermilion)]"><CloudOff className="h-3.5 w-3.5" /> Save failed</span>;
  if (state === "saved") return <span className="flex items-center gap-1 text-xs text-emerald-400"><Check className="h-3.5 w-3.5" /> Saved</span>;
  return <span className="text-xs text-[var(--color-fg-faint)]">Autosave on</span>;
}
