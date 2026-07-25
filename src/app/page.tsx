import Link from "next/link";
import { Plus, Sparkles } from "lucide-react";
import { listProjects } from "@/lib/db/queries";
import { providerName } from "@/lib/providers";
import { hasClaude } from "@/lib/ai/claude";
import { TopBar } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/primitives";
import { ProjectCard } from "@/components/dashboard/project-card";
import { StarterGallery } from "@/components/dashboard/starter-gallery";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const projects = await listProjects().catch(() => []);
  const provider = providerName();
  const claude = hasClaude();

  return (
    <div className="min-h-screen">
      <TopBar>
        <Badge>{provider === "mock" ? "mock provider" : `${provider} provider`}</Badge>
        <Badge>{claude ? "claude: on" : "claude: mock"}</Badge>
        <Button asChild size="sm">
          <Link href="/new">
            <Plus className="h-4 w-4" /> New Manga
          </Link>
        </Button>
      </TopBar>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <section className="mb-10">
          <div className="flex items-center gap-2 text-[var(--color-vermilion)]">
            <Sparkles className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-widest">Start from a genre</span>
          </div>
          <h2 className="mt-1 font-display text-2xl font-bold">Genre starters</h2>
          <p className="mb-4 text-sm text-[var(--color-fg-dim)]">One click gives you a pre-filled premise, style, and pacing. Tweak everything in the wizard.</p>
          <StarterGallery />
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-2xl font-bold">Your library</h2>
            <span className="text-sm text-[var(--color-fg-dim)]">{projects.length} project{projects.length === 1 ? "" : "s"}</span>
          </div>

          {projects.length === 0 ? (
            <div className="halftone relative overflow-hidden rounded-xl border border-dashed border-[var(--color-line)] p-16 text-center">
              <div className="relative mx-auto max-w-md">
                <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-lg bg-[var(--color-vermilion)] font-display text-3xl font-bold text-white">M</div>
                <h3 className="font-display text-xl font-bold">Forge your first chapter</h3>
                <p className="mt-2 text-sm text-[var(--color-fg-dim)]">
                  Type a story idea and MangaForge drafts characters, breaks it into pages and panels, and draws a full black-and-white chapter you can edit and export. Works instantly with the built-in mock artist — no API keys needed.
                </p>
                <Button asChild size="lg" className="mt-5">
                  <Link href="/new">
                    <Plus className="h-4 w-4" /> New Manga
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {projects.map((p) => (
                <ProjectCard key={p.id} project={p} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
