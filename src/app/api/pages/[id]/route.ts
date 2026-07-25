import { ok, fromError, readJson } from "@/lib/api";
import { savePageSchema } from "@/lib/validation";
import { savePagePanels, updatePage } from "@/lib/db/queries";
import type { Panel } from "@/lib/types";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

// Autosave a page: bulk panel state + optional layout/background changes.
export async function PATCH(req: Request, { params }: Ctx): Promise<Response> {
  try {
    const { id } = await params;
    const body = savePageSchema.parse(await readJson(req));
    await savePagePanels(id, body.panels as Panel[]);
    if (body.layoutTemplateId || body.backgroundColor) {
      await updatePage(id, {
        ...(body.layoutTemplateId ? { layoutTemplateId: body.layoutTemplateId } : {}),
        ...(body.backgroundColor ? { backgroundColor: body.backgroundColor } : {}),
      });
    }
    return ok({ ok: true });
  } catch (err) {
    return fromError(err);
  }
}
