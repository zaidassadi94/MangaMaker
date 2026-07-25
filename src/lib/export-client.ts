"use client";

import type { PageWithPanels, Project } from "@/lib/types";
import { composePageSvg, PAGE_PX } from "@/lib/compose-svg";

// ─────────────────────────────────────────────────────────────────────────────
// Client-side export. Rasterises the shared SVG page composition to canvas, then
// produces PNG (zip), PDF (jsPDF), CBZ (jszip), or a stitched webtoon JPEG.
// ─────────────────────────────────────────────────────────────────────────────

type Proj = Pick<Project, "pageSize" | "title" | "readingDirection">;

function svgToCanvas(svg: string, w: number, h: number): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas 2D unavailable"));
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas);
    };
    img.onerror = () => reject(new Error("Failed to rasterise page"));
    img.src = url;
  });
}

async function renderPageCanvas(page: PageWithPanels, project: Proj, scale: number): Promise<HTMLCanvasElement> {
  const { w, h } = PAGE_PX[project.pageSize];
  const svg = composePageSvg(page, project, { showBorders: true });
  return svgToCanvas(svg, Math.round(w * scale), Math.round(h * scale));
}

function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function safeName(title: string): string {
  return title.replace(/[^\w.-]+/g, "_").slice(0, 60) || "mangaforge";
}

function canvasToBlob(canvas: HTMLCanvasElement, type = "image/png", quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), type, quality);
  });
}

export async function exportPng(pages: PageWithPanels[], project: Proj, printReady = false): Promise<void> {
  const scale = printReady ? 2.4 : 1.2;
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  for (let i = 0; i < pages.length; i++) {
    const canvas = await renderPageCanvas(pages[i]!, project, scale);
    const blob = await canvasToBlob(canvas, "image/png");
    zip.file(`${String(i + 1).padStart(3, "0")}.png`, blob);
  }
  const out = await zip.generateAsync({ type: "blob" });
  download(out, `${safeName(project.title)}-png.zip`);
}

export async function exportPdf(pages: PageWithPanels[], project: Proj, printReady = false): Promise<void> {
  const scale = printReady ? 2.4 : 1.5;
  const { jsPDF } = await import("jspdf");
  const { w, h } = PAGE_PX[project.pageSize];
  const pw = Math.round(w * scale);
  const ph = Math.round(h * scale);
  const pdf = new jsPDF({ unit: "px", format: [pw, ph], orientation: ph >= pw ? "portrait" : "landscape" });
  for (let i = 0; i < pages.length; i++) {
    const canvas = await renderPageCanvas(pages[i]!, project, scale);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    if (i > 0) pdf.addPage([pw, ph], ph >= pw ? "portrait" : "landscape");
    pdf.addImage(dataUrl, "JPEG", 0, 0, pw, ph);
  }
  pdf.save(`${safeName(project.title)}.pdf`);
}

export async function exportCbz(pages: PageWithPanels[], project: Proj): Promise<void> {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  for (let i = 0; i < pages.length; i++) {
    const canvas = await renderPageCanvas(pages[i]!, project, 1.5);
    const blob = await canvasToBlob(canvas, "image/jpeg", 0.92);
    zip.file(`${String(i + 1).padStart(3, "0")}.jpg`, blob);
  }
  zip.file(
    "ComicInfo.xml",
    `<?xml version="1.0"?>\n<ComicInfo>\n  <Title>${project.title.replace(/[<&>]/g, "")}</Title>\n  <PageCount>${pages.length}</PageCount>\n  <Manga>${project.readingDirection === "rtl" ? "YesAndRightToLeft" : "Yes"}</Manga>\n</ComicInfo>`,
  );
  const out = await zip.generateAsync({ type: "blob", mimeType: "application/vnd.comicbook+zip" });
  download(new Blob([out], { type: "application/vnd.comicbook+zip" }), `${safeName(project.title)}.cbz`);
}

export async function exportWebtoon(pages: PageWithPanels[], project: Proj): Promise<void> {
  const scale = 1.2;
  const canvases: HTMLCanvasElement[] = [];
  for (const page of pages) canvases.push(await renderPageCanvas(page, project, scale));
  const width = Math.max(...canvases.map((c) => c.width), 1);
  const totalHeight = canvases.reduce((sum, c) => sum + c.height, 0);
  const strip = document.createElement("canvas");
  strip.width = width;
  strip.height = totalHeight;
  const ctx = strip.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D unavailable");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, totalHeight);
  let y = 0;
  for (const c of canvases) {
    ctx.drawImage(c, 0, y);
    y += c.height;
  }
  const blob = await canvasToBlob(strip, "image/jpeg", 0.9);
  download(blob, `${safeName(project.title)}-webtoon.jpg`);
}
