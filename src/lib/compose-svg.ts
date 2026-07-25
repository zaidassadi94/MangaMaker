import type { Bubble, PageWithPanels, Panel, Project, Sfx } from "@/lib/types";
import { wrapText } from "@/lib/bubbles";

// ─────────────────────────────────────────────────────────────────────────────
// Compose a full manga page as a self-contained SVG string (panel art + vector
// bubbles + SFX). Shared by the server export route and the client rasteriser,
// so pages look identical everywhere. Pure — no DOM.
// ─────────────────────────────────────────────────────────────────────────────

export const PAGE_PX: Record<Project["pageSize"], { w: number; h: number }> = {
  b5: { w: 1200, h: 1697 },
  a4: { w: 1200, h: 1697 },
  webtoon: { w: 900, h: 2400 },
};

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function panelRect(p: Panel, W: number, H: number) {
  return { x: p.x * W, y: p.y * H, w: p.w * W, h: p.h * H };
}

function bubbleTextSvg(text: string, bx: number, by: number, bw: number, fontSize: number, fontFamily: string, align: "center" | "left"): string {
  const maxChars = Math.max(1, Math.floor((bw * 0.82) / (fontSize * 0.55)));
  const lines = wrapText(text, maxChars);
  const lh = fontSize * 1.25;
  const startY = by - ((lines.length - 1) * lh) / 2 + fontSize * 0.35;
  const anchor = align === "center" ? "middle" : "start";
  const tx = align === "center" ? bx : bx;
  return `<text x="${tx.toFixed(1)}" y="${startY.toFixed(1)}" font-family="${fontFamily}" font-size="${fontSize}" text-anchor="${anchor}" fill="#111">${lines
    .map((l, i) => `<tspan x="${tx.toFixed(1)}" dy="${i === 0 ? 0 : lh.toFixed(1)}">${esc(l)}</tspan>`)
    .join("")}</text>`;
}

function drawBubble(b: Bubble, panel: { x: number; y: number; w: number; h: number }, W: number, H: number): string {
  const pr = { x: panel.x * W, y: panel.y * H, w: panel.w * W, h: panel.h * H };
  const bx = pr.x + b.x * pr.w;
  const by = pr.y + b.y * pr.h;
  const bw = b.w * pr.w;
  const bh = b.h * pr.h;
  const cx = bx + bw / 2;
  const cy = by + bh / 2;
  const tipX = pr.x + b.tailX * pr.w;
  const tipY = pr.y + b.tailY * pr.h;
  const fontSize = b.fontSize;
  const fontFamily = fontFamilyFor(b);

  const stroke = `stroke="#111" stroke-width="2.5"`;
  let shape = "";
  switch (b.type) {
    case "speech":
    case "offpanel": {
      shape =
        `<ellipse cx="${cx}" cy="${cy}" rx="${bw / 2}" ry="${bh / 2}" fill="#fff" ${stroke}/>` +
        tail(cx, cy, tipX, tipY, bw, bh);
      break;
    }
    case "thought": {
      shape =
        `<ellipse cx="${cx}" cy="${cy}" rx="${bw / 2}" ry="${bh / 2}" fill="#fff" ${stroke} stroke-dasharray="1 0"/>` +
        thoughtTrail(cx, cy, tipX, tipY);
      break;
    }
    case "shout": {
      shape = `<path d="${starPath(cx, cy, bw / 2 + 6, bh / 2 + 6, 14)}" fill="#fff" ${stroke} stroke-linejoin="round"/>` + tail(cx, cy, tipX, tipY, bw, bh);
      break;
    }
    case "whisper": {
      shape = `<ellipse cx="${cx}" cy="${cy}" rx="${bw / 2}" ry="${bh / 2}" fill="#fff" ${stroke} stroke-dasharray="6 5"/>` + tail(cx, cy, tipX, tipY, bw, bh);
      break;
    }
    case "narration": {
      shape = `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" fill="#fff" ${stroke}/>`;
      break;
    }
    case "aside": {
      shape = `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="4" fill="#f3f3f3" ${stroke}/>`;
      break;
    }
  }
  const text = bubbleTextSvg(b.text, cx, cy, bw, fontSize, fontFamily, b.type === "narration" ? "center" : "center");
  return `<g transform="rotate(${b.rotation} ${cx} ${cy})">${shape}${text}</g>`;
}

function fontFamilyFor(b: Bubble): string {
  if (b.type === "shout") return "'Bangers', cursive";
  if (b.type === "narration") return "'Zen Antique', serif";
  return "'Comic Neue', 'Comic Sans MS', cursive";
}

