import type { MessageKey } from '../../i18n';

export const SHORTCUT_GROUPS: { title: MessageKey; items: [MessageKey, string][] }[] = [
  {
    title: 'shortcuts.tools',
    items: [
      ['tool.move', 'V'],
      ['tool.select', 'M'],
      ['tool.pencil', 'B'],
      ['tool.eraser', 'E'],
      ['tool.bucket', 'G'],
      ['tool.line', 'L'],
      ['tool.rect', 'R'],
      ['tool.ellipse', 'C'],
      ['tool.shade', 'S'],
      ['tool.blur', 'F'],
      ['tool.picker', 'I / Alt'],
    ],
  },
  {
    title: 'shortcuts.drawing',
    items: [
      ['options.size', '1 – 9'],
      ['color.swap', 'X'],
      ['menu.undo', 'Ctrl+Z'],
      ['menu.redo', 'Ctrl+Shift+Z'],
      ['shortcuts.clipboard', 'Ctrl+C / X / V'],
      ['menu.copySvg', 'Ctrl+Shift+C'],
      ['shortcuts.clear', 'Del'],
      ['menu.fillLayer', 'Shift+Del'],
      ['shortcuts.nudge', '← → ↑ ↓ (Shift)'],
    ],
  },
  {
    title: 'shortcuts.view',
    items: [
      ['shortcuts.pan', 'Space + drag'],
      ['shortcuts.zoom', 'Wheel, + / −'],
      ['zoom.fit', 'Shift+1'],
      ['shortcuts.actualSize', 'Shift+0'],
      ['menu.grid', 'Shift+G'],
      ['menu.tile', 'Shift+T'],
      ['shortcuts.mirror', 'Shift+X / Shift+Y'],
      ['menu.hideUi', 'Ctrl+\\'],
      ['menu.open', 'Ctrl+O'],
      ['menu.export', 'Ctrl+E'],
    ],
  },
];
