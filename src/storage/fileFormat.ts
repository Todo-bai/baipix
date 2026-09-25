import type { Color } from '../engine/color';
import { MAX_SIZE, newId, type Layer, type PixelDoc } from '../engine/document';
import { clamp } from '../engine/math';

/**
 * `.baipix` files are plain JSON. Each layer is stored as an indexed palette plus run-length
 * encoded indices: small, diff-friendly and readable without any image decoder.
 */
export const FILE_FORMAT = 'baipix';
export const FILE_VERSION = 1;
export const FILE_EXTENSION = '.baipix';

export interface BaipixLayer {
  name: string;
  visible: boolean;
  opacity: number;
  /** Distinct colors as unsigned 32-bit integers (0xAABBGGRR). */
  colors: number[];
  /** Flat list of [colorIndex, runLength] pairs, row-major. */
  runs: number[];
}

export interface BaipixFile {
  format: typeof FILE_FORMAT;
  version: number;
  id?: string;
  name: string;
  width: number;
  height: number;
  activeLayer: number;
  layerCounter: number;
  background: number;
  backgroundVisible: boolean;
  render: { pixelSize: number; gap: number };
  layers: BaipixLayer[];
}

export function encodePixels(pixels: Uint32Array): { colors: number[]; runs: number[] } {
  const colors: number[] = [];
  const index = new Map<Color, number>();
  const runs: number[] = [];
  let i = 0;
  while (i < pixels.length) {
    const c = pixels[i];
    let n = 1;
    while (i + n < pixels.length && pixels[i + n] === c) n++;
    let k = index.get(c);
    if (k === undefined) {
      k = colors.length;
      index.set(c, k);
      colors.push(c);
    }
    runs.push(k, n);
    i += n;
  }
  return { colors, runs };
}

export function decodePixels(colors: number[], runs: number[], length: number): Uint32Array {
  const out = new Uint32Array(length);
  let p = 0;
  for (let i = 0; i + 1 < runs.length && p < length; i += 2) {
    const c = (colors[runs[i]] ?? 0) >>> 0;
    const n = Math.min(runs[i + 1], length - p);
    out.fill(c, p, p + n);
    p += n;
  }
  return out;
}

export function serializeDocument(doc: PixelDoc): BaipixFile {
  return {
    format: FILE_FORMAT,
    version: FILE_VERSION,
    id: doc.id,
    name: doc.name,
    width: doc.width,
    height: doc.height,
    activeLayer: doc.activeLayer,
    layerCounter: doc.layerCounter,
    background: doc.background >>> 0,
    backgroundVisible: doc.backgroundVisible,
    render: { ...doc.render },
    layers: doc.layers.map((l) => ({
      name: l.name,
      visible: l.visible,
      opacity: l.opacity,
      ...encodePixels(l.pixels),
    })),
  };
}

export class FileFormatError extends Error {}

/** Validates and converts a parsed `.baipix` object into a document. Throws FileFormatError. */
export function deserializeDocument(data: unknown): PixelDoc {
  const f = data as Partial<BaipixFile> | null;
  if (!f || f.format !== FILE_FORMAT) throw new FileFormatError('Not a .baipix file');
  if (typeof f.version !== 'number' || f.version > FILE_VERSION)
    throw new FileFormatError('Unsupported version');
  const width = clamp(Math.round(Number(f.width)) || 0, 1, MAX_SIZE);
  const height = clamp(Math.round(Number(f.height)) || 0, 1, MAX_SIZE);
  const layers: Layer[] = (Array.isArray(f.layers) ? f.layers : []).map((l, i) => ({
    id: newId('layer'),
    name: typeof l.name === 'string' && l.name ? l.name.slice(0, 120) : `Layer ${i + 1}`,
    visible: l.visible !== false,
    opacity: typeof l.opacity === 'number' ? clamp(l.opacity, 0, 1) : 1,
    pixels: decodePixels(
      Array.isArray(l.colors) ? l.colors : [],
      Array.isArray(l.runs) ? l.runs : [],
      width * height,
    ),
  }));
  if (!layers.length) throw new FileFormatError('No layers');
  return {
    id: typeof f.id === 'string' ? f.id : newId('doc'),
    name: typeof f.name === 'string' && f.name.trim() ? f.name.slice(0, 120) : 'Untitled',
    width,
    height,
    layers,
    activeLayer: clamp(Math.round(Number(f.activeLayer)) || 0, 0, layers.length - 1),
    layerCounter: Math.max(layers.length, Number(f.layerCounter) || 0),
    background: (Number(f.background) || 0) >>> 0,
    backgroundVisible: f.backgroundVisible !== false,
    render: {
      pixelSize: clamp(Number(f.render?.pixelSize) || 8, 1, 64),
      gap: clamp(Number(f.render?.gap) || 0, 0, 64),
    },
  };
}

export const documentToJson = (doc: PixelDoc): string => JSON.stringify(serializeDocument(doc));

export function documentFromJson(text: string): PixelDoc {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new FileFormatError('Invalid JSON');
  }
  return deserializeDocument(data);
}
