import type { Point } from '../math';
import { constrainAngle, constrainSquare, ellipseFilled, ellipseOutline, line, rectOutline } from '../raster';
import { stamp, strokeColors } from './paint';
import type { Modifiers, Stroke, Tool, ToolId } from './types';

type ShapeKind = 'line' | 'rect' | 'ellipse';

/** Shapes are redrawn from the original pixels on every move, so they can be previewed live. */
function drawShape(kind: ShapeKind, s: Stroke, p: Point, mods: Modifiers): void {
  s.layer.pixels.set(s.base);
  const [color] = strokeColors(s);
  const a = s.start;
  if (kind === 'line') {
    const b = mods.shift ? constrainAngle(a, p) : p;
    line(a.x, a.y, b.x, b.y, (x, y) => stamp(s, x, y, color));
    return;
  }
  const b = mods.shift ? constrainSquare(a, p) : p;
  const x0 = Math.min(a.x, b.x);
  const y0 = Math.min(a.y, b.y);
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  if (kind === 'rect') {
    if (s.options.filled) {
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) stamp(s, x, y, color, color, false, 1);
    } else rectOutline(x0, y0, x1, y1, (x, y) => stamp(s, x, y, color));
    return;
  }
  if (s.options.filled) ellipseFilled(x0, y0, x1, y1, (x, y) => stamp(s, x, y, color, color, false, 1));
  else ellipseOutline(x0, y0, x1, y1, (x, y) => stamp(s, x, y, color));
}

const shapeTool = (kind: ShapeKind): Tool => ({
  id: kind as ToolId,
  editsPixels: true,
  onDown: (s, p, mods) => drawShape(kind, s, p, mods),
  onMove: (s, p, mods) => drawShape(kind, s, p, mods),
});

export const lineTool = shapeTool('line');
export const rectTool = shapeTool('rect');
export const ellipseTool = shapeTool('ellipse');
