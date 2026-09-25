import { alpha, toHex, type Color } from '../color';

export interface RenderGeometry {
  pixelSize: number;
  gap: number;
  width: number;
  height: number;
}

export const MAX_EXPORT_SIZE = 8192;

/**
 * Output size for a document rendered with a pixel size and gap. The pixel size is halved
 * until the image fits within MAX_EXPORT_SIZE.
 */
export function renderGeometry(
  docWidth: number,
  docHeight: number,
  pixelSize: number,
  gap: number,
): RenderGeometry {
  const at = (k: number): RenderGeometry => ({
    pixelSize: k,
    gap,
    width: docWidth * k + (docWidth - 1) * gap,
    height: docHeight * k + (docHeight - 1) * gap,
  });
  let k = pixelSize;
  let g = at(k);
  while (k > 1 && (g.width > MAX_EXPORT_SIZE || g.height > MAX_EXPORT_SIZE)) {
    k = Math.max(1, k >> 1);
    g = at(k);
  }
  return g;
}

const fillAttrs = (c: Color): string =>
  `fill="${toHex(c)}"${alpha(c) < 255 ? ` fill-opacity="${(alpha(c) / 255).toFixed(3)}"` : ''}`;

/**
 * Crisp SVG: one <path> per color. Without a gap, horizontal runs of the same color are merged
 * into a single rectangle, which keeps files small and makes them pleasant to edit in Figma.
 */
export function toSvg(
  pixels: Uint32Array,
  docWidth: number,
  docHeight: number,
  geometry: RenderGeometry,
  background: Color = 0,
): string {
  const { pixelSize: k, gap: g, width, height } = geometry;
  const step = k + g;
  const paths = new Map<Color, string[]>();
  const add = (c: Color, d: string) => {
    const list = paths.get(c);
    if (list) list.push(d);
    else paths.set(c, [d]);
  };
  for (let y = 0; y < docHeight; y++) {
    for (let x = 0; x < docWidth; x++) {
      const c = pixels[y * docWidth + x];
      if (!alpha(c)) continue;
      if (g === 0) {
        let end = x + 1;
        while (end < docWidth && pixels[y * docWidth + end] === c) end++;
        const w = (end - x) * k;
        add(c, `M${x * k} ${y * k}h${w}v${k}h-${w}z`);
        x = end - 1;
      } else {
        add(c, `M${x * step} ${y * step}h${k}v${k}h-${k}z`);
      }
    }
  }
  const lines = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges">`,
  ];
  if (alpha(background)) lines.push(`<rect width="${width}" height="${height}" ${fillAttrs(background)}/>`);
  for (const [c, d] of paths) lines.push(`<path ${fillAttrs(c)} d="${d.join('')}"/>`);
  lines.push('</svg>', '');
  return lines.join('\n');
}
