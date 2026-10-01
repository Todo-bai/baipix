import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import {
  adjustColor,
  alpha,
  NO_ADJUSTMENT,
  opaque,
  toCss,
  withAlpha,
  type Color,
  type ColorAdjustment,
} from '../../engine/color';
import type { ColorMap } from '../../engine/editor';
import { PALETTE_PRESETS, presetColors, remapTable, type RemapMode } from '../../engine/palette';
import { useT, type MessageKey } from '../../i18n';
import { useEditor, useEditorState } from '../EditorContext';
import { uiStore } from '../uiStore';
import { Checkbox } from './Checkbox';
import { IconButton } from './IconButton';

const close = () => uiStore.set({ adjust: false });

type Tab = 'colors' | 'remap';

/** Kinds of adjustments, each a tab of the panel. */
const TABS: { id: Tab; label: MessageKey }[] = [
  { id: 'colors', label: 'adjust.colors' },
  { id: 'remap', label: 'adjust.remap' },
];

const SLIDERS: { key: keyof ColorAdjustment; label: MessageKey; min: number; max: number; unit: string }[] = [
  { key: 'hue', label: 'adjust.hue', min: -180, max: 180, unit: '°' },
  { key: 'saturation', label: 'adjust.saturation', min: 0, max: 200, unit: '%' },
  { key: 'brightness', label: 'adjust.brightness', min: 0, max: 200, unit: '%' },
];

/** Remap settings: the target palette ('file' for the file's own), how to match, how many colors. */
interface Remap {
  target: string;
  mode: RemapMode;
  count: number;
  replacePalette: boolean;
}

/**
 * The Adjustments panel, floating: changes to the existing pixels of the active layer or all
 * layers (limited to the selection if any), with a live preview on the canvas. Applying makes one
 * undo step. Its tabs are the kinds of adjustments: Colors shifts hue, saturation and brightness,
 * Remap moves the drawing to another palette.
 */
export function ColorAdjustPanel() {
  const open = uiStore.use((s) => s.adjust);
  return open ? <Panel /> : null;
}

/** The color change and the palette change (if any) of the current settings. */
function changeFor(
  tab: Tab,
  adj: ColorAdjustment,
  palette: boolean,
  remap: Remap,
  target: Color[],
  used: Map<Color, number>,
): { map: ColorMap; palette: ((colors: Color[]) => Color[]) | null } {
  if (tab === 'colors')
    return {
      map: (c) => adjustColor(c, adj),
      palette: palette ? (colors) => colors.map((c) => adjustColor(c, adj)) : null,
    };
  const { table, colors } = remapTable(used, target, remap.mode, remap.count);
  return {
    map: (c) => (alpha(c) ? withAlpha(table.get(opaque(c)) ?? opaque(c), alpha(c)) : c),
    palette: remap.replacePalette ? () => colors : null,
  };
}

