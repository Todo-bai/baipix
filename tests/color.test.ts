import { describe, expect, it } from 'vitest';
import {
  adjustColor,
  alpha,
  blue,
  fromHex,
  green,
  hsvToRgb,
  NO_ADJUSTMENT,
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

  it('adjusts hue, saturation and brightness', () => {
    const c = pack(200, 60, 60, 128);
    expect(adjustColor(c, NO_ADJUSTMENT)).toBe(c);
    expect(adjustColor(0, { hue: 90, saturation: 0, brightness: 0 })).toBe(0);
    const green = adjustColor(pack(255, 0, 0), { ...NO_ADJUSTMENT, hue: 120 });
    expect(toHex(green)).toBe('#00ff00');
    expect(toHex(adjustColor(pack(255, 0, 0), { ...NO_ADJUSTMENT, saturation: 0 }))).toBe('#ffffff');
    expect(toHex(adjustColor(pack(255, 0, 0), { ...NO_ADJUSTMENT, brightness: 0 }))).toBe('#000000');
    // A full value cannot get brighter; darker ones move toward full above 100%.
    expect(adjustColor(pack(255, 0, 0), { ...NO_ADJUSTMENT, brightness: 150 })).toBe(pack(255, 0, 0));
    expect(toHex(adjustColor(pack(128, 0, 0), { ...NO_ADJUSTMENT, brightness: 200 }))).toBe('#ff0000');
    expect(alpha(adjustColor(c, { hue: 40, saturation: 50, brightness: 80 }))).toBe(128);
  });
});
