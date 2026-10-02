import { toCss } from '../../engine/color';
import { presetColors } from '../../engine/palette';
import { useT } from '../../i18n';
import { TEMPLATES, type Template } from '../templates';

/** Diagonal bands of the palette's colors, with hard edges like pixels. */
const stripes = (colors: string[]) =>
  `linear-gradient(135deg, ${colors
    .map((c, i) => `${c} ${(i / colors.length) * 100}% ${((i + 1) / colors.length) * 100}%`)
    .join(', ')})`;

/** The templates as cards: the canvas's shape in the palette's colors, the name and the size. */
export function TemplateCards({ onPick }: { onPick: (template: Template) => void }) {
  const t = useT();
  return (
    <div className="template-cards">
      {TEMPLATES.map((tpl) => {
        const colors = presetColors(tpl.palette);
        // The canvas's proportions, in a 44×32 box.
        const k = Math.min(44 / tpl.width, 32 / tpl.height);
        return (
          <button key={tpl.id} type="button" className="template-card" onClick={() => onPick(tpl)}>
            <span className="template-thumb" aria-hidden="true">
              <span
                className="template-shape"
                style={{
                  width: Math.round(tpl.width * k),
                  height: Math.round(tpl.height * k),
                  background: stripes(colors.map(toCss)),
                }}
              />
            </span>
            <span className="template-name">{t(tpl.label)}</span>
            <span className="muted">
              {tpl.width} × {tpl.height}
            </span>
          </button>
        );
      })}
    </div>
  );
}
