import { useState } from 'react';
import { MAX_SIZE } from '../../engine/document';
import { clamp } from '../../engine/math';
import { parseHexList } from '../../engine/palette';
import { useT } from '../../i18n';
import { useEditor } from '../EditorContext';
import { closeDialog, toast, uiStore } from '../uiStore';
import { Dialog } from './Dialog';
import { SHORTCUT_GROUPS } from './shortcuts';

const SIZE_PRESETS = [8, 16, 24, 32, 48, 64, 128, 256];

function NewFileDialog() {
  const t = useT();
  const editor = useEditor();
  const doc = editor.getState().doc;
  const [w, setW] = useState(String(doc.width));
  const [h, setH] = useState(String(doc.height));
  return (
    <Dialog
      title={t('dialog.newFile')}
      submitLabel={t('common.create')}
      onClose={closeDialog}
      onSubmit={() =>
        editor.newFile(clamp(Number(w) || 32, 1, MAX_SIZE), clamp(Number(h) || 32, 1, MAX_SIZE))
      }
    >
      <div className="chips">
        {SIZE_PRESETS.map((s) => (
          <button
            key={s}
            type="button"
            className="chip"
            aria-pressed={Number(w) === s && Number(h) === s}
            onClick={() => (setW(String(s)), setH(String(s)))}
          >
            {s} × {s}
          </button>
        ))}
      </div>
      <div className="two-columns">
        <label className="field">
          <span className="field-label">W</span>
          <input
            type="number"
            min={1}
            max={MAX_SIZE}
            value={w}
            onChange={(e) => setW(e.target.value)}
            aria-label={t('canvas.width')}
            required
          />
        </label>
        <label className="field">
          <span className="field-label">H</span>
          <input
            type="number"
            min={1}
            max={MAX_SIZE}
            value={h}
            onChange={(e) => setH(e.target.value)}
            aria-label={t('canvas.height')}
            required
          />
        </label>
      </div>
      <p className="muted">{t('dialog.newFileHint')}</p>
    </Dialog>
  );
}

function PaletteImportDialog() {
  const t = useT();
  const editor = useEditor();
  const [text, setText] = useState('');
  const [mode, setMode] = useState<'replace' | 'append'>('replace');
  return (
    <Dialog
      title={t('palette.paste')}
      submitLabel={t('dialog.useColors')}
      onClose={closeDialog}
      onSubmit={() => {
        const colors = parseHexList(text);
        if (!colors.length) return toast(t('toast.noHex'));
        editor.setPaletteColors(
          mode === 'replace' ? colors : [...editor.getState().palette.colors, ...colors],
        );
        toast(t('toast.colorsImported', { count: colors.length }));
      }}
    >
      <p className="muted">{t('dialog.pasteColorsHint')}</p>
      <textarea
        className="textarea"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="1a1c2c 5d275d b13e53 ef7d57"
        spellCheck={false}
      />
      <div className="radios">
        <label>
          <input type="radio" checked={mode === 'replace'} onChange={() => setMode('replace')} />{' '}
          {t('dialog.replacePalette')}
        </label>
        <label>
          <input type="radio" checked={mode === 'append'} onChange={() => setMode('append')} />{' '}
          {t('dialog.appendPalette')}
        </label>
      </div>
    </Dialog>
  );
}

function ShortcutsDialog() {
  const t = useT();
  return (
    <Dialog title={t('menu.shortcuts')} submitLabel={t('common.close')} onClose={closeDialog} hideCancel>
      <div className="shortcuts">
        {SHORTCUT_GROUPS.map((group) => (
          <div key={group.title}>
            <h3>{t(group.title)}</h3>
            {group.items.map(([label, keys]) => (
              <div key={label} className="shortcut">
                <span>{t(label)}</span>
                <kbd>{keys}</kbd>
              </div>
            ))}
          </div>
        ))}
      </div>
    </Dialog>
  );
}

/** Renders the active dialog from the UI store. */
export function Dialogs() {
  const t = useT();
  const dialog = uiStore.use((s) => s.dialog);
  if (!dialog) return null;
  switch (dialog.type) {
    case 'newFile':
      return <NewFileDialog />;
    case 'paletteImport':
      return <PaletteImportDialog />;
    case 'shortcuts':
      return <ShortcutsDialog />;
    case 'confirm':
      return (
        <Dialog
          title={dialog.title}
          submitLabel={dialog.confirmLabel}
          onClose={closeDialog}
          onSubmit={dialog.onConfirm}
        >
          <p className="muted">{dialog.message}</p>
        </Dialog>
      );
    case 'output':
      return (
        <Dialog title={dialog.title} submitLabel={t('common.close')} onClose={closeDialog} hideCancel>
          <p className="muted">{dialog.message}</p>
          {dialog.image && <img className="output-image" src={dialog.image} alt="" />}
          {dialog.text && (
            <textarea
              className="textarea"
              readOnly
              value={dialog.text}
              onFocus={(e) => e.target.select()}
              autoFocus
            />
          )}
        </Dialog>
      );
  }
}
