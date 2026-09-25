import { useEffect } from 'react';
import type { Editor } from '../../engine/editor';
import { getLocale, t } from '../../i18n';
import type { StorageAdapter } from '../../storage/workspace';
import { toast, uiStore } from '../uiStore';

/** Saves the workspace (debounced) whenever the document, preferences or UI settings change. */
export function useAutosave(editor: Editor, storage: StorageAdapter, ready: boolean) {
  useEffect(() => {
    if (!ready) return;
    let timer = 0;
    let warned = false;
    const save = () => {
      const s = editor.getState();
      const ui = uiStore.get();
      storage
        .save({
          documents: editor.getDocuments(),
          activeId: s.activeId,
          preferences: editor.getPreferences(),
          ui: {
            panelWidths: ui.panelWidths,
            exportFormat: ui.exportFormat,
            exportActiveLayer: ui.exportActiveLayer,
            locale: getLocale(),
          },
        })
        .catch(() => {
          if (!warned) toast(t('toast.saveFailed'));
          warned = true;
        });
    };
    const schedule = () => {
      clearTimeout(timer);
      timer = window.setTimeout(save, 600);
    };
    const offs = [editor.onPersist(schedule), editor.subscribe(schedule), uiStore.subscribe(schedule)];
    window.addEventListener('pagehide', save);
    return () => {
      clearTimeout(timer);
      offs.forEach((off) => off());
      window.removeEventListener('pagehide', save);
    };
  }, [editor, storage, ready]);
}
