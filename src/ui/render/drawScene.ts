import { alpha, toCss, type Color } from '../../engine/color';
import type { PixelDoc } from '../../engine/document';
import type { ViewSettings } from '../../engine/editor';
import type { Point, Rect } from '../../engine/math';
import { brush, mirrored } from '../../engine/raster';
import { checkerPattern, type Theme } from './theme';

export interface Camera {
  dpr: number;
  /** Device pixels per art pixel. */
  scale: number;
  originX: number;
  originY: number;
}

export interface BrushPreview {
  at: Point;
  size: number;
  /** Fill color of the footprint (null = outline only). */
  color: Color | null;
}

export interface Scene {
  doc: PixelDoc;
  /** Flattened image (doc size, background included). */
  composite: CanvasImageSource;
  view: ViewSettings;
  selection: Rect | null;
  brush: BrushPreview | null;
  label: string;
}

const FONT = 'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

/** Frame name above the canvas, in CSS pixels. Shared with the inline rename field. */
export const LABEL = { size: 11, gap: 6 };
const labelFont = (dpr: number) => `500 ${Math.round(LABEL.size * dpr)}px ${FONT}`;

/** Hit box of the frame name, in device pixels (a few pixels of slack around the text). */
export function labelRect(ctx: CanvasRenderingContext2D, label: string, camera: Camera): Rect {
  const { dpr, originX: X, originY: Y } = camera;
  ctx.save();
  ctx.font = labelFont(dpr);
  const w = ctx.measureText(label).width;
  ctx.restore();
  const pad = Math.round(4 * dpr);
  const h = Math.round((LABEL.size + LABEL.gap) * dpr);
  return { x: X - pad, y: Y - h - pad, w: w + pad * 2, h: h + pad };
}

/** On-screen width of the render gap, proportional to the export settings. */
export function gapPixels(doc: PixelDoc, scale: number): number {
  const { gap, pixelSize } = doc.render;
  if (gap <= 0) return 0;
  const g = Math.max(1, Math.round((scale * gap) / (pixelSize + gap)));
  return g < scale ? g : 0;
}

