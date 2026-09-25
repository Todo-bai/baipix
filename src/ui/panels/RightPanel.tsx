import { useSyncExternalStore } from 'react';
import { alpha, pack } from '../../engine/color';
import { hasBackground, MAX_SIZE } from '../../engine/document';
import { renderGeometry } from '../../engine/export/svg';
import { PALETTE_PRESETS } from '../../engine/palette';
import { useT } from '../../i18n';
import { useActions } from '../ActionsContext';
import { useEditor, useEditorState } from '../EditorContext';
import { Checkbox } from '../components/Checkbox';
import { IconButton } from '../components/IconButton';
import { openMenu } from '../components/Menu';
import { NumberField } from '../components/NumberField';
import { PaletteGrid } from '../components/PaletteGrid';
import { Row, Section } from '../components/Section';
import { zoomMenu } from '../menus';
import { openDialog, uiStore } from '../uiStore';
import { viewport } from '../viewport';
import { ColorRow } from './ColorRow';
import { ToolSection } from './ToolSection';

const PIXEL_SIZES = [1, 2, 4, 8, 16, 32];

function TopBar() {
  const t = useT();
  const editor = useEditor();
  const actions = useActions();
  const zoom = useSyncExternalStore(viewport.subscribe, () => viewport.effectiveZoom);
  return (
    <div className="panel-header">
      <button
        type="button"
        className="zoom-button"
        aria-haspopup="menu"
        onClick={(e) => openMenu(e.currentTarget, zoomMenu(editor))}
      >
        {Math.round(zoom * 100)} %<span className="caret">▾</span>
      </button>
      <span className="spacer" />
      <button
        type="button"
        className="btn btn-primary"
        onClick={() => void actions.exportImage(uiStore.get().exportFormat, uiStore.get().exportActiveLayer)}
      >
        {t('export.button')}
      </button>
    </div>
  );
}

function RenderSection() {
  const t = useT();
  const editor = useEditor();
  const render = useEditorState((s) => s.doc.render);
  const showGap = useEditorState((s) => s.view.showGap);
  return (
    <Section title={t('section.render')}>
      <Row label={t('render.pixelSize')}>
        <label className="field" data-tip={t('render.pixelSizeHint')}>
          <select
            value={render.pixelSize}
            onChange={(e) => editor.setRender({ pixelSize: Number(e.target.value) })}
            aria-label={t('render.pixelSize')}
          >
            {[...new Set([...PIXEL_SIZES, render.pixelSize])]
              .sort((a, b) => a - b)
              .map((s) => (
                <option key={s} value={s}>
                  {s} px
                </option>
              ))}
          </select>
        </label>
      </Row>
      <Row label={t('render.gap')}>
        <NumberField
          value={render.gap}
          min={0}
          max={64}
          label="⇔"
          suffix="px"
          ariaLabel={t('render.gap')}
          scrubHint={t('common.dragToAdjust')}
          sensitivity={6}
          onChange={(v) => editor.setRender({ gap: v })}
        />
      </Row>
      <Checkbox
        checked={showGap}
        onChange={(v) => editor.setView('showGap', v)}
        label={t('render.showGap')}
      />
    </Section>
  );
}

function ColorsSection() {
  const t = useT();
  const editor = useEditor();
  const primary = useEditorState((s) => s.primary);
  const secondary = useEditorState((s) => s.secondary);
  return (
    <Section
      title={t('section.colors')}
      aside={
        <IconButton icon="swap" label={t('color.swap')} shortcut="X" onClick={() => editor.swapColors()} />
      }
    >
      <ColorRow
        slot="primary"
        color={primary}
        onChange={(c) => editor.setColor('primary', c)}
        trailing={
          <span className="color-role" data-tip={t('color.leftClick')}>
            {t('color.primaryShort')}
          </span>
        }
      />
      <ColorRow
        slot="secondary"
        color={secondary}
        onChange={(c) => editor.setColor('secondary', c)}
        trailing={
          <span className="color-role" data-tip={t('color.rightClick')}>
            {t('color.secondaryShort')}
          </span>
        }
      />
    </Section>
  );
}

