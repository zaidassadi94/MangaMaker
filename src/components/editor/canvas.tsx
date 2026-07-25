"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Stage, Layer, Rect, Group, Image as KImage, Text, Ellipse, Line, Star, Circle, Transformer } from "react-konva";
import type Konva from "konva";
import { useEditorStore, currentPage } from "@/store/editor";
import { PAGE_PX } from "@/lib/compose-svg";
import { getLayout } from "@/lib/layouts";
import { getReadingOrder } from "@/lib/reading-order";
import { useImage } from "@/hooks/use-image";
import { clamp } from "@/lib/utils";
import type { Bubble, Panel, Sfx } from "@/lib/types";

interface EditingText {
  kind: "bubble" | "sfx";
  panelId: string;
  id: string;
  value: string;
  x: number;
  y: number;
  w: number;
  fontSize: number;
}

export function EditorCanvas({ showReadingOrder }: { showReadingOrder: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const selNodeRef = useRef<Konva.Node | null>(null);

  const pages = useEditorStore((s) => s.pages);
  const currentPageId = useEditorStore((s) => s.currentPageId);
  const meta = useEditorStore((s) => s.meta);
  const selection = useEditorStore((s) => s.selection);
  const select = useEditorStore((s) => s.select);
  const clearSelection = useEditorStore((s) => s.clearSelection);
  const patchPanel = useEditorStore((s) => s.patchPanel);
  const patchBubble = useEditorStore((s) => s.patchBubble);
  const patchSfx = useEditorStore((s) => s.patchSfx);

  const page = currentPage({ pages, currentPageId } as never);
  const pageSize = meta?.pageSize ?? "b5";
  const { w: PW, h: PH } = PAGE_PX[pageSize];

  const [size, setSize] = useState({ w: 800, h: 600 });
  const [scale, setScale] = useState(0.4);
  const [pos, setPos] = useState({ x: 40, y: 20 });
  const [spaceDown, setSpaceDown] = useState(false);
  const [editing, setEditing] = useState<EditingText | null>(null);

  // Fit page to viewport on size / page-size change.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setSize({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const fit = useMemo(
    () => () => {
      const pad = 60;
      const s = Math.min((size.w - pad) / PW, (size.h - pad) / PH);
      setScale(s);
      setPos({ x: (size.w - PW * s) / 2, y: (size.h - PH * s) / 2 });
    },
    [size, PW, PH],
  );

  useEffect(() => {
    fit();
  }, [fit]);

  // Spacebar pan toggle.
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === "Space" && !isTypingTarget(e.target)) {
        e.preventDefault();
        setSpaceDown(true);
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space") setSpaceDown(false);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  // Attach transformer to the selected node.
  useEffect(() => {
    const tr = trRef.current;
    if (!tr) return;
    if (selNodeRef.current && selection.type !== "none") {
      tr.nodes([selNodeRef.current]);
    } else {
      tr.nodes([]);
    }
    tr.getLayer()?.batchDraw();
  }, [selection, page]);

  function onWheel(e: Konva.KonvaEventObject<WheelEvent>) {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;
    const oldScale = scale;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const by = e.evt.deltaY > 0 ? 0.92 : 1.08;
    const newScale = clamp(oldScale * by, 0.08, 3);
    const mousePoint = { x: (pointer.x - pos.x) / oldScale, y: (pointer.y - pos.y) / oldScale };
    setScale(newScale);
    setPos({ x: pointer.x - mousePoint.x * newScale, y: pointer.y - mousePoint.y * newScale });
  }

  if (!page || !meta) {
    return <div className="grid h-full place-items-center text-sm text-[var(--color-fg-dim)]">No page selected</div>;
  }

  const layout = getLayout(page.layoutTemplateId);
  const order = getReadingOrder(layout, meta.readingDirection);

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden bg-[var(--color-ink)]">
      <Stage
        ref={stageRef}
        width={size.w}
        height={size.h}
        scaleX={scale}
        scaleY={scale}
        x={pos.x}
        y={pos.y}
        draggable={spaceDown}
        onWheel={onWheel}
        onMouseDown={(e) => {
          if (e.target === e.target.getStage()) {
            clearSelection();
            selNodeRef.current = null;
          }
        }}
        onDragEnd={(e) => {
          if (spaceDown && e.target === e.target.getStage()) setPos({ x: e.target.x(), y: e.target.y() });
        }}
        style={{ cursor: spaceDown ? "grab" : "default" }}
      >
        <Layer>
          {/* Paper */}
          <Rect x={0} y={0} width={PW} height={PH} fill="#f7f4ec" shadowColor="#000" shadowBlur={40} shadowOpacity={0.5} shadowOffsetY={12} />
          {/* Safe margin */}
          <Rect x={PW * 0.05} y={PH * 0.05} width={PW * 0.9} height={PH * 0.9} stroke="#cbb" dash={[8, 8]} strokeWidth={1} listening={false} />

          {page.panels.map((panel) => (
            <PanelNode
              key={panel.id}
              panel={panel}
              PW={PW}
              PH={PH}
              selected={selection.type === "panel" && selection.panelId === panel.id}
              onSelect={(node) => {
                selNodeRef.current = node;
                select({ type: "panel", panelId: panel.id });
              }}
              onChange={(patch) => patchPanel(panel.id, patch)}
            />
          ))}

          {/* Bubbles + SFX overlay (above raster art) */}
          {page.panels.map((panel) =>
            panel.bubbles.map((b) => (
              <BubbleNode
                key={b.id}
                bubble={b}
                panel={panel}
                PW={PW}
                PH={PH}
                selected={selection.type === "bubble" && selection.id === b.id}
                onSelect={(node) => {
                  selNodeRef.current = node;
                  select({ type: "bubble", panelId: panel.id, id: b.id });
                }}
                onChange={(patch) => patchBubble(panel.id, b.id, patch)}
                onEdit={(rect) => setEditing({ kind: "bubble", panelId: panel.id, id: b.id, value: b.text, ...rect, fontSize: b.fontSize })}
              />
            )),
          )}
          {page.panels.map((panel) =>
            panel.sfx.map((s) => (
              <SfxNode
                key={s.id}
                sfx={s}
                panel={panel}
                PW={PW}
                PH={PH}
                selected={selection.type === "sfx" && selection.id === s.id}
                onSelect={(node) => {
                  selNodeRef.current = node;
                  select({ type: "sfx", panelId: panel.id, id: s.id });
                }}
                onChange={(patch) => patchSfx(panel.id, s.id, patch)}
                onEdit={(rect) => setEditing({ kind: "sfx", panelId: panel.id, id: s.id, value: s.text, ...rect, fontSize: 24 })}
              />
            )),
          )}

          {/* Reading order overlay */}
          {showReadingOrder &&
            order.map((slotIdx, readIdx) => {
              const panel = page.panels[slotIdx];
              if (!panel) return null;
              return (
                <Group key={`ro-${slotIdx}`} listening={false} x={panel.x * PW + 10} y={panel.y * PH + 10}>
                  <Circle radius={16} fill="#e03131" />
                  <Text text={String(readIdx + 1)} fontSize={20} fill="#fff" width={32} height={32} offsetX={16} offsetY={10} align="center" fontStyle="bold" />
                </Group>
              );
            })}

          <Transformer
            ref={trRef}
            rotateEnabled={selection.type !== "panel"}
            keepRatio={false}
            anchorSize={8}
            borderStroke="#e03131"
            anchorStroke="#e03131"
            anchorFill="#fff"
            ignoreStroke
          />
        </Layer>
      </Stage>

      {editing && (
        <TextOverlay
          editing={editing}
          scale={scale}
          pos={pos}
          onCommit={(value) => {
            if (editing.kind === "bubble") patchBubble(editing.panelId, editing.id, { text: value });
            else patchSfx(editing.panelId, editing.id, { text: value });
            setEditing(null);
          }}
          onCancel={() => setEditing(null)}
        />
      )}

      {/* Fit / zoom controls */}
      <div className="absolute bottom-3 left-3 flex items-center gap-1 rounded-md border border-[var(--color-line)] bg-[var(--color-panel)]/90 px-1.5 py-1 text-xs backdrop-blur">
        <button className="px-2 py-0.5 hover:text-[var(--color-vermilion)]" onClick={() => setScale((s) => clamp(s * 0.9, 0.08, 3))}>−</button>
        <button className="min-w-[3rem] px-1 tabular-nums" onClick={fit}>{Math.round(scale * 100)}%</button>
        <button className="px-2 py-0.5 hover:text-[var(--color-vermilion)]" onClick={() => setScale((s) => clamp(s * 1.1, 0.08, 3))}>+</button>
        <span className="ml-1 text-[10px] text-[var(--color-fg-faint)]">space+drag to pan</span>
      </div>
    </div>
  );
}

