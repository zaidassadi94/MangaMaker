"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { getProject } from "@/lib/client-api";
import { composePageSvg } from "@/lib/compose-svg";
import { Loader2 } from "lucide-react";
import type { PageWithPanels } from "@/lib/types";

function pageSrc(page: PageWithPanels, pageSize: "b5" | "a4" | "webtoon"): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(composePageSvg(page, { pageSize }, { showBorders: true }))}`;
}

export function Reader({ projectId }: { projectId: string }) {
  const { data, isLoading } = useQuery({ queryKey: ["project", projectId], queryFn: () => getProject(projectId) });
  const [index, setIndex] = useState(0);

  const pages = useMemo(() => (data ? data.chapters.flatMap((c) => c.pages).sort((a, b) => a.index - b.index) : []), [data]);
  const rtl = data?.readingDirection === "rtl";
  const webtoon = data?.pageSize === "webtoon";

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (webtoon) return;
      if (e.key === "ArrowLeft") setIndex((i) => (rtl ? Math.min(pages.length - 1, i + 1) : Math.max(0, i - 1)));
      if (e.key === "ArrowRight") setIndex((i) => (rtl ? Math.max(0, i - 1) : Math.min(pages.length - 1, i + 1)));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [rtl, webtoon, pages.length]);

  if (isLoading || !data) {
    return <div className="grid min-h-screen place-items-center bg-black text-white"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="fixed left-3 top-3 z-20 flex items-center gap-2">
        <Link href={`/project/${projectId}`} className="rounded-md bg-white/10 px-3 py-1.5 text-sm backdrop-blur hover:bg-white/20">
          <X className="mr-1 inline h-4 w-4" /> Close
        </Link>
        <span className="rounded-md bg-white/10 px-3 py-1.5 text-xs backdrop-blur">{data.title}</span>
      </div>

      {webtoon ? (
        <div className="mx-auto max-w-2xl py-10">
          {pages.map((p) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={p.id} src={pageSrc(p, "webtoon")} alt="" className="mb-4 w-full" />
          ))}
        </div>
      ) : (
        <div className="relative grid min-h-screen place-items-center">
          {pages[index] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={pageSrc(pages[index]!, data.pageSize)} alt={`Page ${index + 1}`} className="max-h-[92vh] w-auto shadow-2xl" />
          )}

          {/* Click zones */}
          <button
            onClick={() => setIndex((i) => (rtl ? Math.min(pages.length - 1, i + 1) : Math.max(0, i - 1)))}
            className="absolute left-0 top-0 flex h-full w-1/3 items-center justify-start pl-4 text-white/0 hover:text-white/60"
          >
            <ChevronLeft className="h-8 w-8" />
          </button>
          <button
            onClick={() => setIndex((i) => (rtl ? Math.max(0, i - 1) : Math.min(pages.length - 1, i + 1)))}
            className="absolute right-0 top-0 flex h-full w-1/3 items-center justify-end pr-4 text-white/0 hover:text-white/60"
          >
            <ChevronRight className="h-8 w-8" />
          </button>

          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-4 py-1.5 text-sm backdrop-blur">
            {index + 1} / {pages.length} {rtl && <span className="ml-2 text-xs text-white/50">right-to-left</span>}
          </div>
        </div>
      )}
    </div>
  );
}
