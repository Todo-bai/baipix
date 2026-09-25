export interface Theme {
  canvas: string;
  checkA: string;
  checkB: string;
  grid: string;
  gridMajor: string;
  frame: string;
  accent: string;
  muted: string;
  axis: string;
}

/** Reads the canvas colors from CSS custom properties, so the renderer follows light/dark themes. */
export function readTheme(el: Element = document.documentElement): Theme {
  const cs = getComputedStyle(el);
  const v = (name: string) => cs.getPropertyValue(name).trim();
  return {
    canvas: v('--canvas'),
    checkA: v('--check-a'),
    checkB: v('--check-b'),
    grid: v('--grid'),
    gridMajor: v('--grid-major'),
    frame: v('--frame'),
    accent: v('--accent'),
    muted: v('--muted'),
    axis: v('--axis'),
  };
}

const patternCache = new WeakMap<CanvasRenderingContext2D, Map<string, CanvasPattern>>();

/** Transparency checkerboard pattern, cached per context and colors. */
export function checkerPattern(
  ctx: CanvasRenderingContext2D,
  cell: number,
  a: string,
  b: string,
): CanvasPattern {
  const key = `${cell}|${a}|${b}`;
  let cache = patternCache.get(ctx);
  if (!cache) patternCache.set(ctx, (cache = new Map()));
  const hit = cache.get(key);
  if (hit) return hit;
  const tile = document.createElement('canvas');
  tile.width = tile.height = cell * 2;
  const t = tile.getContext('2d')!;
  t.fillStyle = a;
  t.fillRect(0, 0, cell * 2, cell * 2);
  t.fillStyle = b;
  t.fillRect(0, 0, cell, cell);
  t.fillRect(cell, cell, cell, cell);
  const pattern = ctx.createPattern(tile, 'repeat')!;
  cache.set(key, pattern);
  return pattern;
}