function Panel() {
  const t = useT();
  const editor = useEditor();
  const hasSelection = useEditorState((s) => s.selection !== null);
  const filePalette = useEditorState((s) => s.palette.colors);
  const rightWidth = uiStore.use((s) => (s.uiHidden ? 0 : s.panelWidths.right));
  const [tab, setTab] = useState<Tab>('colors');
  const [adj, setAdj] = useState<ColorAdjustment>(NO_ADJUSTMENT);
  const [allLayers, setAllLayers] = useState(() => uiStore.get().adjustScope === 'all');
  const [palette, setPalette] = useState(false);
  // The file's palette as it was when the panel opened (previews may change the live one).
  const [ownPalette] = useState(filePalette);
  const [remap, setRemap] = useState<Remap>({
    target: 'file',
    mode: 'nearest',
    count: ownPalette.length,
    replacePalette: false,
  });
  const target = useMemo(
    () => (remap.target === 'file' ? ownPalette : presetColors(remap.target)),
    [remap.target, ownPalette],
  );

  // Starts (or restarts on scope change) the adjustment; leaving without applying cancels it.
  useEffect(() => {
    editor.beginAdjust(allLayers);
    return () => editor.cancelAdjust();
  }, [editor, allLayers]);
  useEffect(() => {
    const change = changeFor(tab, adj, palette, remap, target, editor.adjustedColors());
    editor.previewMap(change.map, change.palette);
  }, [editor, tab, adj, palette, remap, target, allLayers]);
  // Switching files cancels the adjustment in the editor: close the panel too.
  useEffect(() => editor.subscribe(() => !editor.isAdjusting && close()), [editor]);

  const apply = () => {
    const change = changeFor(tab, adj, palette, remap, target, editor.adjustedColors());
    editor.applyMap(change.map, change.palette);
    close();
  };
  const set = (key: keyof ColorAdjustment, value: number) => setAdj((a) => ({ ...a, [key]: value }));
  const reset = () =>
    tab === 'colors'
      ? setAdj(NO_ADJUSTMENT)
      : setRemap({ target: 'file', mode: 'nearest', count: ownPalette.length, replacePalette: false });

  return (
    <div
      className="popover adjust-panel"
      style={{ right: rightWidth + 12 } as CSSProperties}
      role="dialog"
      aria-label={t('adjust.title')}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Escape') close();
        if (e.key === 'Enter' && !(e.target instanceof HTMLSelectElement)) apply();
      }}
    >
      <div className="popover-header">
        <span>{t('adjust.title')}</span>
        <IconButton icon="close" label={t('common.close')} onClick={close} />
      </div>
      <div className="panel-tabs adjust-tabs" role="tablist" aria-label={t('adjust.title')}>
        {TABS.map((x) => (
          <button
            key={x.id}
            type="button"
            role="tab"
            aria-selected={tab === x.id}
            className="panel-tab"
            onClick={() => setTab(x.id)}
          >
            {t(x.label)}
          </button>
        ))}
      </div>
      <div className="popover-body">
        {tab === 'colors' ? (
          <>
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
          </>
        ) : (
          <>
            <label className="adjust-label">
              <span>{t('remap.palette')}</span>
              <select
                className="select-plain"
                value={remap.target}
                onChange={(e) => {
                  const key = e.target.value;
                  const size = key === 'file' ? ownPalette.length : presetColors(key).length;
                  setRemap((r) => ({ ...r, target: key, count: size }));
                }}
                aria-label={t('remap.palette')}
              >
                <option value="file">{t('remap.filePalette')}</option>
                {Object.entries(PALETTE_PRESETS).map(([key, p]) => (
                  <option key={key} value={key}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="remap-preview" aria-hidden="true">
              {target.map((c) => (
                <i key={c} style={{ background: toCss(c) }} />
              ))}
            </div>
            <div className="chips" role="radiogroup" aria-label={t('remap.match')}>
              {(['nearest', 'lightness'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  className="chip"
                  role="radio"
                  aria-checked={remap.mode === m}
                  aria-pressed={remap.mode === m}
                  data-tip={t(m === 'nearest' ? 'remap.nearestHint' : 'remap.lightnessHint')}
                  onClick={() => setRemap((r) => ({ ...r, mode: m }))}
                >
                  {t(m === 'nearest' ? 'remap.nearest' : 'remap.lightness')}
                </button>
              ))}
            </div>
            <div className="adjust-row">
              <label className="adjust-label">
                <span>{t('remap.count')}</span>
                <span className="adjust-value">
                  <input
                    type="number"
                    min={1}
                    max={target.length}
                    value={Math.min(remap.count, target.length)}
                    aria-label={t('remap.count')}
                    onChange={(e) =>
                      setRemap((r) => ({
                        ...r,
                        count: Math.max(1, Math.min(target.length, Number(e.target.value) || 1)),
                      }))
                    }
                  />
                </span>
              </label>
              <input
                type="range"
                className="adjust-slider"
                min={1}
                max={target.length}
                value={Math.min(remap.count, target.length)}
                aria-label={t('remap.count')}
                onChange={(e) => setRemap((r) => ({ ...r, count: Number(e.target.value) }))}
              />
            </div>
          </>
        )}
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
        {tab === 'colors' ? (
          <Checkbox checked={palette} onChange={setPalette} label={t('adjust.palette')} />
        ) : (
          <Checkbox
            checked={remap.replacePalette}
            onChange={(v) => setRemap((r) => ({ ...r, replacePalette: v }))}
            label={t('remap.replacePalette')}
          />
        )}
        {hasSelection && <p className="hint">{t('adjust.selectionOnly')}</p>}
        <div className="adjust-actions">
          <button type="button" className="btn" onClick={reset}>
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
