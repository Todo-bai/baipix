import { describe, expect, it } from 'vitest';
import { pack } from '../src/engine/color';
import { Editor } from '../src/engine/editor';

const RED = pack(255, 0, 0);
const drag = (e: Editor, pts: [number, number][], secondary = false) => {
  e.beginStroke({ x: pts[0][0], y: pts[0][1] }, secondary, { shift: false });
  for (const [x, y] of pts.slice(1)) e.moveStroke({ x, y }, { shift: false });
  e.endStroke();
};
const layer = (e: Editor) => e.getState().doc.layers[e.getState().doc.activeLayer].pixels;
const painted = (e: Editor) => [...layer(e)].filter(Boolean).length;

describe('Editor', () => {
  it('draws with the pencil and undoes/redoes', () => {
    const e = new Editor();
    e.setColor('primary', RED);
    drag(e, [
      [0, 0],
      [3, 0],
    ]);
    expect(painted(e)).toBe(4);
    e.undo();
    expect(painted(e)).toBe(0);
    e.redo();
    expect(painted(e)).toBe(4);
  });

  it('removes doubled corners in pixel-perfect mode', () => {
    const e = new Editor();
    drag(e, [
      [0, 0],
      [1, 0],
      [1, 1],
      [2, 1],
      [2, 2],
    ]);
    expect(painted(e)).toBe(3);
    e.setOption('pixelPerfect', false);
    drag(e, [
      [5, 0],
      [6, 0],
      [6, 1],
    ]);
    expect(painted(e)).toBe(6);
  });

  it('draws symmetrically', () => {
    const e = new Editor();
    e.setView('mirrorX', true);
    drag(e, [[0, 0]]);
    const px = layer(e);
    expect(px[0]).not.toBe(0);
    expect(px[31]).not.toBe(0);
  });

  it('fills a closed area with the bucket', () => {
    const e = new Editor();
    e.setTool('rect');
    drag(e, [
      [0, 0],
      [4, 4],
    ]);
    e.setTool('bucket');
    e.setColor('primary', RED);
    drag(e, [[2, 2]]);
    expect(layer(e)[2 * 32 + 2]).toBe(RED);
    expect(layer(e)[10 * 32 + 10]).toBe(0);
  });

  it('keeps no undo step for a stroke that changes nothing', () => {
    const e = new Editor();
    e.setTool('eraser');
    drag(e, [[3, 3]]);
    expect(e.getState().canUndo).toBe(false);
  });

  it('refuses to draw on a hidden layer', () => {
    const e = new Editor();
    const notices: string[] = [];
    e.onNotice((n) => notices.push(n.type));
    e.setLayerVisible(0, false);
    expect(e.beginStroke({ x: 1, y: 1 }, false, { shift: false })).toBe(false);
    expect(notices).toContain('layerHidden');
  });

  it('moves a selection', () => {
    const e = new Editor();
    drag(e, [[0, 0]]);
    e.setTool('select');
    drag(e, [
      [0, 0],
      [1, 1],
    ]);
    e.nudge(2, 0);
    expect(layer(e)[0]).toBe(0);
    expect(layer(e)[2]).not.toBe(0);
    expect(e.getState().selection).toEqual({ x: 2, y: 0, w: 2, h: 2 });
  });

  it('keeps separate histories per file', () => {
    const e = new Editor();
    drag(e, [[0, 0]]);
    const first = e.getState().activeId;
    e.newFile(16, 16);
    expect(e.getState().canUndo).toBe(false);
    e.switchFile(first);
    expect(e.getState().canUndo).toBe(true);
  });

  it('merges layers down', () => {
    const e = new Editor();
    drag(e, [[0, 0]]);
    e.addLayer();
    drag(e, [[1, 0]]);
    e.mergeDown();
    expect(e.getState().doc.layers).toHaveLength(1);
    expect(painted(e)).toBe(2);
  });

  it('rotates the selection by 90° clockwise, and back after four turns', () => {
    const e = new Editor();
    const px = layer(e);
    const W = e.getState().doc.width;
    // A 3×1 bar with a marked left end, selected.
    px[4 * W + 4] = RED;
    px[4 * W + 5] = 1;
    px[4 * W + 6] = 1;
    e.setTool('select');
    drag(e, [
      [4, 4],
      [6, 4],
    ]);
    const before = [...layer(e)];
    e.rotate();
    // The bar becomes vertical around the same center, the left end on top.
    expect(e.getState().selection).toEqual({ x: 5, y: 3, w: 1, h: 3 });
    const after = layer(e);
    expect(after[3 * W + 5]).toBe(RED);
    expect(after[4 * W + 5]).toBe(1);
    expect(after[5 * W + 5]).toBe(1);
    expect(after[4 * W + 4]).toBe(0);
    for (let i = 0; i < 3; i++) e.rotate();
    expect([...layer(e)]).toEqual(before);
    e.undo();
    expect(layer(e)[4 * W + 4]).toBe(0);
  });

  it('draws the new shapes, outlined and filled', () => {
    for (const tool of ['roundRect', 'triangle', 'star'] as const) {
      const e = new Editor();
      e.setTool(tool);
      drag(e, [
        [2, 2],
        [14, 14],
      ]);
      const outline = painted(e);
      expect(outline).toBeGreaterThan(10);
      e.undo();
      e.setOption('filled', true);
      drag(e, [
        [2, 2],
        [14, 14],
      ]);
      expect(painted(e)).toBeGreaterThan(outline);
    }
  });

  it('shades darker and lightens lighter with palette colors', () => {
    const GREEN = pack(0x38, 0xb7, 0x64);
    const brightness = (c: number) => (c & 0xff) + ((c >> 8) & 0xff) + ((c >> 16) & 0xff);
    for (const [tool, darker] of [
      ['shade', true],
      ['lighten', false],
    ] as const) {
      const e = new Editor();
      e.setColor('primary', GREEN);
      drag(e, [[5, 5]]);
      const before = layer(e)[5 * 32 + 5];
      e.setTool(tool);
      drag(e, [[5, 5]]);
      const after = layer(e)[5 * 32 + 5];
      expect(after).not.toBe(before);
      expect(brightness(after) < brightness(before)).toBe(darker);
    }
  });

  it('adjusts colors with a live preview, then as one undo step', () => {
    const e = new Editor();
    const RED_HUE = { hue: 120, saturation: 100, brightness: 100 };
    e.setColor('primary', RED);
    drag(e, [
      [0, 0],
      [3, 0],
    ]);
    const before = [...layer(e)];
    e.beginAdjust(false);
    e.previewAdjust(RED_HUE);
    expect(layer(e)[0]).toBe(pack(0, 255, 0));
    e.cancelAdjust();
    expect([...layer(e)]).toEqual(before);

    // Limited to the selection, and one undo step.
    e.setTool('select');
    drag(e, [
      [0, 0],
      [1, 0],
    ]);
    e.beginAdjust(false);
    e.previewAdjust(RED_HUE);
    e.applyAdjust(RED_HUE, true);
    expect(layer(e)[1]).toBe(pack(0, 255, 0));
    expect(layer(e)[2]).toBe(RED);
    expect(e.getState().palette.colors).not.toContain(pack(0x1a, 0x1c, 0x2c));
    e.undo();
    expect(layer(e)[1]).toBe(RED);
  });

  it('reorders layers to any position, as one undo step', () => {
    const e = new Editor();
    e.addLayer();
    e.addLayer();
    const names = () => e.getState().doc.layers.map((l) => l.name);
    const before = names();
    e.reorderLayer(0, 2);
    expect(names()).toEqual([before[1], before[2], before[0]]);
    expect(e.getState().doc.activeLayer).toBe(2);
    e.undo();
    expect(names()).toEqual(before);
  });

  it('brings a deleted layer back where it was', () => {
    const e = new Editor();
    e.addLayer();
    e.addLayer();
    e.setActiveLayer(1);
    const names = () => e.getState().doc.layers.map((l) => l.name);
    const before = names();
    expect(e.deleteLayer()).toBe(true);
    drag(e, [[0, 0]]);
    expect(e.restoreDeleted()).toBe(true);
    expect(names()).toEqual(before);
    expect(e.getState().doc.activeLayer).toBe(1);
    expect(e.restoreDeleted()).toBe(false);
  });

  it("doesn't restore a layer that undo already brought back", () => {
    const e = new Editor();
    e.addLayer();
    e.deleteLayer();
    e.undo();
    expect(e.restoreDeleted()).toBe(false);
    expect(e.getState().doc.layers).toHaveLength(2);
  });

  it("doesn't restore a layer after the canvas was resized", () => {
    const e = new Editor();
    e.addLayer();
    e.deleteLayer();
    e.resize(16, 16);
    expect(e.restoreDeleted()).toBe(false);
    expect(e.getState().doc.layers).toHaveLength(1);
  });

  it('brings a deleted file back with its history', () => {
    const e = new Editor();
    e.setColor('primary', RED);
    drag(e, [[0, 0]]);
    const id = e.getState().activeId;
    e.newFile(16, 16);
    e.switchFile(id);
    expect(e.deleteFile(id)).toBe(true);
    expect(e.getState().files).toHaveLength(1);
    expect(e.restoreDeleted()).toBe(true);
    expect(e.getState().files.map((f) => f.id)[0]).toBe(id);
    expect(e.getState().activeId).toBe(id);
    expect(painted(e)).toBe(1);
    e.undo();
    expect(painted(e)).toBe(0);
  });

  it('keeps the last file', () => {
    const e = new Editor();
    expect(e.deleteFile(e.getState().activeId)).toBe(false);
    expect(e.restoreDeleted()).toBe(false);
  });

  it("doesn't paint on a locked layer", () => {
    const e = new Editor();
    const notices: string[] = [];
    e.onNotice((n) => notices.push(n.type));
    e.setColor('primary', RED);
    e.setLayerLocked(0, true);
    drag(e, [[0, 0]]);
    e.fill();
    e.flip(true);
    expect(painted(e)).toBe(0);
    expect(notices).toEqual(['layerLocked', 'layerLocked', 'layerLocked']);
    e.setLayerLocked(0, false);
    drag(e, [[0, 0]]);
    expect(painted(e)).toBe(1);
  });

  it("doesn't merge into a locked layer or adjust it", () => {
    const e = new Editor();
    e.setLayerLocked(0, true);
    e.addLayer();
    e.mergeDown();
    expect(e.getState().doc.layers).toHaveLength(2);
    e.beginAdjust(false);
    expect(e.isAdjusting).toBe(true);
    e.cancelAdjust();
    e.setActiveLayer(0);
    e.beginAdjust(false);
    expect(e.isAdjusting).toBe(false);
  });

  it('solos a layer, then shows every layer again', () => {
    const e = new Editor();
    e.addLayer();
    e.addLayer();
    const visible = () => e.getState().doc.layers.map((l) => l.visible);
    e.setLayerVisible(0, false);
    e.soloLayer(1);
    expect(visible()).toEqual([false, true, false]);
    e.soloLayer(1);
    expect(visible()).toEqual([true, true, true]);
    e.undo();
    expect(visible()).toEqual([false, true, false]);
  });

  it('merges the visible layers into the lowest visible one', () => {
    const e = new Editor();
    e.setColor('primary', RED);
    drag(e, [[0, 0]]);
    e.addLayer();
    drag(e, [[1, 0]]);
    e.addLayer();
    drag(e, [[2, 0]]);
    e.setLayerVisible(2, false);
    e.mergeVisible();
    const { layers, activeLayer } = e.getState().doc;
    expect(layers).toHaveLength(2);
    expect(activeLayer).toBe(0);
    expect([...layers[0].pixels.slice(0, 3)].map(Boolean)).toEqual([true, true, false]);
    e.undo();
    expect(e.getState().doc.layers).toHaveLength(3);
  });

  it('remembers the last colors painted with', () => {
    const e = new Editor();
    const colors = Array.from({ length: 10 }, (_, i) => pack(i * 20, 0, 0));
    for (const c of colors) {
      e.setColor('primary', c);
      drag(e, [[0, 0]]);
      e.undo();
    }
    e.setColor('primary', colors[5]);
    drag(e, [[1, 1]]);
    const recent = e.getState().recent;
    expect(recent).toHaveLength(8);
    expect(recent[0]).toBe(colors[5] >>> 0);
    expect(recent.filter((c) => c === colors[5] >>> 0)).toHaveLength(1);
    expect(e.getPreferences().recent).toEqual(recent);
  });

  it("doesn't count colors that were only picked, or the eraser", () => {
    const e = new Editor();
    e.setColor('primary', RED);
    e.setTool('eraser');
    drag(e, [[0, 0]]);
    expect(e.getState().recent).toEqual([]);
  });

  it('moves a palette color to another position', () => {
    const e = new Editor();
    const before = e.getState().palette.colors;
    e.movePaletteColor(0, 3);
    const after = e.getState().palette;
    expect(after.key).toBe('custom');
    expect(after.colors[3]).toBe(before[0]);
    expect(after.colors.slice(0, 3)).toEqual(before.slice(1, 4));
    expect([...after.colors].sort()).toEqual([...before].sort());
    e.movePaletteColor(3, 0);
    expect(e.getState().palette.colors).toEqual(before);
  });
});
