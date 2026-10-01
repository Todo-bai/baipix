import { describe, expect, it } from 'vitest';
import { pack } from '../src/engine/color';
import { DITHER_PATTERNS, ditherSecond, type DitherPattern } from '../src/engine/dither';
import { Editor } from '../src/engine/editor';

const share = (p: DitherPattern) => {
  let n = 0;
  for (let y = -6; y < 6; y++) for (let x = -6; x < 6; x++) if (ditherSecond(p, x, y)) n++;
  return n / 144;
};

describe('dithering patterns', () => {
  it('use the second color as often as their name says', () => {
    expect(share('checker')).toBe(1 / 2);
    expect(share('dots')).toBe(1 / 4);
    expect(share('dense')).toBe(3 / 4);
    expect(share('linesH')).toBe(1 / 2);
    expect(share('linesV')).toBe(1 / 2);
    expect(share('diagonal')).toBeCloseTo(1 / 3, 1);
    expect(DITHER_PATTERNS).toHaveLength(6);
  });

  it('fill with the chosen pattern', () => {
    const e = new Editor();
    const RED = pack(255, 0, 0);
    const BLUE = pack(0, 0, 255);
    e.setColor('primary', RED);
    e.setColor('secondary', BLUE);
    e.setOption('dither', true);
    e.setOption('ditherPattern', 'dots');
    e.setTool('bucket');
    e.beginStroke({ x: 0, y: 0 }, false, { shift: false });
    e.endStroke();
    const px = e.getState().doc.layers[0].pixels;
    const blue = [...px].filter((c) => c === BLUE).length;
    expect(blue).toBe(px.length / 4);
    expect(px[1 * 32 + 1]).toBe(BLUE);
    expect(px[0]).toBe(RED);
  });
});
