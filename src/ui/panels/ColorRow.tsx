import { useEffect, useState, type ReactNode } from 'react';
import { alpha, fromHex, toCss, toHex, withAlpha, type Color } from '../../engine/color';
import { clamp } from '../../engine/math';
import { useT } from '../../i18n';
import { uiStore, type ColorSlot } from '../uiStore';

interface ColorRowProps {
  slot: ColorSlot;
  color: Color;
  onChange: (color: Color) => void;
  /** Extra controls on the right (role label, visibility…). */
  trailing?: ReactNode;
  dimmed?: boolean;
}

/** Figma-style fill row: swatch (opens the picker) + hex + opacity. */
export function ColorRow({ slot, color, onChange, trailing, dimmed }: ColorRowProps) {
  const t = useT();
  const editing = uiStore.use((s) => s.picker?.slot === slot);
  const [hex, setHex] = useState('');
  const [opacity, setOpacity] = useState('');
  useEffect(() => {
    setHex(toHex(color).slice(1).toUpperCase());
    setOpacity(String(Math.round(alpha(color) / 2.55)));
  }, [color]);

  return (
    <div className={`color-row${dimmed ? ' is-dimmed' : ''}`}>
      <div className={`field hex-field${editing ? ' is-editing' : ''}`}>
        <button
          type="button"
          className="color-chip"
          aria-label={t('color.choose')}
          onClick={(e) =>
            uiStore.set((s) => ({
              picker:
                s.picker?.slot === slot ? null : { slot, top: e.currentTarget.getBoundingClientRect().top },
            }))
          }
        >
          <i style={{ background: toCss(color) }} />
        </button>
        <input
          value={hex}
          maxLength={7}
          spellCheck={false}
          aria-label="Hex"
          onChange={(e) => {
            setHex(e.target.value);
            const c = fromHex(e.target.value, alpha(color) || 255);
            if (c !== null && e.target.value.replace('#', '').length === 6) onChange(c);
          }}
          onBlur={() => setHex(toHex(color).slice(1).toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        />
      </div>
      <label className="field opacity-field">
        <input
          type="number"
          min={0}
          max={100}
          value={opacity}
          aria-label={t('common.opacity')}
          onChange={(e) => {
            setOpacity(e.target.value);
            if (e.target.value !== '')
              onChange(withAlpha(color, Math.round(clamp(Number(e.target.value), 0, 100) * 2.55)));
          }}
          onBlur={() => setOpacity(String(Math.round(alpha(color) / 2.55)))}
        />
        <span className="field-suffix">%</span>
      </label>
      {trailing}
    </div>
  );
}
