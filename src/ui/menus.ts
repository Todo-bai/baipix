import type { Editor, FileInfo } from '../engine/editor';
import { LOCALES, getLocale, setLocale, t } from '../i18n';
import type { Actions } from './actions';
import type { MenuItem } from './components/Menu';
import { getTheme, setTheme, type ThemePreference } from './theme';
import { openAdjust, openDialog, uiStore } from './uiStore';

const CHANGELOG_URL = 'https://github.com/baipix/baipix/blob/main/CHANGELOG.md';
import { viewport } from './viewport';

/** A file's "…" menu, in the Files list and on the home screen cards. */
export function fileMenu(editor: Editor, actions: Actions, file: FileInfo): MenuItem[] {
  return [
    { label: t('file.duplicate'), onSelect: () => editor.duplicateFile(file.id) },
    {
      label: t('file.download'),
      onSelect: () => (editor.switchFile(file.id), void actions.saveDocument()),
    },
    '-',
    { label: t('common.delete'), onSelect: () => actions.deleteFile(file.id, file.name) },
  ];
}

/**
 * The files menu of the left panel's header: the most recent files (the current one checked),
 * the current file's actions, and the home screen with all of them.
 */
export function filesMenu(editor: Editor, actions: Actions): MenuItem[] {
  const s = editor.getState();
  const current = s.files.find((f) => f.id === s.activeId)!;
  const recent = [...s.files].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 8);
  return [
    ...recent.map((f) => ({
      label: f.name,
      checked: f.id === s.activeId,
      onSelect: () => editor.switchFile(f.id),
    })),
    '-',
    ...fileMenu(editor, actions, current),
    '-',
    { label: t('menu.newFile'), onSelect: () => openDialog({ type: 'newFile' }) },
    { label: t('file.allFiles'), onSelect: () => uiStore.set({ home: true }) },
  ];
}

export function mainMenu(editor: Editor, actions: Actions): MenuItem[] {
  const s = editor.getState();
  return [
    { label: t('menu.home'), onSelect: () => uiStore.set({ home: true }) },
    '-',
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
    { label: t('menu.rotate'), onSelect: () => editor.rotate() },
    { label: t('menu.adjustColors'), shortcut: 'Ctrl+U', onSelect: () => openAdjust('all') },
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
      label: t('menu.preview'),
      checked: uiStore.get().preview.open,
      onSelect: () => uiStore.set((u) => ({ preview: { ...u.preview, open: !u.preview.open } })),
    },
    {
      label: t('menu.hideUi'),
      shortcut: '@',
      onSelect: () => uiStore.set((u) => ({ uiHidden: !u.uiHidden })),
    },
    '-',
    ...(['system', 'light', 'dark'] as ThemePreference[]).map((theme) => ({
      label: t(`theme.${theme}`),
      checked: getTheme() === theme,
      onSelect: () => setTheme(theme),
    })),
    '-',
    ...LOCALES.map((l) => ({
      label: l.label,
      checked: getLocale() === l.id,
      onSelect: () => setLocale(l.id),
    })),
    '-',
    { label: t('menu.shortcuts'), shortcut: '?', onSelect: () => openDialog({ type: 'shortcuts' }) },
    {
      label: t('menu.version', { version: __APP_VERSION__ }),
      onSelect: () => window.open(CHANGELOG_URL, '_blank', 'noopener'),
    },
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
