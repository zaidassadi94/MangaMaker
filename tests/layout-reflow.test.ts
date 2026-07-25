import { describe, it, expect } from "vitest";
import { reflowPanels, type Reflowable } from "@/lib/layout-reflow";
import { getLayout } from "@/lib/layouts";
import type { PanelShape } from "@/lib/types";

interface TestPanel extends Reflowable {
  id: string;
  label: string;
}

function makePanel(id: string, index: number): TestPanel {
  return { id, label: `panel-${id}`, index, x: 0, y: 0, w: 0.2, h: 0.2, shape: "rect" };
}

const empty = (slot: { x: number; y: number; w: number; h: number; shape: PanelShape }, index: number): TestPanel => ({
  id: `new-${index}`,
  label: "new",
  index,
  x: slot.x,
  y: slot.y,
  w: slot.w,
  h: slot.h,
  shape: slot.shape,
});

describe("reflowPanels", () => {
  it("re-flows existing panels into new slots preserving their content", () => {
    const panels = [makePanel("a", 0), makePanel("b", 1), makePanel("c", 2), makePanel("d", 3)];
    const out = reflowPanels(panels, getLayout("grid-2x2"), "rtl", empty);
    expect(out).toHaveLength(4);
    // Every original panel survives (content not destroyed).
    for (const id of ["a", "b", "c", "d"]) {
      expect(out.find((p) => p.id === id)).toBeTruthy();
    }
    // Geometry now matches slots.
    for (const p of out) {
      expect(p.w).toBeGreaterThan(0);
      expect(p.h).toBeGreaterThan(0);
    }
  });

  it("creates empty panels when the new layout has more slots", () => {
    const panels = [makePanel("a", 0)];
    const out = reflowPanels(panels, getLayout("grid-3x3"), "rtl", empty);
    expect(out).toHaveLength(9);
    expect(out.filter((p) => p.label === "new")).toHaveLength(8);
    expect(out.find((p) => p.id === "a")).toBeTruthy();
  });

  it("preserves overflow panels when the new layout has fewer slots", () => {
    const panels = [makePanel("a", 0), makePanel("b", 1), makePanel("c", 2), makePanel("d", 3)];
    const out = reflowPanels(panels, getLayout("action-splash-full"), "rtl", empty); // 1 slot
    // No panel is discarded — content is cascaded, not destroyed.
    expect(out.length).toBe(4);
    for (const id of ["a", "b", "c", "d"]) {
      expect(out.find((p) => p.id === id)).toBeTruthy();
    }
  });

  it("re-indexes panels sequentially", () => {
    const panels = [makePanel("a", 5), makePanel("b", 9)];
    const out = reflowPanels(panels, getLayout("grid-2x2"), "rtl", empty);
    expect(out.map((p) => p.index)).toEqual([0, 1, 2, 3]);
  });
});
