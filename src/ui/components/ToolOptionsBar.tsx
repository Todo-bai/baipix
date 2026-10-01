import type { ReactNode } from 'react';
import type { ToolOptions } from '../../engine/tools';
import { useT } from '../../i18n';
import { useEditor, useEditorState } from '../EditorContext';
import { toolMeta } from '../tools';
import { Checkbox } from './Checkbox';
import { Icon } from './Icon';
import { IconButton } from './IconButton';
import { NumberField } from './NumberField';
import { Row } from './Section';

/** Options of the active tool, in a small bar right above the toolbar. Hidden for tools without any. */
export function ToolOptionsBar() {
  const t = useT();
  const editor = useEditor();
  const tool = useEditorState((s) => s.tool);
  const options = useEditorState((s) => s.options);
  const hasSelection = useEditorState((s) => s.selection !== null);
  const meta = toolMeta(tool);
  const set =
    <K extends keyof ToolOptions>(k: K) =>
    (v: ToolOptions[K]) =>
      editor.setOption(k, v);

  const size = (
    <Row label={t('options.size')}>
      <NumberField
        value={options.size}
        min={1}
        max={16}
        label="⇔"
        suffix="px"
        ariaLabel={t('options.size')}
        scrubHint={t('common.dragToAdjust')}
        sensitivity={8}
        onChange={(v) => editor.setOption('size', v)}
      />
    </Row>
  );
  // Help texts go in a tooltip on the tool name, to keep the bar short.
  let info: string | undefined;
  const flips = (
    <div className="button-group">
      <IconButton
        icon="rotate"
        label={t('menu.rotate')}
        className="icon-btn large"
        onClick={() => editor.rotate()}
      />
      <IconButton
        icon="flipH"
        label={t('menu.flipH')}
        className="icon-btn large"
        onClick={() => editor.flip(true)}
      />
      <IconButton
        icon="flipV"
        label={t('menu.flipV')}
        className="icon-btn large"
        onClick={() => editor.flip(false)}
      />
    </div>
  );

  let body: ReactNode;
  switch (tool) {
    case 'pencil':
      info = t('hint.pencil');
      body = (
        <>
          {size}
          <Checkbox
            checked={options.pixelPerfect}
            onChange={set('pixelPerfect')}
            label={t('options.pixelPerfect')}
          />
          <Checkbox checked={options.dither} onChange={set('dither')} label={t('options.dither')} />
        </>
      );
      break;
    case 'eraser':
      info = t('hint.eraser');
      body = <>{size}</>;
      break;
    case 'line':
      info = t('hint.line');
      body = <>{size}</>;
      break;
    case 'rect':
    case 'roundRect':
    case 'ellipse':
    case 'triangle':
    case 'star':
      info = t('hint.shape');
      body = (
        <>
          {size}
          {tool === 'roundRect' && (
            <Row label={t('options.radius')}>
              <NumberField
                value={options.radius}
                min={1}
                max={32}
                label="◜"
                suffix="px"
                ariaLabel={t('options.radius')}
                scrubHint={t('common.dragToAdjust')}
                sensitivity={8}
                onChange={(v) => editor.setOption('radius', v)}
              />
            </Row>
          )}
          <Checkbox checked={options.filled} onChange={set('filled')} label={t('options.filled')} />
        </>
      );
      break;
    case 'bucket':
      info = options.contiguous ? t('hint.bucketContiguous') : t('hint.bucketGlobal');
      body = (
        <>
          <Checkbox
            checked={options.contiguous}
            onChange={set('contiguous')}
            label={t('options.contiguous')}
          />
          <Checkbox checked={options.dither} onChange={set('dither')} label={t('options.dither')} />
          <div className="button-row">
            <button type="button" className="btn" data-kbd="Shift+Del" onClick={() => editor.fill()}>
              {hasSelection ? t('menu.fillSelection') : t('menu.fillLayer')}
            </button>
          </div>
        </>
      );
      break;
    case 'shade':
    case 'lighten': {
      const how = { ramp: 'hint.shadeRamp', palette: 'hint.shadePalette', free: 'hint.shadeFree' } as const;
      info = t(tool === 'shade' ? 'hint.shade' : 'hint.lighten', { how: t(how[options.shadeMode]) });
      body = (
        <>
          {size}
          <label className="field" data-tip={t('options.shadeMode')}>
            <select
              value={options.shadeMode}
              onChange={(e) => editor.setOption('shadeMode', e.target.value as ToolOptions['shadeMode'])}
              aria-label={t('options.shadeMode')}
            >
              <option value="ramp">{t('shade.ramp')}</option>
              <option value="palette">{t('shade.palette')}</option>
              <option value="free">{t('shade.free')}</option>
            </select>
          </label>
          {options.shadeMode === 'free' && (
            <>
              <Row label={t('options.strength')}>
                <NumberField
                  value={options.shadeStrength}
                  min={1}
                  max={3}
                  label="⇔"
                  ariaLabel={t('options.strength')}
                  scrubHint={t('common.dragToAdjust')}
                  sensitivity={14}
                  onChange={(v) => editor.setOption('shadeStrength', v)}
                />
              </Row>
              <Checkbox
                checked={options.shadeHueShift}
                onChange={set('shadeHueShift')}
                label={t('options.hueShift')}
              />
            </>
          )}
        </>
      );
      break;
    }
    case 'blur':
      info = options.blurSnap ? t('hint.blurSnap') : t('hint.blurFree');
      body = (
        <>
          {size}
          <Row label={t('options.strength')}>
            <NumberField
              value={options.blurStrength}
              min={1}
              max={3}
              label="⇔"
              ariaLabel={t('options.strength')}
              scrubHint={t('common.dragToAdjust')}
              sensitivity={14}
              onChange={(v) => editor.setOption('blurStrength', v)}
            />
          </Row>
          <Checkbox checked={options.blurSnap} onChange={set('blurSnap')} label={t('options.blurSnap')} />
        </>
      );
      break;
    case 'spray':
      info = t('hint.spray');
      body = (
        <>
          <Row label={t('options.size')}>
            <NumberField
              value={options.spraySize}
              min={2}
              max={64}
              label="⇔"
              suffix="px"
              ariaLabel={t('options.size')}
              scrubHint={t('common.dragToAdjust')}
              sensitivity={4}
              onChange={(v) => editor.setOption('spraySize', v)}
            />
          </Row>
          <Row label={t('options.density')}>
            <NumberField
              value={options.sprayDensity}
              min={1}
              max={100}
              label="◐"
              suffix="%"
              ariaLabel={t('options.density')}
              scrubHint={t('common.dragToAdjust')}
              sensitivity={2}
              onChange={(v) => editor.setOption('sprayDensity', v)}
            />
          </Row>
          <Checkbox
            checked={options.sprayOpacity}
            onChange={set('sprayOpacity')}
            label={t('options.sprayOpacity')}
          />
        </>
      );
      break;
    case 'jumble':
      info = t('hint.jumble');
      body = (
        <>
          <Row label={t('options.size')}>
            <NumberField
              value={options.jumbleSize}
              min={2}
              max={32}
              label="⇔"
              suffix="px"
              ariaLabel={t('options.size')}
              scrubHint={t('common.dragToAdjust')}
              sensitivity={6}
              onChange={(v) => editor.setOption('jumbleSize', v)}
            />
          </Row>
          <Row label={t('options.strength')}>
            <NumberField
              value={options.jumbleStrength}
              min={1}
              max={3}
              label="⇔"
              ariaLabel={t('options.strength')}
              scrubHint={t('common.dragToAdjust')}
              sensitivity={14}
              onChange={(v) => editor.setOption('jumbleStrength', v)}
            />
          </Row>
        </>
      );
      break;
    case 'picker':
      info = t('hint.picker');
      body = null;
      break;
    case 'select':
      info = t('hint.select');
      body = (
        <>
          <div className="button-row">
            <button type="button" className="btn" onClick={() => editor.selectAll()}>
              {t('menu.selectAll')}
            </button>
            <button type="button" className="btn" disabled={!hasSelection} onClick={() => editor.deselect()}>
              {t('menu.deselect')}
            </button>
          </div>
          {flips}
        </>
      );
      break;
    case 'move':
      info = hasSelection ? t('hint.moveSelection') : t('hint.moveLayer');
      body = <>{flips}</>;
      break;
  }

  if (!body) return null;
  return (
    <div className="tool-options" role="toolbar" aria-label={t(meta.label)}>
      <span className="tool-options-name" data-tip={info} data-kbd={meta.shortcut} tabIndex={info ? 0 : -1}>
        {t(meta.label)}
        {info && <Icon name="info" size={14} />}
      </span>
      {body}
    </div>
  );
}
