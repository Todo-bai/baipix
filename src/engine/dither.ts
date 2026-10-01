/**
 * Dithering patterns: where a dithered stroke or fill uses its second color instead of the first.
 * Decided from the canvas position, so strokes, fills and mirrored copies line up.
 */
export type DitherPattern = 'checker' | 'dots' | 'dense' | 'linesH' | 'linesV' | 'diagonal';

export const DITHER_PATTERNS: DitherPattern[] = ['checker', 'dots', 'dense', 'linesH', 'linesV', 'diagonal'];

const mod = (a: number, n: number) => ((a % n) + n) % n;

export function ditherSecond(pattern: DitherPattern, x: number, y: number): boolean {
  switch (pattern) {
    case 'dots': // 1 in 4
      return (x & 1) === 1 && (y & 1) === 1;
    case 'dense': // 3 in 4
      return ((x | y) & 1) === 1;
    case 'linesH':
      return (y & 1) === 1;
    case 'linesV':
      return (x & 1) === 1;
    case 'diagonal': // 1 in 3, along a diagonal
      return mod(x - y, 3) === 0;
    default: // checkerboard, 1 in 2
      return ((x + y) & 1) === 1;
  }
}
