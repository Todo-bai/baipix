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
});
