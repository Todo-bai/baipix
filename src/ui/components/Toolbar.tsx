import { Fragment, useEffect, useState } from 'react';
import type { ToolId } from '../../engine/tools';
import { useT } from '../../i18n';
import { useEditor, useEditorState } from '../EditorContext';
import { SHAPES, SHAPE_IDS, TOOL_GROUPS, toolMeta } from '../tools';
import { IconButton } from './IconButton';
import { openMenu } from './Menu';

/** One button for all shapes: it picks the last shape used, the caret opens the list. */
function ShapesButton() {
  const t = useT();
  const editor = useEditor();
  const tool = useEditorState((s) => s.tool);
  const [last, setLast] = useState<ToolId>('rect');
  useEffect(() => {
    if (SHAPE_IDS.includes(tool)) setLast(tool);
  }, [tool]);
  const meta = toolMeta(last);
  return (
    <div className="tool-split">
      <IconButton
        className="tool-btn"
        icon={meta.icon}
        iconSize={20}
        label={t(meta.label)}
        shortcut={meta.shortcut || undefined}
        pressed={SHAPE_IDS.includes(tool)}
        onClick={() => editor.setTool(last)}
      />
      <IconButton
        className="tool-caret"
        icon="caret"
        iconSize={12}
        label={t('toolbar.shapes')}
        aria-haspopup="menu"
        onClick={(e) =>
          openMenu(
            e.currentTarget,
            SHAPES.map((s) => ({
              label: t(s.label),
              icon: s.icon,
              shortcut: s.shortcut || undefined,
              checked: tool === s.id,
              onSelect: () => editor.setTool(s.id),
            })),
          )
        }
      />
    </div>
  );
}

/** Floating bottom toolbar. */
export function Toolbar() {
  const t = useT();
  const editor = useEditor();
  const tool = useEditorState((s) => s.tool);
  const canUndo = useEditorState((s) => s.canUndo);
  const canRedo = useEditorState((s) => s.canRedo);
  return (
    <div className="toolbar" role="toolbar" aria-label={t('toolbar.label')}>
      {TOOL_GROUPS.map((group, i) => (
        <Fragment key={i}>
          {i > 0 && <div className="toolbar-divider" />}
          {group === SHAPES ? (
            <ShapesButton />
          ) : (
            group.map((meta) => (
              <IconButton
                key={meta.id}
                className="tool-btn"
                icon={meta.icon}
                iconSize={20}
                label={t(meta.label)}
                shortcut={meta.shortcut}
                pressed={tool === meta.id}
                onClick={() => editor.setTool(meta.id)}
              />
            ))
          )}
        </Fragment>
      ))}
      <div className="toolbar-divider" />
      <IconButton
        className="tool-btn"
        icon="undo"
        iconSize={20}
        label={t('menu.undo')}
        shortcut="Ctrl+Z"
        disabled={!canUndo}
        onClick={() => editor.undo()}
      />
      <IconButton
        className="tool-btn"
        icon="redo"
        iconSize={20}
        label={t('menu.redo')}
        shortcut="Ctrl+Shift+Z"
        disabled={!canRedo}
        onClick={() => editor.redo()}
      />
    </div>
  );
}
