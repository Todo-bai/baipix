import type { PixelDoc } from '../engine/document';
import type { Preferences } from '../engine/editor';
import { deserializeDocument, serializeDocument, type BaipixFile } from './fileFormat';

/** Everything that is persisted between sessions. */
export interface Workspace {
  documents: PixelDoc[];
  activeId: string;
  preferences: Partial<Preferences>;
  /** UI-only settings (panel widths, language…), opaque to the engine. */
  ui: Record<string, unknown>;
}

export interface StoredWorkspace {
  version: 1;
  files: BaipixFile[];
  activeId: string;
  preferences: Partial<Preferences>;
  ui: Record<string, unknown>;
}

/**
 * Where workspaces are kept. The app only talks to this interface, so a cloud backend
 * (Supabase, Google Drive…) can be plugged in later without touching the editor.
 */
export interface StorageAdapter {
  load(): Promise<Workspace | null>;
  save(workspace: Workspace): Promise<void>;
}

export const toStored = (w: Workspace): StoredWorkspace => ({
  version: 1,
  files: w.documents.map(serializeDocument),
  activeId: w.activeId,
  preferences: w.preferences,
  ui: w.ui,
});

export function fromStored(s: StoredWorkspace): Workspace | null {
  const documents: PixelDoc[] = [];
  for (const f of s.files ?? []) {
    try {
      documents.push(deserializeDocument(f));
    } catch {
      /* skip unreadable files rather than losing the whole workspace */
    }
  }
  if (!documents.length) return null;
  return { documents, activeId: s.activeId, preferences: s.preferences ?? {}, ui: s.ui ?? {} };
}
