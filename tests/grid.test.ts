import { describe, expect, it } from 'vitest';
import { pack } from '../src/engine/color';
import { gridInk } from '../src/ui/render/grid';

const isDark = (ink: number) => (ink & 0xffffff) === 0;

describe('Pixel grid ink', () => {
  it('draws dark lines on light pixels and light lines on dark ones', () => {
    const ink = gridInk(Uint32Array.from([pack(255, 255, 255), pack(20, 20, 30)]), 'rgb(255, 255, 255)');
    expect(isDark(ink[0])).toBe(true);
    expect(isDark(ink[1])).toBe(false);
  });

  it('follows the checkerboard on transparent pixels', () => {
    expect(isDark(gridInk(Uint32Array.from([0]), 'rgb(255, 255, 255)')[0])).toBe(true);
    expect(isDark(gridInk(Uint32Array.from([0]), 'rgb(58, 58, 58)')[0])).toBe(false);
  });
});
