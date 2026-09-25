import type { Point } from './math';

export type PlotFn = (x: number, y: number) => void;

/** Bresenham line, both ends included. */
export function line(x0: number, y0: number, x1: number, y1: number, plot: PlotFn): void {
  const dx = Math.abs(x1 - x0);
  const sx = x0 < x1 ? 1 : -1;
  const dy = -Math.abs(y1 - y0);
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    plot(x0, y0);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x0 += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y0 += sy;
    }
  }
}

/** Snaps the end point to 0°, 45° or 90° from the start point. */
export function constrainAngle(start: Point, end: Point): Point {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (ax > ay * 2) return { x: end.x, y: start.y };
  if (ay > ax * 2) return { x: start.x, y: end.y };
  const d = Math.max(ax, ay);
  return { x: start.x + Math.sign(dx) * d, y: start.y + Math.sign(dy) * d };
}

/** Makes the box defined by two points square. */
export function constrainSquare(start: Point, end: Point): Point {
  const d = Math.max(Math.abs(end.x - start.x), Math.abs(end.y - start.y));
  return { x: start.x + (end.x < start.x ? -d : d), y: start.y + (end.y < start.y ? -d : d) };
}

export function rectOutline(x0: number, y0: number, x1: number, y1: number, plot: PlotFn): void {
  for (let x = x0; x <= x1; x++) {
    plot(x, y0);
    plot(x, y1);
  }
  for (let y = y0 + 1; y < y1; y++) {
    plot(x0, y);
    plot(x1, y);
  }
}

/**
 * Ellipse inscribed in a rectangle (Alois Zingl's algorithm). Works for even sizes, unlike
 * the classic center/radius midpoint algorithm. Points can be emitted more than once.
 */
export function ellipseOutline(x0: number, y0: number, x1: number, y1: number, plot: PlotFn): void {
  if (x0 === x1 || y0 === y1) {
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++)
      for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) plot(x, y);
    return;
  }
  let a = Math.abs(x1 - x0);
  const b = Math.abs(y1 - y0);
  let b1 = b & 1;
  let dx = 4 * (1 - a) * b * b;
  let dy = 4 * (b1 + 1) * a * a;
  let err = dx + dy + b1 * a * a;
  if (x0 > x1) {
    x0 = x1;
    x1 += a;
  }
  if (y0 > y1) y0 = y1;
  y0 += (b + 1) >> 1;
  y1 = y0 - b1;
  a *= 8 * a;
  b1 = 8 * b * b;
  do {
    plot(x1, y0);
    plot(x0, y0);
    plot(x0, y1);
    plot(x1, y1);
    const e2 = 2 * err;
    if (e2 <= dy) {
      y0++;
      y1--;
      dy += a;
      err += dy;
    }
    if (e2 >= dx || 2 * err > dy) {
      x0++;
      x1--;
      dx += b1;
      err += dx;
    }
  } while (x0 <= x1);
  while (y0 - y1 <= b) {
    plot(x0 - 1, y0);
    plot(x1 + 1, y0++);
    plot(x0 - 1, y1);
    plot(x1 + 1, y1--);
  }
}

/** Filled ellipse: collects the outline's horizontal spans, then fills them. */
export function ellipseFilled(x0: number, y0: number, x1: number, y1: number, plot: PlotFn): void {
  const spans = new Map<number, [number, number]>();
  ellipseOutline(x0, y0, x1, y1, (x, y) => {
    const s = spans.get(y);
    if (!s) spans.set(y, [x, x]);
    else {
      if (x < s[0]) s[0] = x;
      if (x > s[1]) s[1] = x;
    }
  });
  spans.forEach(([a, b], y) => {
    for (let x = a; x <= b; x++) plot(x, y);
  });
}

/** Top-left aligned square brush footprint. Odd sizes are centered on (cx, cy). */
export function brush(cx: number, cy: number, size: number, plot: PlotFn): void {
  const o = Math.floor((size - 1) / 2);
  for (let dy = 0; dy < size; dy++) for (let dx = 0; dx < size; dx++) plot(cx - o + dx, cy - o + dy);
}

/** A point and its mirrored counterparts, for symmetric drawing. */
export function mirrored(
  x: number,
  y: number,
  width: number,
  height: number,
  mirrorX: boolean,
  mirrorY: boolean,
  size = 1,
): Point[] {
  const out: Point[] = [{ x, y }];
  if (mirrorX) out.push({ x: width - x - size, y });
  if (mirrorY) out.push({ x, y: height - y - size });
  if (mirrorX && mirrorY) out.push({ x: width - x - size, y: height - y - size });
  return out;
}

/**
 * "Pixel perfect": when the last three points form an L (b touches both a and p, while a and p
 * are diagonal), b is a doubled corner pixel and should be removed.
 */
export function isDoubledCorner(a: Point, b: Point, p: Point): boolean {
  return (
    Math.abs(a.x - p.x) === 1 &&
    Math.abs(a.y - p.y) === 1 &&
    (b.x === a.x || b.y === a.y) &&
    (b.x === p.x || b.y === p.y)
  );
}

/**
 * 4-way flood fill over `source`, starting at (x, y). Calls `visit` for every matching pixel index.
 * `canVisit` restricts the fill (e.g. to a selection).
 */
export function floodFill(
  source: Uint32Array,
  width: number,
  height: number,
  x: number,
  y: number,
  visit: (index: number) => void,
  canVisit: (x: number, y: number) => boolean = () => true,
  seen: Uint8Array = new Uint8Array(width * height),
): void {
  if (x < 0 || y < 0 || x >= width || y >= height) return;
  const target = source[y * width + x];
  const stack = [y * width + x];
  while (stack.length) {
    const i = stack.pop()!;
    if (seen[i]) continue;
    const px = i % width;
    const py = (i / width) | 0;
    if (source[i] !== target || !canVisit(px, py)) continue;
    seen[i] = 1;
    visit(i);
    if (px > 0) stack.push(i - 1);
    if (px < width - 1) stack.push(i + 1);
    if (py > 0) stack.push(i - width);
    if (py < height - 1) stack.push(i + width);
  }
}