export function drawScene(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scene: Scene,
  camera: Camera,
  theme: Theme,
): void {
  const { doc, view } = scene;
  const { dpr, scale: s, originX: X, originY: Y } = camera;
  const W = doc.width;
  const H = doc.height;
  const cw = W * s;
  const ch = H * s;
  const lw = Math.max(1, Math.round(dpr));

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = theme.canvas;
  ctx.fillRect(0, 0, width, height);

  const checker = checkerPattern(ctx, Math.max(4, Math.round(8 * dpr)), theme.checkA, theme.checkB);

  // Tile preview: the 8 neighbors are drawn like the real canvas (checkerboard included) so seams
  // are easy to spot, then slightly dimmed to keep the editable copy in focus.
  if (view.tile) {
    for (let j = -1; j <= 1; j++)
      for (let i = -1; i <= 1; i++) {
        if (!i && !j) continue;
        const x = X + i * cw;
        const y = Y + j * ch;
        ctx.save();
        ctx.translate(x, y);
        ctx.fillStyle = checker;
        ctx.fillRect(0, 0, cw, ch);
        ctx.restore();
        ctx.drawImage(scene.composite, x, y, cw, ch);
      }
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = theme.canvas;
    ctx.fillRect(X - cw, Y - ch, cw * 3, ch * 3);
    ctx.restore();
  }

  ctx.save();
  ctx.translate(X, Y);
  ctx.fillStyle = checker;
  ctx.fillRect(0, 0, cw, ch);
  ctx.restore();
  ctx.drawImage(scene.composite, X, Y, cw, ch);

  // Render gap: paint strips between pixels with the background (or the checkerboard).
  const gap = view.showGap ? gapPixels(doc, s) : 0;
  if (gap) {
    ctx.save();
    ctx.translate(X, Y);
    ctx.fillStyle = doc.backgroundVisible && alpha(doc.background) ? toCss(doc.background) : checker;
    for (let i = 0; i < W; i++) ctx.fillRect(i * s + s - gap, 0, gap, ch);
    for (let j = 0; j < H; j++) ctx.fillRect(0, j * s + s - gap, cw, gap);
    ctx.restore();
  }

  // Frame name above the canvas.
  ctx.font = labelFont(dpr);
  ctx.fillStyle = theme.muted;
  ctx.textBaseline = 'bottom';
  ctx.fillText(scene.label, X, Y - Math.round(LABEL.gap * dpr));

  // Pixel grid (every pixel) and major grid (every 8 pixels).
  if (view.grid && s >= 6 && !gap) {
    ctx.fillStyle = theme.grid;
    for (let i = 1; i < W; i++) if (i % 8) ctx.fillRect(X + i * s, Y, 1, ch);
    for (let j = 1; j < H; j++) if (j % 8) ctx.fillRect(X, Y + j * s, cw, 1);
  }
  if (view.grid && s >= 2 && (W > 8 || H > 8)) {
    ctx.fillStyle = theme.gridMajor;
    for (let i = 8; i < W; i += 8) ctx.fillRect(X + i * s, Y, 1, ch);
    for (let j = 8; j < H; j += 8) ctx.fillRect(X, Y + j * s, cw, 1);
  }
  ctx.strokeStyle = theme.frame;
  ctx.lineWidth = 1;
  ctx.strokeRect(X - 0.5, Y - 0.5, cw + 1, ch + 1);

  // Brush footprint: one cell per pixel, shrunk by the gap so it matches what will be painted.
  if (scene.brush) {
    const { at, size, color } = scene.brush;
    const cell = gap ? s - gap : s;
    const o = Math.floor((size - 1) / 2);
    for (const m of mirrored(at.x - o, at.y - o, W, H, view.mirrorX, view.mirrorY, size)) {
      brush(m.x + o, m.y + o, size, (x, y) => {
        const rx = X + x * s;
        const ry = Y + y * s;
        if (color !== null && alpha(color)) {
          ctx.fillStyle = toCss(color);
          ctx.globalAlpha = 0.6;
          ctx.fillRect(rx, ry, cell, cell);
          ctx.globalAlpha = 1;
        }
        if (gap || size === 1) {
          ctx.strokeStyle = theme.accent;
          ctx.lineWidth = lw;
          ctx.strokeRect(rx + lw / 2, ry + lw / 2, cell - lw, cell - lw);
        }
      });
      if (!gap && size > 1) {
        const w = size * s;
        ctx.strokeStyle = theme.accent;
        ctx.lineWidth = lw;
        ctx.strokeRect(X + m.x * s + lw / 2, Y + m.y * s + lw / 2, w - lw, w - lw);
      }
    }
  }

  // Symmetry axes.
  ctx.fillStyle = theme.axis;
  const ext = Math.round(12 * dpr);
  if (view.mirrorX) ctx.fillRect(Math.round(X + cw / 2 - lw / 2), Y - ext, lw, ch + ext * 2);
  if (view.mirrorY) ctx.fillRect(X - ext, Math.round(Y + ch / 2 - lw / 2), cw + ext * 2, lw);

  // Selection: blue outline, corner handles and a size badge.
  const sel = scene.selection;
  if (sel) {
    const rx = X + sel.x * s;
    const ry = Y + sel.y * s;
    const rw = sel.w * s;
    const rh = sel.h * s;
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = lw;
    ctx.strokeRect(rx + lw / 2, ry + lw / 2, rw - lw, rh - lw);
    const hs = Math.round(7 * dpr);
    for (const [cx, cy] of [
      [rx, ry],
      [rx + rw, ry],
      [rx, ry + rh],
      [rx + rw, ry + rh],
    ]) {
      const hx = Math.round(cx - hs / 2);
      const hy = Math.round(cy - hs / 2);
      ctx.fillStyle = '#fff';
      ctx.fillRect(hx, hy, hs, hs);
      ctx.strokeRect(hx + lw / 2, hy + lw / 2, hs - lw, hs - lw);
    }
    const text = `${sel.w} × ${sel.h}`;
    ctx.font = `500 ${Math.round(11 * dpr)}px ${FONT}`;
    const pw = Math.round(ctx.measureText(text).width + 10 * dpr);
    const ph = Math.round(16 * dpr);
    const bx = Math.round(rx + rw / 2 - pw / 2);
    const by = Math.round(ry + rh + 8 * dpr);
    ctx.fillStyle = theme.accent;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(bx, by, pw, ph, Math.round(2 * dpr));
    else ctx.rect(bx, by, pw, ph);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(text, bx + pw / 2, by + ph / 2 + 0.5 * dpr);
    ctx.textAlign = 'start';
  }
}
