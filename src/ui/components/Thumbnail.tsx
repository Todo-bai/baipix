import { useLayoutEffect, useRef } from 'react';

interface ThumbnailProps {
  pixels: () => Uint32Array;
  width: number;
  height: number;
  /** Bump to redraw. */
  version: number;
}

/** Small preview of a pixel buffer, drawn at an integer scale when possible. */
export function Thumbnail({ pixels, width, height, version }: ThumbnailProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const size = 40;
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const src = document.createElement('canvas');
    src.width = width;
    src.height = height;
    const sctx = src.getContext('2d')!;
    const image = sctx.createImageData(width, height);
    new Uint32Array(image.data.buffer).set(pixels());
    sctx.putImageData(image, 0, 0);
    const k = Math.min(size / width, size / height);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(src, (size - width * k) / 2, (size - height * k) / 2, width * k, height * k);
    // `pixels` is intentionally read lazily; `version` drives redraws.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height, version]);
  return <canvas ref={ref} className="thumb" aria-hidden="true" />;
}
