import { alpha, blue, green, pack, red, type Color } from './color';
import { hasBackground, type Layer, type PixelDoc } from './document';

/** Straight-alpha "source over" of one color onto another, with an extra opacity factor. */
export function blendOver(src: Color, dst: Color, opacity = 1): Color {
  const sa = (alpha(src) / 255) * opacity;
  if (sa <= 0) return dst;
  const da = alpha(dst) / 255;
  const oa = sa + da * (1 - sa);
  if (oa <= 0) return 0;
  const mix = (s: number, d: number) => Math.round((s * sa + d * da * (1 - sa)) / oa);
  return pack(
    mix(red(src), red(dst)),
    mix(green(src), green(dst)),
    mix(blue(src), blue(dst)),
    Math.round(oa * 255),
  );
}

export interface FlattenOptions {
  includeBackground?: boolean;
  /** Only render this layer (ignores visibility and opacity). */
  onlyLayer?: Layer;
}

/** Merges the document's layers into a single pixel buffer. Pure: never touches the document. */
export function flatten(doc: PixelDoc, options: FlattenOptions = {}): Uint32Array {
  const { includeBackground = true, onlyLayer } = options;
  const out = new Uint32Array(doc.width * doc.height);
  if (onlyLayer) {
    out.set(onlyLayer.pixels);
    return out;
  }
  if (includeBackground && hasBackground(doc)) out.fill(doc.background);
  let first = !(includeBackground && hasBackground(doc));
  for (const layer of doc.layers) {
    if (!layer.visible || layer.opacity <= 0) continue;
    const src = layer.pixels;
    if (first && layer.opacity === 1) {
      out.set(src);
    } else {
      for (let i = 0; i < src.length; i++) {
        const c = src[i];
        if (c >>> 24) out[i] = blendOver(c, out[i], layer.opacity);
      }
    }
    first = false;
  }
  return out;
}

/** Merges `top` into `bottom` in place (used by "merge down"). */
export function mergeLayerInto(top: Layer, bottom: Layer): void {
  if (!top.visible) return;
  for (let i = 0; i < top.pixels.length; i++) {
    const c = top.pixels[i];
    if (c >>> 24) bottom.pixels[i] = blendOver(c, bottom.pixels[i], top.opacity);
  }
}
