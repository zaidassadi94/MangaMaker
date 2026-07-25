import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import type {
  StyleGuide,
  Beat,
  Bubble,
  Sfx,
  PanelShape,
  ShotType,
  CameraAngle,
  PanelStatus,
  CharacterRole,
  ReadingDirection,
  PageSize,
  JobKind,
  JobStatus,
} from "@/lib/types";

// NB: composite value objects (StyleGuide, bubbles, sfx, string[] arrays) are
// stored as JSON text columns. This keeps the whole-page autosave + undo/redo
// path a single serialisable snapshot rather than a fan-out of joined rows.
// See DECISIONS.md.

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  synopsis: text("synopsis").notNull().default(""),
  genre: text("genre").notNull().default(""),
  styleGuide: text("style_guide", { mode: "json" }).$type<StyleGuide>().notNull(),
  readingDirection: text("reading_direction").$type<ReadingDirection>().notNull().default("rtl"),
  pageSize: text("page_size").$type<PageSize>().notNull().default("b5"),
  coverUrl: text("cover_url"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const characters = sqliteTable("characters", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  role: text("role").$type<CharacterRole>().notNull().default("support"),
  appearanceDescription: text("appearance_description").notNull().default(""),
  personality: text("personality").notNull().default(""),
  sheetImageUrls: text("sheet_image_urls", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
  refImageUrl: text("ref_image_url"),
  seedToken: text("seed_token").notNull(),
  locked: integer("locked", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at").notNull(),
});

export const chapters = sqliteTable("chapters", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  number: integer("number").notNull().default(1),
  title: text("title").notNull().default(""),
  premise: text("premise").notNull().default(""),
  beats: text("beats", { mode: "json" }).$type<Beat[]>().notNull().default(sql`'[]'`),
});

export const pages = sqliteTable("pages", {
  id: text("id").primaryKey(),
  chapterId: text("chapter_id")
    .notNull()
    .references(() => chapters.id, { onDelete: "cascade" }),
  index: integer("idx").notNull().default(0),
  layoutTemplateId: text("layout_template_id").notNull().default("grid-2x2"),
  backgroundColor: text("background_color").notNull().default("#ffffff"),
});

export const panels = sqliteTable("panels", {
  id: text("id").primaryKey(),
  pageId: text("page_id")
    .notNull()
    .references(() => pages.id, { onDelete: "cascade" }),
  index: integer("idx").notNull().default(0),
  x: real("x").notNull().default(0),
  y: real("y").notNull().default(0),
  w: real("w").notNull().default(1),
  h: real("h").notNull().default(1),
  shape: text("shape").$type<PanelShape>().notNull().default("rect"),
  borderWidth: real("border_width").notNull().default(3),
  gutter: real("gutter").notNull().default(0.012),
  description: text("description").notNull().default(""),
  shotType: text("shot_type").$type<ShotType>().notNull().default("medium"),
  cameraAngle: text("camera_angle").$type<CameraAngle>().notNull().default("eye"),
  emotion: text("emotion").notNull().default("neutral"),
  setting: text("setting").notNull().default(""),
  characterIds: text("character_ids", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
  imagePrompt: text("image_prompt").notNull().default(""),
  imageUrl: text("image_url"),
  seed: integer("seed"),
  status: text("status").$type<PanelStatus>().notNull().default("empty"),
  version: integer("version").notNull().default(0),
  history: text("history", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
  bubbles: text("bubbles", { mode: "json" }).$type<Bubble[]>().notNull().default(sql`'[]'`),
  sfx: text("sfx", { mode: "json" }).$type<Sfx[]>().notNull().default(sql`'[]'`),
});

export const assets = sqliteTable("assets", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  url: text("url").notNull(),
  meta: text("meta", { mode: "json" }).$type<Record<string, unknown>>().notNull().default(sql`'{}'`),
});

export const jobs = sqliteTable("jobs", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  kind: text("kind").$type<JobKind>().notNull(),
  status: text("status").$type<JobStatus>().notNull().default("pending"),
  progress: real("progress").notNull().default(0),
  payload: text("payload", { mode: "json" }).$type<Record<string, unknown>>().notNull().default(sql`'{}'`),
  error: text("error"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

// Server-side daily usage tracking for the panel cap (per IP bucket + day).
export const usage = sqliteTable("usage", {
  bucket: text("bucket").primaryKey(), // `${day}:${ipHash}`
  day: text("day").notNull(),
  ipHash: text("ip_hash").notNull(),
  panelCount: integer("panel_count").notNull().default(0),
  updatedAt: integer("updated_at").notNull(),
});
