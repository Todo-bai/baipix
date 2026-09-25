import { useEffect, useReducer, useRef, useState } from 'react';
import { pack } from '../../engine/color';
import { flatten } from '../../engine/composite';
import type { ToolId } from '../../engine/tools';
import { useT } from '../../i18n';
import { useActions } from '../ActionsContext';
import { useEditor, useEditorState } from '../EditorContext';
import { keyState } from '../keyState';
import { drawScene, LABEL, labelRect, type BrushPreview } from '../render/drawScene';
import { readTheme, type Theme } from '../render/theme';
import { BRUSH_TOOLS } from '../tools';
import { hoverStore, uiStore } from '../uiStore';
import { viewport } from '../viewport';

const DRAWING_TOOLS: ToolId[] = ['pencil', 'eraser', 'line', 'rect', 'ellipse', 'bucket', 'shade', 'blur'];
const SHAPE_TOOLS: ToolId[] = ['line', 'rect', 'ellipse'];

interface Pinch {
  distance: number;
  cx: number;
  cy: number;
  zoom: number;
  panX: number;
  panY: number;
}

export function CanvasView() {
  const editor = useEditor();
  const actions = useActions();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [dropping, setDropping] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const renamingRef = useRef(false);
  const redrawRef = useRef(() => {});
  const [, follow] = useReducer((n: number) => n + 1, 0);
  const tool = useEditorState((s) => s.tool);
  const docId = useEditorState((s) => s.doc.id);
  const docName = useEditorState((s) => s.doc.name);
  const t = useT();

  useEffect(() => {
    renamingRef.current = renaming;
    redrawRef.current();
    // Keep the field glued to the frame while zooming or panning.
    return renaming ? viewport.subscribe(follow) : undefined;
  }, [renaming]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const wrap = wrapRef.current!;
    const ctx = canvas.getContext('2d')!;
    const composite = document.createElement('canvas');
    const cctx = composite.getContext('2d')!;
    let theme: Theme = readTheme();
    let hover: { x: number; y: number } | null = null;
    let compositeDirty = true;
    let frame = 0;
    let panStart: { x: number; y: number; panX: number; panY: number } | null = null;
    let pinch: Pinch | null = null;
    const pointers = new Map<number, { x: number; y: number; touch: boolean }>();

    const updateComposite = () => {
      const { doc } = editor.getLive();
      if (composite.width !== doc.width || composite.height !== doc.height) {
        composite.width = doc.width;
        composite.height = doc.height;
      }
      const image = cctx.createImageData(doc.width, doc.height);
      new Uint32Array(image.data.buffer).set(flatten(doc));
      cctx.putImageData(image, 0, 0);
      compositeDirty = false;
    };

    const draw = () => {
      frame = 0;
      if (compositeDirty) updateComposite();
      const live = editor.getLive();
      const state = editor.getState();
      const tool = state.tool;
      let brush: BrushPreview | null = null;
      const shapeInProgress = live.stroking !== null && SHAPE_TOOLS.includes(live.stroking);
      if (hover && !panStart && !pinch && BRUSH_TOOLS.includes(tool) && !shapeInProgress) {
        const paints = tool !== 'eraser' && tool !== 'shade' && tool !== 'blur';
        brush = { at: hover, size: state.options.size, color: paints ? state.primary : null };
      }
      drawScene(
        ctx,
        canvas.width,
        canvas.height,
        {
          doc: live.doc,
          composite,
          view: live.view,
          selection: live.selection,
          brush,
          label: renamingRef.current ? '' : live.doc.name,
        },
        camera(),
        theme,
      );
    };

    const camera = () => ({
      dpr: viewport.dpr,
      scale: viewport.scale,
      originX: viewport.originX,
      originY: viewport.originY,
    });
    const onLabel = (l: { x: number; y: number }) => {
      const r = labelRect(ctx, editor.getState().doc.name, camera());
      const x = l.x * viewport.dpr;
      const y = l.y * viewport.dpr;
      return x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
    };

    const request = () => {
      if (!frame) frame = requestAnimationFrame(draw);
    };
    redrawRef.current = request;
    const pixelsChanged = () => {
      compositeDirty = true;
      request();
    };

    const resize = () => {
      const r = wrap.getBoundingClientRect();
      viewport.setSize(r.width, r.height, r.left, r.top);
      // Resizing clears the canvas, so skip it when nothing changed and redraw right away
      // (not on the next frame): otherwise a blank frame flashes while dragging a panel.
      const w = Math.max(1, Math.round(r.width * viewport.dpr));
      const h = Math.max(1, Math.round(r.height * viewport.dpr));
      if (canvas.width !== w) canvas.width = w;
      if (canvas.height !== h) canvas.height = h;
      cancelAnimationFrame(frame);
      draw();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const onTheme = () => {
      theme = readTheme();
      request();
    };
    const media = matchMedia('(prefers-color-scheme: dark)');
    media.addEventListener('change', onTheme);
    const mo = new MutationObserver(onTheme);
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'class', 'style'],
    });

    const unsubs = [
      editor.onPixels(pixelsChanged),
      viewport.subscribe(request),
      editor.subscribe(() => viewport.showDocument(editor.getState().doc)),
    ];
    viewport.showDocument(editor.getState().doc);

    const local = (e: { clientX: number; clientY: number }) => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };

    const updateHover = (p: { x: number; y: number } | null) => {
      hover = p;
      const doc = editor.getLive().doc;
      if (!p || p.x < 0 || p.y < 0 || p.x >= doc.width || p.y >= doc.height) {
        hoverStore.set({ x: null, y: null, color: null });
        return;
      }
      if (compositeDirty) updateComposite();
      const d = cctx.getImageData(p.x, p.y, 1, 1).data;
      hoverStore.set({ x: p.x, y: p.y, color: d[3] ? pack(d[0], d[1], d[2], d[3]) : null });
    };

    const touches = () => [...pointers.values()].filter((p) => p.touch);
    const pinchInfo = () => {
      const [a, b] = touches();
      const r = canvas.getBoundingClientRect();
      return {
        distance: Math.hypot(a.x - b.x, a.y - b.y),
        cx: (a.x + b.x) / 2 - r.left,
        cy: (a.y + b.y) / 2 - r.top,
      };
    };

    const onDown = (e: PointerEvent) => {
      canvas.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, touch: e.pointerType === 'touch' });
      if (e.pointerType === 'touch' && touches().length >= 2) {
        editor.cancelStroke();
        pinch = { ...pinchInfo(), zoom: viewport.zoom, panX: viewport.panX, panY: viewport.panY };
        updateHover(null);
        return;
      }
      if (pinch) return;
      if (e.button === 1 || keyState.space) {
        panStart = { x: e.clientX, y: e.clientY, panX: viewport.panX, panY: viewport.panY };
        canvas.style.cursor = 'grabbing';
        e.preventDefault();
        return;
      }
      if (e.button !== 0 && e.button !== 2) return;
      const l = local(e);
      // The frame name is renamed by double-click, so clicking it never draws.
      if (onLabel(l)) return;
      const p = viewport.toPixel(l.x, l.y);
      updateHover(p);
      const tool = editor.getState().tool;
      const override = e.altKey && DRAWING_TOOLS.includes(tool) ? 'picker' : undefined;
      editor.beginStroke(p, e.button === 2, { shift: e.shiftKey }, override);
    };

    const onMove = (e: PointerEvent) => {
      if (pointers.has(e.pointerId))
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, touch: e.pointerType === 'touch' });
      if (pinch) {
        const info = pinchInfo();
        const zoom = Math.min(96, Math.max(1, (pinch.zoom * info.distance) / Math.max(1, pinch.distance)));
        const px = (pinch.cx - pinch.panX) / pinch.zoom;
        const py = (pinch.cy - pinch.panY) / pinch.zoom;
        viewport.set({ zoom, panX: info.cx - px * zoom, panY: info.cy - py * zoom });
        pinch = { ...pinch, cx: pinch.cx, cy: pinch.cy };
        return;
      }
      if (panStart) {
        viewport.set({
          zoom: viewport.zoom,
          panX: panStart.panX + e.clientX - panStart.x,
          panY: panStart.panY + e.clientY - panStart.y,
        });
        return;
      }
      const events = editor.isStroking && e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      for (const ev of events.length ? events : [e]) {
        const l = local(ev);
        const p = viewport.toPixel(l.x, l.y);
        if (editor.isStroking) editor.moveStroke(p, { shift: ev.shiftKey });
        hover = p;
      }
      updateHover(hover);
      if (!editor.isStroking) canvas.classList.toggle('on-label', onLabel(local(e)));
      request();
    };

    const onUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (pinch) {
        if (touches().length < 2) {
          const info = { cx: pinch.cx, cy: pinch.cy };
          pinch = null;
          viewport.settle(info.cx, info.cy);
        }
        return;
      }
      if (panStart) {
        panStart = null;
        canvas.style.cursor = '';
        return;
      }
      editor.endStroke();
    };

    const onCancel = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      editor.cancelStroke();
      panStart = null;
      pinch = null;
    };

    const onLeave = (e: PointerEvent) => {
      if (e.pointerType !== 'touch' && !editor.isStroking) {
        updateHover(null);
        request();
      }
    };

    let wheelAccumulator = 0;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const l = local(e);
      if (e.shiftKey && !e.ctrlKey) return viewport.panBy(-(e.deltaY || e.deltaX), 0);
      if (!e.ctrlKey && Math.abs(e.deltaX) > Math.abs(e.deltaY) * 1.2) return viewport.panBy(-e.deltaX, 0);
      wheelAccumulator += e.deltaMode === 1 ? e.deltaY * 30 : e.deltaY;
      const threshold = e.ctrlKey ? 12 : 50;
      while (Math.abs(wheelAccumulator) >= threshold) {
        viewport.step(wheelAccumulator < 0 ? 1 : -1, l.x, l.y);
        wheelAccumulator -= Math.sign(wheelAccumulator) * threshold;
      }
    };

    // Tapping the canvas closes the mobile sheets instead of drawing.
    const closeSheets = (e: PointerEvent) => {
      if (uiStore.get().sheet) {
        e.stopPropagation();
        uiStore.set({ sheet: null });
      }
    };

    const noMenu = (e: Event) => e.preventDefault();
    const onDoubleClick = (e: MouseEvent) => onLabel(local(e)) && setRenaming(true);
    wrap.addEventListener('pointerdown', closeSheets, true);
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onCancel);
    canvas.addEventListener('pointerleave', onLeave);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('contextmenu', noMenu);
    canvas.addEventListener('dblclick', onDoubleClick);

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      mo.disconnect();
      media.removeEventListener('change', onTheme);
      unsubs.forEach((u) => u());
      wrap.removeEventListener('pointerdown', closeSheets, true);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onCancel);
      canvas.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('contextmenu', noMenu);
      canvas.removeEventListener('dblclick', onDoubleClick);
    };
  }, [editor]);

  return (
    <div
      ref={wrapRef}
      className={`canvas-wrap${dropping ? ' is-dropping' : ''}`}
      data-tool={tool}
      data-drop-label={t('canvas.drop')}
      onDragOver={(e) => {
        e.preventDefault();
        setDropping(true);
      }}
      onDragLeave={() => setDropping(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDropping(false);
        const file = e.dataTransfer.files[0];
        if (file) void actions.importImage(file);
      }}
    >
      <canvas ref={canvasRef} className="canvas" />
      {renaming && (
        <input
          className="frame-name-input"
          defaultValue={docName}
          autoFocus
          onFocus={(e) => e.currentTarget.select()}
          style={{
            left: viewport.originX / viewport.dpr,
            top: viewport.originY / viewport.dpr - LABEL.gap,
          }}
          onBlur={(e) => {
            editor.renameFile(docId, e.currentTarget.value);
            setRenaming(false);
          }}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Enter') e.currentTarget.blur();
            if (e.key === 'Escape') {
              e.currentTarget.value = docName;
              e.currentTarget.blur();
            }
          }}
        />
      )}
    </div>
  );
}
