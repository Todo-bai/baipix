import {
  alpha,
  blue,
  green,
  pack,
  red,
  fromHex,
  oklchToColor,
  opaque,
  toHex,
  toOklab,
  withAlpha,
  type Color,
  type Lab,
} from './color';
import { clamp } from './math';

export interface PalettePreset {
  name: string;
  colors: string;
}

export const PALETTE_PRESETS: Record<string, PalettePreset> = {
  sweetie16: {
    name: 'Sweetie 16',
    colors:
      '1a1c2c 5d275d b13e53 ef7d57 ffcd75 a7f070 38b764 257179 29366f 3b5dc9 41a6f6 73eff7 f4f4f4 94b0c2 566c86 333c57',
  },
  pico8: {
    name: 'PICO-8',
    colors:
      '000000 1d2b53 7e2553 008751 ab5236 5f574f c2c3c7 fff1e8 ff004d ffa300 ffec27 00e436 29adff 83769c ff77a8 ffccaa',
  },
  endesga32: {
    name: 'Endesga 32',
    colors:
      'be4a2f d77643 ead4aa e4a672 b86f50 733e39 3e2731 a22633 e43b44 f77622 feae34 fee761 63c74d 3e8948 265c42 193c3e 124e89 0099db 2ce8f5 ffffff c0cbdc 8b9bb4 5a6988 3a4466 262b44 181425 ff0044 68386c b55088 f6757a e8b796 c28569',
  },
  gameboy: { name: 'Game Boy', colors: '0f380f 306230 8bac0f 9bbc0f' },
  grayscale: { name: 'Grayscale', colors: '000000 222222 444444 666666 888888 aaaaaa cccccc eeeeee ffffff' },
};

/** Extracts every 6-digit hex code from free text (Lospec .hex files, CSS, comma lists…). */
export function parseHexList(text: string): Color[] {
  const found = text.match(/#?\b[0-9a-f]{6}\b/gi) ?? [];
  const colors = found.map((h) => fromHex(h)).filter((c): c is Color => c !== null);
  return [...new Set(colors)];
}

export const presetColors = (key: string): Color[] => parseHexList(PALETTE_PRESETS[key]?.colors ?? '');

/** One hex code per line: the Lospec `.hex` format. */
export const toHexList = (colors: Color[]): string => colors.map((c) => toHex(c).slice(1)).join('\n') + '\n';

/**
 * GIMP palette (`.gpl`), also read by Aseprite, Krita and Inkscape: a header, then one
 * "R G B name" line per color. Comments (#), Name: and Columns: lines are skipped.
 */
export function parseGpl(text: string): Color[] {
  const colors: Color[] = [];
  for (const line of text.split(/\r?\n/)) {
    const m = /^\s*(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})(?:\s|$)/.exec(line);
    if (!m) continue;
    const [r, g, b] = [m[1], m[2], m[3]].map((v) => Math.min(255, Number(v)));
    colors.push(pack(r, g, b));
  }
  return [...new Set(colors)];
}

export function toGpl(colors: Color[], name: string): string {
  const lines = colors.map((c) => {
    const rgb = [red(c), green(c), blue(c)].map((v) => String(v).padStart(3)).join(' ');
    return `${rgb}\t${toHex(c).slice(1)}`;
  });
  return `GIMP Palette\nName: ${name.replace(/[\r\n]/g, ' ')}\nColumns: 8\n#\n${lines.join('\n')}\n`;
}

/** Colors from a palette file: GIMP `.gpl` when it says so, hex codes otherwise (`.hex`, `.txt`…). */
export const parsePaletteFile = (text: string): Color[] =>
  /^\s*GIMP Palette/.test(text) ? parseGpl(text) : parseHexList(text);

/**
 * How lighten and shade pick the next color:
 * - `ramp`: the next step in the same color family (close hue), ending on the palette's neutrals;
 * - `palette`: any palette color close in hue and chroma, even from another family;
 * - `free`: no palette, the lightness changes directly (see `shiftLightness`).
 */
export type ShadeMode = 'ramp' | 'palette' | 'free';

/** Below this OKLCH chroma a color counts as a neutral (grays, near-black, near-white). */
const NEUTRAL_CHROMA = 0.035;
/** Widest hue gap between two steps of one ramp. Pixel art ramps shift hue, so it's generous. */
const RAMP_HUE_GAP = 55;

/** Hue angle in degrees, and the gap between two of them (0..180). */
const hueOf = (lab: Lab): number => ((Math.atan2(lab[2], lab[1]) * 180) / Math.PI + 360) % 360;
const hueGap = (a: number, b: number): number => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};
const chromaOf = (lab: Lab): number => Math.hypot(lab[1], lab[2]);

/** Palette with precomputed OKLab values, for fast perceptual lookups. */
export class PaletteIndex {
  private readonly entries: { color: Color; lab: Lab }[];

  constructor(colors: Color[]) {
    this.entries = colors.map((color) => ({ color, lab: toOklab(color) }));
  }

  get size(): number {
    return this.entries.length;
  }

