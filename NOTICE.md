# NOTICE

## Original work only

MangaForge is designed to create **original** manga. Its style presets describe
generic manga aesthetics (inking, screentone, shot framing) and never reference
any specific franchise, series, or character.

The content guardrail (`src/lib/guardrails.ts`) always rejects prompts depicting
sexual content involving minors, extreme gore, or real public figures. An
optional **copyright/franchise filter** (rejecting prompts that name well-known
franchise characters) is available but **off by default** — enable it with
`COPYRIGHT_FILTER=on`. Operators who publish generated work are responsible for
ensuring its originality.

**These filters are a good-faith measure, not a legal guarantee.** They are
non-exhaustive blocklists plus simple heuristics. Operators are responsible for
their own use, and for extending them for their jurisdiction and audience.

## Ownership of generated output

Ownership and licensing of images produced by MangaForge are governed by the
terms of **whichever image provider the operator configures** (Google Gemini,
fal.ai, or the built-in mock provider, which emits only self-generated SVG
placeholders). MangaForge itself claims no rights over generated output. Review
your chosen provider's terms before commercial use.

## Fonts

Fonts are loaded at build time via `next/font/google` (not vendored). Each is
licensed under the **SIL Open Font License 1.1**:

| Font | Role | License |
|---|---|---|
| [Bangers](https://fonts.google.com/specimen/Bangers) | SFX / shout bubbles | SIL OFL 1.1 |
| [Comic Neue](https://fonts.google.com/specimen/Comic+Neue) | Dialogue | SIL OFL 1.1 |
| [Zen Antique](https://fonts.google.com/specimen/Zen+Antique) | Narration boxes | SIL OFL 1.1 |
| [Oswald](https://fonts.google.com/specimen/Oswald) | UI display headings | SIL OFL 1.1 |
| [Inter](https://fonts.google.com/specimen/Inter) | UI body text | SIL OFL 1.1 |

The SIL Open Font License permits use, study, modification, and redistribution
of the fonts. See <https://openfontlicense.org>.

## Third-party libraries

This project depends on open-source libraries (Next.js, React, Konva, Drizzle,
Zustand, TanStack Query, Zod, jsPDF, JSZip, and others) under their respective
licenses. See `package.json` and each package's license for details.
