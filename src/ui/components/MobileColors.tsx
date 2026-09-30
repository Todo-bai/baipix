import { useRef } from 'react';
import { alpha, opaque, toCss, toHex, type Color } from '../../engine/color';
import { useT } from '../../i18n';
import { useEditor, useEditorState } from '../EditorContext';
import { uiStore, type ColorSlot } from '../uiStore';

/** How long a press lasts before it picks the secondary color, in ms. */
const LONG_PRESS = 450;

/**
 * Small screens: the colors stay in view above the toolbar, so picking one doesn't mean opening the
 * right sheet. The two chips open the color picker; a tap on a swatch picks the primary color, a long
 * press the secondary one.
 */
export function MobileColors() {
  const t = useT();
  const editor = useEditor();
  const primary = useEditorState((s) => s.primary);
  const secondary = useEditorState((s) => s.secondary);
  const colors = useEditorState((s) => s.palette.colors);
  const press = useRef<{ timer: number; long: boolean } | null>(null);

  const chip = (slot: ColorSlot, color: Color, label: string) => (
    <button
      type="button"
      className={`mobile-chip is-${slot}`}
      aria-label={label}
      onClick={(e) =>
        uiStore.set((s) => ({
          picker: s.picker?.slot === slot ? null : { slot, top: e.currentTarget.getBoundingClientRect().top },
        }))
      }
    >
      <i style={{ background: toCss(color) }} />
    </button>
  );

  const current = (c: Color, of: Color) => alpha(of) > 0 && opaque(of) === c;

  return (
    <div className="mobile-colors">
      <div className="mobile-chips">
        {chip('primary', primary, t('color.primary'))}
        {chip('secondary', secondary, t('color.secondary'))}
      </div>
      <div className="mobile-swatches">
        {colors.map((c) => (
          <button
            key={c}
            type="button"
            className={`mobile-swatch${current(c, primary) ? ' is-primary' : ''}${
              current(c, secondary) ? ' is-secondary' : ''
            }`}
            style={{ background: toCss(c) }}
            aria-label={toHex(c).slice(1).toUpperCase()}
            onPointerDown={() => {
              const p = { timer: 0, long: false };
              p.timer = window.setTimeout(() => {
                p.long = true;
                editor.setColor('secondary', c);
              }, LONG_PRESS);
              press.current = p;
            }}
            onPointerUp={() => clearTimeout(press.current?.timer)}
            onPointerLeave={() => clearTimeout(press.current?.timer)}
            onPointerCancel={() => clearTimeout(press.current?.timer)}
            onContextMenu={(e) => e.preventDefault()}
            onClick={() => {
              if (!press.current?.long) editor.setColor('primary', c);
              press.current = null;
            }}
          />
        ))}
      </div>
    </div>
  );
}
