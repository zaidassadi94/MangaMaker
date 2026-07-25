import type { ReadingDirection } from "@/lib/types";
import type { LayoutSlot, LayoutTemplate } from "@/lib/layouts";

// ─────────────────────────────────────────────────────────────────────────────
// Reading-order computation. Manga reads right-to-left by default. We group
// slots into horizontal rows (top→bottom), then order within each row
// right→left (RTL) or left→right (LTR).
// ─────────────────────────────────────────────────────────────────────────────

interface Indexed {
  i: number;
  slot: LayoutSlot;
}

const ROW_OVERLAP = 0.06; // slots overlapping vertically by more than this share a row

export function computeReadingOrder(
  slots: LayoutSlot[],
  direction: ReadingDirection,
): number[] {
  const indexed: Indexed[] = slots.map((slot, i) => ({ i, slot }));
  const byTop = [...indexed].sort((a, b) => a.slot.y - b.slot.y);

  const rows: { items: Indexed[]; bottom: number }[] = [];
  for (const item of byTop) {
    const top = item.slot.y;
    const row = rows.find((r) => top < r.bottom - ROW_OVERLAP);
    if (row) {
      row.items.push(item);
      row.bottom = Math.max(row.bottom, item.slot.y + item.slot.h);
    } else {
      rows.push({ items: [item], bottom: item.slot.y + item.slot.h });
    }
  }

  const order: number[] = [];
  for (const row of rows) {
    const sorted = row.items.sort((a, b) =>
      direction === "rtl" ? b.slot.x - a.slot.x : a.slot.x - b.slot.x,
    );
    for (const it of sorted) order.push(it.i);
  }
  return order;
}

/**
 * Reading order for a template. RTL uses the template's hand-authored order
 * (correct for irregular action layouts); LTR is computed geometrically.
 */
export function getReadingOrder(
  template: LayoutTemplate,
  direction: ReadingDirection,
): number[] {
  if (direction === "rtl") {
    if (template.readingOrder.length === template.slots.length) {
      return template.readingOrder;
    }
    return computeReadingOrder(template.slots, "rtl");
  }
  return computeReadingOrder(template.slots, "ltr");
}
