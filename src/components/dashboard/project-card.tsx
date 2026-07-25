"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, BookOpen, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { deleteProject } from "@/lib/client-api";
import { toast } from "@/lib/toast";
import type { Project } from "@/lib/types";

export function ProjectCard({ project }: { project: Project }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const cover =
    project.coverUrl ??
    `/api/mock-image?seed=${project.styleGuide.seed}&ar=3:4&shot=establishing&chars=${encodeURIComponent(project.title)}`;

  async function onDelete(e: React.MouseEvent) {
    e.preventDefault();
    if (!confirm(`Delete "${project.title}"? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await deleteProject(project.id);
      toast("Project deleted", "success");
      router.refresh();
    } catch (err) {
      toast((err as Error).message, "error");
      setBusy(false);
    }
  }

  return (
    <div className="group relative overflow-hidden rounded-lg border border-[var(--color-line)] bg-[var(--color-panel)] transition-colors hover:border-[var(--color-fg-faint)]">
      <Link href={`/project/${project.id}`} className="block">
        <div className="relative aspect-[3/4] overflow-hidden bg-[var(--color-ink)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cover} alt={project.title} className="h-full w-full object-cover opacity-95 transition-transform duration-300 group-hover:scale-[1.03]" />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3">
            <h3 className="line-clamp-1 font-display text-base font-semibold text-white">{project.title}</h3>
            <div className="mt-1 flex items-center gap-1.5">
              <Badge>{project.styleGuide.name}</Badge>
              {project.genre && <Badge>{project.genre}</Badge>}
            </div>
          </div>
        </div>
      </Link>
      <div className="flex items-center justify-between gap-1 p-2">
        <div className="flex gap-1">
          <Button asChild size="sm" variant="ghost">
            <Link href={`/project/${project.id}`}>
              <Pencil className="h-3.5 w-3.5" /> Edit
            </Link>
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link href={`/project/${project.id}/read`}>
              <BookOpen className="h-3.5 w-3.5" /> Read
            </Link>
          </Button>
        </div>
        <Button size="icon" variant="ghost" onClick={onDelete} disabled={busy} aria-label="Delete project">
          <Trash2 className="h-4 w-4 text-[var(--color-fg-faint)] hover:text-[var(--color-vermilion)]" />
        </Button>
      </div>
    </div>
  );
}
