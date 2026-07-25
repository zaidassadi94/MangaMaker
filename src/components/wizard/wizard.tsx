"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Dice5, Loader2, Lock, RefreshCw, Wand2, ChevronRight, ChevronLeft, X } from "lucide-react";
import { STYLE_PRESETS } from "@/lib/styles";
import { STARTERS, getStarter } from "@/lib/starters";
import { Button } from "@/components/ui/button";
import { Textarea, Field, Badge, Select } from "@/components/ui/primitives";
import { TopBar } from "@/components/brand";
import { toast } from "@/lib/toast";
import {
  generateBible, createProject, commitBible, generateCharacterSheet,
  updateCharacter, generateScript, patchProject, getProject, streamSSE,
} from "@/lib/client-api";
import type { StoryBibleOutput } from "@/lib/validation";
import type { Character } from "@/lib/types";
import { formatElapsed } from "@/lib/utils";

const STEPS = ["Premise", "Style", "Characters", "Structure"] as const;
const GENRES = ["shonen action", "shojo romance", "seinen", "isekai fantasy", "comedy", "mystery thriller", "horror", "sports", "slice of life"];

interface PanelProgress {
  status: "rendering" | "done" | "failed";
  imageUrl?: string;
}

export function Wizard() {
  const router = useRouter();
  const params = useSearchParams();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);

  const [premise, setPremise] = useState("");
  const [genre, setGenre] = useState("");
  const [styleId, setStyleId] = useState("shonen-action");
  const [direction, setDirection] = useState<"rtl" | "ltr">("rtl");
  const [pageSize, setPageSize] = useState<"b5" | "a4" | "webtoon">("b5");
  const [pageCount, setPageCount] = useState(8);
  const [pacing, setPacing] = useState(0.5);

  const [projectId, setProjectId] = useState<string | null>(null);
  const [bible, setBible] = useState<StoryBibleOutput | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);

  const [rendering, setRendering] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number; panels: Record<string, PanelProgress> }>({ done: 0, total: 0, panels: {} });
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  // Prefill from ?starter=
  useEffect(() => {
    const sid = params.get("starter");
    const s = sid ? getStarter(sid) : undefined;
    if (s) {
      setPremise(s.premise);
      setGenre(s.genre);
      setStyleId(s.styleId);
      setPacing(s.pacing);
    }
  }, [params]);

  useEffect(() => {
    if (!rendering) return;
    const iv = setInterval(() => setElapsed(Date.now() - startRef.current), 250);
    return () => clearInterval(iv);
  }, [rendering]);

  function surprise() {
    const s = STARTERS[Math.floor(Math.random() * STARTERS.length)]!;
    setPremise(s.premise);
    setGenre(s.genre);
    setStyleId(s.styleId);
    setPacing(s.pacing);
    toast(`Loaded "${s.name}" starter`, "info");
  }

  async function draftStory() {
    if (premise.trim().length < 3) {
      toast("Write a premise first (a sentence or two).", "error");
      return;
    }
    setBusy(true);
    try {
      const { bible: b, source } = await generateBible({ premise, genre, styleId });
      const { id } = await createProject({ title: b.title, premise, genre: b.genre, styleId, readingDirection: direction, pageSize });
      const { characters: chars } = await commitBible(id, b);
      setBible(b);
      setProjectId(id);
      setCharacters(chars);
      setStep(2);
      toast(source === "claude" ? "Story drafted by Claude" : "Story drafted (mock)", "success");
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  async function onRegenSheet(id: string) {
    setCharacters((cs) => cs.map((c) => (c.id === id ? { ...c, refImageUrl: null } : c)));
    try {
      const { character } = await generateCharacterSheet(id);
      setCharacters((cs) => cs.map((c) => (c.id === id ? character : c)));
      toast(`Sheet generated for ${character.name}`, "success");
    } catch (err) {
      toast((err as Error).message, "error");
      setCharacters((cs) => cs); // no-op; keep state
    }
  }

  async function saveCharacter(id: string, patch: Partial<Character>) {
    setCharacters((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    try {
      await updateCharacter(id, patch as never);
    } catch {
      /* autosaved best-effort */
    }
  }

  async function generate() {
    if (!projectId) return;
    setBusy(true);
    try {
      await patchProject(projectId, { readingDirection: direction, pageSize });
      await generateScript({ projectId, pageCount, pacing });
      const project = await getProject(projectId);
      const chapterId = project.chapters[0]?.id;
      if (!chapterId) throw new Error("No chapter to render");

      setRendering(true);
      startRef.current = Date.now();
      abortRef.current = new AbortController();

      await streamSSE(`/api/chapters/${chapterId}/render`, {}, (evt) => {
        if (evt.type === "start") {
          setProgress({ done: 0, total: Number(evt.total) || 0, panels: {} });
        } else if (evt.type === "panel") {
          setProgress((p) => ({
            done: typeof evt.done === "number" ? evt.done : p.done,
            total: p.total,
            panels: { ...p.panels, [String(evt.panelId)]: { status: evt.status as PanelProgress["status"], imageUrl: evt.imageUrl as string | undefined } },
          }));
        } else if (evt.type === "done") {
          toast("Chapter rendered!", "success");
          router.push(`/project/${projectId}`);
        }
      });
    } catch (err) {
      toast((err as Error).message, "error");
      setBusy(false);
      setRendering(false);
    }
  }

  function cancelRender() {
    abortRef.current?.abort();
    if (projectId) router.push(`/project/${projectId}`);
  }

  const canNext = useMemo(() => {
    if (step === 0) return premise.trim().length > 2;
    return true;
  }, [step, premise]);

  if (rendering) {
    return <RenderConsole progress={progress} elapsed={elapsed} onCancel={cancelRender} />;
  }

  return (
    <div className="min-h-screen">
      <TopBar>
        <Button variant="ghost" size="sm" onClick={() => router.push("/")}>Cancel</Button>
      </TopBar>

      {/* Progress rail */}
      <div className="mx-auto max-w-3xl px-4 pt-8">
        <div className="flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex flex-1 items-center gap-2">
              <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${i <= step ? "border-[var(--color-vermilion)] bg-[var(--color-vermilion)] text-white" : "border-[var(--color-line)] text-[var(--color-fg-faint)]"}`}>
                {i + 1}
              </div>
              <span className={`hidden text-xs sm:block ${i === step ? "text-[var(--color-fg)]" : "text-[var(--color-fg-faint)]"}`}>{s}</span>
              {i < STEPS.length - 1 && <div className={`h-px flex-1 ${i < step ? "bg-[var(--color-vermilion)]" : "bg-[var(--color-line)]"}`} />}
            </div>
          ))}
        </div>
      </div>

      <main className="mx-auto max-w-3xl px-4 py-8">
        {step === 0 && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h1 className="font-display text-2xl font-bold">What&apos;s your story?</h1>
              <Button variant="outline" size="sm" onClick={surprise}><Dice5 className="h-4 w-4" /> Surprise me</Button>
            </div>
            <Field label="Premise / logline" hint="One or two sentences. The messier the idea, the more fun the draft.">
              <Textarea value={premise} onChange={(e) => setPremise(e.target.value)} rows={5} placeholder="A retired swordsmith is pulled back into a war when a stranger brings the last blade they ever forged…" />
            </Field>
            <Field label="Genre">
              <div className="flex flex-wrap gap-2">
                {GENRES.map((g) => (
                  <button key={g} onClick={() => setGenre(g)} className={`rounded-full border px-3 py-1 text-xs ${genre === g ? "border-[var(--color-vermilion)] text-[var(--color-fg)]" : "border-[var(--color-line)] text-[var(--color-fg-dim)] hover:border-[var(--color-fg-faint)]"}`}>{g}</button>
                ))}
              </div>
            </Field>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <h1 className="font-display text-2xl font-bold">Pick a look</h1>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {STYLE_PRESETS.map((p) => (
                <button key={p.id} onClick={() => setStyleId(p.id)} className={`overflow-hidden rounded-lg border text-left transition-colors ${styleId === p.id ? "border-[var(--color-vermilion)]" : "border-[var(--color-line)] hover:border-[var(--color-fg-faint)]"}`}>
                  <div className="aspect-[4/3] w-full" style={{ background: p.swatch }} />
                  <div className="p-3">
                    <div className="font-display text-sm font-semibold">{p.name}</div>
                    <div className="mt-0.5 text-[11px] text-[var(--color-fg-dim)]">{p.blurb}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h1 className="font-display text-2xl font-bold">Your cast</h1>
              {bible && <Badge>{bible.title}</Badge>}
            </div>
            {characters.length === 0 ? (
              <p className="text-sm text-[var(--color-fg-dim)]">Draft a story to generate characters.</p>
            ) : (
              <div className="space-y-3">
                {characters.map((c) => (
                  <CharacterEditor key={c.id} character={c} onRegen={() => onRegenSheet(c.id)} onSave={(patch) => saveCharacter(c.id, patch)} onLock={() => saveCharacter(c.id, { locked: !c.locked })} />
                ))}
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <h1 className="font-display text-2xl font-bold">Structure</h1>
            <Field label={`Chapter length — ${pageCount} pages`}>
              <input type="range" min={1} max={24} value={pageCount} onChange={(e) => setPageCount(Number(e.target.value))} className="w-full" />
            </Field>
            <Field label={`Pacing — ${pacing < 0.34 ? "talky / dense" : pacing > 0.66 ? "action / sparse" : "balanced"}`}>
              <input type="range" min={0} max={1} step={0.05} value={pacing} onChange={(e) => setPacing(Number(e.target.value))} className="w-full" />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Reading direction">
                <Select value={direction} onChange={(e) => setDirection(e.target.value as "rtl" | "ltr")}>
                  <option value="rtl">Right-to-left (manga)</option>
                  <option value="ltr">Left-to-right</option>
                </Select>
              </Field>
              <Field label="Page size">
                <Select value={pageSize} onChange={(e) => setPageSize(e.target.value as "b5" | "a4" | "webtoon")}>
                  <option value="b5">B5 (print)</option>
                  <option value="a4">A4 (print)</option>
                  <option value="webtoon">Webtoon (vertical)</option>
                </Select>
              </Field>
            </div>
          </div>
        )}

        {/* Nav */}
        <div className="mt-8 flex items-center justify-between">
          <Button variant="ghost" disabled={step === 0 || busy} onClick={() => setStep((s) => Math.max(0, s - 1))}>
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>
          {step < 1 ? (
            <Button disabled={!canNext || busy} onClick={() => setStep((s) => s + 1)}>Next <ChevronRight className="h-4 w-4" /></Button>
          ) : step === 1 ? (
            <Button disabled={busy} onClick={draftStory}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />} Draft story</Button>
          ) : step === 2 ? (
            <Button disabled={busy} onClick={() => setStep(3)}>Next <ChevronRight className="h-4 w-4" /></Button>
          ) : (
            <Button disabled={busy} onClick={generate}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />} Generate chapter</Button>
          )}
        </div>
      </main>
    </div>
  );
}

function CharacterEditor({ character, onRegen, onSave, onLock }: { character: Character; onRegen: () => void; onSave: (patch: Partial<Character>) => void; onLock: () => void }) {
  const [regen, setRegen] = useState(false);
  return (
    <div className="flex gap-3 rounded-lg border border-[var(--color-line)] bg-[var(--color-panel)] p-3">
      <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded bg-[var(--color-ink)]">
        {character.refImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={character.refImageUrl} alt={character.name} className="h-full w-full object-cover" />
        ) : (
          <div className="skeleton h-full w-full" />
        )}
      </div>
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <input value={character.name} onChange={(e) => onSave({ name: e.target.value })} className="w-40 rounded border border-transparent bg-transparent px-1 font-display text-base font-semibold text-[var(--color-fg)] hover:border-[var(--color-line)] focus-ring" />
          <Badge>{character.role}</Badge>
          <div className="ml-auto flex gap-1">
            <Button size="sm" variant="ghost" onClick={onLock} title={character.locked ? "Unlock" : "Lock design"}>
              <Lock className={`h-3.5 w-3.5 ${character.locked ? "text-[var(--color-vermilion)]" : ""}`} />
            </Button>
            <Button size="sm" variant="outline" disabled={regen || character.locked} onClick={async () => { setRegen(true); await onRegen(); setRegen(false); }}>
              {regen ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Sheet
            </Button>
          </div>
        </div>
        <textarea value={character.appearanceDescription} onChange={(e) => onSave({ appearanceDescription: e.target.value })} rows={2} className="w-full rounded border border-[var(--color-line)] bg-[var(--color-ink)] px-2 py-1 text-xs text-[var(--color-fg-dim)] focus-ring" />
      </div>
    </div>
  );
}

function RenderConsole({ progress, elapsed, onCancel }: { progress: { done: number; total: number; panels: Record<string, PanelProgress> }; elapsed: number; onCancel: () => void }) {
  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
  const entries = Object.entries(progress.panels);
  return (
    <div className="min-h-screen">
      <TopBar>
        <Badge>rendering</Badge>
        <Button variant="danger" size="sm" onClick={onCancel}><X className="h-4 w-4" /> Cancel</Button>
      </TopBar>
      <main className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="font-display text-2xl font-bold">Drawing your chapter…</h1>
        <div className="mt-2 flex items-center gap-4 text-sm text-[var(--color-fg-dim)]">
          <span>{progress.done}/{progress.total} panels</span>
          <span>{formatElapsed(elapsed)} elapsed</span>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[var(--color-panel)]">
          <div className="h-full bg-[var(--color-vermilion)] transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-5">
          {entries.map(([id, p]) => (
            <div key={id} className="relative aspect-[3/4] overflow-hidden rounded border border-[var(--color-line)] bg-[var(--color-ink)]">
              {p.status === "done" && p.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.imageUrl} alt="panel" className="h-full w-full object-cover" />
              ) : p.status === "failed" ? (
                <div className="grid h-full place-items-center text-[10px] text-[var(--color-vermilion)]">failed</div>
              ) : (
                <div className="skeleton h-full w-full" />
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
