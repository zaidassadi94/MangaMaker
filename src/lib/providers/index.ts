import type { ImageProvider } from "@/lib/providers/types";
import { MockProvider } from "@/lib/providers/mock";
import { GeminiProvider } from "@/lib/providers/gemini";
import { FalProvider } from "@/lib/providers/fal";

let cached: ImageProvider | null = null;

export function getImageProvider(): ImageProvider {
  if (cached) return cached;
  const name = (process.env.IMAGE_PROVIDER ?? "mock").toLowerCase();
  switch (name) {
    case "gemini":
      cached = new GeminiProvider();
      break;
    case "fal":
      cached = new FalProvider();
      break;
    default:
      cached = new MockProvider();
  }
  return cached;
}

export function providerName(): string {
  return (process.env.IMAGE_PROVIDER ?? "mock").toLowerCase();
}

export type { ImageProvider };
export * from "@/lib/providers/types";
