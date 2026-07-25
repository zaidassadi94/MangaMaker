"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { FileImage, FileText, Archive, Scroll, Loader2, ArrowLeft, FileCode } from "lucide-react";
import { getProject } from "@/lib/client-api";
import { TopBar } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Card, Badge } from "@/components/ui/primitives";
import { toast } from "@/lib/toast";
import { exportPng, exportPdf, exportCbz, exportWebtoon } from "@/lib/export-client";
import type { PageWithPanels } from "@/lib/types";

type Fmt = "png" | "pdf" | "cbz" | "webtoon" | "svg";

export function ExportPanel({ projectId }: { projectId: string }) {
  const { data, isLoading } = useQuery({ queryKey: ["project", projectId], queryFn: () => getProject(projectId) });
  const [printReady, setPrintReady] = useState(false);
  const [busy, setBusy] = useState<Fmt | null>(null);

  const pages = useMemo<PageWithPanels[]>(() => (data ? data.chapters.flatMap((c) => c.pages).sort((a, b) => a.index - b.index) : []), [data]);

  async function run(fmt: Fmt) {
    if (!data) return;
    setBusy(fmt);
    try {
      const proj = { title: data.title, pageSize: data.pageSize, readingDirection: data.readingDirection };
      if (fmt === "png") await exportPng(pages, proj, printReady);
      else if (fmt === "pdf") await exportPdf(pages, proj, printReady);
      else if (fmt === "cbz") await exportCbz(pages, proj);
      else if (fmt === "webtoon") await exportWebtoon(pages, proj);
      else if (fmt === "svg") {
        const res = await fetch(`/api/export/${projectId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ format: "png", printReady }) });
        if (!res.ok) throw new Error("Server export failed");
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${data.title.replace(/[^\w.-]+/g, "_") || "mangaforge"}-svg.zip`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      }
      toast("Export ready", "success");
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(null);
    }
  }

  if (isLoading || !data) {
    return <div className="grid min-h-screen place-items-center text-[var(--color-fg-dim)]"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  const options: Array<{ fmt: Fmt; icon: React.ReactNode; title: string; desc: string }> = [
    { fmt: "png", icon: <FileImage className="h-5 w-5" />, title: "PNG (zip)", desc: "Every page as a PNG, zipped in reading order." },
    { fmt: "pdf", icon: <FileText className="h-5 w-5" />, title: "PDF", desc: "Print-ready PDF with correct page order & bleed." },
    { fmt: "cbz", icon: <Archive className="h-5 w-5" />, title: "CBZ", desc: "Comic archive with ComicInfo metadata + RTL flag." },
    { fmt: "webtoon", icon: <Scroll className="h-5 w-5" />, title: "Webtoon JPEG", desc: "One tall stitched long-strip image." },
    { fmt: "svg", icon: <FileCode className="h-5 w-5" />, title: "SVG page-set", desc: "Server-composed vector pages (zip). Infinite resolution." },
  ];

  return (
    <div className="min-h-screen">
      <TopBar>
        <Button asChild size="sm" variant="ghost"><Link href={`/project/${projectId}`}><ArrowLeft className="h-4 w-4" /> Editor</Link></Button>
      </TopBar>
      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-1 flex items-center gap-2">
          <h1 className="font-display text-2xl font-bold">Export</h1>
          <Badge>{pages.length} pages</Badge>
          <Badge>{data.pageSize}</Badge>
          <Badge>{data.readingDirection}</Badge>
        </div>
        <p className="mb-6 text-sm text-[var(--color-fg-dim)]">{data.title}</p>

        <label className="mb-5 flex w-fit items-center gap-2 rounded-md border border-[var(--color-line)] px-3 py-2 text-sm">
          <input type="checkbox" checked={printReady} onChange={(e) => setPrintReady(e.target.checked)} />
          Print-ready (300 DPI, B5 trim) — larger files
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          {options.map((o) => (
            <Card key={o.fmt} className="flex items-start gap-3 p-4">
              <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded bg-[var(--color-panel-2)] text-[var(--color-vermilion)]">{o.icon}</div>
              <div className="min-w-0 flex-1">
                <div className="font-display font-semibold">{o.title}</div>
                <p className="mt-0.5 text-xs text-[var(--color-fg-dim)]">{o.desc}</p>
                <Button size="sm" className="mt-2" onClick={() => run(o.fmt)} disabled={busy !== null || pages.length === 0}>
                  {busy === o.fmt ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Download
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
