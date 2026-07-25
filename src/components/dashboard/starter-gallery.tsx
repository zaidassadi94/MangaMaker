"use client";

import { useRouter } from "next/navigation";
import { STARTERS } from "@/lib/starters";
import { getPreset } from "@/lib/styles";

export function StarterGallery() {
  const router = useRouter();
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {STARTERS.map((s) => {
        const preset = getPreset(s.styleId);
        return (
          <button
            key={s.id}
            onClick={() => router.push(`/new?starter=${s.id}`)}
            className="group relative overflow-hidden rounded-lg border border-[var(--color-line)] bg-[var(--color-panel)] p-4 text-left transition-colors hover:border-[var(--color-vermilion)]"
          >
            <div className="absolute inset-0 opacity-20" style={{ background: preset.swatch }} />
            <div className="relative">
              <div className="text-2xl">{s.emoji}</div>
              <div className="mt-2 font-display text-sm font-semibold text-[var(--color-fg)]">{s.name}</div>
              <div className="mt-0.5 text-[11px] text-[var(--color-fg-dim)]">{preset.name}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
