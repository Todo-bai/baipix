import type { Tool } from './types';

/** The hand pans the view. That happens in the canvas view, so the tool itself does nothing. */
export const hand: Tool = {
  id: 'hand',
  editsPixels: false,
  onDown: () => {},
  onMove: () => {},
};
