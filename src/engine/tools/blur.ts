import { alpha, blue, green, pack, red } from '../color';
import type { Point } from '../math';
import { followPointer, forEachBrushPixelOnce } from './paint';
import type { Stroke, Tool } from './types';

/**
 * Weighted box blur (tent kernel) of each brushed pixel, computed from the stroke's original pixels
 * so one pass is predictable; painting again blurs more. Alpha-weighted so transparent pixels don't
 * darken edges. With `blurSnap`, the result is snapped to the palette to stay pixel-art friendly.
 */
function blurAt(s: Stroke, p: Point): void {
  const { width, height } = s.doc;
  const r = s.options.blurStrength;
  forEachBrushPixelOnce(s, p, (i, x, y) => {
    let sr = 0;
    let sg = 0;
    let sb = 0;
    let sa = 0;
    let weights = 0;
    for (let ky = -r; ky <= r; ky++) {
      const yy = y + ky;
      if (yy < 0 || yy >= height) continue;
      for (let kx = -r; kx <= r; kx++) {
        const xx = x + kx;
        if (xx < 0 || xx >= width) continue;
        const w = (r + 1 - Math.abs(kx)) * (r + 1 - Math.abs(ky));
        const c = s.base[yy * width + xx];
        const a = alpha(c) * w;
        sr += red(c) * a;
        sg += green(c) * a;
        sb += blue(c) * a;
        sa += a;
        weights += w;
      }
    }
    const meanAlpha = sa / weights;
    const threshold = s.options.blurSnap ? 128 : 1;
    if (meanAlpha < threshold) {
      s.layer.pixels[i] = 0;
      return;
    }
    const mixed = pack(
      Math.round(sr / sa),
      Math.round(sg / sa),
      Math.round(sb / sa),
      s.options.blurSnap ? 255 : Math.round(meanAlpha),
    );
    s.layer.pixels[i] = s.options.blurSnap ? s.palette.nearest(mixed) : mixed;
  });
}

export const blur: Tool = {
  id: 'blur',
  editsPixels: true,
  onDown: (s, p) => blurAt(s, p),
  onMove: (s, p) => followPointer(s, p, (q) => blurAt(s, q)),
};
