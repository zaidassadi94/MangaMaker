import { createClient } from "@libsql/client";
import { mkdirSync } from "node:fs";
import path from "node:path";

// Idempotent schema bootstrap. Runs `CREATE TABLE IF NOT EXISTS` so a fresh
// clone works with zero setup (`pnpm dev` with no migration step). Cached as a
// module-level promise so it executes at most once per server process.
const DDL: string[] = [
  `CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    synopsis TEXT NOT NULL DEFAULT '',
    genre TEXT NOT NULL DEFAULT '',
    style_guide TEXT NOT NULL,
    reading_direction TEXT NOT NULL DEFAULT 'rtl',
    page_size TEXT NOT NULL DEFAULT 'b5',
    cover_url TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS characters (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'support',
    appearance_description TEXT NOT NULL DEFAULT '',
    personality TEXT NOT NULL DEFAULT '',
    sheet_image_urls TEXT NOT NULL DEFAULT '[]',
    ref_image_url TEXT,
    seed_token TEXT NOT NULL,
    locked INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS chapters (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    number INTEGER NOT NULL DEFAULT 1,
    title TEXT NOT NULL DEFAULT '',
    premise TEXT NOT NULL DEFAULT '',
    beats TEXT NOT NULL DEFAULT '[]'
  )`,
  `CREATE TABLE IF NOT EXISTS pages (
    id TEXT PRIMARY KEY,
    chapter_id TEXT NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    idx INTEGER NOT NULL DEFAULT 0,
    layout_template_id TEXT NOT NULL DEFAULT 'grid-2x2',
    background_color TEXT NOT NULL DEFAULT '#ffffff'
  )`,
  `CREATE TABLE IF NOT EXISTS panels (
    id TEXT PRIMARY KEY,
    page_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    idx INTEGER NOT NULL DEFAULT 0,
    x REAL NOT NULL DEFAULT 0,
    y REAL NOT NULL DEFAULT 0,
    w REAL NOT NULL DEFAULT 1,
    h REAL NOT NULL DEFAULT 1,
    shape TEXT NOT NULL DEFAULT 'rect',
    border_width REAL NOT NULL DEFAULT 3,
    gutter REAL NOT NULL DEFAULT 0.012,
    description TEXT NOT NULL DEFAULT '',
    shot_type TEXT NOT NULL DEFAULT 'medium',
    camera_angle TEXT NOT NULL DEFAULT 'eye',
    emotion TEXT NOT NULL DEFAULT 'neutral',
    setting TEXT NOT NULL DEFAULT '',
    character_ids TEXT NOT NULL DEFAULT '[]',
    image_prompt TEXT NOT NULL DEFAULT '',
    image_url TEXT,
    seed INTEGER,
    status TEXT NOT NULL DEFAULT 'empty',
    version INTEGER NOT NULL DEFAULT 0,
    history TEXT NOT NULL DEFAULT '[]',
    bubbles TEXT NOT NULL DEFAULT '[]',
    sfx TEXT NOT NULL DEFAULT '[]'
  )`,
  `CREATE TABLE IF NOT EXISTS assets (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    url TEXT NOT NULL,
    meta TEXT NOT NULL DEFAULT '{}'
  )`,
  `CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    progress REAL NOT NULL DEFAULT 0,
    payload TEXT NOT NULL DEFAULT '{}',
    error TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS usage (
    bucket TEXT PRIMARY KEY,
    day TEXT NOT NULL,
    ip_hash TEXT NOT NULL,
    panel_count INTEGER NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_characters_project ON characters(project_id)`,
  `CREATE INDEX IF NOT EXISTS idx_chapters_project ON chapters(project_id)`,
  `CREATE INDEX IF NOT EXISTS idx_pages_chapter ON pages(chapter_id)`,
  `CREATE INDEX IF NOT EXISTS idx_panels_page ON panels(page_id)`,
];

let ready: Promise<void> | null = null;

export function ensureSchema(): Promise<void> {
  if (ready) return ready;
  const url = process.env.DATABASE_URL ?? "file:./data/mangaforge.db";
  const authToken = process.env.DATABASE_AUTH_TOKEN;
  // Ensure the parent directory exists for local file databases.
  if (url.startsWith("file:")) {
    const filePath = url.slice("file:".length);
    try {
      mkdirSync(path.dirname(path.resolve(filePath)), { recursive: true });
    } catch {
      /* ignore */
    }
  }
  const client = createClient({ url, ...(authToken ? { authToken } : {}) });
  ready = (async () => {
    for (const stmt of DDL) {
      await client.execute(stmt);
    }
  })();
  return ready;
}
