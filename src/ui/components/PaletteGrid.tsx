import { alpha, opaque, toCss, toHex, type Color } from '../../engine/color';

interface PaletteGridProps {
  colors: Color[];
  primary: Color;
  secondary?: Color;
  onPick: (color: Color, secondary: boolean) => void;
}

export function PaletteGrid({ colors, primary, secondary, onPick }: PaletteGridProps) {
  const isPrimary = (c: Color) => alpha(primary) > 0 && opaque(primary) === c;
  const isSecondary = (c: Color) =>
    secondary !== undefined && alpha(secondary) > 0 && opaque(secondary) === c;
  return (
    <div className="palette-grid">
      {colors.map((c) => {
        const hex = toHex(c).slice(1).toUpperCase();
        return (
          <button
            key={c}
            type="button"
            className={`swatch${isPrimary(c) ? ' is-primary' : ''}${isSecondary(c) ? ' is-secondary' : ''}`}
            style={{ background: toCss(c) }}
            aria-label={hex}
            data-tip={hex}
            onClick={() => onPick(c, false)}
            onContextMenu={(e) => {
              e.preventDefault();
              onPick(c, true);
            }}
          />
        );
      })}
    </div>
  );
}
