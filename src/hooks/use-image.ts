"use client";

import { useEffect, useState } from "react";

// Minimal image loader for Konva (avoids adding the `use-image` dependency).
export function useImage(src: string | null): [HTMLImageElement | null, "loading" | "loaded" | "failed"] {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [status, setStatus] = useState<"loading" | "loaded" | "failed">("loading");

  useEffect(() => {
    if (!src) {
      setImg(null);
      setStatus("failed");
      return;
    }
    let cancelled = false;
    const image = new window.Image();
    image.crossOrigin = "anonymous";
    setStatus("loading");
    image.onload = () => {
      if (cancelled) return;
      setImg(image);
      setStatus("loaded");
    };
    image.onerror = () => {
      if (cancelled) return;
      setImg(null);
      setStatus("failed");
    };
    image.src = src;
    return () => {
      cancelled = true;
    };
  }, [src]);

  return [img, status];
}
