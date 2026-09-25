import type { Color } from '../engine/color';
import { createStore } from './store';

export type ColorSlot = 'primary' | 'secondary' | 'background';

export type DialogState =
  | { type: 'newFile' }
  | { type: 'paletteImport' }
  | { type: 'shortcuts' }
  | { type: 'confirm'; title: string; message: string; confirmLabel: string; onConfirm: () => void }
  | { type: 'output'; title: string; message: string; image?: string; text?: string };

export interface UiState {
  dialog: DialogState | null;
  /** Open color picker: which color it edits and where to anchor it vertically. */
  picker: { slot: ColorSlot; top: number } | null;
  /** Mobile bottom sheet. */
  sheet: 'left' | 'right' | null;
  panelWidths: { left: number; right: number };
  uiHidden: boolean;
  exportFormat: 'png' | 'svg';
  exportActiveLayer: boolean;
}

export const PANEL_LIMITS = {
  left: { min: 200, max: 480, default: 240 },
  right: { min: 232, max: 480, default: 248 },
};

export const uiStore = createStore<UiState>({
  dialog: null,
  picker: null,
  sheet: null,
  panelWidths: { left: PANEL_LIMITS.left.default, right: PANEL_LIMITS.right.default },
  uiHidden: false,
  exportFormat: 'png',
  exportActiveLayer: false,
});

export const openDialog = (dialog: DialogState): void => uiStore.set({ dialog });
export const closeDialog = (): void => uiStore.set({ dialog: null });

/** Pixel under the cursor, for the coordinates badge (updated often, kept separate). */
export const hoverStore = createStore<
  { x: number; y: number; color: Color | null } | { x: null; y: null; color: null }
>({
  x: null,
  y: null,
  color: null,
});

export interface Toast {
  id: number;
  message: string;
}
export const toastStore = createStore<{ toasts: Toast[] }>({ toasts: [] });
let toastId = 0;
export function toast(message: string): void {
  const id = ++toastId;
  toastStore.set({ toasts: [{ id, message }] });
  setTimeout(() => toastStore.set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })), 2800);
}
