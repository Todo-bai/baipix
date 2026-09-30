import { alpha, type Color } from './color';

export const MAX_SIZE = 512;

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  /** Locked layers can't be painted on (they can still be moved, renamed or deleted). */
  locked: boolean;
  /** 0..1 */
  opacity: number;
  /** width × height packed colors, row-major. */
  pixels: Uint32Array;
}

/** How pixels are rendered on export (and optionally previewed on the canvas). */
export interface RenderSettings {
  /** Size of one pixel in the exported file, in px. */
  pixelSize: number;
  /** Gap between pixels in the exported file, in px. */
  gap: number;
}

export interface PixelDoc {
  id: string;
  name: string;
  width: number;
  height: number;
  /** Bottom to top. */
  layers: Layer[];
  activeLayer: number;
  /** 0 means no background. */
  background: Color;
  backgroundVisible: boolean;
  render: RenderSettings;
  /**
   * Symmetry axes, in pixels from the left and top edges, by half pixels: a whole number puts the axis
   * between two pixels, a .5 through the middle of one. Missing means the center of the canvas.
   */
  axisX?: number;
  axisY?: number;
  /** Used to name new layers ("Layer 3"). */
  layerCounter: number;
  /** Last change, in ms since the epoch (for the home screen). Missing in older files. */
  updatedAt?: number;
}

let seq = 0;
export const newId = (prefix: string): string =>
  `${prefix}_${Date.now().toString(36)}${(seq++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function createLayer(name: string, width: number, height: number): Layer {
  return {
    id: newId('layer'),
    name,
    visible: true,
    locked: false,
    opacity: 1,
    pixels: new Uint32Array(width * height),
  };
}

export function createDocument(name: string, width: number, height: number, layerName = 'Layer 1'): PixelDoc {
  return {
    id: newId('doc'),
    name,
    width,
    height,
    layers: [createLayer(layerName, width, height)],
    activeLayer: 0,
    background: 0,
    backgroundVisible: true,
    render: { pixelSize: 8, gap: 0 },
    layerCounter: 1,
    updatedAt: Date.now(),
  };
}

export const cloneLayer = (layer: Layer, keepId = true): Layer => ({
  ...layer,
  id: keepId ? layer.id : newId('layer'),
  pixels: layer.pixels.slice(),
});

export function cloneDocument(doc: PixelDoc, keepIds = true): PixelDoc {
  return {
    ...doc,
    id: keepIds ? doc.id : newId('doc'),
    render: { ...doc.render },
    layers: doc.layers.map((l) => cloneLayer(l, keepIds)),
  };
}

export const activeLayer = (doc: PixelDoc): Layer => doc.layers[doc.activeLayer];

export const hasBackground = (doc: PixelDoc): boolean => doc.backgroundVisible && alpha(doc.background) > 0;

/** Where the symmetry axes are: the center of the canvas unless they were moved. */
export const mirrorAxes = (doc: PixelDoc): { x: number; y: number } => ({
  x: doc.axisX ?? doc.width / 2,
  y: doc.axisY ?? doc.height / 2,
});

/** Changes the canvas size, keeping the drawing centered (and moved symmetry axes with it). */
export function resizeDocument(doc: PixelDoc, width: number, height: number): void {
  const offsetX = Math.floor((width - doc.width) / 2);
  const offsetY = Math.floor((height - doc.height) / 2);
  if (doc.axisX !== undefined) doc.axisX = Math.min(width, Math.max(0, doc.axisX + offsetX));
  if (doc.axisY !== undefined) doc.axisY = Math.min(height, Math.max(0, doc.axisY + offsetY));
  for (const layer of doc.layers) {
    const next = new Uint32Array(width * height);
    for (let y = 0; y < doc.height; y++) {
      const ty = y + offsetY;
      if (ty < 0 || ty >= height) continue;
      for (let x = 0; x < doc.width; x++) {
        const tx = x + offsetX;
        if (tx >= 0 && tx < width) next[ty * width + tx] = layer.pixels[y * doc.width + x];
      }
    }
    layer.pixels = next;
  }
  doc.width = width;
  doc.height = height;
}
