import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { IconName } from '../icons';
import { createStore } from '../store';
import { Icon } from './Icon';

export type MenuItem =
  | '-'
  | {
      label: string;
      icon?: IconName;
      shortcut?: string;
      checked?: boolean;
      disabled?: boolean;
      onSelect: () => void;
    };

const menuStore = createStore<{ anchor: HTMLElement | null; items: MenuItem[] }>({ anchor: null, items: [] });

/** Opens a menu under `anchor`. Clicking the same anchor again closes it. */
export function openMenu(anchor: HTMLElement, items: MenuItem[]): void {
  if (menuStore.get().anchor === anchor) return closeMenu();
  menuStore.get().anchor?.setAttribute('aria-expanded', 'false');
  anchor.setAttribute('aria-expanded', 'true');
  menuStore.set({ anchor, items });
}

export function closeMenu(): void {
  menuStore.get().anchor?.setAttribute('aria-expanded', 'false');
  menuStore.set({ anchor: null, items: [] });
}

export const isMenuOpen = (): boolean => menuStore.get().anchor !== null;

/** Dark dropdown menu. Rendered once at the app root. */
export function MenuHost() {
  const { anchor, items } = menuStore.use((s) => s);
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: 0, top: 0 });

  useLayoutEffect(() => {
    if (!anchor || !ref.current) return;
    const r = anchor.getBoundingClientRect();
    const { offsetWidth: w, offsetHeight: h } = ref.current;
    let left = r.left;
    let top = r.bottom + 4;
    if (left + w > innerWidth - 8) left = innerWidth - 8 - w;
    if (top + h > innerHeight - 8) top = Math.max(8, r.top - 4 - h);
    setPos({ left: Math.max(8, left), top });
  }, [anchor, items]);

  useEffect(() => {
    if (!anchor) return;
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!ref.current?.contains(target) && !anchor.contains(target)) closeMenu();
    };
    const onKey = (e: KeyboardEvent) => {
      const buttons = [...(ref.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])];
      const i = buttons.indexOf(document.activeElement as HTMLButtonElement);
      if (e.key === 'Escape') {
        closeMenu();
        anchor.focus();
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const next =
          e.key === 'ArrowDown' ? (i + 1) % buttons.length : (i - 1 + buttons.length) % buttons.length;
        buttons[next]?.focus();
      }
    };
    const onResize = () => closeMenu();
    document.addEventListener('pointerdown', onDown, true);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('pointerdown', onDown, true);
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('resize', onResize);
    };
  }, [anchor]);

  if (!anchor) return null;
  return (
    <div ref={ref} className="menu" role="menu" style={pos}>
      {items.map((item, i) =>
        item === '-' ? (
          <div key={i} className="menu-separator" />
        ) : (
          <button
            key={i}
            type="button"
            role="menuitem"
            className={`menu-item${item.checked ? ' is-checked' : ''}`}
            disabled={item.disabled}
            onClick={() => {
              closeMenu();
              item.onSelect();
            }}
          >
            {item.icon && <Icon name={item.icon} size={16} />}
            <span>{item.label}</span>
            {item.shortcut && <span className="menu-shortcut">{item.shortcut}</span>}
          </button>
        ),
      )}
    </div>
  );
}
