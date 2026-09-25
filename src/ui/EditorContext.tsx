import { createContext, useContext, useSyncExternalStore } from 'react';
import type { Editor, EditorState } from '../engine/editor';

export const EditorContext = createContext<Editor | null>(null);

export function useEditor(): Editor {
  const editor = useContext(EditorContext);
  if (!editor) throw new Error('useEditor must be used inside <EditorContext.Provider>');
  return editor;
}

/** Subscribes to a slice of the editor state. Keep selectors cheap and return stable values. */
export function useEditorState<T>(selector: (state: EditorState) => T): T {
  const editor = useEditor();
  return useSyncExternalStore(editor.subscribe, () => selector(editor.getState()));
}
