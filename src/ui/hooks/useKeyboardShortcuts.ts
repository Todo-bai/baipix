import { useEffect } from 'react';
import type { Editor } from '../../engine/editor';
import { t } from '../../i18n';
import type { Actions } from '../actions';
import { isMenuOpen } from '../components/Menu';
import { keyState } from '../keyState';
import { TOOL_LIST } from '../tools';
import { openDialog, toast, uiStore } from '../uiStore';
import { viewport } from '../viewport';

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement && !!target.closest('input, textarea, select, [contenteditable]');

/** Global keyboard shortcuts. Uses `event.code` for digits so AZERTY layouts work too. */
export function useKeyboardShortcuts(editor: Editor, actions: Actions) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isMenuOpen() || document.querySelector('dialog[open]') || isTyping(e.target)) return;
      const key = e.key.toLowerCase();
      const mod = e.ctrlKey || e.metaKey;

      if (e.code === 'Space') {
        keyState.space = true;
        document.body.classList.add('is-panning');
        e.preventDefault();
        return;
      }

      // `@` toggles the interface. Checked before modifiers: AltGr (AZERTY on Windows) reports Ctrl+Alt.
      if (e.key === '@') {
        e.preventDefault();
        return uiStore.set((s) => ({ uiHidden: !s.uiHidden }));
      }

      if (mod) {
        const handled = (() => {
          if (key === 'z' && !e.shiftKey) return (editor.undo(), true);
          if ((key === 'z' && e.shiftKey) || key === 'y') return (editor.redo(), true);
          if (key === 'c' && e.shiftKey) return (void actions.copySvg(), true);
          if (key === 'c')
            return (
              editor.copy() &&
                toast(t(editor.getState().selection ? 'toast.selectionCopied' : 'toast.layerCopied')),
              true
            );
          if (key === 'x') return (editor.cut() && toast(t('toast.cut')), true);
          if (key === 'a') return (editor.selectAll(), true);
          if (key === 'd') return (editor.deselect(), true);
          if (key === 'e' || key === 's')
            return (
              void actions.exportImage(uiStore.get().exportFormat, uiStore.get().exportActiveLayer),
              true
            );
          if (key === 'o') return (void actions.openDocument(), true);
          return false;
        })();
        if (handled) e.preventDefault();
        return;
      }

      if (e.key === 'Escape') {
        if (uiStore.get().picker) uiStore.set({ picker: null });
        else if (editor.isStroking) editor.cancelStroke();
        else editor.deselect();
        return;
      }
      if (e.key === '?') return openDialog({ type: 'shortcuts' });
      if (e.shiftKey && e.code === 'Digit1') return viewport.fit(editor.getState().doc);
      if (e.shiftKey && e.code === 'Digit0') return viewport.zoomTo(1);
      if (e.shiftKey) {
        const toggles = { g: 'grid', t: 'tile', x: 'mirrorX', y: 'mirrorY' } as const;
        const view = toggles[key as keyof typeof toggles];
        if (view) return editor.toggleView(view);
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        return e.shiftKey ? editor.fill() : editor.clearSelection();
      }
      if (e.key.startsWith('Arrow') && (editor.getState().tool === 'move' || editor.getState().selection)) {
        e.preventDefault();
        const d = e.shiftKey ? 8 : 1;
        const [dx, dy] = { ArrowLeft: [-d, 0], ArrowRight: [d, 0], ArrowUp: [0, -d], ArrowDown: [0, d] }[
          e.key
        ] ?? [0, 0];
        return editor.nudge(dx, dy);
      }
      if (e.key === '+' || e.key === '=') return viewport.step(1);
      if (e.key === '-' || e.key === '_') return viewport.step(-1);
      const digit = /^(Digit|Numpad)([1-9])$/.exec(e.code);
      if (digit && !e.shiftKey) return editor.setOption('size', Number(digit[2]));
      if (key === 'x' && !e.shiftKey) return editor.swapColors();
      const tool = TOOL_LIST.find((x) => x.shortcut.toLowerCase() === key);
      if (tool && !e.shiftKey && !e.altKey) editor.setTool(tool.id);
    };
    const release = () => {
      keyState.space = false;
      document.body.classList.remove('is-panning');
    };
    const onKeyUp = (e: KeyboardEvent) => e.code === 'Space' && release();
    const onPaste = (e: ClipboardEvent) => {
      if (isTyping(e.target)) return;
      const files = [...(e.clipboardData?.files ?? [])];
      void actions.pasteFromClipboard(files).then((pasted) => pasted && e.preventDefault());
      if (files.length || editor.hasClipboard()) e.preventDefault();
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', release);
    document.addEventListener('paste', onPaste);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', release);
      document.removeEventListener('paste', onPaste);
    };
  }, [editor, actions]);
}
