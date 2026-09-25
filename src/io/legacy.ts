import { createDocument, type PixelDoc } from '../engine/document';
import { clamp } from '../engine/math';

/**
 * Imports drawings saved by the early single-file prototype (localStorage, PNG data URLs),
 * so nobody loses work when moving to this version. Removed once imported.
 */
const LEGACY_KEYS = ['baipix:v2', 'pixma:v2', 'grain:v1'];

interface LegacyLayer {
  name?: string;
  visible?: boolean;
  opacity?: number;
  png?: string;
}
interface LegacyFile {
  name?: string;
  W: number;
  H: number;
  active?: number;
  bg?: number;
  bgOn?: boolean;
  exportScale?: number;
  exportGap?: number;
  layers: LegacyLayer[];
}

async function decodePng(dataUrl: string, width: number, height: number): Promise<Uint32Array> {
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0);
  return new Uint32Array(ctx.getImageData(0, 0, width, height).data.buffer.slice(0));
}

export async function importLegacyWorkspace(): Promise<PixelDoc[]> {
  for (const key of LEGACY_KEYS) {
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(key);
    } catch {
      return [];
    }
    if (!raw) continue;
    try {
      const data = JSON.parse(raw);
      const files: LegacyFile[] = Array.isArray(data.files)
        ? data.files
        : [{ ...data, exportGap: data.prefs?.exportGap }];
      const docs: PixelDoc[] = [];
      for (const f of files) {
        const w = clamp(f.W | 0, 1, 512);
        const h = clamp(f.H | 0, 1, 512);
        const doc = createDocument(f.name || 'Untitled', w, h);
        doc.layers = [];
        for (const [i, l] of (f.layers ?? []).entries()) {
          const layer = { ...createDocument('', w, h).layers[0], name: l.name || `Layer ${i + 1}` };
          layer.visible = l.visible !== false;
          layer.opacity = typeof l.opacity === 'number' ? l.opacity : 1;
          if (l.png) layer.pixels = await decodePng(l.png, w, h);
          doc.layers.push(layer);
        }
        if (!doc.layers.length) continue;
        doc.layerCounter = doc.layers.length;
        doc.activeLayer = clamp(f.active ?? 0, 0, doc.layers.length - 1);
        doc.background = (f.bg ?? 0) >>> 0;
        doc.backgroundVisible = f.bgOn !== false;
        doc.render = { pixelSize: f.exportScale ?? 8, gap: f.exportGap ?? 0 };
        docs.push(doc);
      }
      LEGACY_KEYS.forEach((k) => localStorage.removeItem(k));
      return docs;
    } catch {
      continue;
    }
  }
  return [];
}
