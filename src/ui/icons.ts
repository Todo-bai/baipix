import {
  ArrowDownToLine,
  ArrowLeftRight,
  ChevronDown,
  ChevronUp,
  Circle,
  Contrast,
  Copy,
  Droplets,
  Ellipsis,
  Eraser,
  Eye,
  EyeOff,
  FlipHorizontal2,
  FlipVertical2,
  Layers,
  Menu,
  Minus,
  Move,
  PaintBucket,
  Pencil,
  Pipette,
  Plus,
  Redo2,
  RotateCwSquare,
  SlidersHorizontal,
  Slash,
  Square,
  SquareDashed,
  Trash2,
  Undo2,
  X,
  type LucideIcon,
} from 'lucide-react';

/** Interface icons, from Lucide (ISC, https://lucide.dev). */
export const ICONS = {
  move: Move,
  select: SquareDashed,
  pencil: Pencil,
  eraser: Eraser,
  bucket: PaintBucket,
  line: Slash,
  rect: Square,
  ellipse: Circle,
  shade: Contrast,
  blur: Droplets,
  picker: Pipette,
  undo: Undo2,
  redo: Redo2,
  plus: Plus,
  minus: Minus,
  trash: Trash2,
  eye: Eye,
  eyeOff: EyeOff,
  up: ChevronUp,
  down: ChevronDown,
  duplicate: Copy,
  merge: ArrowDownToLine,
  more: Ellipsis,
  swap: ArrowLeftRight,
  menu: Menu,
  layers: Layers,
  panel: SlidersHorizontal,
  close: X,
  rotate: RotateCwSquare,
  // Lucide names these after the axis line: the vertical line mirrors left-right.
  flipH: FlipVertical2,
  flipV: FlipHorizontal2,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS | 'logo';

/** The Baipix logo stays pixel art, on a 6×6 grid ('#' = filled). */
const LOGO = ['##.#..', '#.##.#', '.#.###', '##.#.#', '#.#.##', '.##.#.'];

/** SVG path data for the logo, merging horizontal runs. */
export function logoPath(): { d: string; size: number } {
  let d = '';
  LOGO.forEach((row, y) => {
    for (let x = 0; x < row.length; ) {
      if (row[x] !== '#') {
        x++;
        continue;
      }
      let end = x;
      while (end < row.length && row[end] === '#') end++;
      d += `M${x} ${y}h${end - x}v1h-${end - x}z`;
      x = end;
    }
  });
  return { d, size: LOGO.length };
}
