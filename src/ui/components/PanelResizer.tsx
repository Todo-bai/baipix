import { clamp } from '../../engine/math';
import { useT } from '../../i18n';
import { PANEL_LIMITS, uiStore } from '../uiStore';

/** Drag handle on the inner edge of a side panel. Double-click resets the width. */
export function PanelResizer({ side }: { side: 'left' | 'right' }) {
  const t = useT();
  const limits = PANEL_LIMITS[side];
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    const x0 = e.clientX;
    const w0 = uiStore.get().panelWidths[side];
    el.classList.add('is-dragging');
    document.body.classList.add('is-resizing');
    uiStore.set({ picker: null });
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - x0;
      const width = clamp(Math.round(side === 'left' ? w0 + dx : w0 - dx), limits.min, limits.max);
      uiStore.set((s) => ({ panelWidths: { ...s.panelWidths, [side]: width } }));
    };
    const up = () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      el.classList.remove('is-dragging');
      document.body.classList.remove('is-resizing');
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  };
  return (
    <div
      className={`resizer resizer-${side}`}
      role="separator"
      aria-orientation="vertical"
      aria-label={t(side === 'left' ? 'panel.resizeLeft' : 'panel.resizeRight')}
      data-tip={t('panel.resizeHint')}
      onPointerDown={onPointerDown}
      onDoubleClick={() =>
        uiStore.set((s) => ({ panelWidths: { ...s.panelWidths, [side]: limits.default } }))
      }
    />
  );
}
