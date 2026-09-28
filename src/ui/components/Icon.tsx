import { ICONS, LOGO, type IconName } from '../icons';

interface IconProps {
  name: IconName;
  /** Rendered size in CSS px. */
  size?: number;
}

export function Icon({ name, size = 16 }: IconProps) {
  if (name === 'logo') {
    // `size` is the logo height; multiples of 8 keep every square on whole pixels.
    return (
      <svg
        className="icon"
        viewBox={`0 0 ${LOGO.width} ${LOGO.height}`}
        width={(size * LOGO.width) / LOGO.height}
        height={size}
        shapeRendering="crispEdges"
        aria-hidden="true"
      >
        <path fill="currentColor" d={LOGO.d} />
      </svg>
    );
  }
  // Icons are 12×12 pixel grids: only multiples of 6 px keep each pixel on whole device pixels
  // (1.5 px per pixel is 3 device pixels on a 2× screen), so round to the nearest one.
  const px = Math.max(12, Math.round(size / 6) * 6);
  const Glyph = ICONS[name];
  return <Glyph className="icon" width={px} height={px} shapeRendering="crispEdges" aria-hidden="true" />;
}
