import { alpha, blue, green, red, type Color } from './color';
import type { PixelBlock } from './region';

export interface PixelGrid {
  /** Screen pixels per art pixel. */
  scale: number;
  /** Where the grid starts (0 to scale − 1): a cropped screenshot cuts the first cells. */
  offsetX: number;
  offsetY: number;
}

/** Two colors that differ more than compression noise (JPEG, screenshots). */
function differ(a: Color, b: Color): boolean {
  if (a === b) return false;
  if (!alpha(a) || !alpha(b)) return alpha(a) !== alpha(b);
  return (
    Math.abs(red(a) - red(b)) + Math.abs(green(a) - green(b)) + Math.abs(blue(a) - blue(b)) > 36 ||
    Math.abs(alpha(a) - alpha(b)) > 24
  );
}

/**
 * How many color changes there are at each position along an axis: `counts[i]` for the edge
 * between pixel i − 1 and pixel i (along x for columns, along y for rows).
 */
function edgeCounts(pixels: Uint32Array, width: number, height: number, axis: 'x' | 'y'): number[] {
  const size = axis === 'x' ? width : height;
  const counts = new Array<number>(size).fill(0);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (axis === 'x' && x > 0 && differ(pixels[i], pixels[i - 1])) counts[x]++;
      if (axis === 'y' && y > 0 && differ(pixels[i], pixels[i - width])) counts[y]++;
    }
  return counts;
}

/** The share of the edges that fall on a grid of `scale` starting at `offset`. */
function fit(counts: number[], scale: number, offset: number): number {
  let on = 0;
  let total = 0;
  counts.forEach((c, i) => {
    total += c;
    if ((i - offset) % scale === 0) on += c;
  });
  return total ? on / total : 0;
}

/** The offset where the most edges fall on the grid, and that share. */
function bestOffset(counts: number[], scale: number): { offset: number; score: number } {
  let best = { offset: 0, score: 0 };
  for (let o = 0; o < scale; o++) {
    const score = fit(counts, scale, o);
    if (score > best.score) best = { offset: o, score };
  }
  return best;
}

/**
 * Finds the pixel grid of a scaled-up image: the largest scale (2 to 64) where nearly all color
 * changes, along both axes, fall on the grid lines. Null when the image doesn't look scaled up.
 */
export function detectPixelGrid(pixels: Uint32Array, width: number, height: number): PixelGrid | null {
  const cols = edgeCounts(pixels, width, height, 'x');
  const rows = edgeCounts(pixels, width, height, 'y');
  const edges = cols.reduce((a, b) => a + b, 0) + rows.reduce((a, b) => a + b, 0);
  // A flat image has nothing to go by.
  if (edges < 8) return null;
  const max = Math.min(64, Math.floor(Math.min(width, height) / 2));
  for (let scale = max; scale >= 2; scale--) {
    const x = bestOffset(cols, scale);
    const y = bestOffset(rows, scale);
    if (x.score >= 0.95 && y.score >= 0.95) return { scale, offsetX: x.offset, offsetY: y.offset };
  }
  return null;
}

/** The art's size once scaled down along the grid (a cut cell at an edge still counts). */
export function gridSize(width: number, height: number, grid: PixelGrid): { width: number; height: number } {
  const cells = (size: number, offset: number) =>
    (offset > 0 ? 1 : 0) + Math.ceil((size - offset) / grid.scale);
  return { width: cells(width, grid.offsetX), height: cells(height, grid.offsetY) };
}

/** Scales an image back down along its grid, taking each cell's middle pixel. */
export function downscaleToGrid(
  pixels: Uint32Array,
  width: number,
  height: number,
  grid: PixelGrid,
): PixelBlock {
  const { scale, offsetX, offsetY } = grid;
  const size = gridSize(width, height, grid);
  const startX = offsetX > 0 ? offsetX - scale : 0;
  const startY = offsetY > 0 ? offsetY - scale : 0;
  const out = new Uint32Array(size.width * size.height);
  for (let cy = 0; cy < size.height; cy++)
    for (let cx = 0; cx < size.width; cx++) {
      // The middle of the cell, kept on the image for the cut cells at the edges.
      const x0 = Math.max(0, startX + cx * scale);
      const x1 = Math.min(width, startX + (cx + 1) * scale);
      const y0 = Math.max(0, startY + cy * scale);
      const y1 = Math.min(height, startY + (cy + 1) * scale);
      const x = Math.floor((x0 + x1 - 1) / 2);
      const y = Math.floor((y0 + y1 - 1) / 2);
      out[cy * size.width + cx] = pixels[y * width + x];
    }
  return { width: size.width, height: size.height, pixels: out };
}
