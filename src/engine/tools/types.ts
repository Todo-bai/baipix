import type { Color } from '../color';
import type { Layer, PixelDoc } from '../document';
import type { Point, Rect } from '../math';
import type { PaletteIndex } from '../palette';

export type ToolId =
  | 'move'
  | 'select'
  | 'pencil'
  | 'eraser'
  | 'bucket'
  | 'line'
  | 'rect'
  | 'roundRect'
  | 'ellipse'
  | 'triangle'
  | 'star'
  | 'shade'
  | 'lighten'
  | 'blur'
  | 'picker';

export interface ToolOptions {
  size: number;
  pixelPerfect: boolean;
  dither: boolean;
  filled: boolean;
  /** Corner radius of the rounded rectangle, in pixels. */
  radius: number;
  contiguous: boolean;
  blurStrength: number;
  blurSnap: boolean;
}

export const DEFAULT_TOOL_OPTIONS: ToolOptions = {
  size: 1,
  pixelPerfect: true,
  dither: false,
  filled: false,
  radius: 2,
  contiguous: true,
  blurStrength: 1,
  blurSnap: true,
};

export interface Modifiers {
  shift: boolean;
}

/** Everything a tool needs during one pointer gesture. Created by the editor on pointer down. */
export interface Stroke {
  doc: PixelDoc;
  layer: Layer;
  /** Layer pixels as they were when the stroke started. */
  base: Uint32Array;
  start: Point;
  last: Point;
  /** Right button / secondary color. */
  secondary: boolean;
  options: ToolOptions;
  primaryColor: Color;
  secondaryColor: Color;
  palette: PaletteIndex;
  mirrorX: boolean;
  mirrorY: boolean;
  selection: Rect | null;
  /** Per-pixel marks, for tools that must affect each pixel once per stroke. */
  visited: Uint8Array;
  /** Points painted so far (pixel-perfect bookkeeping). */
  trail: Point[];
  /** Free scratch space for a tool. */
  scratch: Record<string, unknown>;
  /** Color of the flattened image at a point (for the picker). */
  sample(p: Point): Color;
  setColor(slot: 'primary' | 'secondary', color: Color): void;
  setSelection(rect: Rect | null): void;
}

export interface Tool {
  id: ToolId;
  /** Whether the tool writes to the active layer (and therefore needs an undo step). */
  editsPixels: boolean;
  onDown(stroke: Stroke, p: Point, mods: Modifiers): void;
  onMove(stroke: Stroke, p: Point, mods: Modifiers): void;
  onUp?(stroke: Stroke): void;
}
