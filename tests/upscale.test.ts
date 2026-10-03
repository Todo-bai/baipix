import { describe, expect, it } from 'vitest';
import { pack } from '../src/engine/color';
import { detectPixelGrid, downscaleToGrid, gridSize } from '../src/engine/upscale';

const A = pack(30, 30, 40);
const B = pack(240, 200, 80);
const C = pack(80, 160, 220);

/** A small piece of art (w × h colors, a little irregular), scaled up by `s`, cut by `cut` pixels. */
function scaled(s: number, cut = 0, noise = false) {
  const w = 7;
  const h = 5;
  const art = Array.from({ length: w * h }, (_, i) => [A, B, C, B, A, C, A][(i * 3 + (i >> 2)) % 7]);
  const width = w * s - cut;
  const height = h * s - cut;
  const pixels = new Uint32Array(width * height);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const c = art[Math.floor((y + cut) / s) * w + Math.floor((x + cut) / s)];
      // JPEG-like noise: a channel off by a few levels.
      pixels[y * width + x] = noise && (x + y) % 3 === 0 ? c + 3 : c;
    }
  return { art, w, h, width, height, pixels };
}

describe('detectPixelGrid', () => {
  it('finds the scale of an image scaled up', () => {
    for (const s of [2, 3, 8, 12]) {
      const img = scaled(s);
      expect(detectPixelGrid(img.pixels, img.width, img.height)).toEqual({
        scale: s,
        offsetX: 0,
        offsetY: 0,
      });
    }
  });

  it('finds the offset of a cropped one, and ignores compression noise', () => {
    const img = scaled(6, 2, true);
    expect(detectPixelGrid(img.pixels, img.width, img.height)).toEqual({ scale: 6, offsetX: 4, offsetY: 4 });
  });

  it('says no for art at its real size, or a flat image', () => {
    const img = scaled(1);
    expect(detectPixelGrid(img.pixels, img.width, img.height)).toBeNull();
    expect(detectPixelGrid(new Uint32Array(64 * 64).fill(A), 64, 64)).toBeNull();
  });
});

describe('downscaleToGrid', () => {
  it('gives the art back', () => {
    const img = scaled(8);
    const grid = { scale: 8, offsetX: 0, offsetY: 0 };
    const block = downscaleToGrid(img.pixels, img.width, img.height, grid);
    expect([block.width, block.height]).toEqual([img.w, img.h]);
    expect([...block.pixels]).toEqual(img.art);
  });

  it('keeps the cut cells at the edges', () => {
    const img = scaled(6, 2);
    const grid = { scale: 6, offsetX: 4, offsetY: 4 };
    expect(gridSize(img.width, img.height, grid)).toEqual({ width: img.w, height: img.h });
    expect([...downscaleToGrid(img.pixels, img.width, img.height, grid).pixels]).toEqual(img.art);
  });
});
