import type { PixelDoc, ReferenceImage } from '../engine/document';
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

/** A file in the browser's workspace: the .baipix content, plus what isn't in .baipix files. */
export type StoredFile = BaipixFile & { reference?: ReferenceImage };

export interface StoredWorkspace {
  version: 1;
  files: StoredFile[];
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
  files: w.documents.map((d) => ({
    ...serializeDocument(d),
    ...(d.reference && { reference: d.reference }),
  })),
  activeId: w.activeId,
  preferences: w.preferences,
  ui: w.ui,
});

export function fromStored(s: StoredWorkspace): Workspace | null {
  const documents: PixelDoc[] = [];
  for (const f of s.files ?? []) {
    try {
      const doc = deserializeDocument(f);
      const reference = readReference(f.reference);
      if (reference) doc.reference = reference;
      documents.push(doc);
    } catch {
      /* skip unreadable files rather than losing the whole workspace */
    }
  }
  if (!documents.length) return null;
  return { documents, activeId: s.activeId, preferences: s.preferences ?? {}, ui: s.ui ?? {} };
}

/** Checks a stored reference image, dropping it when anything is off. */
function readReference(r: unknown): ReferenceImage | undefined {
  const x = r as Partial<ReferenceImage> | null | undefined;
  if (!x || typeof x.src !== 'string' || !x.src.startsWith('data:image/')) return undefined;
  const nums = [x.width, x.height, x.x, x.y, x.w, x.h, x.opacity];
  if (!nums.every((n) => typeof n === 'number' && Number.isFinite(n))) return undefined;
  if (!(x.w! > 0 && x.h! > 0)) return undefined;
  return {
    src: x.src,
    width: x.width!,
    height: x.height!,
    x: x.x!,
    y: x.y!,
    w: x.w!,
    h: x.h!,
    opacity: Math.min(1, Math.max(0, x.opacity!)),
    visible: x.visible !== false,
    locked: x.locked === true,
  };
}
