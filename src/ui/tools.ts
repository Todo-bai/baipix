import type { ToolId } from '../engine/tools';
import type { MessageKey } from '../i18n';
import type { IconName } from './icons';

export interface ToolMeta {
  id: ToolId;
  icon: IconName;
  label: MessageKey;
  shortcut: string;
}

/** Toolbar layout: groups are separated by a divider. */
export const TOOL_GROUPS: ToolMeta[][] = [
  [
    { id: 'move', icon: 'move', label: 'tool.move', shortcut: 'V' },
    { id: 'select', icon: 'select', label: 'tool.select', shortcut: 'M' },
  ],
  [
    { id: 'pencil', icon: 'pencil', label: 'tool.pencil', shortcut: 'B' },
    { id: 'eraser', icon: 'eraser', label: 'tool.eraser', shortcut: 'E' },
    { id: 'bucket', icon: 'bucket', label: 'tool.bucket', shortcut: 'G' },
  ],
  [
    { id: 'line', icon: 'line', label: 'tool.line', shortcut: 'L' },
    { id: 'rect', icon: 'rect', label: 'tool.rect', shortcut: 'R' },
    { id: 'ellipse', icon: 'ellipse', label: 'tool.ellipse', shortcut: 'C' },
  ],
  [
    { id: 'shade', icon: 'shade', label: 'tool.shade', shortcut: 'S' },
    { id: 'blur', icon: 'blur', label: 'tool.blur', shortcut: 'F' },
    { id: 'picker', icon: 'picker', label: 'tool.picker', shortcut: 'I' },
  ],
];

export const TOOL_LIST: ToolMeta[] = TOOL_GROUPS.flat();
export const toolMeta = (id: ToolId): ToolMeta => TOOL_LIST.find((t) => t.id === id)!;

/** Tools that show a brush footprint under the cursor. */
export const BRUSH_TOOLS: ToolId[] = ['pencil', 'eraser', 'line', 'rect', 'ellipse', 'shade', 'blur'];
