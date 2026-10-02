/** A command of the palette (Ctrl+K): a menu item or a tool. */
export interface Command {
  category: string;
  label: string;
  shortcut?: string;
  run: () => void;
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

/**
 * The commands matching every word of `query` (in their name or menu, accents and case aside),
 * best first: names that start with it, then a word that does, then the rest, in menu order.
 */
export function searchCommands(commands: Command[], query: string): Command[] {
  const q = normalize(query.trim());
  if (!q) return commands;
  const words = q.split(/\s+/);
  const scored: [Command, number][] = [];
  for (const c of commands) {
    const label = normalize(c.label);
    const text = `${normalize(c.category)} ${label}`;
    if (!words.every((w) => text.includes(w))) continue;
    const score = label.startsWith(q) ? 0 : new RegExp(`(^|[\\s›(])${escapeRegExp(q)}`).test(label) ? 1 : 2;
    scored.push([c, score]);
  }
  return scored.sort((a, b) => a[1] - b[1]).map(([c]) => c);
}
