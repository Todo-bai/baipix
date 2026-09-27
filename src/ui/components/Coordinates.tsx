import { useMemo } from 'react';
import { toCss, toHex } from '../../engine/color';
import { flatten } from '../../engine/composite';
import { uniqueColors } from '../../engine/region';
import { useT } from '../../i18n';
import { useEditorState } from '../EditorContext';
import { hoverStore } from '../uiStore';

/** Past this many colors, the count just says "256+". */
const COLOR_LIMIT = 256;

/** Cursor position and color under it, then the drawing's size, layers and colors. */
export function Coordinates() {
  const t = useT();
  const hover = hoverStore.use((s) => s);
  const doc = useEditorState((s) => s.doc);
  const revision = useEditorState((s) => s.revision);
  const colors = useMemo(
    () => uniqueColors(flatten(doc, { includeBackground: false }), COLOR_LIMIT).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pixel buffers are mutable, revision tracks them
    [doc, revision],
  );
  const c = hover.color;
  const layers = doc.layers.length;
  return (
    <div className="coordinates" aria-hidden="true">
      {hover.x !== null && (
        <>
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
          <span className="coordinates-divider" />
        </>
      )}
      <span>
        <b>
          {doc.width}×{doc.height}
        </b>{' '}
        px
      </span>
      <span>{t(layers === 1 ? 'coordinates.layer' : 'coordinates.layers', { count: layers })}</span>
      <span>
        {t(colors === 1 ? 'coordinates.color' : 'coordinates.colors', {
          count: colors >= COLOR_LIMIT ? `${COLOR_LIMIT}+` : colors,
        })}
      </span>
    </div>
  );
}
