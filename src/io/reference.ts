import type { ReferenceImage } from '../engine/document';
import { loadImage } from './image';

/** Longest side of a reference image once imported: sharp enough to trace, light to store. */
export const REFERENCE_MAX = 2048;

/**
 * Turns an image file into a reference image fitted inside the canvas (whole image visible,
 * centered), half transparent. Throws on an unreadable image.
 */
export async function referenceFromFile(
  file: Blob,
  docWidth: number,
  docHeight: number,
): Promise<ReferenceImage> {
  const img = await loadImage(file);
  const f = Math.min(1, REFERENCE_MAX / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.max(1, Math.round(img.naturalWidth * f));
  const height = Math.max(1, Math.round(img.naturalHeight * f));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, width, height);
  // WebP where the browser can encode it (it falls back to PNG otherwise).
  const src = canvas.toDataURL('image/webp', 0.85);
  const k = Math.min(docWidth / width, docHeight / height);
  const w = width * k;
  const h = height * k;
  return {
    src,
    width,
    height,
    x: (docWidth - w) / 2,
    y: (docHeight - h) / 2,
    w,
    h,
    opacity: 0.5,
    visible: true,
  };
}
