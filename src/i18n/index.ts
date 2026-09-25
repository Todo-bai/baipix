import { useSyncExternalStore } from 'react';
import { en, type MessageKey } from './en';
import { fr } from './fr';

export type Locale = 'en' | 'fr';
export type { MessageKey };

const dictionaries: Record<Locale, Record<MessageKey, string>> = { en, fr };
export const LOCALES: { id: Locale; label: string }[] = [
  { id: 'en', label: 'English' },
  { id: 'fr', label: 'Français' },
];

let locale: Locale = navigator.language?.toLowerCase().startsWith('fr') ? 'fr' : 'en';
const listeners = new Set<() => void>();

export const getLocale = (): Locale => locale;

export function setLocale(next: Locale): void {
  if (next === locale || !(next in dictionaries)) return;
  locale = next;
  document.documentElement.lang = next;
  listeners.forEach((l) => l());
}

export type Vars = Record<string, string | number>;

/** Translates a key, replacing `{name}` placeholders. Falls back to English, then to the key. */
export function t(key: MessageKey, vars?: Vars): string {
  const template = dictionaries[locale][key] ?? en[key] ?? key;
  return vars
    ? template.replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? `{${name}}`))
    : template;
}

/** Re-renders the component when the language changes. */
export function useT(): typeof t {
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => locale,
  );
  return t;
}
