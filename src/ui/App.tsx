import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { Editor } from '../engine/editor';
import { setLocale, t, useT, type Locale } from '../i18n';
import { importLegacyWorkspace } from '../io/legacy';
import type { StorageAdapter } from '../storage/workspace';
import { ActionsContext } from './ActionsContext';
import { createActions } from './actions';
import { CanvasView } from './components/CanvasView';
import { ColorPicker } from './components/ColorPicker';
import { Coordinates } from './components/Coordinates';
import { MenuHost } from './components/Menu';
import { MobileBar } from './components/MobileBar';
import { PanelResizer } from './components/PanelResizer';
import { Toasts } from './components/Toasts';
import { Toolbar } from './components/Toolbar';
import { Tooltips } from './components/Tooltips';
import { Dialogs } from './dialogs/Dialogs';
import { EditorContext } from './EditorContext';
import { useAutosave } from './hooks/useAutosave';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useNotices } from './hooks/useNotices';
import { LeftPanel } from './panels/LeftPanel';
import { RightPanel } from './panels/RightPanel';
import { PANEL_LIMITS, toast, uiStore, type UiState } from './uiStore';

const editorLabels = () => ({
  layer: (n: number) => t('default.layer', { n }),
  copyOf: (name: string) => t('default.copyOf', { name }),
  untitled: (n: number) => (n > 1 ? t('default.untitledN', { n }) : t('default.untitled')),
  pasted: t('default.pasted'),
});

/** Restores the saved workspace (or imports the prototype's drawings) before enabling autosave. */
function useRestore(editor: Editor, storage: StorageAdapter): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const saved = await storage.load();
        if (cancelled) return;
        if (saved) {
          const ui = saved.ui as Partial<UiState> & { locale?: Locale };
          if (ui.locale) setLocale(ui.locale);
          editor.setLabels(editorLabels());
          const widths = ui.panelWidths;
          uiStore.set({
            exportFormat: ui.exportFormat === 'svg' ? 'svg' : 'png',
            exportActiveLayer: !!ui.exportActiveLayer,
            ...(widths && {
              panelWidths: {
                left: Math.min(Math.max(widths.left, PANEL_LIMITS.left.min), PANEL_LIMITS.left.max),
                right: Math.min(Math.max(widths.right, PANEL_LIMITS.right.min), PANEL_LIMITS.right.max),
              },
            }),
          });
          editor.setPreferences(saved.preferences);
          editor.loadDocuments(saved.documents, saved.activeId);
          toast(
            saved.documents.length > 1
              ? t('toast.filesRestored', { count: saved.documents.length })
              : t('toast.restored'),
          );
        } else {
          const legacy = await importLegacyWorkspace();
          if (legacy.length && !cancelled) {
            editor.loadDocuments(legacy);
            toast(t('toast.legacyImported', { count: legacy.length }));
          }
        }
      } catch {
        /* first run or storage unavailable: start fresh */
      }
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [editor, storage]);
  return ready;
}

export function App({ editor, storage }: { editor: Editor; storage: StorageAdapter }) {
  useT();
  const actions = useMemo(() => createActions(editor), [editor]);
  const ready = useRestore(editor, storage);
  const { uiHidden, sheet, panelWidths } = uiStore.use((s) => s);
  useKeyboardShortcuts(editor, actions);
  useNotices(editor);
  useAutosave(editor, storage, ready);

  const style = {
    '--left-width': `${panelWidths.left}px`,
    '--right-width': `${panelWidths.right}px`,
  } as CSSProperties;
  const classes = ['app', uiHidden && 'ui-hidden', sheet && `sheet-${sheet}`].filter(Boolean).join(' ');

  return (
    <EditorContext.Provider value={editor}>
      <ActionsContext.Provider value={actions}>
        <div className={classes} style={style}>
          <LeftPanel />
          <main className="workspace">
            <CanvasView />
            <PanelResizer side="left" />
            <PanelResizer side="right" />
            <MobileBar />
            <Coordinates />
            <Toolbar />
          </main>
          <RightPanel />
        </div>
        <ColorPicker />
        <MenuHost />
        <Dialogs />
        <Tooltips />
        <Toasts />
      </ActionsContext.Provider>
    </EditorContext.Provider>
  );
}

export { editorLabels };
