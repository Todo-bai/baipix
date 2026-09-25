import { describe, expect, it } from 'vitest';
import {
  constrainAngle,
  ellipseFilled,
  ellipseOutline,
  floodFill,
  isDoubledCorner,
  line,
  mirrored,
} from '../src/engine/raster';

const collect = (fn: (plot: (x: number, y: number) => void) => void) => {
  const pts = new Set<string>();
  fn((x, y) => pts.add(`${x},${y}`));
  return pts;
};

describe('line', () => {
  it('includes both ends and one pixel per step on a diagonal', () => {
    const pts = collect((p) => line(0, 0, 3, 3, p));
    expect([...pts]).toEqual(['0,0', '1,1', '2,2', '3,3']);
  });

  it('snaps angles', () => {
    expect(constrainAngle({ x: 0, y: 0 }, { x: 10, y: 2 })).toEqual({ x: 10, y: 0 });
    expect(constrainAngle({ x: 0, y: 0 }, { x: 5, y: 4 })).toEqual({ x: 5, y: 5 });
  });
});

describe('ellipse', () => {
  it('fits exactly in its bounding box, even sizes included', () => {
    const pts = collect((p) => ellipseOutline(0, 0, 7, 5, p));
    const xs = [...pts].map((s) => +s.split(',')[0]);
    const ys = [...pts].map((s) => +s.split(',')[1]);
    expect(Math.min(...xs)).toBe(0);
    expect(Math.max(...xs)).toBe(7);
    expect(Math.min(...ys)).toBe(0);
    expect(Math.max(...ys)).toBe(5);
  });

  it('is symmetric', () => {
    const pts = collect((p) => ellipseFilled(0, 0, 9, 9, p));
    for (const s of pts) {
      const [x, y] = s.split(',').map(Number);
      expect(pts.has(`${9 - x},${y}`)).toBe(true);
      expect(pts.has(`${x},${9 - y}`)).toBe(true);
    }
  });
});

describe('pixel perfect', () => {
  it('detects an L-shaped doubled corner', () => {
    expect(isDoubledCorner({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 })).toBe(true);
    expect(isDoubledCorner({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 })).toBe(false);
  });
});

describe('floodFill', () => {
  it('fills only the connected region', () => {
    // 4×3, a wall of 1s in column 2
    const src = Uint32Array.from([0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0]);
    const filled: number[] = [];
    floodFill(src, 4, 3, 0, 0, (i) => filled.push(i));
    expect(filled.sort((a, b) => a - b)).toEqual([0, 1, 4, 5, 8, 9]);
  });
});

describe('mirrored', () => {
  it('mirrors on both axes', () => {
    expect(mirrored(1, 2, 8, 8, true, true)).toEqual([
      { x: 1, y: 2 },
      { x: 6, y: 2 },
      { x: 1, y: 5 },
      { x: 6, y: 5 },
    ]);
  });
});
