import { iconPath, type IconName } from '../icons';

interface IconProps {
  name: IconName;
  /** Rendered size in CSS px. Use multiples of 12 for crisp pixels. */
  size?: number;
}

export function Icon({ name, size = 24 }: IconProps) {
  const { d, size: grid } = iconPath(name);
  const px = (size * grid) / 12;
  return (
    <svg className="px-icon" viewBox={`0 0 ${grid} ${grid}`} width={px} height={px} aria-hidden="true">
      <path fill="currentColor" d={d} />
    </svg>
  );
}
