import type { CameraAngle, Character, Panel, ShotType, StyleGuide } from "@/lib/types";
import { SHARED_STYLE_SUFFIX } from "@/lib/styles";

// ─────────────────────────────────────────────────────────────────────────────
// Panel prompt assembly:
//   [style prefix] + [shot + angle] + [character tokens] + [action] + [setting]
//   + [style suffix]
// Dialogue/SFX text is NEVER placed in the image prompt — bubbles are a
// separate vector layer.
// ─────────────────────────────────────────────────────────────────────────────

const SHOT_PHRASES: Record<ShotType, string> = {
  establishing: "wide establishing shot",
  wide: "wide shot",
  medium: "medium shot",
  closeup: "close-up",
  "extreme-closeup": "extreme close-up",
  "over-shoulder": "over-the-shoulder shot",
  pov: "point-of-view shot",
  insert: "insert detail shot",
};

const ANGLE_PHRASES: Record<CameraAngle, string> = {
  eye: "eye-level angle",
  low: "low angle looking up",
  high: "high angle looking down",
  dutch: "dutch tilt angle",
  birdseye: "bird's-eye view from above",
  worms: "worm's-eye view from below",
};

export function characterToken(c: Pick<Character, "name" | "appearanceDescription" | "seedToken">): string {
  const appearance = c.appearanceDescription.trim().replace(/\s+/g, " ");
  return `${c.name} (${appearance}) [ref:${c.seedToken}]`;
}

export interface AssembleInput {
  style: Pick<StyleGuide, "positivePrompt">;
  shotType: ShotType;
  cameraAngle: CameraAngle;
  emotion?: string;
  description: string;
  setting?: string;
  characters: Array<Pick<Character, "name" | "appearanceDescription" | "seedToken">>;
}

export function assemblePanelPrompt(input: AssembleInput): string {
  const parts: string[] = [];
  parts.push(input.style.positivePrompt.trim());
  parts.push(`${SHOT_PHRASES[input.shotType]}, ${ANGLE_PHRASES[input.cameraAngle]}`);

  if (input.characters.length > 0) {
    parts.push(`featuring ${input.characters.map(characterToken).join("; ")}`);
  }

  const action = input.description.trim();
  if (action) {
    parts.push(input.emotion && input.emotion !== "neutral" ? `${action} (mood: ${input.emotion})` : action);
  }

  if (input.setting && input.setting.trim()) {
    parts.push(`setting: ${input.setting.trim()}`);
  }

  parts.push(SHARED_STYLE_SUFFIX);

  return parts
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join(", ");
}

/** Build the prompt for an existing panel given its style + involved characters. */
export function promptForPanel(
  panel: Pick<Panel, "shotType" | "cameraAngle" | "emotion" | "description" | "setting">,
  style: Pick<StyleGuide, "positivePrompt">,
  characters: Array<Pick<Character, "name" | "appearanceDescription" | "seedToken">>,
): string {
  return assemblePanelPrompt({
    style,
    shotType: panel.shotType,
    cameraAngle: panel.cameraAngle,
    emotion: panel.emotion,
    description: panel.description,
    setting: panel.setting,
    characters,
  });
}
