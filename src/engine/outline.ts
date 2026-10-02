import { alpha, type Color } from './color';
import type { Rect } from './math';

export interface OutlineOptions {
  /** Around the drawing, on the empty pixels next to it, or along its own edge pixels. */
  place: 'outside' | 'inside';
  /** Diagonal neighbors count too: square corners. Without them, corners stay open (rounder). */
  corners: boolean;
  color: Color;
}

const SIDES = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];
const DIAGONALS = [
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

/**
 * A 1px outline of what's drawn (any pixel that isn't fully transparent) within `rect`, as new
 * pixels. Outside: the empty pixels touching the drawing take the color. Inside: the drawing's
 * pixels touching an empty one, or the edge of `rect`, do. Only `rect` is read and written.
 */
export function outlinePixels(
  base: Uint32Array,
  width: number,
  rect: Rect,
  { place, corners, color }: OutlineOptions,
): Uint32Array {
  const out = base.slice();
  const neighbors = corners ? [...SIDES, ...DIAGONALS] : SIDES;
  const inRect = (x: number, y: number) =>
    x >= rect.x && y >= rect.y && x < rect.x + rect.w && y < rect.y + rect.h;
  const drawn = (x: number, y: number) => inRect(x, y) && alpha(base[y * width + x]) > 0;
  for (let y = rect.y; y < rect.y + rect.h; y++)
    for (let x = rect.x; x < rect.x + rect.w; x++) {
      const filled = drawn(x, y);
      if ((place === 'outside') === filled) continue;
      // Outside: an empty pixel next to the drawing. Inside: a drawn pixel next to emptiness.
      const edge = neighbors.some(([dx, dy]) => drawn(x + dx, y + dy) !== filled);
      if (edge) out[y * width + x] = color;
    }
  return out;
}
