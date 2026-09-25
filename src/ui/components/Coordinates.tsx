import { toCss, toHex } from '../../engine/color';
import { useT } from '../../i18n';
import { hoverStore } from '../uiStore';

/** Cursor position and color under it. */
export function Coordinates() {
  const t = useT();
  const hover = hoverStore.use((s) => s);
  if (hover.x === null) return null;
  const c = hover.color;
  return (
    <div className="coordinates" aria-hidden="true">
      <span>
        X <b>{hover.x}</b>
      </span>
      <span>
        Y <b>{hover.y}</b>
      </span>
      {c === null ? (
        <span>{t('coordinates.transparent')}</span>
      ) : (
        <span>
          <i style={{ background: toCss(c) }} />
          <b>{toHex(c).slice(1).toUpperCase()}</b>
        </span>
      )}
    </div>
  );
}
