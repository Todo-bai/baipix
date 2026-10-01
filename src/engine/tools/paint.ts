import { alpha, type Color } from '../color';
import { blendOver } from '../composite';
import { rectContains, type Point } from '../math';
import { mirrorAxes } from '../document';
import { brush, line, mirrored } from '../raster';
import type { Stroke } from './types';

export const inBounds = (s: Stroke, x: number, y: number): boolean =>
  x >= 0 && y >= 0 && x < s.doc.width && y < s.doc.height;

/**
 * Writes a pixel if it lies on the canvas and inside the selection. With the `blend` option, a
 * semi-transparent color mixes with the pixel as it was when the stroke started, so going over the
 * same spot twice in one stroke doesn't build it up.
 */
export function setPixel(s: Stroke, x: number, y: number, color: Color): void {
  if (!inBounds(s, x, y) || !rectContains(s.selection, x, y)) return;
  const i = y * s.doc.width + x;
  s.layer.pixels[i] = s.options.blend && alpha(color) < 255 ? blendOver(color, s.base[i]) : color;
}

/** Every mirrored copy of a single pixel. */
export const mirrorsOf = (s: Stroke, x: number, y: number): Point[] => {
  const axes = mirrorAxes(s.doc);
  return mirrored(x, y, axes.x, axes.y, s.mirrorX, s.mirrorY);
};

/**
 * Paints the brush footprint at (cx, cy), with symmetry. With `dither`, pixels alternate
 * between c1 and c2 in a checkerboard (decided from the source pixel so mirrored copies match).
 */
export function stamp(
  s: Stroke,
  cx: number,
  cy: number,
  c1: Color,
  c2 = c1,
  dither = false,
  size = s.options.size,
): void {
  brush(
    cx,
    cy,
    size,
    (x, y) => {
      const color = dither && (x + y) & 1 ? c2 : c1;
      for (const m of mirrorsOf(s, x, y)) setPixel(s, m.x, m.y, color);
    },
    s.options.roundTip,
  );
}

/** Calls `paint` for every pixel between the previous pointer position and `p` (excluding the previous one). */
export function followPointer(s: Stroke, p: Point, paint: (q: Point) => void): void {
  if (p.x === s.last.x && p.y === s.last.y) return;
  let first = true;
  line(s.last.x, s.last.y, p.x, p.y, (x, y) => {
    if (first) {
      first = false;
      return;
    }
    paint({ x, y });
  });
  s.last = p;
}

/** Runs `visit` once per pixel per stroke over the brush footprint (with symmetry). */
export function forEachBrushPixelOnce(
  s: Stroke,
  p: Point,
  visit: (index: number, x: number, y: number) => void,
): void {
  brush(
    p.x,
    p.y,
    s.options.size,
    (bx, by) => {
      for (const { x, y } of mirrorsOf(s, bx, by)) {
        if (!inBounds(s, x, y) || !rectContains(s.selection, x, y)) continue;
        const i = y * s.doc.width + x;
        if (s.visited[i]) continue;
        s.visited[i] = 1;
        visit(i, x, y);
      }
    },
    s.options.roundTip,
  );
}

export const strokeColors = (s: Stroke): [Color, Color] =>
  s.secondary ? [s.secondaryColor, s.primaryColor] : [s.primaryColor, s.secondaryColor];
