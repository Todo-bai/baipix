import type { ReactNode } from 'react';
import type { ToolOptions } from '../../engine/tools';
import { useT } from '../../i18n';
import { useEditor, useEditorState } from '../EditorContext';
import { Checkbox } from '../components/Checkbox';
import { IconButton } from '../components/IconButton';
import { NumberField } from '../components/NumberField';
import { Row, Section } from '../components/Section';
import { toolMeta } from '../tools';

/** Contextual options of the active tool. */
export function ToolSection() {
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
  const hint = (text: string) => <p className="hint">{text}</p>;
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
      body = (
        <>
          {size}
          <Checkbox
            checked={options.pixelPerfect}
            onChange={set('pixelPerfect')}
            label={t('options.pixelPerfect')}
          />
          <Checkbox checked={options.dither} onChange={set('dither')} label={t('options.dither')} />
          {hint(t('hint.pencil'))}
        </>
      );
      break;
    case 'eraser':
      body = (
        <>
          {size}
          {hint(t('hint.eraser'))}
        </>
      );
      break;
    case 'line':
      body = (
        <>
          {size}
          {hint(t('hint.line'))}
        </>
      );
      break;
    case 'rect':
    case 'roundRect':
    case 'ellipse':
    case 'triangle':
    case 'star':
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
          {hint(t('hint.shape'))}
        </>
      );
      break;
    case 'bucket':
      body = (
        <>
          <Checkbox
            checked={options.contiguous}
            onChange={set('contiguous')}
            label={t('options.contiguous')}
          />
          <Checkbox checked={options.dither} onChange={set('dither')} label={t('options.dither')} />
          {hint(options.contiguous ? t('hint.bucketContiguous') : t('hint.bucketGlobal'))}
          <div className="button-row">
            <button type="button" className="btn" data-kbd="Shift+Del" onClick={() => editor.fill()}>
              {hasSelection ? t('menu.fillSelection') : t('menu.fillLayer')}
            </button>
          </div>
        </>
      );
      break;
    case 'shade':
    case 'lighten':
      body = (
        <>
          {size}
          {hint(t(tool === 'shade' ? 'hint.shade' : 'hint.lighten'))}
        </>
      );
      break;
    case 'blur':
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
          {hint(options.blurSnap ? t('hint.blurSnap') : t('hint.blurFree'))}
        </>
      );
      break;
    case 'picker':
      body = hint(t('hint.picker'));
      break;
    case 'select':
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
          {hint(t('hint.select'))}
        </>
      );
      break;
    case 'move':
      body = (
        <>
          {flips}
          {hint(hasSelection ? t('hint.moveSelection') : t('hint.moveLayer'))}
        </>
      );
      break;
  }

  return (
    <Section title={t(meta.label)} aside={<span className="muted">{meta.shortcut}</span>}>
      {body}
    </Section>
  );
}
