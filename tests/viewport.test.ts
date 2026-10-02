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

  it('knows the visible area, and centers the view on an art pixel', () => {
    viewport.width = 800;
    viewport.height = 600;
    viewport.covered = () => ({ left: 200, right: 0 });
    viewport.set({ zoom: 10, panX: 100, panY: 0 });
    // The free part of the workspace starts after the left panel, 200px in.
    expect(viewport.visibleArea()).toEqual({ x0: 10, y0: 0, x1: 70, y1: 60 });
    viewport.centerOn(50, 40);
    const { x0, x1, y0, y1 } = viewport.visibleArea();
    expect((x0 + x1) / 2).toBeCloseTo(50);
    expect((y0 + y1) / 2).toBeCloseTo(40);
    viewport.covered = () => ({ left: 0, right: 0 });
  });
});
