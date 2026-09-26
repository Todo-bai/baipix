import { describe, expect, it } from 'vitest';
import { viewport } from '../src/ui/viewport';

describe('viewport', () => {
  it('spreads pixels by the render gap instead of shrinking them, around the drawing center', () => {
    viewport.set({ zoom: 8, panX: 100, panY: 50 });
    const center = () => viewport.panX + (32 * viewport.effectiveZoom) / 2;
    const before = center();
    expect(viewport.pixel).toBe(8);
    expect(viewport.scale).toBe(8);

    // Render gap 2 for 8px pixels: a quarter of the pixel size.
    viewport.setGapRatio(0.25, 32, 32);
    expect(viewport.pixel).toBe(8);
    expect(viewport.gap).toBe(2);
    expect(viewport.scale).toBe(10);
    expect(viewport.pixelZoom).toBe(8);
    expect(center()).toBeCloseTo(before);

    viewport.setGapRatio(0, 32, 32);
    expect(viewport.scale).toBe(8);
    expect(center()).toBeCloseTo(before);
  });
});
