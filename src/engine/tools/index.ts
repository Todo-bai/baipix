import { blur } from './blur';
import { bucket } from './bucket';
import { eraser } from './eraser';
import { move } from './move';
import { pencil } from './pencil';
import { picker } from './picker';
import { select } from './select';
import { lighten, shade } from './shade';
import { ellipseTool, lineTool, rectTool, roundRectTool, starTool, triangleTool } from './shapes';
import type { Tool, ToolId } from './types';

/** To add a tool: create a file exporting a `Tool`, register it here, then add its UI metadata in `ui/tools.ts`. */
export const TOOLS: Record<ToolId, Tool> = {
  move,
  select,
  pencil,
  eraser,
  bucket,
  line: lineTool,
  rect: rectTool,
  roundRect: roundRectTool,
  ellipse: ellipseTool,
  triangle: triangleTool,
  star: starTool,
  shade,
  lighten,
  blur,
  picker,
};

export type { Tool, ToolId, ToolOptions, Stroke, Modifiers } from './types';
export { DEFAULT_TOOL_OPTIONS } from './types';
