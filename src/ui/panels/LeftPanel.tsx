import { useEffect, useRef, useState } from 'react';
import { flatten } from '../../engine/composite';
import { useT } from '../../i18n';
import { useActions } from '../ActionsContext';
import { useEditor, useEditorState } from '../EditorContext';
import { Icon } from '../components/Icon';
import { IconButton } from '../components/IconButton';
import { openMenu } from '../components/Menu';
import { Section } from '../components/Section';
import { Thumbnail } from '../components/Thumbnail';
import { mainMenu } from '../menus';
import { openDialog } from '../uiStore';
import { PreviewSection } from './PreviewSection';

/** Inline rename on double-click, used by files and layers. */
function EditableName({
  value,
  onRename,
  className = 'item-name',
}: {
  value: string;
  onRename: (v: string) => void;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (editing) ref.current?.select();
  }, [editing]);
  if (!editing)
    return (
      <span className={className} onDoubleClick={() => setEditing(true)}>
        {value}
      </span>
    );
  const done = (save: boolean) => {
    if (save && ref.current) onRename(ref.current.value);
    setEditing(false);
  };
  return (
    <span className={className}>
      <input
        ref={ref}
        defaultValue={value}
        autoFocus
        onBlur={() => done(true)}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Enter') done(true);
          if (e.key === 'Escape') done(false);
        }}
      />
    </span>
  );
}

function FileHeader() {
  const t = useT();
  const editor = useEditor();
  const actions = useActions();
  const doc = useEditorState((s) => s.doc);
  // Renames mutate the document in place, so select the name itself to re-render on change.
  const docName = useEditorState((s) => s.doc.name);
  const [name, setName] = useState(docName);
  useEffect(() => setName(docName), [docName, doc.id]);
  return (
    <div className="panel-header">
      <button
        type="button"
        className="logo-button"
        aria-label={t('menu.main')}
        data-tip={t('menu.main')}
        aria-haspopup="menu"
        onClick={(e) => openMenu(e.currentTarget, mainMenu(editor, actions))}
      >
        <Icon name="logo" size={16} />
        <span className="caret">▾</span>
      </button>
      <div className="file-name">
        <input
          value={name}
          aria-label={t('file.name')}
          spellCheck={false}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => (name.trim() ? editor.renameFile(doc.id, name) : setName(docName))}
          onKeyDown={(e) =>
            (e.key === 'Enter' || e.key === 'Escape') && (e.target as HTMLInputElement).blur()
          }
        />
        <span className="muted">{t('file.size', { w: doc.width, h: doc.height })}</span>
      </div>
    </div>
  );
}

function FilesSection() {
  const t = useT();
  const editor = useEditor();
  const actions = useActions();
  const files = useEditorState((s) => s.files);
  const activeId = useEditorState((s) => s.activeId);
  const revision = useEditorState((s) => s.revision);
  const docs = editor.getDocuments();
  return (
    <Section
      title={t('section.files')}
      aside={<IconButton icon="plus" label={t('file.new')} onClick={() => openDialog({ type: 'newFile' })} />}
    >
      <div className="item-list files-list">
        {files.map((f) => {
          const doc = docs.find((d) => d.id === f.id)!;
          return (
            <div
              key={f.id}
              className={`item${f.id === activeId ? ' is-active' : ''}`}
              onClick={() => editor.switchFile(f.id)}
            >
              <Thumbnail
                pixels={() => flatten(doc)}
                width={f.width}
                height={f.height}
                version={f.id === activeId ? revision : 0}
              />
              <EditableName value={f.name} onRename={(v) => editor.renameFile(f.id, v)} />
              <span className="muted">
                {f.width}×{f.height}
              </span>
              <IconButton
                icon="more"
                className="icon-btn item-action"
                label={t('file.actions')}
                aria-haspopup="menu"
                onClick={(e) => {
                  e.stopPropagation();
                  openMenu(e.currentTarget, [
                    { label: t('file.duplicate'), onSelect: () => editor.duplicateFile(f.id) },
                    {
                      label: t('file.download'),
                      onSelect: () => (editor.switchFile(f.id), void actions.saveDocument()),
                    },
                    '-',
                    {
                      label: t('common.delete'),
                      disabled: files.length < 2,
                      onSelect: () => actions.confirmDeleteFile(f.id, f.name),
                    },
                  ]);
                }}
              />
            </div>
          );
        })}
      </div>
    </Section>
  );
}

