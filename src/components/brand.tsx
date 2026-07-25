import Link from "next/link";
import { cn } from "@/lib/utils";

export function Wordmark({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("group inline-flex items-center gap-2", className)}>
      <span className="grid h-7 w-7 place-items-center rounded bg-[var(--color-vermilion)] font-display text-lg font-bold text-white shadow-sm">
        M
      </span>
      <span className="font-display text-lg font-semibold tracking-tight text-[var(--color-fg)]">
        Manga<span className="text-[var(--color-vermilion)]">Forge</span>
      </span>
    </Link>
  );
}

export function TopBar({ children }: { children?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-[var(--color-line)] bg-[var(--color-surround)]/80 px-4 backdrop-blur">
      <Wordmark />
      <div className="flex items-center gap-2">{children}</div>
    </header>
  );
}
