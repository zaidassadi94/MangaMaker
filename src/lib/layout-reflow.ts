import type { PanelShape, ReadingDirection } from "@/lib/types";
import type { LayoutSlot, LayoutTemplate } from "@/lib/layouts";
import { getReadingOrder } from "@/lib/reading-order";
import { clamp } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Layout reflow. Swapping a page's template re-flows existing panels into the
// new slots (in reading order) rather than destroying them. Panels beyond the
// slot count are preserved via a cascade offset so no content is ever lost;
// extra slots become new empty panels.
// ─────────────────────────────────────────────────────────────────────────────

export interface Reflowable {
  x: number;
  y: number;
  w: number;
  h: number;
  shape: PanelShape;
  index: number;
}

export function reflowPanels<T extends Reflowable>(
  panels: T[],
  template: LayoutTemplate,
  direction: ReadingDirection,
  makeEmpty: (slot: LayoutSlot, index: number) => T,
): T[] {
  const order = getReadingOrder(template, direction);
  const orderedSlots = order
    .map((i) => template.slots[i])
    .filter((s): s is LayoutSlot => Boolean(s));
  const sorted = [...panels].sort((a, b) => a.index - b.index);

  const count = Math.max(orderedSlots.length, sorted.length);
  const result: T[] = [];

  for (let k = 0; k < count; k++) {
    const slot = orderedSlots[k];
    const panel = sorted[k];

    if (slot && panel) {
      result.push({ ...panel, x: slot.x, y: slot.y, w: slot.w, h: slot.h, shape: slot.shape, index: k });
    } else if (slot && !panel) {
      result.push(makeEmpty(slot, k));
    } else if (!slot && panel) {
      // Overflow: keep the panel's content, cascade it over the last slot.
      const last = orderedSlots[orderedSlots.length - 1] ?? { x: 0.06, y: 0.06, w: 0.4, h: 0.4, shape: "rect" as PanelShape };
      const off = 0.03 * (k - orderedSlots.length + 1);
      result.push({
        ...panel,
        x: clamp(last.x + off, 0, 1 - last.w),
        y: clamp(last.y + off, 0, 1 - last.h),
        w: last.w,
        h: last.h,
        shape: last.shape,
        index: k,
      });
    }
  }

  return result;
}
