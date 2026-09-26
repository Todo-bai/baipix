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

/**
 * The Baipix logo: a pixel escaping a 2×2 block, on an 8×8 grid (3×3 squares). Drawn in the text
 * color, so it is black on light and white on dark.
 */
export const LOGO = {
  width: 8,
  height: 8,
  d: 'M0 2h3v6H0zM3 5h3v3H3zM5 0h3v3H5z',
};
