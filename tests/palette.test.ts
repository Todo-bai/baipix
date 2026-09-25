import { describe, expect, it } from 'vitest';
import { pack } from '../src/engine/color';
import { hueShiftedRamp, PaletteIndex, parseHexList, toHexList } from '../src/engine/palette';

describe('palette', () => {
  it('parses Lospec-style lists', () => {
    expect(parseHexList('1a1c2c\n#5D275D, b13e53 and junk')).toHaveLength(3);
    expect(toHexList(parseHexList('1a1c2c 5d275d'))).toBe('1a1c2c\n5d275d\n');
  });

  it('finds the nearest color', () => {
    const index = new PaletteIndex([pack(0, 0, 0), pack(255, 255, 255)]);
    expect(index.nearest(pack(20, 20, 20))).toBe(pack(0, 0, 0));
  });

  it('shades toward lighter and darker colors', () => {
    const colors = [pack(40, 10, 10), pack(120, 30, 30), pack(220, 90, 90)];
    const index = new PaletteIndex(colors);
    expect(index.shade(colors[1], 1)).toBe(colors[2]);
    expect(index.shade(colors[1], -1)).toBe(colors[0]);
    expect(index.shade(colors[2], 1)).toBeNull();
  });

  it('builds a five-step ramp around the base color', () => {
    const ramp = hueShiftedRamp(pack(200, 80, 60));
    expect(ramp).toHaveLength(5);
    expect(ramp[2]).toBe(pack(200, 80, 60));
  });
});
