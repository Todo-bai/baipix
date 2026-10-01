import type { Color } from '../color';
import type { Layer, PixelDoc } from '../document';
import type { Outside } from '../outside';
import type { Point, Rect } from '../math';
import type { PaletteIndex, ShadeMode } from '../palette';

export type ToolId =
  | 'move'
  | 'select'
  | 'hand'
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
  | 'spray'
  | 'jumble'
  | 'picker';

export interface ToolOptions {
  size: number;
  /** Round brush tip instead of a square one (sizes 3 and up). */
  roundTip: boolean;
  pixelPerfect: boolean;
  dither: boolean;
  filled: boolean;
  /** Corner radius of the rounded rectangle, in pixels. */
  radius: number;
  contiguous: boolean;
  blurStrength: number;
  blurSnap: boolean;
  /** How lighten and shade pick the next color. */
  shadeMode: ShadeMode;
  /** Steps per stroke in the free mode, 1 to 3. */
  shadeStrength: number;
  /** Free mode: highlights toward yellow, shadows toward blue-violet. */
  shadeHueShift: boolean;
  /** Spray: diameter of the circle, in pixels. */
  spraySize: number;
  /** Spray: how many pixels each dab drops, 1 to 100. */
  sprayDensity: number;
  /** Spray: give each pixel a random opacity. */
  sprayOpacity: boolean;
  /** Jumble: side of the square whose pixels get shuffled. */
  jumbleSize: number;
  /** Jumble: how many swaps per step, 1 to 3. */
  jumbleStrength: number;
}

export const DEFAULT_TOOL_OPTIONS: ToolOptions = {
  size: 1,
  roundTip: false,
  pixelPerfect: true,
  dither: false,
  filled: false,
  radius: 2,
  contiguous: true,
  blurStrength: 1,
  blurSnap: true,
  shadeMode: 'ramp',
  shadeStrength: 1,
  shadeHueShift: true,
  spraySize: 8,
  sprayDensity: 30,
  sprayOpacity: false,
  jumbleSize: 6,
  jumbleStrength: 1,
};

export interface Modifiers {
  shift: boolean;
  /** Move tool: Cmd/Ctrl held, move the active layer instead of the one under the pointer. */
  keepLayer?: boolean;
}

/** Everything a tool needs during one pointer gesture. Created by the editor on pointer down. */
export interface Stroke {
  doc: PixelDoc;
  layer: Layer;
  /** Layer pixels as they were when the stroke started. */
  base: Uint32Array;
  /** The layer's part outside the canvas when the stroke started. */
  baseOutside: Outside | undefined;
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
  /** Paints with the stroke colors, which then go to the recent colors. */
  paintsColor?: boolean;
  onDown(stroke: Stroke, p: Point, mods: Modifiers): void;
  onMove(stroke: Stroke, p: Point, mods: Modifiers): void;
  onUp?(stroke: Stroke): void;
}
