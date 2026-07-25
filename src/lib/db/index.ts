import { drizzle } from "drizzle-orm/libsql";
import { createClient, type Client } from "@libsql/client";
import * as schema from "./schema";

// Single libSQL client. `DATABASE_URL` accepts a local file (`file:./data/...`)
// or a remote Turso `libsql://` url with no code changes.
const url = process.env.DATABASE_URL ?? "file:./data/mangaforge.db";
const authToken = process.env.DATABASE_AUTH_TOKEN;

declare global {
  var __mangaforge_libsql__: Client | undefined;
}

const client: Client =
  globalThis.__mangaforge_libsql__ ??
  createClient({ url, ...(authToken ? { authToken } : {}) });

if (process.env.NODE_ENV !== "production") {
  globalThis.__mangaforge_libsql__ = client;
}

export const db = drizzle(client, { schema });
export { schema };
export type DB = typeof db;