function LayersSection() {
  const t = useT();
  const editor = useEditor();
  const doc = useEditorState((s) => s.doc);
  const revision = useEditorState((s) => s.revision);
  const layers = doc.layers.map((layer, index) => ({ layer, index })).reverse();
  const n = layers.length;
  const listRef = useRef<HTMLDivElement>(null);
  // Drag to reorder: `slot` is the gap (in display order, top first) where the layer would land.
  const [drag, setDrag] = useState<{ from: number; slot: number } | null>(null);
  const dragged = useRef(false);

  const startDrag = (e: React.PointerEvent, displayPos: number, index: number) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest('button, input')) return;
    const y0 = e.clientY;
    let started = false;
    const slotAt = (y: number) => {
      const items = [...(listRef.current?.querySelectorAll('.item') ?? [])];
      const k = items.findIndex((el) => {
        const r = el.getBoundingClientRect();
        return y < r.top + r.height / 2;
      });
      return k < 0 ? items.length : k;
    };
    const move = (ev: PointerEvent) => {
      if (!started && Math.abs(ev.clientY - y0) < 4) return;
      started = true;
      document.body.classList.add('is-dragging-layer');
      setDrag({ from: index, slot: slotAt(ev.clientY) });
    };
    const end = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      document.body.classList.remove('is-dragging-layer');
      setDrag(null);
      if (!started) return;
      dragged.current = true; // swallow the click that follows the drag
      const slot = slotAt(ev.clientY);
      const pos = slot > displayPos ? slot - 1 : slot;
      if (ev.type === 'pointerup') editor.reorderLayer(index, n - 1 - pos);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
  };
  // No indicator when dropping would not move the layer.
  const dropClass = (displayPos: number) => {
    if (!drag) return '';
    const from = n - 1 - drag.from;
    if (drag.slot === from || drag.slot === from + 1) return '';
    if (drag.slot === displayPos) return ' drop-before';
    if (drag.slot === n && displayPos === n - 1) return ' drop-after';
    return '';
  };
  return (
    <Section
      title={t('section.layers')}
      className="grow"
      aside={<IconButton icon="plus" label={t('layer.new')} onClick={() => editor.addLayer()} />}
    >
      <div className="item-list" ref={listRef}>
        {layers.map(({ layer, index }, displayPos) => (
          <div
            key={layer.id}
            className={`item${index === doc.activeLayer ? ' is-active' : ''}${layer.visible ? '' : ' is-hidden'}${
              drag?.from === index ? ' is-dragging' : ''
            }${dropClass(displayPos)}`}
            onPointerDown={(e) => startDrag(e, displayPos, index)}
            onClick={() => {
              if (dragged.current) dragged.current = false;
              else editor.setActiveLayer(index);
            }}
          >
            <Thumbnail pixels={() => layer.pixels} width={doc.width} height={doc.height} version={revision} />
            <EditableName value={layer.name} onRename={(v) => editor.renameLayer(index, v)} />
            {layer.opacity < 1 && <span className="muted">{Math.round(layer.opacity * 100)} %</span>}
            <IconButton
              icon={layer.visible ? 'eye' : 'eyeOff'}
              className="icon-btn item-action"
              label={layer.visible ? t('layer.hide') : t('layer.show')}
              onClick={(e) => {
                e.stopPropagation();
                editor.setLayerVisible(index, !layer.visible);
              }}
            />
          </div>
        ))}
      </div>
      <div className="layer-actions">
        <IconButton icon="duplicate" label={t('layer.duplicate')} onClick={() => editor.duplicateLayer()} />
        <IconButton
          icon="up"
          label={t('layer.moveUp')}
          disabled={doc.activeLayer >= doc.layers.length - 1}
          onClick={() => editor.moveLayer(1)}
        />
        <IconButton
          icon="down"
          label={t('layer.moveDown')}
          disabled={doc.activeLayer === 0}
          onClick={() => editor.moveLayer(-1)}
        />
        <IconButton
          icon="merge"
          label={t('layer.mergeDown')}
          disabled={doc.activeLayer === 0}
          onClick={() => editor.mergeDown()}
        />
        <span className="spacer" />
        <IconButton
          icon="trash"
          label={t('layer.delete')}
          disabled={doc.layers.length < 2}
          onClick={() => editor.deleteLayer()}
        />
      </div>
    </Section>
  );
}

export function LeftPanel() {
  const t = useT();
  return (
    <aside className="panel panel-left" aria-label={t('panel.left')}>
      <FileHeader />
      <FilesSection />
      <LayersSection />
      <PreviewSection />
    </aside>
  );
}
