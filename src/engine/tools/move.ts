import type { Rect } from '../math';
import { extractBlock, fillRect, shiftPixels, stampBlock, type PixelBlock } from '../region';
import type { Stroke, Tool } from './types';

interface MoveState {
  block?: PixelBlock;
  cleared?: Uint32Array;
  origin?: Rect;
}

/** Lifts the selection (or the whole layer) on pointer down, then re-stamps it at the new offset. */
export function beginMove(s: Stroke): void {
  const state: MoveState = {};
  if (s.selection) {
    const { width, height } = s.doc;
    state.origin = { ...s.selection };
    state.block = extractBlock(s.base, width, height, s.selection);
    state.cleared = s.base.slice();
    fillRect(state.cleared, width, height, s.selection, 0);
    // extractBlock clips to the canvas: keep the origin aligned with the clipped block.
    state.origin.x = Math.max(0, state.origin.x);
    state.origin.y = Math.max(0, state.origin.y);
  }
  s.scratch.move = state;
}

export function applyMove(s: Stroke, dx: number, dy: number): void {
  const { width, height } = s.doc;
  const state = s.scratch.move as MoveState;
  if (!state.block || !state.cleared || !state.origin) {
    s.layer.pixels.set(shiftPixels(s.base, width, height, dx, dy));
    return;
  }
  s.layer.pixels.set(state.cleared);
  const x = state.origin.x + dx;
  const y = state.origin.y + dy;
  stampBlock(s.layer.pixels, width, height, state.block, x, y);
  s.setSelection({ x, y, w: state.block.width, h: state.block.height });
}

export const move: Tool = {
  id: 'move',
  editsPixels: true,
  onDown: (s) => beginMove(s),
  onMove: (s, p) => applyMove(s, p.x - s.start.x, p.y - s.start.y),
};
