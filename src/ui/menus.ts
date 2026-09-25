import type { Editor } from '../engine/editor';
import { LOCALES, getLocale, setLocale, t } from '../i18n';
import type { Actions } from './actions';
import type { MenuItem } from './components/Menu';
import { openDialog, uiStore } from './uiStore';
import { viewport } from './viewport';

export function mainMenu(editor: Editor, actions: Actions): MenuItem[] {
  const s = editor.getState();
  return [
    { label: t('menu.newFile'), onSelect: () => openDialog({ type: 'newFile' }) },
    { label: t('menu.open'), shortcut: 'Ctrl+O', onSelect: () => void actions.openDocument() },
    { label: t('menu.saveAs'), onSelect: () => void actions.saveDocument() },
    { label: t('menu.importImage'), onSelect: () => void actions.importImage() },
    '-',
    {
      label: t('menu.export'),
      shortcut: 'Ctrl+E',
      onSelect: () => void actions.exportImage(uiStore.get().exportFormat, uiStore.get().exportActiveLayer),
    },
    { label: t('menu.copySvg'), shortcut: 'Ctrl+Shift+C', onSelect: () => void actions.copySvg() },
    { label: t('menu.copyPng'), onSelect: () => void actions.copyPng() },
    '-',
    { label: t('menu.undo'), shortcut: 'Ctrl+Z', disabled: !s.canUndo, onSelect: () => editor.undo() },
    { label: t('menu.redo'), shortcut: 'Ctrl+Shift+Z', disabled: !s.canRedo, onSelect: () => editor.redo() },
    '-',
    { label: t('menu.selectAll'), shortcut: 'Ctrl+A', onSelect: () => editor.selectAll() },
    {
      label: t('menu.deselect'),
      shortcut: 'Ctrl+D',
      disabled: !s.selection,
      onSelect: () => editor.deselect(),
    },
    {
      label: s.selection ? t('menu.fillSelection') : t('menu.fillLayer'),
      shortcut: 'Shift+Del',
      onSelect: () => editor.fill(),
    },
    { label: t('menu.flipH'), onSelect: () => editor.flip(true) },
    { label: t('menu.flipV'), onSelect: () => editor.flip(false) },
    '-',
    {
      label: t('menu.grid'),
      shortcut: 'Shift+G',
      checked: s.view.grid,
      onSelect: () => editor.toggleView('grid'),
    },
    {
      label: t('menu.tile'),
      shortcut: 'Shift+T',
      checked: s.view.tile,
      onSelect: () => editor.toggleView('tile'),
    },
    {
      label: t('menu.hideUi'),
      shortcut: '@',
      onSelect: () => uiStore.set((u) => ({ uiHidden: !u.uiHidden })),
    },
    '-',
    ...LOCALES.map((l) => ({
      label: l.label,
      checked: getLocale() === l.id,
      onSelect: () => setLocale(l.id),
    })),
    '-',
    { label: t('menu.shortcuts'), shortcut: '?', onSelect: () => openDialog({ type: 'shortcuts' }) },
  ];
}

export function zoomMenu(editor: Editor): MenuItem[] {
  return [
    { label: t('zoom.in'), shortcut: '+', onSelect: () => viewport.step(1) },
    { label: t('zoom.out'), shortcut: '−', onSelect: () => viewport.step(-1) },
    '-',
    { label: t('zoom.fit'), shortcut: 'Shift+1', onSelect: () => viewport.fit(editor.getState().doc) },
    ...[1, 8, 16, 32].map((z) => ({
      label: t('zoom.to', { value: z * 100 }),
      shortcut: z === 1 ? 'Shift+0' : undefined,
      onSelect: () => viewport.zoomTo(z),
    })),
  ];
}
