import { describe, it, expect } from "vitest";
import { autoSizeBubble, wrapText } from "@/lib/bubbles";

describe("wrapText", () => {
  it("wraps words at the max chars per line", () => {
    const lines = wrapText("the quick brown fox jumps", 9);
    for (const l of lines) expect(l.length).toBeLessThanOrEqual(9);
    expect(lines.join(" ")).toBe("the quick brown fox jumps");
  });

  it("hard-breaks tokens longer than the line", () => {
    const lines = wrapText("supercalifragilistic", 6);
    expect(lines.length).toBeGreaterThan(1);
    for (const l of lines) expect(l.length).toBeLessThanOrEqual(6);
  });

  it("never returns an empty array", () => {
    expect(wrapText("", 10)).toEqual([""]);
  });
});

describe("autoSizeBubble", () => {
  it("grows with more text but never exceeds maxWidth", () => {
    const short = autoSizeBubble("Hi.", { fontSize: 18, maxWidth: 220 });
    const long = autoSizeBubble("This is a much longer line of dialogue that should wrap.", { fontSize: 18, maxWidth: 220 });
    expect(short.width).toBeLessThanOrEqual(220);
    expect(long.width).toBeLessThanOrEqual(220);
    expect(long.height).toBeGreaterThan(short.height);
  });

  it("produces more lines as text lengthens", () => {
    const r = autoSizeBubble("one two three four five six seven eight nine ten", { fontSize: 20, maxWidth: 160 });
    expect(r.lines.length).toBeGreaterThan(1);
  });

  it("scales height with font size", () => {
    const small = autoSizeBubble("Same text here", { fontSize: 12, maxWidth: 300 });
    const big = autoSizeBubble("Same text here", { fontSize: 28, maxWidth: 300 });
    expect(big.height).toBeGreaterThan(small.height);
  });
});