// ── Panel ─────────────────────────────────────────────────────────────────────
function PanelNode({ panel, PW, PH, selected, onSelect, onChange }: { panel: Panel; PW: number; PH: number; selected: boolean; onSelect: (n: Konva.Node) => void; onChange: (patch: Partial<Panel>) => void }) {
  const groupRef = useRef<Konva.Group>(null);
  const [img] = useImage(panel.imageUrl);
  const x = panel.x * PW;
  const y = panel.y * PH;
  const w = panel.w * PW;
  const h = panel.h * PH;

  useEffect(() => {
    if (selected && groupRef.current) onSelect(groupRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const crop = img ? coverCrop(img.width, img.height, w, h) : undefined;

  return (
    <Group
      ref={groupRef}
      x={x}
      y={y}
      draggable
      onMouseDown={(e) => {
        e.cancelBubble = true;
        if (groupRef.current) onSelect(groupRef.current);
      }}
      clipFunc={(ctx) => clipShape(ctx, panel.shape, w, h)}
      onDragEnd={(e) => {
        onChange({ x: snap(e.target.x() / PW), y: snap(e.target.y() / PH) });
      }}
      onTransformEnd={(e) => {
        const node = e.target;
        const sx = node.scaleX();
        const sy = node.scaleY();
        node.scaleX(1);
        node.scaleY(1);
        onChange({
          x: snap(node.x() / PW),
          y: snap(node.y() / PH),
          w: clamp((w * sx) / PW, 0.05, 1),
          h: clamp((h * sy) / PH, 0.05, 1),
        });
      }}
    >
      <Rect x={0} y={0} width={w} height={h} fill="#e6e3da" />
      {img ? (
        <KImage image={img} x={0} y={0} width={w} height={h} crop={crop} />
      ) : (
        <>
          <Rect x={0} y={0} width={w} height={h} fill="#eceae2" />
          <Text text={panel.status === "rendering" ? "rendering…" : panel.shotType} x={0} y={h / 2 - 8} width={w} align="center" fontSize={14} fill="#9a968c" />
        </>
      )}
      {panel.shape !== "bleed" && <Rect x={0} y={0} width={w} height={h} stroke="#111" strokeWidth={panel.borderWidth} />}
    </Group>
  );
}

// ── Bubble ────────────────────────────────────────────────────────────────────
function BubbleNode({ bubble, panel, PW, PH, selected, onSelect, onChange, onEdit }: { bubble: Bubble; panel: Panel; PW: number; PH: number; selected: boolean; onSelect: (n: Konva.Node) => void; onChange: (patch: Partial<Bubble>) => void; onEdit: (rect: { x: number; y: number; w: number }) => void }) {
  const groupRef = useRef<Konva.Group>(null);
  const pr = { x: panel.x * PW, y: panel.y * PH, w: panel.w * PW, h: panel.h * PH };
  const bw = bubble.w * pr.w;
  const bh = bubble.h * pr.h;
  const cx = pr.x + (bubble.x + bubble.w / 2) * pr.w;
  const cy = pr.y + (bubble.y + bubble.h / 2) * pr.h;

  const tailAbs = bubble.autoTail
    ? { x: pr.x + 0.5 * pr.w, y: pr.y + 0.92 * pr.h }
    : { x: pr.x + bubble.tailX * pr.w, y: pr.y + bubble.tailY * pr.h };

  useEffect(() => {
    if (selected && groupRef.current) onSelect(groupRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const stroke = "#111";
  const strokeWidth = 3;
  const fontFamily = bubble.type === "shout" ? "var(--font-sfx)" : bubble.type === "narration" ? "var(--font-narration)" : "var(--font-dialogue)";

  return (
    <>
      {/* Tail (in page coords, drawn first so bubble body overlaps its base) */}
      {bubble.type !== "narration" && bubble.type !== "aside" && (
        <Line
          points={tailPoints(cx, cy, tailAbs.x, tailAbs.y, bw, bh)}
          closed
          fill="#fff"
          stroke={stroke}
          strokeWidth={strokeWidth}
          listening={false}
        />
      )}
      {bubble.type !== "narration" && bubble.type !== "aside" && (
        <Circle
          x={tailAbs.x}
          y={tailAbs.y}
          radius={6 / 1}
          fill="#e03131"
          opacity={selected ? 1 : 0}
          draggable
          onMouseDown={(e) => (e.cancelBubble = true)}
          onDragMove={(e) => {
            onChange({
              autoTail: false,
              tailX: (e.target.x() - pr.x) / pr.w,
              tailY: (e.target.y() - pr.y) / pr.h,
            });
          }}
        />
      )}

      <Group
        ref={groupRef}
        x={cx}
        y={cy}
        rotation={bubble.rotation}
        draggable
        onMouseDown={(e) => {
          e.cancelBubble = true;
          if (groupRef.current) onSelect(groupRef.current);
        }}
        onDblClick={() => onEdit({ x: cx - bw / 2, y: cy - bh / 2, w: bw })}
        onDragEnd={(e) => {
          const nx = (e.target.x() - bw / 2 - pr.x) / pr.w;
          const ny = (e.target.y() - bh / 2 - pr.y) / pr.h;
          onChange({ x: nx, y: ny });
        }}
        onTransformEnd={(e) => {
          const node = e.target;
          const sx = node.scaleX();
          const sy = node.scaleY();
          node.scaleX(1);
          node.scaleY(1);
          onChange({ w: clamp((bw * sx) / pr.w, 0.1, 2), h: clamp((bh * sy) / pr.h, 0.05, 2), rotation: node.rotation() });
        }}
      >
        {renderBubbleShape(bubble, bw, bh, stroke, strokeWidth)}
        <Text
          text={bubble.text}
          x={-bw / 2 + 8}
          y={-bh / 2}
          width={bw - 16}
          height={bh}
          align="center"
          verticalAlign="middle"
          fontSize={bubble.fontSize}
          fontFamily={fontFamily}
          fill="#111"
          listening={false}
          wrap="word"
        />
      </Group>
    </>
  );
}

function renderBubbleShape(bubble: Bubble, bw: number, bh: number, stroke: string, strokeWidth: number) {
  switch (bubble.type) {
    case "speech":
    case "offpanel":
      return <Ellipse radiusX={bw / 2} radiusY={bh / 2} fill="#fff" stroke={stroke} strokeWidth={strokeWidth} />;
    case "thought":
      return <Ellipse radiusX={bw / 2} radiusY={bh / 2} fill="#fff" stroke={stroke} strokeWidth={strokeWidth} dash={[2, 6]} />;
    case "whisper":
      return <Ellipse radiusX={bw / 2} radiusY={bh / 2} fill="#fff" stroke={stroke} strokeWidth={strokeWidth} dash={[10, 7]} />;
    case "shout":
      return <Star numPoints={14} innerRadius={Math.min(bw, bh) / 2.6} outerRadius={Math.max(bw, bh) / 1.7} fill="#fff" stroke={stroke} strokeWidth={strokeWidth} />;
    case "narration":
      return <Rect x={-bw / 2} y={-bh / 2} width={bw} height={bh} fill="#fff" stroke={stroke} strokeWidth={strokeWidth} />;
    case "aside":
      return <Rect x={-bw / 2} y={-bh / 2} width={bw} height={bh} cornerRadius={6} fill="#f0eee7" stroke={stroke} strokeWidth={strokeWidth} />;
    default:
      return null;
  }
}

function tailPoints(cx: number, cy: number, tipX: number, tipY: number, bw: number, bh: number): number[] {
  const dx = tipX - cx;
  const dy = tipY - cy;
  const len = Math.hypot(dx, dy) || 1;
  const nx = dx / len;
  const ny = dy / len;
  const baseX = cx + nx * (bw / 2) * 0.6;
  const baseY = cy + ny * (bh / 2) * 0.6;
  const px = -ny * 12;
  const py = nx * 12;
  return [baseX + px, baseY + py, tipX, tipY, baseX - px, baseY - py];
}

// ── SFX ───────────────────────────────────────────────────────────────────────
function SfxNode({ sfx, panel, PW, PH, selected, onSelect, onChange, onEdit }: { sfx: Sfx; panel: Panel; PW: number; PH: number; selected: boolean; onSelect: (n: Konva.Node) => void; onChange: (patch: Partial<Sfx>) => void; onEdit: (rect: { x: number; y: number; w: number }) => void }) {
  const ref = useRef<Konva.Text>(null);
  const pr = { x: panel.x * PW, y: panel.y * PH, w: panel.w * PW, h: panel.h * PH };
  const x = pr.x + sfx.x * pr.w;
  const y = pr.y + sfx.y * pr.h;
  const fontSize = 54 * sfx.scale;

  useEffect(() => {
    if (selected && ref.current) onSelect(ref.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  return (
    <Text
      ref={ref}
      text={sfx.text}
      x={x}
      y={y}
      rotation={sfx.rotation}
      fontSize={fontSize}
      fontFamily="var(--font-sfx)"
      fill="#111"
      stroke="#fff"
      strokeWidth={4}
      fillAfterStrokeEnabled
      draggable
      onMouseDown={(e) => {
        e.cancelBubble = true;
        if (ref.current) onSelect(ref.current);
      }}
      onDblClick={() => onEdit({ x, y, w: 160 })}
      onDragEnd={(e) => onChange({ x: (e.target.x() - pr.x) / pr.w, y: (e.target.y() - pr.y) / pr.h })}
      onTransformEnd={(e) => {
        const node = e.target;
        const sx = node.scaleX();
        node.scaleX(1);
        node.scaleY(1);
        onChange({ scale: clamp(sfx.scale * sx, 0.3, 4), rotation: node.rotation() });
      }}
    />
  );
}

// ── Inline text editor overlay ─────────────────────────────────────────────────
function TextOverlay({ editing, scale, pos, onCommit, onCancel }: { editing: EditingText; scale: number; pos: { x: number; y: number }; onCommit: (v: string) => void; onCancel: () => void }) {
  const [value, setValue] = useState(editing.value);
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);
  const left = pos.x + editing.x * scale;
  const top = pos.y + editing.y * scale;
  const width = Math.max(80, editing.w * scale);
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => onCommit(value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          onCommit(value);
        } else if (e.key === "Escape") {
          onCancel();
        }
      }}
      className="absolute z-50 resize-none rounded border border-[var(--color-vermilion)] bg-white p-1 text-center text-black shadow-lg focus:outline-none"
      style={{ left, top, width, fontSize: Math.max(11, editing.fontSize * scale) }}
    />
  );
}

// ── helpers ─────────────────────────────────────────────────────────────────
function snap(v: number): number {
  return Math.round(v * 200) / 200; // 0.5% grid
}

function isTypingTarget(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
}

function coverCrop(iw: number, ih: number, tw: number, th: number) {
  const ir = iw / ih;
  const tr = tw / th;
  if (ir > tr) {
    const cw = ih * tr;
    return { x: (iw - cw) / 2, y: 0, width: cw, height: ih };
  }
  const ch = iw / tr;
  return { x: 0, y: (ih - ch) / 2, width: iw, height: ch };
}

function clipShape(ctx: Konva.Context, shape: Panel["shape"], w: number, h: number) {
  ctx.beginPath();
  if (shape === "circle") {
    ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  } else if (shape === "skew" || shape === "burst") {
    const s = Math.min(w, h) * 0.12;
    ctx.moveTo(s, 0);
    ctx.lineTo(w, 0);
    ctx.lineTo(w - s, h);
    ctx.lineTo(0, h);
    ctx.closePath();
  } else {
    ctx.rect(0, 0, w, h);
  }
}
