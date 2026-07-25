import { ok, fromError, readJson } from "@/lib/api";
import { createProjectSchema } from "@/lib/validation";
import { assertPromptAllowed } from "@/lib/guardrails";
import { createProject, listProjects } from "@/lib/db/queries";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  try {
    return ok(await listProjects());
  } catch (err) {
    return fromError(err);
  }
}

export async function POST(req: Request): Promise<Response> {
  try {
    const input = createProjectSchema.parse(await readJson(req));
    if (input.premise) assertPromptAllowed(input.premise);
    if (input.title) assertPromptAllowed(input.title);
    const { project } = await createProject({
      title: input.title,
      synopsis: input.premise,
      genre: input.genre,
      styleId: input.styleId,
      readingDirection: input.readingDirection,
      pageSize: input.pageSize,
    });
    return ok({ id: project.id, project }, { status: 201 });
  } catch (err) {
    return fromError(err);
  }
}
