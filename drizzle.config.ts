import type { Config } from "drizzle-kit";

const url = process.env.DATABASE_URL ?? "file:./data/mangaforge.db";
const authToken = process.env.DATABASE_AUTH_TOKEN;
const remote = url.startsWith("libsql") || url.startsWith("http");

export default {
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: remote ? "turso" : "sqlite",
  dbCredentials: { url, ...(authToken ? { authToken } : {}) },
} as Config;
