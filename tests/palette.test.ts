import { describe, expect, it } from 'vitest';
import { alpha, fromHex, pack, toOklab } from '../src/engine/color';
import {
  hueShiftedRamp,
  PaletteIndex,
  parseGpl,
  parseHexList,
  parsePaletteFile,
  presetColors,
  shiftLightness,
  toGpl,
  toHexList,
} from '../src/engine/palette';

describe('palette', () => {
  it('parses Lospec-style lists', () => {
    expect(parseHexList('1a1c2c\n#5D275D, b13e53 and junk')).toHaveLength(3);
    expect(toHexList(parseHexList('1a1c2c 5d275d'))).toBe('1a1c2c\n5d275d\n');
  });

  it('reads and writes GIMP palettes', () => {
    const gpl = `GIMP Palette
Name: Test
Columns: 4
# a comment
 26  28  44	Black
255 205 117 Sand
  0   0   0
`;
    const colors = parseGpl(gpl);
    expect(colors).toEqual([pack(26, 28, 44), pack(255, 205, 117), pack(0, 0, 0)]);
    const written = toGpl(colors, 'Round trip');
    expect(written.startsWith('GIMP Palette\nName: Round trip\n')).toBe(true);
    expect(parseGpl(written)).toEqual(colors);
  });

  it('tells palette files apart', () => {
    expect(parsePaletteFile('GIMP Palette\n255 0 0 Red\n')).toEqual([pack(255, 0, 0)]);
    expect(parsePaletteFile('1a1c2c\n5d275d\n')).toHaveLength(2);
    expect(parsePaletteFile('nothing here')).toEqual([]);
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

  it('stays in the same ramp by default', () => {
    const index = new PaletteIndex(presetColors('sweetie16'));
    const hex = (h: string) => fromHex(h)!;
    // Dark blue lightens to the brighter blue, not to the purple ramp.
    expect(index.shade(hex('29366f'), 1)).toBe(hex('3b5dc9'));
    expect(index.shade(hex('29366f'), 1, 'palette')).toBe(hex('5d275d'));
    // The purple, red, orange, yellow ramp, both ways.
    expect(index.shade(hex('5d275d'), 1)).toBe(hex('b13e53'));
    expect(index.shade(hex('ef7d57'), -1)).toBe(hex('b13e53'));
    // A ramp ends on the palette's neutrals: white for highlights, near-black for shadows.
    expect(index.shade(hex('ffcd75'), 1)).toBe(hex('f4f4f4'));
    expect(index.shade(hex('29366f'), -1)).toBe(hex('1a1c2c'));
    // Neutrals stay neutral.
    expect(index.shade(hex('f4f4f4'), -1)).toBe(hex('94b0c2'));
  });

  it('changes the lightness outside the palette in the free mode', () => {
    const base = pack(60, 120, 200, 128);
    const [L] = toOklab(base);
    expect(toOklab(shiftLightness(base, 1, 1, false))[0]).toBeGreaterThan(L + 0.05);
    expect(toOklab(shiftLightness(base, -1, 3, false))[0]).toBeLessThan(L - 0.15);
    expect(alpha(shiftLightness(base, 1, 1, true))).toBe(128);
    // With the hue shift, a lighter blue drifts toward yellow: less blue, more green.
    const plain = toOklab(shiftLightness(base, 1, 2, false));
    const shifted = toOklab(shiftLightness(base, 1, 2, true));
    expect(shifted[2]).toBeGreaterThan(plain[2]);
  });

  it('builds a five-step ramp around the base color', () => {
    const ramp = hueShiftedRamp(pack(200, 80, 60));
    expect(ramp).toHaveLength(5);
    expect(ramp[2]).toBe(pack(200, 80, 60));
  });
});
