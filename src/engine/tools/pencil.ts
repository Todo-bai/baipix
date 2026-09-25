import type { Point } from '../math';
import { isDoubledCorner } from '../raster';
import { followPointer, inBounds, mirrorsOf, stamp, strokeColors } from './paint';
import type { Stroke, Tool } from './types';

function paint(s: Stroke, p: Point): void {
  const [c1, c2] = strokeColors(s);
  if (s.options.pixelPerfect && s.options.size === 1) {
    const n = s.trail.length;
    if (n && s.trail[n - 1].x === p.x && s.trail[n - 1].y === p.y) return;
    if (n >= 2 && isDoubledCorner(s.trail[n - 2], s.trail[n - 1], p)) {
      const corner = s.trail.pop()!;
      for (const m of mirrorsOf(s, corner.x, corner.y)) {
        if (inBounds(s, m.x, m.y)) {
          const i = m.y * s.doc.width + m.x;
          s.layer.pixels[i] = s.base[i];
        }
      }
    }
    s.trail.push(p);
  }
  stamp(s, p.x, p.y, c1, c2, s.options.dither);
}

export const pencil: Tool = {
  id: 'pencil',
  editsPixels: true,
  onDown: (s, p) => paint(s, p),
  onMove: (s, p) => followPointer(s, p, (q) => paint(s, q)),
};
