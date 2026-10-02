import { describe, expect, it } from 'vitest';
import { pack } from '../src/engine/color';
import { Editor } from '../src/engine/editor';
import { outlinePixels, type OutlineOptions } from '../src/engine/outline';

const RED = pack(255, 0, 0);
const BLUE = pack(0, 0, 255);
const W = 5;

/** A 5×5 grid from rows of '#' (red) and '.' (empty); back to rows, with 'o' for the outline color. */
const grid = (rows: string[]) => Uint32Array.from(rows.join('').split(''), (c) => (c === '#' ? RED : 0));
const rows = (px: Uint32Array) =>
  Array.from({ length: px.length / W }, (_, y) =>
    [...px.slice(y * W, y * W + W)].map((c) => (c === BLUE ? 'o' : c ? '#' : '.')).join(''),
  );
const ALL = { x: 0, y: 0, w: W, h: W };
const opts = (o: Partial<OutlineOptions>): OutlineOptions => ({
  place: 'outside',
  corners: false,
  color: BLUE,
  ...o,
});

const DOT = grid(['.....', '.....', '..#..', '.....', '.....']);

describe('outlinePixels', () => {
  it('outlines outside, with or without corners', () => {
    expect(rows(outlinePixels(DOT, W, ALL, opts({})))).toEqual(['.....', '..o..', '.o#o.', '..o..', '.....']);
    expect(rows(outlinePixels(DOT, W, ALL, opts({ corners: true })))).toEqual([
      '.....',
      '.ooo.',
      '.o#o.',
      '.ooo.',
      '.....',
    ]);
  });

  it('outlines inside: the edge pixels, the rect edge counting as empty', () => {
    const square = grid(['#####', '#####', '#####', '#####', '#####']);
    expect(rows(outlinePixels(square, W, ALL, opts({ place: 'inside' })))).toEqual([
      'ooooo',
      'o###o',
      'o###o',
      'o###o',
      'ooooo',
    ]);
  });

  it('stays inside the rect', () => {
    const rect = { x: 2, y: 2, w: 3, h: 3 };
    expect(rows(outlinePixels(DOT, W, rect, opts({ corners: true })))).toEqual([
      '.....',
      '.....',
      '..#o.',
      '..oo.',
      '.....',
    ]);
  });
});

describe('Editor outline', () => {
  it('previews, applies as one undo step, and cancels', () => {
    const e = new Editor();
    const layer = () => e.getState().doc.layers[e.getState().doc.activeLayer].pixels;
    e.setColor('primary', RED);
    e.beginStroke({ x: 4, y: 4 }, false, { shift: false });
    e.endStroke();
    const before = layer().slice();
    const change = (base: Uint32Array, width: number, rect: { x: number; y: number; w: number; h: number }) =>
      outlinePixels(base, width, rect, opts({}));

    e.beginAdjust(false);
    e.previewChange(change);
    expect(layer().filter((c) => c === BLUE)).toHaveLength(4);
    e.cancelAdjust();
    expect(layer()).toEqual(before);

    e.beginAdjust(false);
    e.applyChange(change);
    expect(layer().filter((c) => c === BLUE)).toHaveLength(4);
    e.undo();
    expect(layer()).toEqual(before);
  });
});
