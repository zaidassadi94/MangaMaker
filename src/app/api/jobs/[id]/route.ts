import { ok, fail, fromError } from "@/lib/api";
import { getJob } from "@/lib/db/queries";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx): Promise<Response> {
  try {
    const { id } = await params;
    const job = await getJob(id);
    if (!job) return fail("Job not found", 404);
    return ok(job);
  } catch (err) {
    return fromError(err);
  }
}