function tail(cx: number, cy: number, tipX: number, tipY: number, bw: number, bh: number): string {
  const dx = tipX - cx;
  const dy = tipY - cy;
  const len = Math.hypot(dx, dy) || 1;
  const nx = dx / len;
  const ny = dy / len;
  const baseX = cx + nx * (bw / 2) * 0.7;
  const baseY = cy + ny * (bh / 2) * 0.7;
  const perpX = -ny * 12;
  const perpY = nx * 12;
  return `<path d="M ${(baseX + perpX).toFixed(1)} ${(baseY + perpY).toFixed(1)} L ${tipX.toFixed(1)} ${tipY.toFixed(1)} L ${(baseX - perpX).toFixed(1)} ${(baseY - perpY).toFixed(1)} Z" fill="#fff" stroke="#111" stroke-width="2.5"/>`;
}

function thoughtTrail(cx: number, cy: number, tipX: number, tipY: number): string {
  const out: string[] = [];
  for (let i = 1; i <= 3; i++) {
    const t = i / 4;
    const x = cx + (tipX - cx) * t;
    const y = cy + (tipY - cy) * t;
    out.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(9 - i * 2).toFixed(1)}" fill="#fff" stroke="#111" stroke-width="2"/>`);
  }
  return out.join("");
}

function starPath(cx: number, cy: number, rx: number, ry: number, points: number): string {
  const pts: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const outer = i % 2 === 0;
    const a = (Math.PI / points) * i - Math.PI / 2;
    const r = outer ? 1 : 0.74;
    pts.push(`${(cx + Math.cos(a) * rx * r).toFixed(1)},${(cy + Math.sin(a) * ry * r).toFixed(1)}`);
  }
  return `M ${pts.join(" L ")} Z`;
}

function drawSfx(s: Sfx, panel: { x: number; y: number; w: number; h: number }, W: number, H: number): string {
  const pr = { x: panel.x * W, y: panel.y * H, w: panel.w * W, h: panel.h * H };
  const cx = pr.x + s.x * pr.w;
  const cy = pr.y + s.y * pr.h;
  const size = 46 * s.scale;
  const skew = s.style === "jagged" ? -8 : 0;
  return `<g transform="translate(${cx.toFixed(1)} ${cy.toFixed(1)}) rotate(${s.rotation}) skewX(${skew})">
    <text font-family="'Bangers', cursive" font-size="${size}" text-anchor="middle" fill="#111" stroke="#fff" stroke-width="4" paint-order="stroke" style="letter-spacing:1px">${esc(s.text)}</text>
  </g>`;
}

export function composePageSvg(
  page: PageWithPanels,
  project: Pick<Project, "pageSize">,
  opts: { showBorders?: boolean } = {},
): string {
  const { w: W, h: H } = PAGE_PX[project.pageSize];
  const showBorders = opts.showBorders ?? true;
  const bg = page.backgroundColor || "#ffffff";

  const clipDefs: string[] = [];
  const body: string[] = [];

  page.panels.forEach((p, i) => {
    const r = panelRect(p, W, H);
    const clipId = `clip-${page.id}-${i}`;
    let clipShape = `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}"/>`;
    if (p.shape === "circle") {
      clipShape = `<ellipse cx="${r.x + r.w / 2}" cy="${r.y + r.h / 2}" rx="${r.w / 2}" ry="${r.h / 2}"/>`;
    } else if (p.shape === "skew" || p.shape === "burst") {
      const s = Math.min(r.w, r.h) * 0.12;
      clipShape = `<polygon points="${r.x + s},${r.y} ${r.x + r.w},${r.y} ${r.x + r.w - s},${r.y + r.h} ${r.x},${r.y + r.h}"/>`;
    }
    clipDefs.push(`<clipPath id="${clipId}">${clipShape}</clipPath>`);

    body.push(`<g clip-path="url(#${clipId})">`);
    body.push(`<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="#e9e7df"/>`);
    if (p.imageUrl) {
      body.push(`<image href="${esc(p.imageUrl)}" x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" preserveAspectRatio="xMidYMid slice"/>`);
    } else {
      body.push(`<text x="${r.x + r.w / 2}" y="${r.y + r.h / 2}" font-family="monospace" font-size="18" text-anchor="middle" fill="#999">${esc(p.shotType)}</text>`);
    }
    body.push(`</g>`);
    if (showBorders && p.shape !== "bleed") {
      body.push(`<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="none" stroke="#111" stroke-width="${p.borderWidth}"/>`);
    }

    for (const b of p.bubbles) body.push(drawBubble(b, p, W, H));
    for (const s of p.sfx) body.push(drawSfx(s, p, W, H));
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>${clipDefs.join("")}</defs>
  <rect width="${W}" height="${H}" fill="${esc(bg)}"/>
  ${body.join("\n")}
</svg>`;
}
