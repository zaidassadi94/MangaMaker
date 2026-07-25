import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { ensureSchema } from "@/lib/db/ensure";
import {
  createProject, createCharacterFromBible, getChapterByProject, persistScript,
  listCharacters, getProjectFull, updatePanel, updateCharacter,
} from "@/lib/db/queries";
import { mockBible, mockScript } from "@/lib/ai/mock-story";
import { renderPanel, renderCharacterSheet } from "@/lib/render";
import { renderMockPanelSvg } from "@/lib/providers/mock-svg";
import { composePageSvg, PAGE_PX } from "@/lib/compose-svg";
import { seedFromString } from "@/lib/ids";
import type { PageWithPanels } from "@/lib/types";

const PREMISE =
  "A retired swordsmith is pulled back into a war when a stranger arrives carrying the last blade they ever forged — and the mark of an enemy long thought dead.";
const GENRE = "shonen action";

async function main() {
  await ensureSchema();

  const bible = mockBible(PREMISE, GENRE);
  const { project, chapter } = await createProject({
    title: bible.title,
    synopsis: bible.synopsis,
    genre: bible.genre,
    styleId: "shonen-action",
    readingDirection: "rtl",
    pageSize: "b5",
  });

  const chars = [];
  for (const c of bible.characters) {
    const character = await createCharacterFromBible(project.id, c);
    const ref = await renderCharacterSheet(character, project);
    await updateCharacter(character.id, { refImageUrl: ref, sheetImageUrls: [ref] });
    chars.push({ ...character, refImageUrl: ref });
  }

  const ch = (await getChapterByProject(project.id)) ?? chapter;
  const script = mockScript(bible, 8, 0.55, "b5");
  await persistScript(project, ch, script, chars);

  // Render every panel with the mock provider (deterministic /api/mock-image urls).
  const full = await getProjectFull(project.id);
  if (!full) throw new Error("seed: failed to reload project");
  const allChars = await listCharacters(project.id);
  const pages = full.chapters.flatMap((c) => c.pages);
  for (const page of pages) {
    for (const panel of page.panels) {
      const r = await renderPanel(panel, project, allChars);
      await updatePanel(panel.id, { imageUrl: r.imageUrl, seed: r.seed, imagePrompt: r.prompt, status: "done", version: 1 });
    }
  }

  console.log(`✓ Seeded demo project "${project.title}" (${pages.length} pages, ${allChars.length} characters).`);

  // Write self-contained sample-chapter SVGs to /public/seed (mock placeholder
  // art inlined as data URIs — no server needed, small, provenance-clean).
  const seedDir = path.join(process.cwd(), "public", "seed");
  await mkdir(seedDir, { recursive: true });
  const reloaded = await getProjectFull(project.id);
  const seededPages = (reloaded?.chapters.flatMap((c) => c.pages) ?? []).slice(0, 8);

  const manifest: Array<{ file: string; index: number }> = [];
  for (let i = 0; i < seededPages.length; i++) {
    const page = inlinePlaceholders(seededPages[i]!);
    const svg = composePageSvg(page, { pageSize: "b5" }, { showBorders: true });
    const file = `page-${String(i + 1).padStart(2, "0")}.svg`;
    await writeFile(path.join(seedDir, file), svg, "utf8");
    manifest.push({ file, index: i });
  }

  await writeFile(
    path.join(seedDir, "chapter.json"),
    JSON.stringify({ title: bible.title, synopsis: bible.synopsis, genre: bible.genre, pageSize: "b5", readingDirection: "rtl", pages: manifest, provenance: "mock-provider SVG placeholder art" }, null, 2),
  );
  await writeFile(
    path.join(seedDir, "README.md"),
    `# Seed sample chapter\n\nThese pages are **mock-provider SVG placeholder art**, committed so the repo is\ndemoable with zero AI calls and unambiguous provenance. Regenerate with \`pnpm db:seed\`.\n`,
  );

  console.log(`✓ Wrote ${seededPages.length} sample pages to /public/seed`);
}

/** Replace panel imageUrls with inline mock-SVG data URIs so seed art is self-contained. */
function inlinePlaceholders(page: PageWithPanels): PageWithPanels {
  return {
    ...page,
    panels: page.panels.map((p) => {
      const svg = renderMockPanelSvg({
        seed: p.seed ?? seedFromString(p.id),
        aspectRatio: "3:4",
        shotType: p.shotType,
        cameraAngle: p.cameraAngle,
        characterNames: [],
      });
      return { ...p, imageUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` };
    }),
  };
}

// PAGE_PX referenced to keep the compose import tree obvious in tooling.
void PAGE_PX;

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
