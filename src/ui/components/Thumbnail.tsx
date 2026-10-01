import { useLayoutEffect, useRef } from 'react';

interface ThumbnailProps {
  pixels: () => Uint32Array;
  width: number;
  height: number;
  /** Bump to redraw. */
  version: number;
}

/** Thumbnails are 20px high; their width follows the drawing, between these ratios. */
const MIN_RATIO = 0.5;
const MAX_RATIO = 2;
/** Canvas pixels per CSS pixel, so thumbnails stay sharp on 2× screens. */
const DENSITY = 2;

/**
 * Small preview of a pixel buffer, with the drawing's proportions: a wide drawing gets a wide
 * thumbnail instead of a thin strip in a square. Very wide or tall ones are capped and fitted.
 */
export function Thumbnail({ pixels, width, height, version }: ThumbnailProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ratio = Math.min(MAX_RATIO, Math.max(MIN_RATIO, width / height));
    const h = 20 * DENSITY;
    const w = Math.round(h * ratio);
    canvas.width = w;
    canvas.height = h;
    canvas.style.width = `${w / DENSITY}px`;
    const ctx = canvas.getContext('2d')!;
    const src = document.createElement('canvas');
    src.width = width;
    src.height = height;
    const sctx = src.getContext('2d')!;
    const image = sctx.createImageData(width, height);
    new Uint32Array(image.data.buffer).set(pixels());
    sctx.putImageData(image, 0, 0);
    const k = Math.min(w / width, h / height);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(src, (w - width * k) / 2, (h - height * k) / 2, width * k, height * k);
    // `pixels` is intentionally read lazily; `version` drives redraws.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height, version]);
  return <canvas ref={ref} className="thumb" aria-hidden="true" />;
}