function PaletteSection() {
  const t = useT();
  const editor = useEditor();
  const actions = useActions();
  const palette = useEditorState((s) => s.palette);
  const primary = useEditorState((s) => s.primary);
  const secondary = useEditorState((s) => s.secondary);
  return (
    <Section
      title={t('section.palette')}
      aside={
        <>
          <select
            className="select-plain"
            value={palette.key}
            onChange={(e) => editor.setPalettePreset(e.target.value)}
            aria-label={t('palette.preset')}
          >
            {Object.entries(PALETTE_PRESETS).map(([key, p]) => (
              <option key={key} value={key}>
                {p.name}
              </option>
            ))}
            {palette.custom && <option value="custom">{t('palette.custom')}</option>}
          </select>
          <IconButton
            icon="more"
            label={t('palette.actions')}
            aria-haspopup="menu"
            onClick={(e) =>
              openMenu(e.currentTarget, [
                { label: t('palette.add'), onSelect: () => editor.addToPalette() },
                { label: t('palette.remove'), onSelect: () => editor.removeFromPalette() },
                { label: t('palette.ramp'), onSelect: () => editor.addRamp() },
                '-',
                { label: t('palette.sort'), onSelect: () => editor.sortPalette() },
                { label: t('palette.fromDrawing'), onSelect: () => editor.paletteFromDrawing() },
                '-',
                { label: t('palette.paste'), onSelect: () => openDialog({ type: 'paletteImport' }) },
                { label: t('palette.export'), onSelect: () => void actions.exportPalette() },
              ])
            }
          />
        </>
      }
    >
      <PaletteGrid
        colors={palette.colors}
        primary={primary}
        secondary={secondary}
        onPick={(c, second) => editor.setColor(second ? 'secondary' : 'primary', c)}
      />
      <div className="button-row">
        <button
          type="button"
          className="btn"
          data-tip={t('palette.addHint')}
          onClick={() => editor.addToPalette()}
        >
          {t('palette.addShort')}
        </button>
        <button
          type="button"
          className="btn"
          data-tip={t('palette.rampHint')}
          onClick={() => editor.addRamp()}
        >
          {t('palette.rampShort')}
        </button>
        <button
          type="button"
          className="btn"
          data-tip={t('palette.exportHint')}
          onClick={() => void actions.exportPalette()}
        >
          {t('palette.exportShort')}
        </button>
      </div>
    </Section>
  );
}

function LayerSection() {
  const t = useT();
  const editor = useEditor();
  const layer = useEditorState((s) => s.doc.layers[s.doc.activeLayer]);
  const index = useEditorState((s) => s.doc.activeLayer);
  useEditorState((s) => s.revision);
  return (
    <Section title={t('section.layer')} aside={<span className="muted truncate">{layer.name}</span>}>
      <div className="two-columns">
        <NumberField
          value={Math.round(layer.opacity * 100)}
          min={0}
          max={100}
          label="◐"
          suffix="%"
          ariaLabel={t('common.opacity')}
          scrubHint={t('common.dragToAdjust')}
          sensitivity={2}
          onChange={(v, final) => editor.setLayerOpacity(v / 100, final)}
        />
        <button type="button" className="btn" onClick={() => editor.setLayerVisible(index, !layer.visible)}>
          {layer.visible ? t('layer.hide') : t('layer.show')}
        </button>
      </div>
    </Section>
  );
}

