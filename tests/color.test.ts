import { describe, expect, it } from 'vitest';
import {
  alpha,
  blue,
  fromHex,
  green,
  hsvToRgb,
  pack,
  red,
  rgbToHsv,
  toHex,
  withAlpha,
} from '../src/engine/color';

describe('color', () => {
  it('packs and unpacks channels', () => {
    const c = pack(10, 20, 30, 40);
    expect([red(c), green(c), blue(c), alpha(c)]).toEqual([10, 20, 30, 40]);
  });

  it('round-trips hex', () => {
    expect(toHex(fromHex('#1A1C2C')!)).toBe('#1a1c2c');
    expect(toHex(fromHex('f0a')!)).toBe('#ff00aa');
    expect(fromHex('nope')).toBeNull();
  });

  it('replaces alpha only', () => {
    expect(alpha(withAlpha(pack(1, 2, 3), 7))).toBe(7);
    expect(red(withAlpha(pack(1, 2, 3), 7))).toBe(1);
  });

  it('round-trips HSV', () => {
    for (const [r, g, b] of [
      [255, 0, 0],
      [12, 200, 90],
      [128, 128, 128],
    ]) {
      expect(hsvToRgb(rgbToHsv(r, g, b))).toEqual([r, g, b]);
    }
  });
});