  /** Closest palette color (alpha preserved from the input). */
  nearest(c: Color): Color {
    if (!this.entries.length) return c;
    const [L, a, b] = toOklab(c);
    let best = this.entries[0].color;
    let bestDistance = Infinity;
    for (const e of this.entries) {
      const d = (e.lab[0] - L) ** 2 + (e.lab[1] - a) ** 2 + (e.lab[2] - b) ** 2;
      if (d < bestDistance) {
        bestDistance = d;
        best = e.color;
      }
    }
    return withAlpha(best, alpha(c));
  }

  /**
   * Next lighter (dir = 1) or darker (dir = -1) palette color, or null when there is none.
   * `ramp` stays in the color's family; `palette` takes the closest in hue and chroma.
   */
  shade(c: Color, dir: 1 | -1, mode: Exclude<ShadeMode, 'free'> = 'ramp'): Color | null {
    return mode === 'ramp' ? this.rampStep(c, dir) : this.closestStep(c, dir);
  }

  /**
   * Same family: close hue for colors, neutrals for neutrals. The next step is the smallest
   * real change in lightness. When the family has nothing further, it ends on the nearest neutral
   * (highlights to white, shadows to black), like most pixel art ramps.
   */
  private rampStep(c: Color, dir: 1 | -1): Color | null {
    const lab = toOklab(c);
    const C = chromaOf(lab);
    const h = hueOf(lab);
    let best: Color | null = null;
    let bestScore = Infinity;
    let end: Color | null = null;
    let endGap = Infinity;
    for (const e of this.entries) {
      const dL = e.lab[0] - lab[0];
      if (dir > 0 ? dL <= 0.04 : dL >= -0.04) continue;
      const eC = chromaOf(e.lab);
      const gap = hueGap(h, hueOf(e.lab));
      const neutral = eC < NEUTRAL_CHROMA;
      let family: boolean;
      if (C < 0.02)
        family = eC < 0.08; // no real hue to compare
      else if (C < NEUTRAL_CHROMA) family = neutral || (eC < 0.08 && gap <= RAMP_HUE_GAP);
      else family = !neutral && gap <= RAMP_HUE_GAP;
      if (family) {
        const score = Math.abs(dL) + (gap / 180) * 0.4 + Math.abs(eC - C) * 0.4;
        if (score < bestScore) {
          bestScore = score;
          best = e.color;
        }
      } else if (neutral && Math.abs(dL) < endGap) {
        endGap = Math.abs(dL);
        end = e.color;
      }
    }
    const next = best ?? end;
    return next === null ? null : withAlpha(next, alpha(c));
  }

  /** Any palette color close in hue and chroma (the original behavior). */
  private closestStep(c: Color, dir: 1 | -1): Color | null {
    const [L, a, b] = toOklab(c);
    let best: Color | null = null;
    let bestScore = Infinity;
    for (const e of this.entries) {
      const dL = e.lab[0] - L;
      if (dir > 0 ? dL <= 0.012 : dL >= -0.012) continue;
      const score = Math.hypot(e.lab[1] - a, e.lab[2] - b) * 2.4 + Math.abs(dL);
      if (score < bestScore) {
        bestScore = score;
        best = e.color;
      }
    }
    return best === null ? null : withAlpha(best, alpha(c));
  }
}

const rotateToward = (h: number, target: number, amount: number): number => {
  let d = target - h;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return h + Math.sign(d) * Math.min(Math.abs(d), amount);
};

/**
 * Lighter (dir = 1) or darker (dir = -1) version of a color, outside any palette. `strength` is
 * 1 to 3 steps. With `hueShift`, highlights drift toward yellow and shadows toward blue-violet,
 * like `hueShiftedRamp`.
 */
export function shiftLightness(c: Color, dir: 1 | -1, strength: number, hueShift: boolean): Color {
  const [L, a, b] = toOklab(c);
  const C = Math.hypot(a, b);
  let h = Math.atan2(b, a);
  if (hueShift && C >= 0.02)
    h = dir > 0 ? rotateToward(h, 1.55, 0.1 * strength) : rotateToward(h, 4.9, 0.12 * strength);
  const lightness = clamp(L + dir * 0.07 * strength, 0, 1);
  return withAlpha(oklchToColor(lightness, C, h), alpha(c));
}

/**
 * Five-step ramp around a base color with hue shifting: highlights drift toward yellow,
 * shadows toward blue-violet, which reads more natural than plain lightness changes.
 */
export function hueShiftedRamp(base: Color): Color[] {
  const color = opaque(base);
  const [L, a, b] = toOklab(color);
  const C = Math.hypot(a, b);
  const h = Math.atan2(b, a);
  const ramp: Color[] = [];
  for (let k = -2; k <= 2; k++) {
    if (k === 0) {
      ramp.push(color);
      continue;
    }
    const lightness = clamp(L + k * 0.11, 0.1, 0.97);
    const hue = k > 0 ? rotateToward(h, 1.55, 0.16 * k) : rotateToward(h, 4.9, 0.18 * -k);
    const chroma = C < 0.02 ? C : C * (k > 0 ? 1 - 0.14 * k : 1 - 0.06 * -k);
    ramp.push(oklchToColor(lightness, chroma, hue));
  }
  return ramp;
}

export const sortByLightness = (colors: Color[]): Color[] =>
  [...colors].sort((x, y) => toOklab(x)[0] - toOklab(y)[0]);
