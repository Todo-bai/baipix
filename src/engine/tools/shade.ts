import { alpha } from '../color';
import type { Point } from '../math';
import { followPointer, forEachBrushPixelOnce } from './paint';
import type { Stroke, Tool } from './types';

/**
 * Darkens (`dir` -1) or lightens (+1) each pixel once per stroke, with the next palette color in
 * that direction. The right button goes the other way.
 */
function shadeAt(s: Stroke, p: Point, dir: 1 | -1): void {
  if (s.secondary) dir = dir === 1 ? -1 : 1;
  forEachBrushPixelOnce(s, p, (i) => {
    const src = s.base[i];
    if (!alpha(src)) return;
    const next = s.palette.shade(src, dir);
    if (next !== null) s.layer.pixels[i] = next;
  });
}

const shadeTool = (id: 'shade' | 'lighten', dir: 1 | -1): Tool => ({
  id,
  editsPixels: true,
  onDown: (s, p) => shadeAt(s, p, dir),
  onMove: (s, p) => followPointer(s, p, (q) => shadeAt(s, q, dir)),
});

export const shade = shadeTool('shade', -1);
export const lighten = shadeTool('lighten', 1);
