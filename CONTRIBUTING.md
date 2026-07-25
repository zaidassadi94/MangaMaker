# Contributing to MangaForge

Thanks for helping! The three things people most often want to extend are
**layout templates**, **style presets**, and **image providers** — each is a
small, self-contained change. Worked examples below.

## Setup

```bash
pnpm install
pnpm dev          # runs with the mock provider, no keys needed
pnpm typecheck && pnpm lint && pnpm test
```

Before opening a PR, make sure `pnpm typecheck`, `pnpm lint`, `pnpm test`, and
`pnpm build` all pass, and that your change still works with `IMAGE_PROVIDER=mock`.

---

## 1. Add a layout template

Templates are **pure data** in `src/lib/layouts.ts`. Panels are `{x, y, w, h,
shape}` in `0..1` page coordinates, plus a `readingOrder` (indices into `slots`)
in right-to-left manga order.

```ts
// src/lib/layouts.ts
const heroSplit: LayoutTemplate = {
  id: "mixed-hero-split",           // must be unique
  name: "Hero Split",
  family: "mixed",                  // grid | yonkoma | action | dialogue | dramatic | webtoon | mixed
  description: "A tall hero beside a stack of three.",
  slots: [
    { x: 0.03, y: 0.03, w: 0.5, h: 0.94, shape: "rect" },   // 0: hero
    { x: 0.56, y: 0.03, w: 0.41, h: 0.3, shape: "rect" },   // 1
    { x: 0.56, y: 0.35, w: 0.41, h: 0.3, shape: "rect" },   // 2
    { x: 0.56, y: 0.67, w: 0.41, h: 0.3, shape: "rect" },   // 3
  ],
  // RTL: the right column reads first, top-to-bottom, then the hero.
  readingOrder: [1, 2, 3, 0],
};

// …then add it to the exported LAYOUT_TEMPLATES array.
export const LAYOUT_TEMPLATES: LayoutTemplate[] = [/* … */, heroSplit];
```

Tips:
- Use the `grid(cols, rows)` helper for regular grids.
- For webtoon templates set `webtoon: true` so they only appear for webtoon
  projects.
- Add a case to `tests/reading-order.test.ts` if your reading order is
  non-obvious. Reflow into your template is already covered generically.

---

## 2. Add a style preset

Presets live in `src/lib/styles.ts`. Keep them **generic manga aesthetics only**
— no franchise references (the guardrail will reject those anyway).

```ts
// src/lib/styles.ts
{
  id: "noir-ink",
  name: "Noir Ink",
  blurb: "High-contrast noir with heavy spot blacks.",
  positiveCore:
    "black and white manga panel, film-noir lighting, heavy spot blacks, stark rim light, venetian-blind shadows, rain, moody detective aesthetic",
  lineWeight: 0.7,
  toneDensity: 0.8,
  inkContrast: 0.95,
  swatch: "linear-gradient(135deg,#000,#000 60%,#fff)",   // CSS for the picker card
}
```

Add it to `STYLE_PRESETS`. The shared suffix and negative prompt
(`SHARED_STYLE_SUFFIX`, `SHARED_NEGATIVE_PROMPT`) are appended automatically by
`assemblePanelPrompt`, so only describe the *positive core*.

Optionally add a genre starter that uses it in `src/lib/starters.ts`.

---

## 3. Add an image provider

Implement the `ImageProvider` interface (`src/lib/providers/types.ts`) and
register it in the factory. Providers must return a **URL** (never base64) —
persist any raw bytes via the storage adapter helpers.

```ts
// src/lib/providers/myprovider.ts
import { persistRemoteImage } from "@/lib/storage";
import { seedFromString } from "@/lib/ids";
import type { EditOpts, EditResult, GenerateOpts, GenerateResult, ImageProvider } from "@/lib/providers/types";

export class MyProvider implements ImageProvider {
  name = "myprovider";

  async generate(opts: GenerateOpts): Promise<GenerateResult> {
    const seed = opts.seed ?? seedFromString(opts.prompt);
    const res = await fetch("https://api.example.com/generate", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.MYPROVIDER_KEY!}` },
      body: JSON.stringify({ prompt: opts.prompt, seed, aspect_ratio: opts.aspectRatio }),
    });
    if (!res.ok) throw new Error(`myprovider error ${res.status}`);
    const { image_url } = (await res.json()) as { image_url: string };
    const url = await persistRemoteImage(image_url, `${opts.meta?.projectId ?? "adhoc"}/${opts.meta?.panelId ?? "img"}-${seed}.png`);
    return { url, seed };
  }

  async edit(opts: EditOpts): Promise<EditResult> {
    // …call your edit endpoint, persist, return { url }
    return { url: opts.baseImage };
  }
}
```

Then wire it up:

```ts
// src/lib/providers/index.ts
case "myprovider":
  cached = new MyProvider();
  break;
```

Add your key to `.env.example` (never with a `NEXT_PUBLIC_` prefix — it must stay
server-side), and mention it in the README provider table. That's it: the whole
app, wizard, batch render, and per-panel tools now use your provider when
`IMAGE_PROVIDER=myprovider`.

---

## Code style

- TypeScript strict, no `any`.
- Zod-validate every API boundary.
- Keep secrets server-side. `pnpm check:secrets` fails the build if a key-shaped
  string reaches the client bundle.
