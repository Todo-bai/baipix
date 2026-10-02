import type { Editor } from '../engine/editor';
import type { MessageKey } from '../i18n';

/** A starting point for a new file: a size, a palette that suits it, and the views it needs. */
export interface Template {
  id: string;
  label: MessageKey;
  width: number;
  height: number;
  palette: string;
  /** Symmetry for characters, tile preview for seamless tiles. Off otherwise. */
  mirrorX?: boolean;
  tile?: boolean;
  /** A guide every so many pixels, with the rulers shown: a grid of cells (a sprite sheet). */
  cells?: number;
}

export const TEMPLATES: Template[] = [
  { id: 'icon', label: 'template.icon', width: 16, height: 16, palette: 'sweetie16' },
  { id: 'sprite', label: 'template.sprite', width: 32, height: 32, palette: 'pico8', mirrorX: true },
  { id: 'tile', label: 'template.tile', width: 32, height: 32, palette: 'endesga32', tile: true },
  { id: 'avatar', label: 'template.avatar', width: 24, height: 24, palette: 'pollen8' },
  { id: 'portrait', label: 'template.portrait', width: 64, height: 64, palette: 'dawnbringer32' },
  { id: 'sheet', label: 'template.sheet', width: 128, height: 128, palette: 'aap64', cells: 16 },
  { id: 'gameboy', label: 'template.gameboy', width: 160, height: 144, palette: 'gameboy' },
  { id: 'banner', label: 'template.banner', width: 128, height: 32, palette: 'resurrect64' },
  { id: 'wallpaper', label: 'template.wallpaper', width: 160, height: 90, palette: 'slso8' },
  { id: 'c64', label: 'template.c64', width: 320, height: 200, palette: 'c64' },
];

/** Creates a file from a template: its size, its palette, its views (symmetry, tile preview), its guides. */
export function createFromTemplate(editor: Editor, template: Template, name?: string): void {
  editor.newFile(template.width, template.height, name);
  editor.setPalettePreset(template.palette);
  editor.setView('mirrorX', !!template.mirrorX);
  editor.setView('tile', !!template.tile);
  if (template.cells) {
    const { cells, width, height } = template;
    for (let x = cells; x < width; x += cells) editor.setGuide('x', null, x);
    for (let y = cells; y < height; y += cells) editor.setGuide('y', null, y);
    editor.setView('rulers', true);
  }
  // Set up, but still untouched: it goes away if left as it is.
  editor.markFresh();
}
