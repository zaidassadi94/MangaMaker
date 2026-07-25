import JSZip from "jszip";
import { fail, fromError, readJson } from "@/lib/api";
import { exportSchema } from "@/lib/validation";
import { getProjectFull } from "@/lib/db/queries";
import { composePageSvg } from "@/lib/compose-svg";
import type { PageWithPanels } from "@/lib/types";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ projectId: string }> };

function pad(n: number): string {
  return String(n).padStart(3, "0");
}

// Server-side export: composes each page as a self-contained SVG and returns a
// ZIP page-set (vector, provenance-clean). The client exporter rasterises the
// same SVGs into PNG/PDF/CBZ/webtoon via canvas + jsPDF + jszip.
export async function POST(req: Request, { params }: Ctx): Promise<Response> {
  try {
    const { projectId } = await params;
    const input = exportSchema.parse(await readJson(req));
    const project = await getProjectFull(projectId);
    if (!project) return fail("Project not found", 404);

    const pages: PageWithPanels[] = project.chapters.flatMap((c) => c.pages);
    if (pages.length === 0) return fail("Nothing to export yet — generate a chapter first.", 400);

    const zip = new JSZip();
    pages.forEach((page, i) => {
      const svg = composePageSvg(page, project, { showBorders: true });
      zip.file(`${pad(i + 1)}.svg`, svg);
    });

    if (input.format === "cbz") {
      zip.file(
        "ComicInfo.xml",
        `<?xml version="1.0"?>\n<ComicInfo>\n  <Title>${escapeXml(project.title)}</Title>\n  <PageCount>${pages.length}</PageCount>\n  <Manga>${project.readingDirection === "rtl" ? "YesAndRightToLeft" : "Yes"}</Manga>\n</ComicInfo>`,
      );
    }
    zip.file(
      "manifest.json",
      JSON.stringify(
        { title: project.title, format: input.format, pageCount: pages.length, readingDirection: project.readingDirection, pageSize: project.pageSize, printReady: input.printReady },
        null,
        2,
      ),
    );

    const bytes = await zip.generateAsync({ type: "uint8array" });
    const safe = project.title.replace(/[^\w.-]+/g, "_").slice(0, 60) || "mangaforge";
    return new Response(bytes as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${safe}-${input.format}.zip"`,
      },
    });
  } catch (err) {
    return fromError(err);
  }
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
