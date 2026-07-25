import { describe, it, expect, afterEach } from "vitest";
import { checkPrompt, assertPromptAllowed, GuardrailError } from "@/lib/guardrails";

describe("guardrails: copyright/franchise filter (OFF by default)", () => {
  afterEach(() => {
    delete process.env.COPYRIGHT_FILTER;
  });

  it("allows franchise-named prompts when the filter is off (default)", () => {
    expect(checkPrompt("a hero who looks exactly like Naruto with a headband").ok).toBe(true);
    expect(checkPrompt("in the style of Demon Slayer").ok).toBe(true);
  });

  it("does not block ordinary words that overlap the blocklist", () => {
    // "power", "all might", "nami" are common English — must not be blocked.
    expect(checkPrompt("a power line at dusk").ok).toBe(true);
    expect(checkPrompt("we all might make it").ok).toBe(true);
    expect(checkPrompt("nami swept the coast").ok).toBe(true);
  });

  it("blocks franchise names only when COPYRIGHT_FILTER=on", () => {
    process.env.COPYRIGHT_FILTER = "on";
    const r = checkPrompt("a hero who looks exactly like Naruto");
    expect(r.ok).toBe(false);
    expect(r.category).toBe("franchise");
    expect(r.message).toContain("original characters");
  });

  it("allows original descriptions regardless of the filter", () => {
    expect(checkPrompt("a spiky-haired swordsman in a torn red coat, fierce eyes").ok).toBe(true);
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
  it("throws a GuardrailError on disallowed content (child-safety filter)", () => {
    expect(() => assertPromptAllowed("a nude underage child")).toThrow(GuardrailError);
  });

  it("does not throw on allowed prompts", () => {
    expect(() => assertPromptAllowed("an original knight in silver armor")).not.toThrow();
  });

  it("does not throw on franchise names by default (copyright filter off)", () => {
    expect(() => assertPromptAllowed("draw Goku")).not.toThrow();
  });
});
