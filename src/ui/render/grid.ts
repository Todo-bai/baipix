/**
 * The pixel grid adapts to what is under it: dark lines on light pixels, light lines on dark ones,
 * so it never disappears on a white background or a black drawing. `gridInk` gives, for each art
 * pixel, the color of the grid lines along its left and top edges; the renderer stretches one column
 * (or row) of it along each line.
 */

/** Lines are drawn at this alpha; the major grid (every 8 pixels) is drawn twice. */
const INK_ALPHA = 30;
const DARK = (INK_ALPHA << 24) >>> 0;
const LIGHT = ((INK_ALPHA << 24) | 0xffffff) >>> 0;

/** Perceived brightness of an 0xAABBGGRR color, 0 to 255. */
const luma = (c: number) => 0.299 * (c & 255) + 0.587 * ((c >> 8) & 255) + 0.114 * ((c >> 16) & 255);

const isLight = (c: number) => luma(c) > 140;

/** Parses the `rgb(r, g, b)` strings of the theme into 0xAABBGGRR. */
function cssToColor(css: string): number {
  const [r = 0, g = 0, b = 0] = (css.match(/\d+(\.\d+)?/g) ?? []).map(Number);
  return ((255 << 24) | (Math.round(b) << 16) | (Math.round(g) << 8) | Math.round(r)) >>> 0;
}

/**
 * One ink color per pixel (flattened drawing, background included). Transparent pixels show the
 * checkerboard, so they follow its color.
 */
export function gridInk(pixels: Uint32Array, checker: string): Uint32Array {
  const onChecker = isLight(cssToColor(checker)) ? DARK : LIGHT;
  const out = new Uint32Array(pixels.length);
  for (let i = 0; i < pixels.length; i++) {
    const c = pixels[i];
    out[i] = c >>> 24 < 128 ? onChecker : isLight(c) ? DARK : LIGHT;
  }
  return out;
}
