"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea, Field } from "@/components/ui/primitives";
import { Eraser, Loader2 } from "lucide-react";

// Lightweight inpaint: paint a white mask over the panel image on black, then
// describe the fix. Produces a mask data URL passed to the edit endpoint.
export function InpaintModal({ imageUrl, onClose, onSubmit }: { imageUrl: string; onClose: () => void; onSubmit: (instruction: string, maskDataUrl: string) => Promise<void> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [instruction, setInstruction] = useState("");
  const [busy, setBusy] = useState(false);
  const drawing = useRef(false);
  const [brush, setBrush] = useState(28);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  function paint(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(x, y, brush, 0, Math.PI * 2);
    ctx.fill();
  }

  async function submit() {
    const canvas = canvasRef.current!;
    setBusy(true);
    try {
      await onSubmit(instruction, canvas.toDataURL("image/png"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-lg border border-[var(--color-line)] bg-[var(--color-panel)] p-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-2 font-display text-lg font-semibold">Inpaint</h3>
        <p className="mb-3 text-xs text-[var(--color-fg-dim)]">Paint the area to change (white), then describe the fix.</p>
        <div className="relative mx-auto w-full max-w-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="panel" className="w-full rounded" />
          <canvas
            ref={canvasRef}
            width={512}
            height={683}
            className="absolute inset-0 h-full w-full cursor-crosshair rounded opacity-50"
            onPointerDown={(e) => { drawing.current = true; paint(e); }}
            onPointerMove={paint}
            onPointerUp={() => (drawing.current = false)}
            onPointerLeave={() => (drawing.current = false)}
          />
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-[var(--color-fg-dim)]">
          <Eraser className="h-3.5 w-3.5" /> Brush
          <input type="range" min={8} max={64} value={brush} onChange={(e) => setBrush(Number(e.target.value))} />
        </div>
        <div className="mt-3">
          <Field label="Instruction">
            <Textarea value={instruction} onChange={(e) => setInstruction(e.target.value)} rows={2} placeholder="replace with a broken window" />
          </Field>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button disabled={busy || instruction.trim().length === 0} onClick={submit}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Apply
          </Button>
        </div>
      </div>
    </div>
  );
}
