import { ICONS, LOGO, type IconName } from '../icons';

interface IconProps {
  name: IconName;
  /** Rendered size in CSS px. */
  size?: number;
}

export function Icon({ name, size = 16 }: IconProps) {
  if (name === 'logo') {
    // `size` is the logo height.
    return (
      <svg
        className="icon"
        viewBox={`0 0 ${LOGO.width} ${LOGO.height}`}
        width={(size * LOGO.width) / LOGO.height}
        height={size}
        aria-hidden="true"
      >
        <path fill="currentColor" d={LOGO.d} />
      </svg>
    );
  }
  const Glyph = ICONS[name];
  return <Glyph className="icon" size={size} strokeWidth={1.5} absoluteStrokeWidth aria-hidden="true" />;
}
