import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Editor } from './engine/editor';
import { getLocale } from './i18n';
import { IndexedDbStorage } from './storage/indexedDb';
import type { StorageAdapter } from './storage/workspace';
import { App, editorLabels } from './ui/App';
import './ui/styles/tokens.css';
import './ui/styles/app.css';

/** Storage falls back to memory only when IndexedDB is unavailable (private mode, sandboxed iframes). */
const memoryStorage: StorageAdapter = { load: async () => null, save: async () => {} };
let storage: StorageAdapter = memoryStorage;
try {
  if (typeof indexedDB !== 'undefined') storage = new IndexedDbStorage();
} catch {
  storage = memoryStorage;
}

document.documentElement.lang = getLocale();
const editor = new Editor(editorLabels());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App editor={editor} storage={storage} />
  </StrictMode>,
);
