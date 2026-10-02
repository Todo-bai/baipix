import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { Editor } from '../../engine/editor';
import { t, useT } from '../../i18n';
import type { Actions } from '../actions';
import { useActions } from '../ActionsContext';
import { useEditor } from '../EditorContext';
import { MENU_BAR } from '../menus';
import { SHAPES, TOOL_LIST } from '../tools';
import { uiStore } from '../uiStore';
import { Icon } from './Icon';
import { formatShortcut, type MenuItem } from './Menu';
import { searchCommands, type Command } from '../commands';

/** Every command of the menu bar (submenus as "Récents › Knight"), then the tools. */
export function buildCommands(editor: Editor, actions: Actions): Command[] {
  const commands: Command[] = [];
  const add = (category: string, items: MenuItem[], prefix = '') => {
    for (const item of items) {
      // Not itself: it's already open.
      if (item === '-' || item.disabled || item.label === t('menu.commandPalette')) continue;
      const label = prefix + item.label;
      if (item.items) add(category, item.items, `${label} › `);
      else if (item.onSelect) commands.push({ category, label, shortcut: item.shortcut, run: item.onSelect });
    }
  };
  for (const menu of MENU_BAR) add(t(`menu.${menu.id}`), menu.items(editor, actions));
  const tools = [...TOOL_LIST, ...SHAPES.filter((s) => !TOOL_LIST.some((x) => x.id === s.id))];
  for (const tool of tools)
    commands.push({
      category: t('shortcuts.tools'),
      label: t(tool.label),
      shortcut: tool.shortcut || undefined,
      run: () => editor.setTool(tool.id),
    });
  return commands;
}

function Palette() {
  const t = useT();
  const editor = useEditor();
  const actions = useActions();
  const commands = useMemo(() => buildCommands(editor, actions), [editor, actions]);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const results = useMemo(() => searchCommands(commands, query), [commands, query]);
  const list = useRef<HTMLUListElement>(null);
  // Where the focus was, to give it back on closing.
  const before = useRef(document.activeElement as HTMLElement | null);
  const id = useId();

  useEffect(() => {
    list.current?.children[active]?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const close = () => {
    uiStore.set({ commandPalette: false });
    before.current?.focus?.();
  };
  const run = (c: Command | undefined) => {
    if (!c) return;
    close();
    c.run();
  };

  return (
    <div className="command-backdrop" onPointerDown={(e) => e.target === e.currentTarget && close()}>
      <div className="command-palette" role="dialog" aria-label={t('menu.commandPalette')}>
        <label className="command-search">
          <Icon name="search" size={16} />
          <input
            autoFocus
            value={query}
            placeholder={t('command.search')}
            spellCheck={false}
            role="combobox"
            aria-expanded="true"
            aria-controls={`${id}-list`}
            aria-activedescendant={results.length ? `${id}-${active}` : undefined}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              const n = results.length;
              if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                if (n) setActive((i) => (e.key === 'ArrowDown' ? (i + 1) % n : (i - 1 + n) % n));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                run(results[active]);
              } else if (e.key === 'Escape') {
                e.preventDefault();
                close();
              } else if (e.key === 'Tab') e.preventDefault();
            }}
          />
        </label>
        {results.length ? (
          <ul ref={list} id={`${id}-list`} className="command-list" role="listbox">
            {results.map((c, i) => (
              <li
                key={i}
                id={`${id}-${i}`}
                role="option"
                aria-selected={i === active}
                className="command-item"
                onPointerMove={() => i !== active && setActive(i)}
                onClick={() => run(c)}
              >
                <span className="command-category">{c.category}</span>
                <span className="command-label">{c.label}</span>
                {c.shortcut && <span className="command-shortcut">{formatShortcut(c.shortcut)}</span>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="command-empty muted">{t('command.empty')}</p>
        )}
      </div>
    </div>
  );
}

/** Ctrl+K: type to find any command of the menus, or a tool, and run it. */
export function CommandPalette() {
  const open = uiStore.use((s) => s.commandPalette);
  return open ? <Palette /> : null;
}
