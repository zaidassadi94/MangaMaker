import { describe, it, expect } from "vitest";
import { assemblePanelPrompt, characterToken } from "@/lib/prompt";
import { SHARED_STYLE_SUFFIX } from "@/lib/styles";

const style = { positivePrompt: "high-contrast black and white manga panel, bold inking" };

describe("assemblePanelPrompt", () => {
  it("orders parts: style prefix → shot+angle → characters → action → setting → suffix", () => {
    const prompt = assemblePanelPrompt({
      style,
      shotType: "closeup",
      cameraAngle: "low",
      emotion: "furious",
      description: "she draws the blade",
      setting: "a rain-soaked alley",
      characters: [{ name: "Kaede", appearanceDescription: "silver bob, red scarf", seedToken: "kaede-abc123" }],
    });
    expect(prompt.startsWith(style.positivePrompt)).toBe(true);
    expect(prompt).toContain("close-up");
    expect(prompt).toContain("low angle");
    expect(prompt).toContain("Kaede");
    expect(prompt).toContain("she draws the blade");
    expect(prompt).toContain("a rain-soaked alley");
    expect(prompt.endsWith(SHARED_STYLE_SUFFIX)).toBe(true);
    // Ordering: characters appear before the action.
    expect(prompt.indexOf("Kaede")).toBeLessThan(prompt.indexOf("she draws the blade"));
  });

  it("never includes dialogue text (only structural fields)", () => {
    const prompt = assemblePanelPrompt({
      style,
      shotType: "medium",
      cameraAngle: "eye",
      description: "two rivals face off",
      characters: [],
    });
    expect(prompt).not.toContain('"');
    expect(prompt).toContain(SHARED_STYLE_SUFFIX);
  });

  it("includes the emotion only when not neutral", () => {
    const neutral = assemblePanelPrompt({ style, shotType: "wide", cameraAngle: "eye", emotion: "neutral", description: "a quiet street", characters: [] });
    const mad = assemblePanelPrompt({ style, shotType: "wide", cameraAngle: "eye", emotion: "furious", description: "a quiet street", characters: [] });
    expect(neutral).not.toContain("mood:");
    expect(mad).toContain("mood: furious");
  });

  it("characterToken embeds the appearance and stable ref token", () => {
    const token = characterToken({ name: "Ren", appearanceDescription: "silver hair, long coat", seedToken: "ren-xyz" });
    expect(token).toContain("Ren");
    expect(token).toContain("silver hair");
    expect(token).toContain("ref:ren-xyz");
  });
});
