import { describe, it, expect } from "vitest";
import { computeReadingOrder, getReadingOrder } from "@/lib/reading-order";
import { getLayout } from "@/lib/layouts";
import type { LayoutSlot } from "@/lib/layouts";

const grid2x2: LayoutSlot[] = [
  { x: 0.05, y: 0.05, w: 0.4, h: 0.4, shape: "rect" }, // TL (0)
  { x: 0.55, y: 0.05, w: 0.4, h: 0.4, shape: "rect" }, // TR (1)
  { x: 0.05, y: 0.55, w: 0.4, h: 0.4, shape: "rect" }, // BL (2)
  { x: 0.55, y: 0.55, w: 0.4, h: 0.4, shape: "rect" }, // BR (3)
];

describe("computeReadingOrder", () => {
  it("orders RTL: each row right-to-left, top rows first", () => {
    expect(computeReadingOrder(grid2x2, "rtl")).toEqual([1, 0, 3, 2]);
  });

  it("orders LTR: each row left-to-right, top rows first", () => {
    expect(computeReadingOrder(grid2x2, "ltr")).toEqual([0, 1, 2, 3]);
  });

  it("is a permutation covering every slot exactly once", () => {
    const order = computeReadingOrder(grid2x2, "rtl");
    expect([...order].sort()).toEqual([0, 1, 2, 3]);
  });

  it("handles a single slot", () => {
    expect(computeReadingOrder([{ x: 0, y: 0, w: 1, h: 1, shape: "bleed" }], "rtl")).toEqual([0]);
  });
});

describe("getReadingOrder", () => {
  it("uses the template's authored RTL order", () => {
    const t = getLayout("grid-2x2");
    expect(getReadingOrder(t, "rtl")).toEqual(t.readingOrder);
  });

  it("returns a full permutation for LTR on every shipped template", () => {
    const t = getLayout("action-explosive-5");
    const order = getReadingOrder(t, "ltr");
    expect(order.length).toBe(t.slots.length);
    expect([...order].sort((a, b) => a - b)).toEqual(t.slots.map((_, i) => i));
  });
});
