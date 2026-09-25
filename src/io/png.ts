import { alpha, toCss, type Color } from '../engine/color';
import type { RenderGeometry } from '../engine/export/svg';

/** Renders pixels at the given geometry (pixel size + gap) on a canvas. */
export function renderToCanvas(
  pixels: Uint32Array,
  docWidth: number,
  docHeight: number,
  geometry: RenderGeometry,
  background: Color = 0,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = geometry.width;
  canvas.height = geometry.height;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  if (alpha(background)) {
    ctx.fillStyle = toCss(background);
    ctx.fillRect(0, 0, geometry.width, geometry.height);
  }
  if (geometry.gap === 0) {
    const src = pixelsToCanvas(pixels, docWidth, docHeight);
    ctx.drawImage(src, 0, 0, geometry.width, geometry.height);
    return canvas;
  }
  const step = geometry.pixelSize + geometry.gap;
  for (let y = 0; y < docHeight; y++) {
    for (let x = 0; x < docWidth; x++) {
      const c = pixels[y * docWidth + x];
      if (!alpha(c)) continue;
      ctx.fillStyle = toCss(c);
      ctx.fillRect(x * step, y * step, geometry.pixelSize, geometry.pixelSize);
    }
  }
  return canvas;
}

/** 1:1 canvas of a pixel buffer. */
export function pixelsToCanvas(pixels: Uint32Array, width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const image = ctx.createImageData(width, height);
  new Uint32Array(image.data.buffer).set(pixels);
  ctx.putImageData(image, 0, 0);
  return canvas;
}

export const canvasToBlob = (canvas: HTMLCanvasElement): Promise<Blob> =>
  new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG encoding failed'))), 'image/png'),
  );
