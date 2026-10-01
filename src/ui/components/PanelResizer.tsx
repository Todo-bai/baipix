import { useEffect, useState } from 'react';
import { clamp } from '../../engine/math';
import { useT } from '../../i18n';
import { PANEL_LIMITS, uiStore } from '../uiStore';

/** Drag handle on the inner edge of a side panel. Double-click resets the width. */
export function PanelResizer({ side }: { side: 'left' | 'right' }) {
  const t = useT();
  const limits = PANEL_LIMITS[side];
  // The left panel fits its content: the handle follows its height instead of the window's.
  const [height, setHeight] = useState<number | null>(null);
  useEffect(() => {
    if (side !== 'left') return;
    const panel = document.querySelector<HTMLElement>('.panel-left');
    if (!panel) return;
    const ro = new ResizeObserver(() => setHeight(panel.offsetHeight));
    ro.observe(panel);
    return () => ro.disconnect();
  }, [side]);
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
      style={height !== null ? { height, bottom: 'auto' } : undefined}
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
