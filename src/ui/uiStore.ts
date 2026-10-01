import type { Color } from '../engine/color';
import { createStore } from './store';

export type ColorSlot = 'primary' | 'secondary' | 'background';

export type DialogState =
  | { type: 'newFile' }
  | { type: 'paletteImport' }
  | { type: 'paletteManager' }
  | { type: 'shortcuts' }
  | { type: 'confirm'; title: string; message: string; confirmLabel: string; onConfirm: () => void }
  | { type: 'output'; title: string; message: string; image?: string; text?: string };

export interface PreviewWindow {
  open: boolean;
  collapsed: boolean;
  /** Top-left corner in the workspace, in CSS px; null until moved (it then sits bottom left). */
  x: number | null;
  y: number | null;
  w: number;
  h: number;
  /** Zoom in %, relative to the fit (200: twice as large as fitted); null fits the whole drawing. */
  zoom: number | null;
}

export interface UiState {
  dialog: DialogState | null;
  /** Open color picker: which color it edits and where to anchor it vertically. */
  picker: { slot: ColorSlot; top: number } | null;
  /** Mobile bottom sheet. */
  sheet: 'left' | 'right' | null;
  /** Color adjustment panel open. */
  adjust: boolean;
  /** The floating preview window: shown or not, folded, where (null: the default spot), its size and zoom. */
  preview: PreviewWindow;
  /** What the Adjustments panel starts on: the active layer (from the Layer section) or all layers. */
  adjustScope: 'layer' | 'all';
  panelWidths: { left: number; right: number };
  uiHidden: boolean;
  exportFormat: 'png' | 'svg';
  exportActiveLayer: boolean;
  /** Ids of the collapsed panel sections. */
  collapsed: string[];
  /** Tab of the right panel. */
  rightTab: 'design' | 'export';
  /** Exports include the document's background (when it has one). */
  exportBackground: boolean;
  /** Preset palettes left out of the palette menu. */
  hiddenPalettes: string[];
  /** The home screen covers the editor. */
  home: boolean;
}

export const PANEL_LIMITS = {
  left: { min: 200, max: 480, default: 240 },
  right: { min: 232, max: 480, default: 248 },
};

export const uiStore = createStore<UiState>({
  dialog: null,
  picker: null,
  sheet: null,
  adjust: false,
  adjustScope: 'all',
  preview: { open: true, collapsed: false, x: null, y: null, w: 208, h: 168, zoom: null },
  panelWidths: { left: PANEL_LIMITS.left.default, right: PANEL_LIMITS.right.default },
  uiHidden: false,
  exportFormat: 'png',
  exportActiveLayer: false,
  collapsed: [],
  rightTab: 'design',
  exportBackground: true,
  hiddenPalettes: [],
  home: false,
});

export const openDialog = (dialog: DialogState): void => uiStore.set({ dialog });
/** Opens the Adjustments panel, on the active layer or on all layers. */
export const openAdjust = (scope: 'layer' | 'all' = 'all'): void =>
  uiStore.set({ adjust: true, adjustScope: scope });
export const closeDialog = (): void => uiStore.set({ dialog: null });

/** Pixel under the cursor, for the coordinates badge (updated often, kept separate). */
export const hoverStore = createStore<
  { x: number; y: number; color: Color | null } | { x: null; y: null; color: null }
>({
  x: null,
  y: null,
  color: null,
});

export interface ToastAction {
  label: string;
  run: () => void;
}
export interface Toast {
  id: number;
  message: string;
  action?: ToastAction;
}
export const toastStore = createStore<{ toasts: Toast[] }>({ toasts: [] });
let toastId = 0;
export const dismissToast = (id: number): void =>
  toastStore.set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) }));
/** Shows a short message. With an action (e.g. Undo), it stays longer so there is time to click. */
export function toast(message: string, action?: ToastAction): void {
  const id = ++toastId;
  toastStore.set({ toasts: [{ id, message, action }] });
  setTimeout(() => dismissToast(id), action ? 6000 : 2800);
}
