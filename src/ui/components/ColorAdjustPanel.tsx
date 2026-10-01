import { useEffect, useState, type CSSProperties } from 'react';
import { NO_ADJUSTMENT, type ColorAdjustment } from '../../engine/color';
import { useT, type MessageKey } from '../../i18n';
import { useEditor, useEditorState } from '../EditorContext';
import { uiStore } from '../uiStore';
import { Checkbox } from './Checkbox';
import { IconButton } from './IconButton';

const close = () => uiStore.set({ adjust: false });

/** Kinds of adjustments, each a tab of the panel. */
const TABS: { id: 'colors'; label: MessageKey }[] = [{ id: 'colors', label: 'adjust.colors' }];

const SLIDERS: { key: keyof ColorAdjustment; label: MessageKey; min: number; max: number; unit: string }[] = [
  { key: 'hue', label: 'adjust.hue', min: -180, max: 180, unit: '°' },
  { key: 'saturation', label: 'adjust.saturation', min: 0, max: 200, unit: '%' },
  { key: 'brightness', label: 'adjust.brightness', min: 0, max: 200, unit: '%' },
];

/**
 * The Adjustments panel, floating: changes to the existing pixels of the active layer or all
 * layers (limited to the selection if any), with a live preview on the canvas. Applying makes one
 * undo step. Its tabs are the kinds of adjustments; Colors shifts hue, saturation and brightness.
 */
export function ColorAdjustPanel() {
  const open = uiStore.use((s) => s.adjust);
  return open ? <Panel /> : null;
}

function Panel() {
  const t = useT();
  const editor = useEditor();
  const hasSelection = useEditorState((s) => s.selection !== null);
  const rightWidth = uiStore.use((s) => (s.uiHidden ? 0 : s.panelWidths.right));
  const [adj, setAdj] = useState<ColorAdjustment>(NO_ADJUSTMENT);
  const [allLayers, setAllLayers] = useState(() => uiStore.get().adjustScope === 'all');
  const [palette, setPalette] = useState(false);

  // Starts (or restarts on scope change) the adjustment; leaving without applying cancels it.
  useEffect(() => {
    editor.beginAdjust(allLayers);
    return () => editor.cancelAdjust();
  }, [editor, allLayers]);
  useEffect(() => editor.previewAdjust(adj), [editor, adj, allLayers]);
  // Switching files cancels the adjustment in the editor: close the panel too.
  useEffect(() => editor.subscribe(() => !editor.isAdjusting && close()), [editor]);

  const apply = () => {
    editor.applyAdjust(adj, palette);
    close();
  };
  const set = (key: keyof ColorAdjustment, value: number) => setAdj((a) => ({ ...a, [key]: value }));

  return (
    <div
      className="popover adjust-panel"
      style={{ right: rightWidth + 12 } as CSSProperties}
      role="dialog"
      aria-label={t('adjust.title')}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Escape') close();
        if (e.key === 'Enter') apply();
      }}
    >
      <div className="popover-header">
        <span>{t('adjust.title')}</span>
        <IconButton icon="close" label={t('common.close')} onClick={close} />
      </div>
      {/* Tabs show once there are several kinds of adjustments. */}
      {TABS.length > 1 && (
        <div className="panel-tabs" role="tablist" aria-label={t('adjust.title')}>
          {TABS.map((tab) => (
            <button key={tab.id} type="button" role="tab" aria-selected className="panel-tab">
              {t(tab.label)}
            </button>
          ))}
        </div>
      )}
      <div className="popover-body">
        {SLIDERS.map(({ key, label, min, max, unit }) => (
          <div key={key} className="adjust-row">
            <label className="adjust-label">
              <span>{t(label)}</span>
              <span className="adjust-value">
                <input
                  type="number"
                  min={min}
                  max={max}
                  value={adj[key]}
                  aria-label={t(label)}
                  onChange={(e) => set(key, Math.max(min, Math.min(max, Number(e.target.value) || 0)))}
                />
                {unit}
              </span>
            </label>
            <input
              type="range"
              className={`adjust-slider adjust-${key}`}
              min={min}
              max={max}
              value={adj[key]}
              aria-label={t(label)}
              onChange={(e) => set(key, Number(e.target.value))}
              onDoubleClick={() => set(key, NO_ADJUSTMENT[key])}
            />
          </div>
        ))}
        <div className="chips" role="radiogroup">
          {[false, true].map((all) => (
            <button
              key={String(all)}
              type="button"
              className="chip"
              role="radio"
              aria-checked={allLayers === all}
              aria-pressed={allLayers === all}
              onClick={() => setAllLayers(all)}
            >
              {t(all ? 'adjust.allLayers' : 'adjust.layer')}
            </button>
          ))}
        </div>
        <Checkbox checked={palette} onChange={setPalette} label={t('adjust.palette')} />
        {hasSelection && <p className="hint">{t('adjust.selectionOnly')}</p>}
        <div className="adjust-actions">
          <button type="button" className="btn" onClick={() => setAdj(NO_ADJUSTMENT)}>
            {t('common.reset')}
          </button>
          <span className="adjust-spacer" />
          <button type="button" className="btn" onClick={close}>
            {t('common.cancel')}
          </button>
          <button type="button" className="btn btn-primary" onClick={apply}>
            {t('common.apply')}
          </button>
        </div>
      </div>
    </div>
  );
}
