import type { PixelDoc } from '../engine/document';
import { clamp } from '../engine/math';

export const ZOOM_LEVELS = [1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96];

interface View {
  zoom: number;
  panX: number;
  panY: number;
}

/**
 * Canvas camera: zoom and pan in CSS pixels, per document. Device pixel ratio is handled by
 * rounding the on-screen pixel size so every art pixel covers a whole number of device pixels.
 */
class Viewport {
  zoom = 16;
  panX = 0;
  panY = 0;
  width = 0;
  height = 0;
  private left = 0;
  private top = 0;
  private windowW = 0;
  private windowH = 0;
  dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  private docId: string | null = null;
  private saved = new Map<string, View>();
  /** Document waiting for the first layout to be fitted. */
  private pendingFit: PixelDoc | null = null;
  private listeners = new Set<() => void>();

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private emit(): void {
    this.listeners.forEach((l) => l());
  }

  /** Device pixels per art pixel. */
  get scale(): number {
    return Math.max(1, Math.round(this.zoom * this.dpr));
  }

  /** Effective zoom after rounding, in CSS pixels per art pixel. */
  get effectiveZoom(): number {
    return this.scale / this.dpr;
  }

  get originX(): number {
    return Math.round(this.panX * this.dpr);
  }

  get originY(): number {
    return Math.round(this.panY * this.dpr);
  }

  /** Converts a position relative to the canvas element (CSS px) to an art pixel. */
  toPixel(x: number, y: number): { x: number; y: number } {
    const s = this.scale;
    return {
      x: Math.floor((x * this.dpr - this.originX) / s),
      y: Math.floor((y * this.dpr - this.originY) / s),
    };
  }

  /**
   * `left`/`top` are the workspace position in the window. Panels shown, hidden or resized never
   * move the drawing on screen; resizing the window keeps it in place relative to the window center.
   */
  setSize(width: number, height: number, left = 0, top = 0): void {
    const windowW = window.innerWidth;
    const windowH = window.innerHeight;
    if (this.width !== 0) {
      this.panX += this.left - left + (windowW - this.windowW) / 2;
      this.panY += this.top - top + (windowH - this.windowH) / 2;
    }
    this.width = width;
    this.height = height;
    this.left = left;
    this.top = top;
    this.windowW = windowW;
    this.windowH = windowH;
    this.dpr = window.devicePixelRatio || 1;
    if (this.pendingFit && width > 0) {
      const doc = this.pendingFit;
      this.pendingFit = null;
      this.fit(doc);
      return;
    }
    this.emit();
  }

  private insets() {
    const small = this.width < 600;
    return { x: small ? 24 : 64, top: small ? 76 : 44, bottom: small ? 72 : 84 };
  }

  fit(doc: PixelDoc): void {
    if (!this.width) {
      this.pendingFit = doc;
      return;
    }
    const { x, top, bottom } = this.insets();
    let z = 1;
    for (const level of ZOOM_LEVELS)
      if (doc.width * level <= this.width - x && doc.height * level <= this.height - top - bottom) z = level;
    this.zoom = z;
    const ez = this.effectiveZoom;
    this.panX = Math.round((this.width - doc.width * ez) / 2);
    this.panY = Math.round(top + (this.height - top - bottom - doc.height * ez) / 2);
    this.emit();
  }

  /** Zooms keeping the point (cx, cy) fixed on screen. Defaults to the center. */
  zoomTo(zoom: number, cx = this.width / 2, cy = this.height / 2): void {
    const before = this.effectiveZoom;
    const px = (cx - this.panX) / before;
    const py = (cy - this.panY) / before;
    this.zoom = clamp(zoom, 1, 96);
    const after = this.effectiveZoom;
    this.panX = cx - px * after;
    this.panY = cy - py * after;
    this.emit();
  }

  step(direction: 1 | -1, cx?: number, cy?: number): void {
    const z = this.zoom;
    const next =
      direction > 0
        ? ZOOM_LEVELS.find((v) => v > z + 0.001)
        : [...ZOOM_LEVELS].reverse().find((v) => v < z - 0.001);
    this.zoomTo(next ?? (direction > 0 ? 96 : 1), cx, cy);
  }

  panBy(dx: number, dy: number): void {
    this.panX += dx;
    this.panY += dy;
    this.emit();
  }

  /** Continuous zoom (pinch). Call `settle` when the gesture ends to snap to a whole zoom. */
  set(view: View): void {
    Object.assign(this, view);
    this.emit();
  }

  settle(cx: number, cy: number): void {
    this.zoomTo(Math.max(1, Math.round(this.zoom)), cx, cy);
  }

  /** Remembers the camera per document. */
  showDocument(doc: PixelDoc): void {
    if (this.docId === doc.id) return;
    if (this.docId) this.saved.set(this.docId, { zoom: this.zoom, panX: this.panX, panY: this.panY });
    this.docId = doc.id;
    const view = this.saved.get(doc.id);
    if (view) this.set(view);
    else this.fit(doc);
  }
}

export const viewport = new Viewport();
