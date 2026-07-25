"use client";

import { useMemo, useState } from "react";
import { Plus, Copy, Trash2, Lock, LockOpen, GripVertical } from "lucide-react";
import { useEditorStore } from "@/store/editor";
import { composePageSvg } from "@/lib/compose-svg";
import { Button } from "@/components/ui/button";
import { Label, Badge } from "@/components/ui/primitives";
import { updateCharacter } from "@/lib/client-api";
import { toast } from "@/lib/toast";
import type { PageWithPanels } from "@/lib/types";

function thumbUrl(page: PageWithPanels, pageSize: "b5" | "a4" | "webtoon"): string {
  const svg = composePageSvg(page, { pageSize }, { showBorders: true });
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function LeftRail() {
  const pages = useEditorStore((s) => s.pages);
  const currentPageId = useEditorStore((s) => s.currentPageId);
  const meta = useEditorStore((s) => s.meta);
  const setPage = useEditorStore((s) => s.setPage);
  const addPage = useEditorStore((s) => s.addPage);
  const duplicatePage = useEditorStore((s) => s.duplicatePage);
  const deletePage = useEditorStore((s) => s.deletePage);
  const reorderPages = useEditorStore((s) => s.reorderPages);
  const characters = useEditorStore((s) => s.characters);
  const patchCharacter = useEditorStore((s) => s.patchCharacter);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [tab, setTab] = useState<"pages" | "cast">("pages");

  const pageSize = meta?.pageSize ?? "b5";
  const thumbs = useMemo(() => pages.map((p) => thumbUrl(p, pageSize)), [pages, pageSize]);

  async function toggleLock(id: string, locked: boolean) {
    patchCharacter(id, { locked: !locked });
    try {
      await updateCharacter(id, { locked: !locked });
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex border-b border-[var(--color-line)] text-xs">
        <button onClick={() => setTab("pages")} className={`flex-1 py-2 ${tab === "pages" ? "border-b-2 border-[var(--color-vermilion)] text-[var(--color-fg)]" : "text-[var(--color-fg-dim)]"}`}>Pages</button>
        <button onClick={() => setTab("cast")} className={`flex-1 py-2 ${tab === "cast" ? "border-b-2 border-[var(--color-vermilion)] text-[var(--color-fg)]" : "text-[var(--color-fg-dim)]"}`}>Cast &amp; Style</button>
      </div>

      {tab === "pages" ? (
        <div className="flex-1 overflow-y-auto p-2">
          <div className="mb-2 flex items-center justify-between">
            <Label>{pages.length} pages</Label>
            <Button size="sm" variant="ghost" onClick={addPage}><Plus className="h-3.5 w-3.5" /> Add</Button>
          </div>
          <div className="space-y-2">
            {pages.map((p, i) => (
              <div
                key={p.id}
                draggable
                onDragStart={() => setDragIndex(i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => { if (dragIndex !== null) reorderPages(dragIndex, i); setDragIndex(null); }}
                onClick={() => setPage(p.id)}
                className={`group relative cursor-pointer rounded border ${p.id === currentPageId ? "border-[var(--color-vermilion)]" : "border-[var(--color-line)] hover:border-[var(--color-fg-faint)]"}`}
              >
                <div className="flex items-center gap-1 px-1.5 py-1 text-[10px] text-[var(--color-fg-dim)]">
                  <GripVertical className="h-3 w-3 opacity-40" />
                  <span>Page {i + 1}</span>
                  <div className="ml-auto flex opacity-0 transition-opacity group-hover:opacity-100">
                    <button onClick={(e) => { e.stopPropagation(); duplicatePage(p.id); }} className="p-0.5 hover:text-[var(--color-fg)]"><Copy className="h-3 w-3" /></button>
                    <button onClick={(e) => { e.stopPropagation(); deletePage(p.id); }} className="p-0.5 hover:text-[var(--color-vermilion)]"><Trash2 className="h-3 w-3" /></button>
                  </div>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={thumbs[i]} alt={`Page ${i + 1}`} className="w-full rounded-b bg-[var(--color-paper)]" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-2">
          <Label>Characters</Label>
          <div className="mt-1 space-y-1.5">
            {characters.map((c) => (
              <div key={c.id} className="flex items-center gap-2 rounded border border-[var(--color-line)] p-1.5">
                <div className="h-9 w-9 shrink-0 overflow-hidden rounded bg-[var(--color-ink)]">
                  {c.refImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.refImageUrl} alt={c.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full place-items-center text-[8px] text-[var(--color-fg-faint)]">no ref</div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-medium">{c.name}</div>
                  <div className="truncate text-[10px] text-[var(--color-fg-faint)]">{c.role}</div>
                </div>
                <button onClick={() => toggleLock(c.id, c.locked)} title={c.locked ? "Unlock" : "Lock"}>
                  {c.locked ? <Lock className="h-3.5 w-3.5 text-[var(--color-vermilion)]" /> : <LockOpen className="h-3.5 w-3.5 text-[var(--color-fg-faint)]" />}
                </button>
              </div>
            ))}
            {characters.length === 0 && <p className="text-xs text-[var(--color-fg-faint)]">No characters.</p>}
          </div>

          {meta && (
            <>
              <Label className="mt-4 block">Style guide</Label>
              <div className="mt-1 rounded border border-[var(--color-line)] p-2 text-xs">
                <div className="flex items-center justify-between">
                  <Badge>{meta.styleGuide.name}</Badge>
                  <span className="text-[10px] text-[var(--color-fg-faint)]">seed {meta.styleGuide.seed}</span>
                </div>
                <StyleSlider label="Line weight" value={meta.styleGuide.lineWeight} onChange={(v) => useEditorStore.setState({ meta: { ...meta, styleGuide: { ...meta.styleGuide, lineWeight: v } } })} />
                <StyleSlider label="Tone density" value={meta.styleGuide.toneDensity} onChange={(v) => useEditorStore.setState({ meta: { ...meta, styleGuide: { ...meta.styleGuide, toneDensity: v } } })} />
                <StyleSlider label="Ink contrast" value={meta.styleGuide.inkContrast} onChange={(v) => useEditorStore.setState({ meta: { ...meta, styleGuide: { ...meta.styleGuide, inkContrast: v } } })} />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function StyleSlider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="mt-2">
      <div className="flex justify-between text-[10px] text-[var(--color-fg-dim)]">
        <span>{label}</span>
        <span>{Math.round(value * 100)}%</span>
      </div>
      <input type="range" min={0} max={1} step={0.05} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full" />
    </div>
  );
}
