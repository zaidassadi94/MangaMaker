import { Suspense } from "react";
import { Wizard } from "@/components/wizard/wizard";

export const dynamic = "force-dynamic";

export default function NewPage() {
  return (
    <Suspense fallback={<div className="grid min-h-screen place-items-center text-[var(--color-fg-dim)]">Loading…</div>}>
      <Wizard />
    </Suspense>
  );
}