function CanvasSection() {
  const t = useT();
  const editor = useEditor();
  const doc = useEditorState((s) => s.doc);
  useEditorState((s) => s.revision);
  const hasBg = doc.background !== 0;
  return (
    <Section
      title={t('section.canvas')}
      aside={<IconButton icon="plus" label={t('file.new')} onClick={() => openDialog({ type: 'newFile' })} />}
    >
      <div className="two-columns">
        <NumberField
          value={doc.width}
          min={1}
          max={MAX_SIZE}
          label="W"
          ariaLabel={t('canvas.width')}
          sensitivity={3}
          onChange={(v, final) => final && editor.resize(v, doc.height)}
        />
        <NumberField
          value={doc.height}
          min={1}
          max={MAX_SIZE}
          label="H"
          ariaLabel={t('canvas.height')}
          sensitivity={3}
          onChange={(v, final) => final && editor.resize(doc.width, v)}
        />
      </div>
      <p className="hint">{t('canvas.resizeHint')}</p>
      <div className="subsection-title">
        <span>{t('canvas.background')}</span>
        {!hasBg && (
          <IconButton
            icon="plus"
            label={t('canvas.addBackground')}
            onClick={(e) => {
              const secondary = editor.getState().secondary;
              editor.setBackground(alpha(secondary) ? secondary : pack(255, 255, 255), true);
              uiStore.set({
                picker: { slot: 'background', top: e.currentTarget.getBoundingClientRect().top },
              });
            }}
          />
        )}
      </div>
      {hasBg ? (
        <ColorRow
          slot="background"
          color={doc.background}
          dimmed={!doc.backgroundVisible}
          onChange={(c) => editor.setBackground(c, doc.backgroundVisible)}
          trailing={
            <>
              <IconButton
                icon={doc.backgroundVisible ? 'eye' : 'eyeOff'}
                label={doc.backgroundVisible ? t('canvas.hideBackground') : t('canvas.showBackground')}
                onClick={() => editor.setBackground(doc.background, !doc.backgroundVisible)}
              />
              <IconButton
                icon="minus"
                label={t('canvas.removeBackground')}
                onClick={() => {
                  if (uiStore.get().picker?.slot === 'background') uiStore.set({ picker: null });
                  editor.setBackground(0, true);
                }}
              />
            </>
          }
        />
      ) : (
        <p className="hint">{t('canvas.noBackground')}</p>
      )}
    </Section>
  );
}

function DisplaySection() {
  const t = useT();
  const editor = useEditor();
  const view = useEditorState((s) => s.view);
  return (
    <Section title={t('section.display')}>
      <Checkbox checked={view.grid} onChange={(v) => editor.setView('grid', v)} label={t('display.grid')} />
      <Checkbox checked={view.tile} onChange={(v) => editor.setView('tile', v)} label={t('display.tile')} />
      <Checkbox
        checked={view.mirrorX}
        onChange={(v) => editor.setView('mirrorX', v)}
        label={t('display.mirrorX')}
      />
      <Checkbox
        checked={view.mirrorY}
        onChange={(v) => editor.setView('mirrorY', v)}
        label={t('display.mirrorY')}
      />
    </Section>
  );
}

function ExportSection() {
  const t = useT();
  const actions = useActions();
  const doc = useEditorState((s) => s.doc);
  useEditorState((s) => s.revision);
  const format = uiStore.use((s) => s.exportFormat);
  const onlyLayer = uiStore.use((s) => s.exportActiveLayer);
  const g = renderGeometry(doc.width, doc.height, doc.render.pixelSize, doc.render.gap);
  const bg = !onlyLayer && hasBackground(doc);
  return (
    <Section title={t('section.export')}>
      <Row label={t('export.format')}>
        <label className="field">
          <select
            value={format}
            onChange={(e) => uiStore.set({ exportFormat: e.target.value as 'png' | 'svg' })}
            aria-label={t('export.format')}
          >
            <option value="png">PNG</option>
            <option value="svg">SVG</option>
          </select>
        </label>
      </Row>
      <Checkbox
        checked={onlyLayer}
        onChange={(v) => uiStore.set({ exportActiveLayer: v })}
        label={t('export.activeLayerOnly')}
      />
      <button
        type="button"
        className="btn btn-wide"
        onClick={() => void actions.exportImage(format, onlyLayer)}
      >
        {t('export.file', { name: `${doc.name}.${format}` })}
      </button>
      <div className="two-columns">
        <button
          type="button"
          className="btn"
          data-tip={t('export.copySvgHint')}
          data-kbd="Ctrl+Shift+C"
          onClick={() => void actions.copySvg(onlyLayer)}
        >
          {t('export.copySvg')}
        </button>
        <button
          type="button"
          className="btn"
          data-tip={t('export.copyPngHint')}
          onClick={() => void actions.copyPng(onlyLayer)}
        >
          {t('export.copyPng')}
        </button>
      </div>
      <p className="hint">
        {t('export.info', { w: g.width, h: g.height })}{' '}
        {bg ? t('export.withBackground') : t('export.transparent')}
      </p>
    </Section>
  );
}

export function RightPanel() {
  const t = useT();
  return (
    <aside className="panel panel-right" aria-label={t('panel.right')}>
      <TopBar />
      <RenderSection />
      <ToolSection />
      <ColorsSection />
      <PaletteSection />
      <LayerSection />
      <CanvasSection />
      <DisplaySection />
      <ExportSection />
    </aside>
  );
}
