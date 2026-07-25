"use client";

import { useState } from "react";
import { RefreshCw, Grid2x2, Wand2, Paintbrush, History, Loader2, Trash2, Copy } from "lucide-react";
import { useEditorStore } from "@/store/editor";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Field, Label, Badge, Select, Separator } from "@/components/ui/primitives";
import { toast } from "@/lib/toast";
import { generatePanel, panelVariations, editPanelReq } from "@/lib/client-api";
import { InpaintModal } from "@/components/editor/inpaint-modal";
import type { Bubble, BubbleType, Panel, Sfx } from "@/lib/types";

const SHOTS = ["establishing", "wide", "medium", "closeup", "extreme-closeup", "over-shoulder", "pov", "insert"];
const ANGLES = ["eye", "low", "high", "dutch", "birdseye", "worms"];
const BUBBLE_TYPES: BubbleType[] = ["speech", "thought", "shout", "whisper", "narration", "offpanel", "aside"];
const SFX_STYLES = ["impact", "soft", "jagged", "motion"];

export function Inspector() {
  const selection = useEditorStore((s) => s.selection);
  const pages = useEditorStore((s) => s.pages);
  const characters = useEditorStore((s) => s.characters);

  const panel = findPanel(pages, selection.type === "none" ? null : selection.panelId);

  if (selection.type === "none" || !panel) {
    return (
      <div className="halftone-faint grid h-full place-items-center p-6 text-center text-sm text-[var(--color-fg-faint)]">
        <div>
          <p className="font-display text-base text-[var(--color-fg-dim)]">Nothing selected</p>
          <p className="mt-1 text-xs">Click a panel, bubble, or SFX to edit it.</p>
        </div>
      </div>
    );
  }

  if (selection.type === "bubble") {
    const bubble = panel.bubbles.find((b) => b.id === selection.id);
    if (bubble) return <BubbleInspector panel={panel} bubble={bubble} />;
  }
  if (selection.type === "sfx") {
    const sfx = panel.sfx.find((s) => s.id === selection.id);
    if (sfx) return <SfxInspector panel={panel} sfx={sfx} />;
  }
  return <PanelInspector panel={panel} characters={characters} />;
}

