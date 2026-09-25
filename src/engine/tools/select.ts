import { clamp, rectFromPoints, type Point } from '../math';
import type { Stroke, Tool } from './types';

const clampToCanvas = (s: Stroke, p: Point): Point => ({
  x: clamp(p.x, 0, s.doc.width - 1),
  y: clamp(p.y, 0, s.doc.height - 1),
});

export const select: Tool = {
  id: 'select',
  editsPixels: false,
  onDown(s, p) {
    s.scratch.origin = clampToCanvas(s, p);
    s.scratch.moved = false;
  },
  onMove(s, p) {
    const origin = s.scratch.origin as Point;
    const q = clampToCanvas(s, p);
    if (q.x !== origin.x || q.y !== origin.y) s.scratch.moved = true;
    if (s.scratch.moved) s.setSelection(rectFromPoints(origin, q));
  },
  onUp(s) {
    if (!s.scratch.moved) s.setSelection(null);
  },
};
