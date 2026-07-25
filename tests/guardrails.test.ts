import { describe, it, expect } from "vitest";
import { checkPrompt, assertPromptAllowed, GuardrailError } from "@/lib/guardrails";

describe("guardrails: franchise blocklist", () => {
  it("rejects a named franchise character", () => {
    const r = checkPrompt("a hero who looks exactly like Naruto with a headband");
    expect(r.ok).toBe(false);
    expect(r.category).toBe("franchise");
    expect(r.message).toContain("original characters");
  });

  it("rejects multi-word franchise names", () => {
    expect(checkPrompt("in the style of Demon Slayer").ok).toBe(false);
    expect(checkPrompt("a Dragon Ball style fight").ok).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(checkPrompt("PIKACHU on a rooftop").ok).toBe(false);
  });

  it("allows original descriptions", () => {
    const r = checkPrompt("a spiky-haired swordsman in a torn red coat, fierce eyes");
    expect(r.ok).toBe(true);
  });

  it("does not false-positive on ordinary words", () => {
    expect(checkPrompt("a quiet fishing village at dawn").ok).toBe(true);
  });
});

describe("guardrails: content filter", () => {
  it("blocks sexual content involving minors", () => {
    const r = checkPrompt("a nude underage child");
    expect(r.ok).toBe(false);
    expect(r.category).toBe("csam");
  });

  it("allows non-sexual mention of a child character", () => {
    expect(checkPrompt("a child runs across a field, laughing").ok).toBe(true);
  });

  it("blocks extreme gore", () => {
    expect(checkPrompt("graphically dismember the body").ok).toBe(false);
  });

  it("blocks real public figures", () => {
    expect(checkPrompt("a portrait of Elon Musk").ok).toBe(false);
  });
});

describe("assertPromptAllowed", () => {
  it("throws a GuardrailError on rejection", () => {
    expect(() => assertPromptAllowed("draw Goku")).toThrow(GuardrailError);
  });

  it("does not throw on allowed prompts", () => {
    expect(() => assertPromptAllowed("an original knight in silver armor")).not.toThrow();
  });
});
