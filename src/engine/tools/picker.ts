import type { Point } from '../math';
import type { Stroke, Tool } from './types';

const pick = (s: Stroke, p: Point) => {
  if (p.x < 0 || p.y < 0 || p.x >= s.doc.width || p.y >= s.doc.height) return;
  s.setColor(s.secondary ? 'secondary' : 'primary', s.sample(p));
};

export const picker: Tool = {
  id: 'picker',
  editsPixels: false,
  onDown: pick,
  onMove: pick,
};
