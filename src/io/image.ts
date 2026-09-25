import type { PixelBlock } from '../engine/region';

export function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Unreadable image'));
    };
    img.src = url;
  });
}

/** Reads an image into pixels, downscaling with nearest-neighbor to fit within max bounds. */
export function imageToBlock(
  img: HTMLImageElement,
  maxWidth: number,
  maxHeight: number,
): PixelBlock & { scaled: boolean } {
  const f = Math.min(1, maxWidth / img.naturalWidth, maxHeight / img.naturalHeight);
  const width = Math.max(1, Math.floor(img.naturalWidth * f));
  const height = Math.max(1, Math.floor(img.naturalHeight * f));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0, width, height);
  const pixels = new Uint32Array(ctx.getImageData(0, 0, width, height).data.buffer.slice(0));
  return { width, height, pixels, scaled: f < 1 };
}
