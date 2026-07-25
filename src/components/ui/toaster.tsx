"use client";

import { useToastStore } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export function Toaster() {
  const { toasts, dismiss } = useToastStore();
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={cn(
            "flex items-start gap-2 rounded-md border px-3 py-2 text-sm shadow-lg backdrop-blur",
            "bg-[var(--color-panel)]/95 max-w-sm",
            t.kind === "error" && "border-[var(--color-vermilion)]",
            t.kind === "success" && "border-emerald-500/60",
            t.kind === "info" && "border-[var(--color-line)]",
          )}
        >
          <span className="mt-0.5 shrink-0">
            {t.kind === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            ) : t.kind === "error" ? (
              <AlertCircle className="h-4 w-4 text-[var(--color-vermilion)]" />
            ) : (
              <Info className="h-4 w-4 text-[var(--color-fg-dim)]" />
            )}
          </span>
          <span className="flex-1 leading-snug">{t.message}</span>
          <button onClick={() => dismiss(t.id)} className="shrink-0 text-[var(--color-fg-faint)] hover:text-[var(--color-fg)]">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
