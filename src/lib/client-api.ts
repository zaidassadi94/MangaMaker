"use client";

import type { ProjectFull, Panel } from "@/lib/types";
import type { StoryBibleOutput } from "@/lib/validation";

// Thin typed fetch wrappers for the client. Throw on non-2xx with the server's
// human-readable message so callers can surface it in a toast.

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `Request failed (${res.status})`);
  return data as T;
}

export function createProject(body: {
  title: string;
  premise: string;
  genre: string;
  styleId: string;
  readingDirection: "rtl" | "ltr";
  pageSize: "b5" | "a4" | "webtoon";
}): Promise<{ id: string }> {
  return jsonFetch("/api/projects", { method: "POST", body: JSON.stringify(body) });
}

export function generateBible(body: { premise: string; genre: string; styleId: string }): Promise<{ bible: StoryBibleOutput; source: "claude" | "mock" }> {
  return jsonFetch("/api/story/bible", { method: "POST", body: JSON.stringify(body) });
}

export function commitBible(projectId: string, bible: StoryBibleOutput): Promise<{ characters: ProjectFull["characters"] }> {
  return jsonFetch(`/api/projects/${projectId}/bible`, { method: "POST", body: JSON.stringify({ bible }) });
}

export function generateCharacterSheet(characterId: string): Promise<{ character: ProjectFull["characters"][number] }> {
  return jsonFetch(`/api/characters/${characterId}/sheet`, { method: "POST", body: JSON.stringify({}) });
}

export function generateScript(body: { projectId: string; pageCount: number; pacing: number }): Promise<{ pages: number; source: string }> {
  return jsonFetch("/api/story/script", { method: "POST", body: JSON.stringify(body) });
}

export function getProject(id: string): Promise<ProjectFull> {
  return jsonFetch(`/api/projects/${id}`);
}

export function generatePanel(panelId: string, body: { promptOverride?: string; seed?: number } = {}): Promise<{ panel: Panel; quota: { remaining: number; limit: number } }> {
  return jsonFetch(`/api/panels/${panelId}/generate`, { method: "POST", body: JSON.stringify(body) });
}

export function panelVariations(panelId: string, body: { count: number; promptOverride?: string }): Promise<{ variations: Array<{ imageUrl: string; seed: number }>; quota: { remaining: number } }> {
  return jsonFetch(`/api/panels/${panelId}/variations`, { method: "POST", body: JSON.stringify(body) });
}

export function editPanelReq(panelId: string, body: { instruction: string; maskImage?: string }): Promise<{ panel: Panel; quota: { remaining: number } }> {
  return jsonFetch(`/api/panels/${panelId}/edit`, { method: "POST", body: JSON.stringify(body) });
}

export function savePage(pageId: string, body: { panels: Panel[]; layoutTemplateId?: string; backgroundColor?: string }): Promise<{ ok: boolean }> {
  return jsonFetch(`/api/pages/${pageId}`, { method: "PATCH", body: JSON.stringify(body) });
}

export function deleteProject(id: string): Promise<{ ok: boolean }> {
  return jsonFetch(`/api/projects/${id}`, { method: "DELETE" });
}

export function updateCharacter(
  id: string,
  patch: { name?: string; role?: string; appearanceDescription?: string; personality?: string; locked?: boolean },
): Promise<{ character: ProjectFull["characters"][number] }> {
  return jsonFetch(`/api/characters/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
}

export function patchProject(
  id: string,
  patch: { readingDirection?: "rtl" | "ltr"; pageSize?: "b5" | "a4" | "webtoon"; title?: string },
): Promise<{ ok: boolean }> {
  return jsonFetch(`/api/projects/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
}

/**
 * POST an SSE endpoint and invoke `onEvent` for each streamed JSON event.
 * Used by the batch render console.
 */
export async function streamSSE(
  url: string,
  body: unknown,
  onEvent: (evt: Record<string, unknown>) => void,
): Promise<void> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok || !res.body) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? `Render failed (${res.status})`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const part of parts) {
      const line = part.trim();
      if (!line.startsWith("data:")) continue;
      try {
        onEvent(JSON.parse(line.slice(5).trim()));
      } catch {
        /* ignore malformed chunk */
      }
    }
  }
}
