import { ok, fail, fromError, readJson } from "@/lib/api";
import { getProjectFull, updateProject, deleteProject } from "@/lib/db/queries";
import { z } from "zod";
import { readingDirection, pageSize } from "@/lib/validation";

export const runtime = "nodejs";

const patchSchema = z.object({
  title: z.string().min(1).max(120).optional(),
  synopsis: z.string().max(4000).optional(),
  genre: z.string().max(60).optional(),
  readingDirection: readingDirection.optional(),
  pageSize: pageSize.optional(),
  coverUrl: z.string().nullable().optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx): Promise<Response> {
  try {
    const { id } = await params;
    const project = await getProjectFull(id);
    if (!project) return fail("Project not found", 404);
    return ok(project);
  } catch (err) {
    return fromError(err);
  }
}

export async function PATCH(req: Request, { params }: Ctx): Promise<Response> {
  try {
    const { id } = await params;
    const patch = patchSchema.parse(await readJson(req));
    await updateProject(id, patch);
    return ok({ ok: true });
  } catch (err) {
    return fromError(err);
  }
}

export async function DELETE(_req: Request, { params }: Ctx): Promise<Response> {
  try {
    const { id } = await params;
    await deleteProject(id);
    return ok({ ok: true });
  } catch (err) {
    return fromError(err);
  }
}
