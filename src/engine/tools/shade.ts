import { alpha } from '../color';
import type { Point } from '../math';
import { followPointer, forEachBrushPixelOnce } from './paint';
import type { Stroke, Tool } from './types';

/** Lightens (or darkens) each pixel once per stroke, using the closest palette color. */
function shadeAt(s: Stroke, p: Point): void {
  const dir = s.secondary !== s.options.shadeInvert ? -1 : 1;
  forEachBrushPixelOnce(s, p, (i) => {
    const src = s.base[i];
    if (!alpha(src)) return;
    const next = s.palette.shade(src, dir);
    if (next !== null) s.layer.pixels[i] = next;
  });
}

export const shade: Tool = {
  id: 'shade',
  editsPixels: true,
  onDown: (s, p) => shadeAt(s, p),
  onMove: (s, p) => followPointer(s, p, (q) => shadeAt(s, q)),
};
