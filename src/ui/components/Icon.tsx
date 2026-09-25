import { ICONS, logoPath, type IconName } from '../icons';

interface IconProps {
  name: IconName;
  /** Rendered size in CSS px. */
  size?: number;
}

export function Icon({ name, size = 16 }: IconProps) {
  if (name === 'logo') {
    const { d, size: grid } = logoPath();
    return (
      <svg className="px-icon" viewBox={`0 0 ${grid} ${grid}`} width={size} height={size} aria-hidden="true">
        <path fill="currentColor" d={d} />
      </svg>
    );
  }
  const Glyph = ICONS[name];
  return <Glyph className="icon" size={size} strokeWidth={1.5} absoluteStrokeWidth aria-hidden="true" />;
}
