/** Interface theme: follow the OS, or force light or dark. Remembered in this browser. */
export type ThemePreference = 'system' | 'light' | 'dark';

const KEY = 'baipix.theme';

export function getTheme(): ThemePreference {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // Storage can be blocked (private mode, sandboxed iframes): fall back to the OS setting.
  }
  return 'system';
}

/** Sets `data-theme` on <html>, which tokens.css and the canvas renderer both follow. */
function apply(theme: ThemePreference): void {
  if (theme === 'system') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
}

export function setTheme(theme: ThemePreference): void {
  apply(theme);
  try {
    if (theme === 'system') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, theme);
  } catch {
    // Not remembered, but still applied for this session.
  }
}

/** Applies the saved theme; call before the first render to avoid a flash of the wrong theme. */
export const initTheme = (): void => apply(getTheme());