function PanelInspector({ panel, characters }: { panel: Panel; characters: { id: string; name: string }[] }) {
  const patchPanel = useEditorStore((s) => s.patchPanel);
  const restore = useEditorStore((s) => s.restorePanelVersion);
  const [busy, setBusy] = useState<"regen" | "vary" | "edit" | null>(null);
  const [variations, setVariations] = useState<Array<{ imageUrl: string; seed: number }>>([]);
  const [editText, setEditText] = useState("");
  const [showInpaint, setShowInpaint] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  function applyImage(imageUrl: string, extra: Partial<Panel> = {}) {
    patchPanel(panel.id, {
      history: panel.imageUrl && panel.imageUrl !== imageUrl ? [...panel.history.filter((h) => h !== imageUrl), panel.imageUrl] : panel.history,
      imageUrl,
      status: "done",
      version: panel.version + 1,
      ...extra,
    });
  }

  async function onRegen() {
    setBusy("regen");
    try {
      const { panel: updated, quota } = await generatePanel(panel.id, { promptOverride: panel.imagePrompt || undefined, seed: panel.seed ?? undefined });
      applyImage(updated.imageUrl!, { seed: updated.seed, imagePrompt: updated.imagePrompt });
      toast(`Regenerated · ${quota.remaining} left today`, "success");
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(null);
    }
  }

  async function onVary() {
    setBusy("vary");
    try {
      const { variations: v } = await panelVariations(panel.id, { count: 4, promptOverride: panel.imagePrompt || undefined });
      setVariations(v);
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(null);
    }
  }

  async function onEdit() {
    if (!editText.trim()) return;
    setBusy("edit");
    try {
      const { panel: updated } = await editPanelReq(panel.id, { instruction: editText });
      applyImage(updated.imageUrl!);
      setEditText("");
      toast("Edit applied", "success");
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(null);
    }
  }

  async function onInpaint(instruction: string, mask: string) {
    try {
      const { panel: updated } = await editPanelReq(panel.id, { instruction, maskImage: mask });
      applyImage(updated.imageUrl!);
      setShowInpaint(false);
      toast("Inpaint applied", "success");
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  const versions = [...panel.history, ...(panel.imageUrl ? [panel.imageUrl] : [])];

  return (
    <div className="flex h-full flex-col overflow-y-auto p-3 text-sm">
      <div className="mb-2 flex items-center justify-between">
        <Badge>panel · v{panel.version}</Badge>
        <span className="text-[11px] text-[var(--color-fg-faint)]">seed {panel.seed ?? "—"}</span>
      </div>

      <div className="mb-3 aspect-[3/4] overflow-hidden rounded border border-[var(--color-line)] bg-[var(--color-ink)]">
        {panel.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={panel.imageUrl} alt="panel" className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full place-items-center text-xs text-[var(--color-fg-faint)]">no render yet</div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <Button size="sm" variant="secondary" onClick={onRegen} disabled={busy !== null}>
          {busy === "regen" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Regenerate
        </Button>
        <Button size="sm" variant="secondary" onClick={onVary} disabled={busy !== null}>
          {busy === "vary" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Grid2x2 className="h-3.5 w-3.5" />} Variations
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setShowInpaint(true)} disabled={!panel.imageUrl}>
          <Paintbrush className="h-3.5 w-3.5" /> Inpaint
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setShowHistory((v) => !v)} disabled={versions.length === 0}>
          <History className="h-3.5 w-3.5" /> History
        </Button>
      </div>

      {variations.length > 0 && (
        <div className="mt-3">
          <Label>Pick a variation</Label>
          <div className="mt-1 grid grid-cols-2 gap-1.5">
            {variations.map((v, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={v.imageUrl}
                alt={`variation ${i + 1}`}
                onClick={() => { applyImage(v.imageUrl, { seed: v.seed }); setVariations([]); toast("Variation applied", "success"); }}
                className="aspect-[3/4] cursor-pointer rounded border border-[var(--color-line)] object-cover hover:border-[var(--color-vermilion)]"
              />
            ))}
          </div>
        </div>
      )}

      {showHistory && versions.length > 0 && (
        <div className="mt-3">
          <Label>Version history</Label>
          <div className="mt-1 flex gap-1.5 overflow-x-auto pb-1">
            {versions.map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={url} alt={`v${i}`} onClick={() => restore(panel.id, url)} className={`h-20 w-16 shrink-0 cursor-pointer rounded border object-cover ${url === panel.imageUrl ? "border-[var(--color-vermilion)]" : "border-[var(--color-line)] hover:border-[var(--color-fg-faint)]"}`} />
            ))}
          </div>
        </div>
      )}

      <Separator className="my-3" />

      <div className="space-y-3">
        <Field label="Description">
          <Textarea value={panel.description} onChange={(e) => patchPanel(panel.id, { description: e.target.value })} rows={2} />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Shot">
            <Select value={panel.shotType} onChange={(e) => patchPanel(panel.id, { shotType: e.target.value as Panel["shotType"] })}>
              {SHOTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </Field>
          <Field label="Angle">
            <Select value={panel.cameraAngle} onChange={(e) => patchPanel(panel.id, { cameraAngle: e.target.value as Panel["cameraAngle"] })}>
              {ANGLES.map((a) => <option key={a} value={a}>{a}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Emotion">
          <Input value={panel.emotion} onChange={(e) => patchPanel(panel.id, { emotion: e.target.value })} />
        </Field>
        <div>
          <Label>Characters</Label>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {characters.map((c) => {
              const on = panel.characterIds.includes(c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => patchPanel(panel.id, { characterIds: on ? panel.characterIds.filter((id) => id !== c.id) : [...panel.characterIds, c.id] })}
                  className={`rounded-full border px-2 py-0.5 text-xs ${on ? "border-[var(--color-vermilion)] text-[var(--color-fg)]" : "border-[var(--color-line)] text-[var(--color-fg-dim)]"}`}
                >
                  {c.name}
                </button>
              );
            })}
            {characters.length === 0 && <span className="text-xs text-[var(--color-fg-faint)]">No characters</span>}
          </div>
        </div>
        <Field label="Image prompt" hint="Editable. Never includes dialogue.">
          <Textarea value={panel.imagePrompt} onChange={(e) => patchPanel(panel.id, { imagePrompt: e.target.value })} rows={3} className="text-xs" />
        </Field>
        <Field label="Edit with instruction">
          <div className="flex gap-1.5">
            <Input value={editText} onChange={(e) => setEditText(e.target.value)} placeholder="make it raining" onKeyDown={(e) => e.key === "Enter" && onEdit()} />
            <Button size="icon" variant="secondary" onClick={onEdit} disabled={busy !== null || !editText.trim()}>
              {busy === "edit" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            </Button>
          </div>
        </Field>
      </div>

      {showInpaint && panel.imageUrl && <InpaintModal imageUrl={panel.imageUrl} onClose={() => setShowInpaint(false)} onSubmit={onInpaint} />}
    </div>
  );
}

function BubbleInspector({ panel, bubble }: { panel: Panel; bubble: Bubble }) {
  const patchBubble = useEditorStore((s) => s.patchBubble);
  const del = useEditorStore((s) => s.deleteSelected);
  const dup = useEditorStore((s) => s.duplicateSelected);
  const characters = useEditorStore((s) => s.characters);
  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto p-3 text-sm">
      <div className="flex items-center justify-between">
        <Badge>bubble</Badge>
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" onClick={dup}><Copy className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" onClick={del}><Trash2 className="h-4 w-4 text-[var(--color-vermilion)]" /></Button>
        </div>
      </div>
      <Field label="Type">
        <Select value={bubble.type} onChange={(e) => patchBubble(panel.id, bubble.id, { type: e.target.value as BubbleType })}>
          {BUBBLE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </Select>
      </Field>
      <Field label="Text">
        <Textarea value={bubble.text} onChange={(e) => patchBubble(panel.id, bubble.id, { text: e.target.value })} rows={3} />
      </Field>
      <Field label={`Font size — ${bubble.fontSize}px`}>
        <input type="range" min={10} max={40} value={bubble.fontSize} onChange={(e) => patchBubble(panel.id, bubble.id, { fontSize: Number(e.target.value) })} className="w-full" />
      </Field>
      <Field label="Speaker">
        <Select value={bubble.speakerId ?? ""} onChange={(e) => patchBubble(panel.id, bubble.id, { speakerId: e.target.value || null })}>
          <option value="">— none —</option>
          {characters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
      </Field>
      <label className="flex items-center gap-2 text-xs text-[var(--color-fg-dim)]">
        <input type="checkbox" checked={bubble.autoTail} onChange={(e) => patchBubble(panel.id, bubble.id, { autoTail: e.target.checked })} />
        Auto-point tail
      </label>
    </div>
  );
}

function SfxInspector({ panel, sfx }: { panel: Panel; sfx: Sfx }) {
  const patchSfx = useEditorStore((s) => s.patchSfx);
  const del = useEditorStore((s) => s.deleteSelected);
  const dup = useEditorStore((s) => s.duplicateSelected);
  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto p-3 text-sm">
      <div className="flex items-center justify-between">
        <Badge>SFX</Badge>
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" onClick={dup}><Copy className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" onClick={del}><Trash2 className="h-4 w-4 text-[var(--color-vermilion)]" /></Button>
        </div>
      </div>
      <Field label="Text">
        <Input value={sfx.text} onChange={(e) => patchSfx(panel.id, sfx.id, { text: e.target.value })} />
      </Field>
      <Field label="Style">
        <Select value={sfx.style} onChange={(e) => patchSfx(panel.id, sfx.id, { style: e.target.value as Sfx["style"] })}>
          {SFX_STYLES.map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
      </Field>
      <Field label={`Scale — ${sfx.scale.toFixed(1)}×`}>
        <input type="range" min={0.3} max={4} step={0.1} value={sfx.scale} onChange={(e) => patchSfx(panel.id, sfx.id, { scale: Number(e.target.value) })} className="w-full" />
      </Field>
      <Field label={`Rotation — ${Math.round(sfx.rotation)}°`}>
        <input type="range" min={-180} max={180} value={sfx.rotation} onChange={(e) => patchSfx(panel.id, sfx.id, { rotation: Number(e.target.value) })} className="w-full" />
      </Field>
    </div>
  );
}

function findPanel(pages: { panels: Panel[] }[], panelId: string | null): Panel | null {
  if (!panelId) return null;
  for (const page of pages) {
    const p = page.panels.find((x) => x.id === panelId);
    if (p) return p;
  }
  return null;
}
