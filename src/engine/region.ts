import { alpha, type Color } from './color';
import { clipRect, type Rect } from './math';

/** A standalone block of pixels (clipboard, floating selection). */
export interface PixelBlock {
  width: number;
  height: number;
  pixels: Uint32Array;
}

export function extractBlock(pixels: Uint32Array, width: number, height: number, rect: Rect): PixelBlock {
  const r = clipRect(rect, width, height);
  const out = new Uint32Array(r.w * r.h);
  for (let y = 0; y < r.h; y++) {
    const start = (r.y + y) * width + r.x;
    out.set(pixels.subarray(start, start + r.w), y * r.w);
  }
  return { width: r.w, height: r.h, pixels: out };
}

export function fillRect(pixels: Uint32Array, width: number, height: number, rect: Rect, color: Color): void {
  const r = clipRect(rect, width, height);
  for (let y = r.y; y < r.y + r.h; y++) pixels.fill(color, y * width + r.x, y * width + r.x + r.w);
}

/** Stamps a block at (x, y). Transparent pixels of the block are skipped unless `replace` is set. */
export function stampBlock(
  pixels: Uint32Array,
  width: number,
  height: number,
  block: PixelBlock,
  x: number,
  y: number,
  replace = false,
): void {
  for (let by = 0; by < block.height; by++) {
    const ty = y + by;
    if (ty < 0 || ty >= height) continue;
    for (let bx = 0; bx < block.width; bx++) {
      const tx = x + bx;
      if (tx < 0 || tx >= width) continue;
      const c = block.pixels[by * block.width + bx];
      if (replace || alpha(c)) pixels[ty * width + tx] = c;
    }
  }
}

export function flipRect(
  pixels: Uint32Array,
  width: number,
  height: number,
  rect: Rect,
  horizontal: boolean,
): void {
  const r = clipRect(rect, width, height);
  if (horizontal) {
    for (let y = r.y; y < r.y + r.h; y++) {
      for (let i = 0; i < r.w >> 1; i++) {
        const a = y * width + r.x + i;
        const b = y * width + r.x + r.w - 1 - i;
        [pixels[a], pixels[b]] = [pixels[b], pixels[a]];
      }
    }
  } else {
    for (let j = 0; j < r.h >> 1; j++) {
      for (let x = r.x; x < r.x + r.w; x++) {
        const a = (r.y + j) * width + x;
        const b = (r.y + r.h - 1 - j) * width + x;
        [pixels[a], pixels[b]] = [pixels[b], pixels[a]];
      }
    }
  }
}

/** Shifts all pixels by (dx, dy); pixels pushed off canvas are lost. */
export function shiftPixels(
  source: Uint32Array,
  width: number,
  height: number,
  dx: number,
  dy: number,
): Uint32Array {
  const out = new Uint32Array(width * height);
  for (let y = 0; y < height; y++) {
    const sy = y - dy;
    if (sy < 0 || sy >= height) continue;
    for (let x = 0; x < width; x++) {
      const sx = x - dx;
      if (sx >= 0 && sx < width) out[y * width + x] = source[sy * width + sx];
    }
  }
  return out;
}

/** Unique opaque colors of a buffer, at most `limit`. */
export function uniqueColors(pixels: Uint32Array, limit = 256): Color[] {
  const set = new Set<Color>();
  for (const c of pixels) {
    if (alpha(c)) set.add((c | 0xff000000) >>> 0);
    if (set.size >= limit) break;
  }
  return [...set];
}
