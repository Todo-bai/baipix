import { describe, expect, it } from 'vitest';
import { pack } from '../src/engine/color';
import { flatten } from '../src/engine/composite';
import { createDocument } from '../src/engine/document';
import { renderGeometry, toSvg } from '../src/engine/export/svg';

const RED = pack(255, 0, 0);

describe('renderGeometry', () => {
  it('adds gaps only between pixels', () => {
    expect(renderGeometry(4, 2, 8, 2)).toMatchObject({ width: 4 * 8 + 3 * 2, height: 2 * 8 + 2 });
  });

  it('shrinks pixels that would exceed the maximum size', () => {
    expect(renderGeometry(512, 512, 32, 0).pixelSize).toBe(16);
  });
});

describe('toSvg', () => {
  it('merges horizontal runs into one rectangle', () => {
    const px = Uint32Array.from([RED, RED, RED, 0]);
    const svg = toSvg(px, 4, 1, renderGeometry(4, 1, 10, 0));
    expect(svg).toContain('d="M0 0h30v10h-30z"');
    expect(svg.match(/<path/g)).toHaveLength(1);
  });

  it('draws one square per pixel with a gap, plus the background', () => {
    const px = Uint32Array.from([RED, RED]);
    const svg = toSvg(px, 2, 1, renderGeometry(2, 1, 10, 2), pack(0, 0, 255));
    expect(svg).toContain('M0 0h10v10h-10zM12 0h10v10h-10z');
    expect(svg).toContain('<rect width="22" height="10" fill="#0000ff"/>');
  });
});

describe('flatten', () => {
  it('composites layers over the background', () => {
    const doc = createDocument('t', 2, 1);
    doc.background = pack(0, 0, 255);
    doc.layers[0].pixels[0] = RED;
    const out = flatten(doc);
    expect(out[0]).toBe(RED);
    expect(out[1]).toBe(pack(0, 0, 255));
    expect(flatten(doc, { includeBackground: false })[1]).toBe(0);
  });
});
