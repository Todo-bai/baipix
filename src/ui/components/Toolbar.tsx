import { Fragment } from 'react';
import { useT } from '../../i18n';
import { useEditor, useEditorState } from '../EditorContext';
import { TOOL_GROUPS } from '../tools';
import { IconButton } from './IconButton';

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
          {group.map((meta) => (
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
          ))}
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
