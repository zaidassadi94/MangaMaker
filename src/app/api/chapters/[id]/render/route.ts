import pLimit from "p-limit";
import { eq, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { ensureSchema } from "@/lib/db/ensure";
import { chapters, pages, panels as panelsTable } from "@/lib/db/schema";
import { getProject, listCharacters, updatePanel } from "@/lib/db/queries";
import { renderPanel } from "@/lib/render";
import { fail } from "@/lib/api";
import { rateLimit, GEN_RATE } from "@/lib/ratelimit";
import { ipHash, reservePanels } from "@/lib/request-ctx";
import type { Panel } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

type Ctx = { params: Promise<{ id: string }> };

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function POST(req: Request, { params }: Ctx): Promise<Response> {
  await ensureSchema();
  const { id: chapterId } = await params;
  const hash = ipHash(req);

  const rl = await rateLimit(`render:${hash}`, GEN_RATE);
  if (!rl.ok) return fail("Too many requests — slow down a moment.", 429);

  const chapter = await db.select().from(chapters).where(eq(chapters.id, chapterId)).get();
  if (!chapter) return fail("Chapter not found", 404);
  const project = await getProject(chapter.projectId);
  if (!project) return fail("Project not found", 404);
  const characters = await listCharacters(project.id);

  const pageRows = await db.select().from(pages).where(eq(pages.chapterId, chapterId)).orderBy(asc(pages.index)).all();
  const allPanels: Panel[] = [];
  for (const pg of pageRows) {
    const rows = await db.select().from(panelsTable).where(eq(panelsTable.pageId, pg.id)).orderBy(asc(panelsTable.index)).all();
    allPanels.push(...rows);
  }
  const pending = allPanels.filter((p) => !p.imageUrl || p.status === "empty" || p.status === "failed" || p.status === "queued");
  const total = pending.length;

  const reserve = await reservePanels(hash, total);
  if (!reserve.ok) {
    return fail(`Daily generation cap reached (${reserve.state.limit}). ${reserve.state.remaining} panels remaining today.`, 429, { quota: reserve.state });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let done = 0;
      const send = (event: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };
      send({ type: "start", total, quota: reserve.state });

      const limit = pLimit(3);
      await Promise.all(
        pending.map((panel) =>
          limit(async () => {
            await updatePanel(panel.id, { status: "rendering" });
            send({ type: "panel", panelId: panel.id, pageId: panel.pageId, status: "rendering" });
            let lastErr: unknown = null;
            for (let attempt = 0; attempt < 3; attempt++) {
              try {
                const result = await renderPanel(panel, project, characters);
                const patch = {
                  imageUrl: result.imageUrl,
                  seed: result.seed,
                  imagePrompt: result.prompt,
                  status: "done" as const,
                  version: panel.version + 1,
                };
                await updatePanel(panel.id, patch);
                done += 1;
                send({ type: "panel", panelId: panel.id, pageId: panel.pageId, status: "done", imageUrl: result.imageUrl, done, total });
                return;
              } catch (err) {
                lastErr = err;
                await sleep(400 * Math.pow(2, attempt));
              }
            }
            await updatePanel(panel.id, { status: "failed" });
            done += 1;
            send({ type: "panel", panelId: panel.id, pageId: panel.pageId, status: "failed", error: (lastErr as Error)?.message ?? "render failed", done, total });
          }),
        ),
      );

      send({ type: "done", total });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
