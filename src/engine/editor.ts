import { adjustColor, alpha, opaque, type Color, type ColorAdjustment } from './color';
import { flatten, mergeLayerInto, type FlattenOptions } from './composite';
import {
  activeLayer,
  cloneDocument,
  cloneLayer,
  createDocument,
  createLayer,
  MAX_SIZE,
  resizeDocument,
  type Layer,
  type PixelDoc,
  type RenderSettings,
} from './document';
import { History, takeSnapshot, type Snapshot } from './history';
import { clamp, clipRect, type Point, type Rect } from './math';
import { PaletteIndex, hueShiftedRamp, presetColors, sortByLightness } from './palette';
import { extractBlock, fillRect, flipRect, rotateRect, uniqueColors, type PixelBlock } from './region';
import {
  DEFAULT_TOOL_OPTIONS,
  TOOLS,
  type Modifiers,
  type Stroke,
  type ToolId,
  type ToolOptions,
} from './tools';
import { applyMove, beginMove } from './tools/move';
import { strokeColors } from './tools/paint';

export interface ViewSettings {
  grid: boolean;
  tile: boolean;
  mirrorX: boolean;
  mirrorY: boolean;
}

export interface PaletteState {
  /** Preset key, or 'custom'. */
  key: string;
  colors: Color[];
  custom: Color[] | null;
}

export interface FileInfo {
  id: string;
  name: string;
  width: number;
  height: number;
  /** Last change, in ms since the epoch. */
  updatedAt: number;
}

/** Immutable snapshot consumed by the UI. A new object is created on every change. */
export interface EditorState {
  files: FileInfo[];
  activeId: string;
  /** The active document. Its pixel buffers are mutable; rely on `revision` to detect changes. */
  doc: PixelDoc;
  selection: Rect | null;
  tool: ToolId;
  options: ToolOptions;
  primary: Color;
  secondary: Color;
  palette: PaletteState;
  /** Last colors painted with, most recent first. */
  recent: Color[];
  view: ViewSettings;
  /** Ids of the selected layers, bottom to top. Always includes the active layer. */
  selectedLayers: string[];
  canUndo: boolean;
  canRedo: boolean;
  revision: number;
}

/** Names the engine needs, injected by the UI so they can be translated. */
export interface EditorLabels {
  layer: (n: number) => string;
  copyOf: (name: string) => string;
  untitled: (n: number) => string;
  pasted: string;
}

export type Notice =
  | { type: 'layerHidden' }
  | { type: 'layerLocked' }
  | { type: 'colorInPalette' }
  | { type: 'colorNotInPalette' }
  | { type: 'emptyDrawing' }
  | { type: 'rampAdded'; count: number }
  | { type: 'extracted'; count: number }
  | { type: 'pasted' }
  | { type: 'merged' };

export interface Preferences {
  tool: ToolId;
  options: ToolOptions;
  primary: Color;
  secondary: Color;
  palette: PaletteState;
  recent: Color[];
  view: ViewSettings;
}

interface Session {
  doc: PixelDoc;
  history: History;
  selection: Rect | null;
  /** Ids of the selected layers (always including the active one), and where a Shift+click range starts. */
  picked?: string[];
  anchor?: string;
}

/** What the last delete removed, so it can be brought back (the toast's Undo button). */
type Deleted =
  | { kind: 'file'; session: Session; index: number }
  | { kind: 'layer'; session: Session; layer: Layer; index: number }
  | { kind: 'layers'; session: Session; entries: { layer: Layer; index: number }[] };

type Listener = () => void;

/** How many recent colors are kept. */
export const RECENT_COLORS = 8;

const DEFAULT_LABELS: EditorLabels = {
  layer: (n) => `Layer ${n}`,
  copyOf: (name) => `${name} copy`,
  untitled: (n) => (n > 1 ? `Untitled ${n}` : 'Untitled'),
  pasted: 'Pasted',
};

export class Editor {
  private sessions: Session[] = [];
  private active!: Session;
  private tool: ToolId = 'pencil';
  private options: ToolOptions = { ...DEFAULT_TOOL_OPTIONS };
  private primary: Color;
  private secondary: Color;
  private palette: PaletteState;
  private paletteIndex: PaletteIndex;
  private view: ViewSettings = { grid: true, tile: false, mirrorX: false, mirrorY: false };
  private clipboard: PixelBlock | null = null;
  private stroke: Stroke | null = null;
  /** Color adjustment in progress: the original pixels of the layers being adjusted. */
  private adjusting: { layers: { id: string; base: Uint32Array }[]; rect: Rect } | null = null;
  private strokeTool: ToolId | null = null;
  private opacityChange = false;
  private deleted: Deleted | null = null;
  private recent: Color[] = [];
  private revision = 0;
  private state!: EditorState;

  private listeners = new Set<Listener>();
  private pixelListeners = new Set<Listener>();
  private persistListeners = new Set<Listener>();
  private noticeListeners = new Set<(n: Notice) => void>();

  constructor(private labels: EditorLabels = DEFAULT_LABELS) {
    const colors = presetColors('sweetie16');
    this.palette = { key: 'sweetie16', colors, custom: null };
    this.paletteIndex = new PaletteIndex(colors);
    this.primary = colors[0];
    this.secondary = colors[12];
    this.addSession(createDocument(labels.untitled(1), 32, 32, labels.layer(1)));
    this.refresh();
  }

  /* ------------------------------------------------------------------ subscriptions */

  getState = (): EditorState => this.state;

  /** Live document and selection, updated during strokes (the state snapshot is not). */
  getLive = (): { doc: PixelDoc; selection: Rect | null; view: ViewSettings; stroking: ToolId | null } => ({
    doc: this.active.doc,
    selection: this.active.selection,
    view: this.view,
    stroking: this.strokeTool,
  });

  /** UI state changes (not fired on every pointer move while drawing). */
  subscribe = (listener: Listener): (() => void) => this.on(this.listeners, listener);
  /** Pixel or selection changes, fired continuously while drawing. For the canvas renderer. */
  onPixels = (listener: Listener): (() => void) => this.on(this.pixelListeners, listener);
  /** Anything worth saving changed. */
  onPersist = (listener: Listener): (() => void) => this.on(this.persistListeners, listener);
  onNotice = (listener: (n: Notice) => void): (() => void) => this.on(this.noticeListeners, listener);

  setLabels(labels: EditorLabels): void {
    this.labels = labels;
  }

  private on<T>(set: Set<T>, listener: T): () => void {
    set.add(listener);
    return () => set.delete(listener);
  }

  private notice(n: Notice): void {
    this.noticeListeners.forEach((l) => l(n));
  }

  private refresh(): void {
    const s = this.active;
    this.revision++;
    // Keep the layer selection valid: existing layers only, and always the active one.
    const active = activeLayer(s.doc).id;
    const ids = s.doc.layers.map((l) => l.id);
    const picked = ids.filter((id) => s.picked?.includes(id));
    s.picked = picked.includes(active) ? picked : [active];
    this.state = {
      files: this.sessions.map(({ doc }) => ({
        id: doc.id,
        name: doc.name,
        width: doc.width,
        height: doc.height,
        updatedAt: doc.updatedAt ?? 0,
      })),
      activeId: s.doc.id,
      doc: s.doc,
      selection: s.selection,
      tool: this.tool,
      options: this.options,
      primary: this.primary,
      secondary: this.secondary,
      palette: this.palette,
      recent: this.recent,
      view: this.view,
      selectedLayers: s.picked,
      canUndo: s.history.canUndo,
      canRedo: s.history.canRedo,
      revision: this.revision,
    };
  }

  /** Publishes a change. `persist` is false for pure UI changes that don't need saving. */
  private commit(persist = true): void {
    this.refresh();
    this.listeners.forEach((l) => l());
    this.pixelListeners.forEach((l) => l());
    if (persist) this.persistListeners.forEach((l) => l());
  }

  private pixelsChanged(): void {
    this.pixelListeners.forEach((l) => l());
  }

  /* ------------------------------------------------------------------ history */

  private get doc(): PixelDoc {
    return this.active.doc;
  }

  private checkpoint(): void {
    this.active.history.push(takeSnapshot(this.doc, this.active.selection));
    this.touch();
  }

  /** Dates the active file's last change. */
  private touch(): void {
    this.doc.updatedAt = Date.now();
  }

  private restore(snapshot: Snapshot): void {
    this.active.doc = snapshot.doc;
    this.active.selection = snapshot.selection;
  }

  undo(): void {
    if (this.stroke || this.adjusting) return;
    const prev = this.active.history.undo(takeSnapshot(this.doc, this.active.selection));
    if (prev) {
      this.forgetDeletedLayer();
      this.restore(prev);
      this.touch();
      this.commit();
    }
  }

  redo(): void {
    if (this.stroke || this.adjusting) return;
    const next = this.active.history.redo(takeSnapshot(this.doc, this.active.selection));
    if (next) {
      this.forgetDeletedLayer();
      this.restore(next);
      this.touch();
      this.commit();
    }
  }

  /** Undo and redo swap whole snapshots, which may bring the deleted layer back on their own. */
  private forgetDeletedLayer(): void {
    const d = this.deleted;
    if (d && d.kind !== 'file' && d.session === this.active) this.deleted = null;
  }

  /** Runs a document mutation as one undoable step. */
  private edit(mutate: (doc: PixelDoc) => void): void {
    this.checkpoint();
    mutate(this.doc);
    this.commit();
  }

  /* ------------------------------------------------------------------ files */

  private addSession(doc: PixelDoc): Session {
    const session: Session = { doc, history: new History(), selection: null };
    this.sessions.push(session);
    this.active = session;
    return session;
  }

  private nextUntitled(): string {
    const names = new Set(this.sessions.map((s) => s.doc.name));
    let n = this.sessions.length + 1;
    while (names.has(this.labels.untitled(n))) n++;
    return this.labels.untitled(n);
  }

  newFile(width: number, height: number, name = this.nextUntitled()): void {
    this.cancelStroke();
    const w = clamp(Math.round(width), 1, MAX_SIZE);
    const h = clamp(Math.round(height), 1, MAX_SIZE);
    this.addSession(createDocument(name, w, h, this.labels.layer(1)));
    this.commit();
  }

  /** Adds an existing document (import, open file). */
  addDocument(doc: PixelDoc): void {
    this.cancelStroke();
    doc.updatedAt = Date.now();
    this.addSession(doc);
    this.commit();
  }

  /** Replaces every file, e.g. when restoring a saved workspace. */
  loadDocuments(docs: PixelDoc[], activeId?: string): void {
    if (!docs.length) return;
    this.cancelStroke();
    const now = Date.now();
    docs.forEach((doc) => (doc.updatedAt ??= now));
    this.sessions = docs.map((doc) => ({ doc, history: new History(), selection: null }));
    this.deleted = null;
    this.active = this.sessions.find((s) => s.doc.id === activeId) ?? this.sessions[0];
    this.commit(false);
  }

  getDocuments(): PixelDoc[] {
    return this.sessions.map((s) => s.doc);
  }

  switchFile(id: string): void {
    const target = this.sessions.find((s) => s.doc.id === id);
    if (!target || target === this.active) return;
    this.cancelStroke();
    this.cancelAdjust();
    this.active = target;
    this.commit();
  }

  renameFile(id: string, name: string): void {
    const s = this.sessions.find((x) => x.doc.id === id);
    const clean = name.trim().slice(0, 120);
    if (!s || !clean || clean === s.doc.name) return;
    s.doc.name = clean;
    s.doc.updatedAt = Date.now();
    this.commit();
  }

  duplicateFile(id: string): void {
    const i = this.sessions.findIndex((x) => x.doc.id === id);
    if (i < 0) return;
    this.cancelStroke();
    const copy = cloneDocument(this.sessions[i].doc, false);
    copy.name = this.labels.copyOf(copy.name);
    copy.updatedAt = Date.now();
    const session: Session = { doc: copy, history: new History(), selection: null };
    this.sessions.splice(i + 1, 0, session);
    this.active = session;
    this.commit();
  }

  /**
   * Returns false when nothing was deleted. The file can be brought back with `restoreDeleted`.
   * The editor always holds a file: deleting the last one leaves a blank one in its place.
   */
  deleteFile(id: string): boolean {
    const i = this.sessions.findIndex((x) => x.doc.id === id);
    if (i < 0) return false;
    this.cancelStroke();
    if (this.sessions.length === 1) {
      const { width, height } = this.sessions[0].doc;
      this.sessions.push({
        doc: createDocument(this.labels.untitled(1), width, height, this.labels.layer(1)),
        history: new History(),
        selection: null,
      });
    }
    const [removed] = this.sessions.splice(i, 1);
    if (removed === this.active) this.active = this.sessions[Math.max(0, i - 1)];
    this.deleted = { kind: 'file', session: removed, index: i };
    this.commit();
    return true;
  }

  /** Removes a file for good, without offering to bring it back (the home screen's blank file). */
  discardFile(id: string): void {
    const i = this.sessions.findIndex((x) => x.doc.id === id);
    if (i < 0 || this.sessions.length < 2) return;
    this.cancelStroke();
    const [removed] = this.sessions.splice(i, 1);
    if (removed === this.active) this.active = this.sessions[Math.max(0, i - 1)];
    this.commit();
  }

  /**
   * Brings back the last deleted file (with its history) or layer, and makes it active.
   * Returns false when it can't anymore: already restored, its file is gone, or the canvas was resized.
   */
  restoreDeleted(): boolean {
    const d = this.deleted;
    if (!d) return false;
    this.deleted = null;
    this.cancelStroke();
    if (d.kind === 'file') {
      this.sessions.splice(Math.min(d.index, this.sessions.length), 0, d.session);
      this.active = d.session;
      this.commit();
      return true;
    }
    const { width, height } = d.session.doc;
    const entries = d.kind === 'layer' ? [{ layer: d.layer, index: d.index }] : d.entries;
    if (!this.sessions.includes(d.session) || entries.some((x) => x.layer.pixels.length !== width * height))
      return false;
    this.cancelAdjust();
    this.active = d.session;
    this.edit((doc) => {
      // Lowest first, so each layer lands back at its own index.
      for (const { layer, index } of entries) doc.layers.splice(Math.min(index, doc.layers.length), 0, layer);
      doc.activeLayer = doc.layers.indexOf(entries[entries.length - 1].layer);
      this.active.picked = entries.map((x) => x.layer.id);
    });
    return true;
  }

  /* ------------------------------------------------------------------ document */

  resize(width: number, height: number): void {
    const w = clamp(Math.round(width) || this.doc.width, 1, MAX_SIZE);
    const h = clamp(Math.round(height) || this.doc.height, 1, MAX_SIZE);
    if (w === this.doc.width && h === this.doc.height) return;
    this.edit((doc) => {
      resizeDocument(doc, w, h);
      this.active.selection = null;
    });
  }

  setBackground(color: Color, visible = true): void {
    this.edit((doc) => {
      doc.background = color;
      doc.backgroundVisible = visible;
    });
  }

  /** Live background color edits (color picker drags) without an undo step per move. */
  previewBackground(color: Color): void {
    this.doc.background = color;
    this.commit();
  }

  /**
   * Moves a symmetry axis, snapped to half pixels and kept on the canvas. `null`, or the center,
   * puts it back in the middle.
   */
  setMirrorAxis(axis: 'x' | 'y', value: number | null): void {
    const doc = this.doc;
    const size = axis === 'x' ? doc.width : doc.height;
    const key = axis === 'x' ? 'axisX' : 'axisY';
    const next = value === null ? size / 2 : Math.min(size, Math.max(0, Math.round(value * 2) / 2));
    if (next === (doc[key] ?? size / 2)) return;
    if (next === size / 2) delete doc[key];
    else doc[key] = next;
    this.commit();
  }

  setRender(render: Partial<RenderSettings>): void {
    this.doc.render = {
      pixelSize: clamp(render.pixelSize ?? this.doc.render.pixelSize, 1, 64),
      gap: clamp(render.gap ?? this.doc.render.gap, 0, 64),
    };
    this.commit();
  }

  flatten(options?: FlattenOptions): Uint32Array {
    return flatten(this.doc, options);
  }

  /* ------------------------------------------------------------------ layers */

  /**
   * The layer the Move tool takes at pixel `p`: the top visible, unlocked layer with a pixel there.
   * -1 when there is none, or with a selection (the selection moves instead).
   */
  layerAt(p: Point): number {
    const { width, height, layers } = this.doc;
    if (this.active.selection || p.x < 0 || p.y < 0 || p.x >= width || p.y >= height) return -1;
    const i = p.y * width + p.x;
    for (let k = layers.length - 1; k >= 0; k--) {
      const l = layers[k];
      if (l.visible && !l.locked && l.opacity > 0 && l.pixels[i] >>> 24) return k;
    }
    return -1;
  }

  setActiveLayer(index: number): void {
    if (index < 0 || index >= this.doc.layers.length) return;
    const id = this.doc.layers[index].id;
    if (index === this.doc.activeLayer && this.active.picked?.length === 1) return;
    this.doc.activeLayer = index;
    this.active.picked = [id];
    this.active.anchor = id;
    this.commit();
  }

  /**
   * Layer list clicks: `single` selects one layer, `toggle` (Cmd/Ctrl+click) adds or removes one,
   * `range` (Shift+click) selects every layer from the last clicked one. The clicked layer becomes
   * the active one, except when it's toggled off.
   */
  selectLayer(index: number, mode: 'single' | 'toggle' | 'range'): void {
    const layers = this.doc.layers;
    if (!layers[index]) return;
    if (mode === 'single') return this.setActiveLayer(index);
    const id = layers[index].id;
    const picked = this.state.selectedLayers;
    if (mode === 'toggle') {
      if (picked.includes(id)) {
        if (picked.length === 1) return;
        const rest = picked.filter((x) => x !== id);
        this.active.picked = rest;
        if (layers[this.doc.activeLayer].id === id)
          this.doc.activeLayer = layers.findIndex((l) => l.id === rest[rest.length - 1]);
      } else {
        this.active.picked = [...picked, id];
        this.doc.activeLayer = index;
      }
      this.active.anchor = id;
    } else {
      const from = layers.findIndex((l) => l.id === this.active.anchor);
      const start = from < 0 ? this.doc.activeLayer : from;
      const [lo, hi] = start < index ? [start, index] : [index, start];
      this.active.picked = layers.slice(lo, hi + 1).map((l) => l.id);
      this.doc.activeLayer = index;
    }
    this.commit(false);
  }

  /** Selected layers, bottom to top. */
  private pickedLayers(): Layer[] {
    const picked = this.state.selectedLayers;
    return this.doc.layers.filter((l) => picked.includes(l.id));
  }

  addLayer(): void {
    this.edit((doc) => {
      doc.layerCounter += 1;
      doc.layers.splice(
        doc.activeLayer + 1,
        0,
        createLayer(this.labels.layer(doc.layerCounter), doc.width, doc.height),
      );
      doc.activeLayer += 1;
    });
  }

  duplicateLayer(): void {
    this.edit((doc) => {
      const copy = cloneLayer(activeLayer(doc), false);
      copy.name = this.labels.copyOf(copy.name);
      doc.layers.splice(doc.activeLayer + 1, 0, copy);
      doc.activeLayer += 1;
    });
  }

  /**
   * Deletes the selected layers (at least one layer stays). Returns how many were deleted; they can be
   * brought back with `restoreDeleted`.
   */
  deleteLayers(): number {
    const picked = this.pickedLayers();
    if (picked.length < 2) return this.deleteLayer() ? 1 : 0;
    if (picked.length >= this.doc.layers.length) return 0;
    this.edit((doc) => {
      const entries = picked.map((layer) => ({ layer, index: doc.layers.indexOf(layer) }));
      doc.layers = doc.layers.filter((l) => !picked.includes(l));
      doc.activeLayer = Math.min(doc.layers.length - 1, Math.max(0, entries[0].index - 1));
      this.deleted = { kind: 'layers', session: this.active, entries };
    });
    return picked.length;
  }

  /** Returns false when nothing was deleted. The layer can be brought back with `restoreDeleted`. */
  deleteLayer(): boolean {
    if (this.doc.layers.length < 2) return false;
    this.edit((doc) => {
      const index = doc.activeLayer;
      const [layer] = doc.layers.splice(index, 1);
      doc.activeLayer = Math.max(0, index - 1);
      this.deleted = { kind: 'layer', session: this.active, layer, index };
    });
    return true;
  }

  moveLayer(direction: 1 | -1): void {
    const i = this.doc.activeLayer;
    const j = i + direction;
    if (j < 0 || j >= this.doc.layers.length) return;
    this.edit((doc) => {
      [doc.layers[i], doc.layers[j]] = [doc.layers[j], doc.layers[i]];
      doc.activeLayer = j;
    });
  }

  /** Moves a layer to another position (indices bottom to top), as one undo step. It stays active. */
  reorderLayer(from: number, to: number): void {
    const n = this.doc.layers.length;
    if (from === to || from < 0 || to < 0 || from >= n || to >= n) return;
    this.edit((doc) => {
      const [layer] = doc.layers.splice(from, 1);
      doc.layers.splice(to, 0, layer);
      doc.activeLayer = to;
    });
  }

  mergeDown(): void {
    const i = this.doc.activeLayer;
    if (i <= 0) return;
    if (this.doc.layers[i].locked || this.doc.layers[i - 1].locked) {
      this.notice({ type: 'layerLocked' });
      return;
    }
    this.edit((doc) => {
      mergeLayerInto(doc.layers[i], doc.layers[i - 1]);
      doc.layers.splice(i, 1);
      doc.activeLayer = i - 1;
    });
    this.notice({ type: 'merged' });
  }

  /** Merges the selected visible layers into the lowest of them, as one undo step. */
  mergeLayers(): void {
    this.mergeInto(this.pickedLayers().filter((l) => l.visible));
  }

  /** Merges every visible layer into one and drops the hidden ones, as one undo step. */
  flattenImage(): void {
    const visible = this.doc.layers.filter((l) => l.visible);
    if (!visible.length || (visible.length === 1 && visible.length === this.doc.layers.length)) return;
    if (visible.some((l) => l.locked)) {
      this.notice({ type: 'layerLocked' });
      return;
    }
    this.edit((doc) => {
      const [bottom, ...rest] = visible;
      for (const layer of rest) mergeLayerInto(layer, bottom);
      doc.layers = [bottom];
      doc.activeLayer = 0;
    });
    this.notice({ type: 'merged' });
  }

  private mergeInto(layers: Layer[]): void {
    if (layers.length < 2) return;
    if (layers.some((l) => l.locked)) {
      this.notice({ type: 'layerLocked' });
      return;
    }
    this.edit((doc) => {
      const [bottom, ...rest] = layers;
      for (const layer of rest) mergeLayerInto(layer, bottom);
      doc.layers = doc.layers.filter((l) => !rest.includes(l));
      doc.activeLayer = doc.layers.indexOf(bottom);
    });
    this.notice({ type: 'merged' });
  }

  /**
   * Moves the selected layers together, keeping their order, so they land at `slot` (0 = bottom,
   * layers.length = top, counted before the move). One undo step.
   */
  moveLayersTo(slot: number): void {
    const picked = this.pickedLayers();
    const layers = this.doc.layers;
    const rest = layers.filter((l) => !picked.includes(l));
    const at = layers.slice(0, Math.max(0, slot)).filter((l) => !picked.includes(l)).length;
    const next = [...rest.slice(0, at), ...picked, ...rest.slice(at)];
    if (next.every((l, i) => l === layers[i])) return;
    this.edit((doc) => {
      const active = doc.layers[doc.activeLayer];
      doc.layers = next;
      doc.activeLayer = next.indexOf(active);
    });
  }

  /** Merges every visible layer into the lowest visible one, as one undo step. */
  mergeVisible(): void {
    this.mergeInto(this.doc.layers.filter((l) => l.visible));
  }

  setLayerVisible(index: number, visible: boolean): void {
    this.edit((doc) => {
      doc.layers[index].visible = visible;
    });
  }

  /** Shows only this layer. If it already was the only visible one, shows every layer again. */
  soloLayer(index: number): void {
    if (!this.doc.layers[index]) return;
    const alone = this.doc.layers.every((l, i) => l.visible === (i === index));
    this.edit((doc) => doc.layers.forEach((l, i) => (l.visible = alone || i === index)));
  }

  setLayerLocked(index: number, locked: boolean): void {
    if (!this.doc.layers[index]) return;
    this.edit((doc) => {
      doc.layers[index].locked = locked;
    });
  }

  /** Paint on a locked layer: tells the user why nothing happens. */
  private activeLocked(): boolean {
    if (!activeLayer(this.doc).locked) return false;
    this.notice({ type: 'layerLocked' });
    return true;
  }

  renameLayer(index: number, name: string): void {
    const clean = name.trim().slice(0, 120);
    if (!clean || clean === this.doc.layers[index]?.name) return;
    this.edit((doc) => {
      doc.layers[index].name = clean;
    });
  }

  /** Opacity drags: one undo step per gesture. Call with `done` on release. */
  setLayerOpacity(opacity: number, done = false): void {
    if (!this.opacityChange) {
      this.checkpoint();
      this.opacityChange = true;
    }
    activeLayer(this.doc).opacity = clamp(opacity, 0, 1);
    if (done) {
      this.opacityChange = false;
      this.commit();
    } else this.pixelsChanged();
  }

  /* ------------------------------------------------------------------ colors & palette */

  setColor(slot: 'primary' | 'secondary', color: Color): void {
    this[slot] = color >>> 0;
    this.commit();
  }

  /** Moves colors to the front of the recent colors (transparent ones are skipped). */
  private remember(...colors: Color[]): void {
    const fresh = colors.filter((c) => alpha(c) > 0).map((c) => c >>> 0);
    if (!fresh.length) return;
    this.recent = [...new Set([...fresh, ...this.recent])].slice(0, RECENT_COLORS);
  }

  swapColors(): void {
    [this.primary, this.secondary] = [this.secondary, this.primary];
    this.commit();
  }

  setPalettePreset(key: string): void {
    const colors = key === 'custom' ? (this.palette.custom ?? []) : presetColors(key);
    this.palette = { ...this.palette, key, colors };
    this.paletteIndex = new PaletteIndex(colors);
    this.commit();
  }

  /** Forgets the custom palette, unless it's the one in use. */
  deleteCustomPalette(): void {
    if (this.palette.key === 'custom' || !this.palette.custom) return;
    this.palette = { ...this.palette, custom: null };
    this.commit();
  }

  /** Replaces the palette with custom colors. */
  setPaletteColors(colors: Color[]): void {
    const unique = [...new Set(colors.map(opaque))];
    this.palette = { key: 'custom', colors: unique, custom: unique };
    this.paletteIndex = new PaletteIndex(unique);
    this.commit();
  }

  addToPalette(color: Color = this.primary): void {
    const c = opaque(color);
    if (this.palette.colors.includes(c)) {
      this.notice({ type: 'colorInPalette' });
      return;
    }
    this.setPaletteColors([...this.palette.colors, c]);
  }

  removeFromPalette(color: Color = this.primary): void {
    const c = opaque(color);
    if (!this.palette.colors.includes(c)) {
      this.notice({ type: 'colorNotInPalette' });
      return;
    }
    this.setPaletteColors(this.palette.colors.filter((x) => x !== c));
  }

  addRamp(): void {
    const added = hueShiftedRamp(this.primary).filter((c) => !this.palette.colors.includes(c));
    this.setPaletteColors([...this.palette.colors, ...added]);
    this.notice({ type: 'rampAdded', count: added.length });
  }

  /** Moves a palette color to another position (a preset becomes a custom palette, like any edit). */
  movePaletteColor(from: number, to: number): void {
    const colors = [...this.palette.colors];
    if (from === to || !colors[from] || to < 0 || to >= colors.length) return;
    const [color] = colors.splice(from, 1);
    colors.splice(to, 0, color);
    this.setPaletteColors(colors);
  }

  sortPalette(): void {
    this.setPaletteColors(sortByLightness(this.palette.colors));
  }

  paletteFromDrawing(): void {
    const colors = uniqueColors(this.flatten());
    if (!colors.length) {
      this.notice({ type: 'emptyDrawing' });
      return;
    }
    this.setPaletteColors(sortByLightness(colors));
    this.notice({ type: 'extracted', count: colors.length });
  }

  /* ------------------------------------------------------------------ tools & view */

  setTool(tool: ToolId): void {
    if (this.stroke) this.endStroke();
    this.tool = tool;
    this.commit();
  }

  setOption<K extends keyof ToolOptions>(key: K, value: ToolOptions[K]): void {
    this.options = { ...this.options, [key]: value };
    this.commit();
  }

  setView<K extends keyof ViewSettings>(key: K, value: ViewSettings[K]): void {
    this.view = { ...this.view, [key]: value };
    this.commit();
  }

  toggleView(key: keyof ViewSettings): void {
    this.setView(key, !this.view[key]);
  }

  getPreferences(): Preferences {
    return {
      tool: this.tool,
      options: this.options,
      primary: this.primary,
      secondary: this.secondary,
      palette: this.palette,
      recent: this.recent,
      view: this.view,
    };
  }

  setPreferences(p: Partial<Preferences>): void {
    if (p.tool && p.tool in TOOLS) this.tool = p.tool;
    if (p.options) this.options = { ...DEFAULT_TOOL_OPTIONS, ...p.options };
    if (typeof p.primary === 'number') this.primary = p.primary >>> 0;
    if (typeof p.secondary === 'number') this.secondary = p.secondary >>> 0;
    if (p.view) {
      const { grid, tile, mirrorX, mirrorY } = { ...this.view, ...p.view };
      this.view = { grid, tile, mirrorX, mirrorY }; // older saves also had showGap
    }
    if (Array.isArray(p.recent))
      this.recent = p.recent.filter((c) => typeof c === 'number').slice(0, RECENT_COLORS);
    if (p.palette?.colors?.length) {
      this.palette = p.palette;
      this.paletteIndex = new PaletteIndex(p.palette.colors);
    }
    this.commit(false);
  }

  /* ------------------------------------------------------------------ selection & clipboard */

  selectAll(): void {
    this.active.selection = { x: 0, y: 0, w: this.doc.width, h: this.doc.height };
    this.commit(false);
  }

  deselect(): void {
    if (!this.active.selection) return;
    this.active.selection = null;
    this.commit(false);
  }

  private targetRect(): Rect {
    return this.active.selection ?? { x: 0, y: 0, w: this.doc.width, h: this.doc.height };
  }

  clearSelection(): void {
    if (!this.active.selection || this.activeLocked()) return;
    this.edit((doc) => fillRect(activeLayer(doc).pixels, doc.width, doc.height, this.targetRect(), 0));
  }

  /** Fills the selection, or the whole layer, with the primary color. */
  fill(): void {
    if (this.activeLocked()) return;
    if (!activeLayer(this.doc).visible) {
      this.notice({ type: 'layerHidden' });
      return;
    }
    this.remember(this.primary);
    this.edit((doc) =>
      fillRect(activeLayer(doc).pixels, doc.width, doc.height, this.targetRect(), this.primary),
    );
  }

  flip(horizontal: boolean): void {
    if (this.activeLocked()) return;
    this.edit((doc) =>
      flipRect(activeLayer(doc).pixels, doc.width, doc.height, this.targetRect(), horizontal),
    );
  }

  /** Rotates the selection (or the layer) by 90° clockwise; the selection follows the new shape. */
  rotate(): void {
    if (this.activeLocked()) return;
    const hadSelection = this.active.selection !== null;
    this.edit((doc) => {
      const rotated = rotateRect(activeLayer(doc).pixels, doc.width, doc.height, this.targetRect());
      if (hadSelection) this.active.selection = rotated;
    });
  }

  /* ------------------------------------------------------------------ color adjustment */

  get isAdjusting(): boolean {
    return this.adjusting !== null;
  }

  /**
   * Starts adjusting colors of the active layer (or all layers), limited to the selection if any.
   * Previews are live and not in the history; `applyAdjust` makes one undo step.
   */
  beginAdjust(allLayers: boolean): void {
    this.cancelStroke();
    this.cancelAdjust();
    const doc = this.doc;
    const layers = (allLayers ? doc.layers : [activeLayer(doc)]).filter((l) => !l.locked);
    if (!layers.length) {
      this.notice({ type: 'layerLocked' });
      this.commit(false); // Lets the adjustment panel notice that nothing is being adjusted.
      return;
    }
    this.adjusting = {
      layers: layers.map((l) => ({ id: l.id, base: l.pixels.slice() })),
      rect: clipRect(this.targetRect(), doc.width, doc.height),
    };
  }

  /** Rewrites the adjusted layers from their original pixels. */
  private writeAdjustment(adj: ColorAdjustment | null): void {
    const { layers, rect } = this.adjusting!;
    const width = this.doc.width;
    const cache = new Map<Color, Color>();
    for (const { id, base } of layers) {
      const layer = this.doc.layers.find((l) => l.id === id);
      if (!layer) continue;
      layer.pixels.set(base);
      if (!adj) continue;
      for (let y = rect.y; y < rect.y + rect.h; y++)
        for (let x = rect.x; x < rect.x + rect.w; x++) {
          const i = y * width + x;
          const c = base[i];
          let next = cache.get(c);
          if (next === undefined) cache.set(c, (next = adjustColor(c, adj)));
          layer.pixels[i] = next;
        }
    }
  }

  previewAdjust(adj: ColorAdjustment): void {
    if (!this.adjusting) return;
    this.writeAdjustment(adj);
    this.pixelsChanged();
  }

  /** Commits the adjustment as one undo step; `palette` also adjusts the palette colors. */
  applyAdjust(adj: ColorAdjustment, palette: boolean): void {
    if (!this.adjusting) return;
    this.writeAdjustment(null);
    this.edit(() => this.writeAdjustment(adj));
    this.adjusting = null;
    if (palette) this.setPaletteColors(this.palette.colors.map((c) => adjustColor(c, adj)));
  }

  cancelAdjust(): void {
    if (!this.adjusting) return;
    this.writeAdjustment(null);
    this.adjusting = null;
    this.pixelsChanged();
  }

  /** Moves the selection (or the layer) by a few pixels, as one undo step. */
  nudge(dx: number, dy: number): void {
    if (this.stroke || !activeLayer(this.doc).visible || this.activeLocked()) return;
    this.checkpoint();
    const s = this.createStroke({ x: 0, y: 0 }, false);
    beginMove(s);
    applyMove(s, dx, dy);
    this.commit();
  }

  copy(): boolean {
    const r = clipRect(this.targetRect(), this.doc.width, this.doc.height);
    if (!r.w || !r.h) return false;
    this.clipboard = extractBlock(activeLayer(this.doc).pixels, this.doc.width, this.doc.height, r);
    return true;
  }

  cut(): boolean {
    if (this.activeLocked() || !this.copy()) return false;
    if (!this.active.selection) this.selectAll();
    this.clearSelection();
    return true;
  }

  hasClipboard(): boolean {
    return this.clipboard !== null;
  }

  /** Pastes the clipboard (or a given block) on a new layer, selected, with the move tool active. */
  paste(block: PixelBlock | null = this.clipboard, name = this.labels.pasted): void {
    if (!block) return;
    this.edit((doc) => {
      const sel = this.active.selection;
      const x = sel ? clamp(sel.x, 0, doc.width - 1) : Math.max(0, Math.floor((doc.width - block.width) / 2));
      const y = sel
        ? clamp(sel.y, 0, doc.height - 1)
        : Math.max(0, Math.floor((doc.height - block.height) / 2));
      const layer = createLayer(name, doc.width, doc.height);
      for (let by = 0; by < block.height; by++) {
        for (let bx = 0; bx < block.width; bx++) {
          const tx = x + bx;
          const ty = y + by;
          if (tx < doc.width && ty < doc.height)
            layer.pixels[ty * doc.width + tx] = block.pixels[by * block.width + bx];
        }
      }
      doc.layers.splice(doc.activeLayer + 1, 0, layer);
      doc.activeLayer += 1;
      this.active.selection = {
        x,
        y,
        w: Math.min(block.width, doc.width - x),
        h: Math.min(block.height, doc.height - y),
      };
      this.tool = 'move';
    });
    this.notice({ type: 'pasted' });
  }

  /* ------------------------------------------------------------------ strokes */

  get isStroking(): boolean {
    return this.stroke !== null;
  }

  private createStroke(p: Point, secondary: boolean): Stroke {
    const doc = this.doc;
    const layer = activeLayer(doc);
    return {
      doc,
      layer,
      base: layer.pixels.slice(),
      start: p,
      last: p,
      secondary,
      options: this.options,
      primaryColor: this.primary,
      secondaryColor: this.secondary,
      palette: this.paletteIndex,
      mirrorX: this.view.mirrorX,
      mirrorY: this.view.mirrorY,
      selection: this.active.selection,
      visited: new Uint8Array(doc.width * doc.height),
      trail: [],
      scratch: {},
      sample: (q) => {
        const flat = flatten(doc);
        const c = flat[q.y * doc.width + q.x];
        return alpha(c) ? c : 0;
      },
      setColor: (slot, color) => {
        this[slot] = color;
        this.commit(false);
      },
      setSelection: (rect) => {
        this.active.selection = rect;
      },
    };
  }

  /**
   * Starts a gesture at pixel `p`. `toolOverride` lets the UI force a tool (Alt → picker).
   * Returns false when nothing happens (e.g. drawing on a hidden layer).
   */
  beginStroke(p: Point, secondary: boolean, mods: Modifiers, toolOverride?: ToolId): boolean {
    this.cancelStroke();
    if (this.adjusting) return false;
    const id = toolOverride ?? this.tool;
    const tool = TOOLS[id];
    if (id === 'move' && !mods.keepLayer) this.pickLayerAt(p);
    if (tool.editsPixels && this.activeLocked()) return false;
    if (tool.editsPixels && !activeLayer(this.doc).visible) {
      this.notice({ type: 'layerHidden' });
      return false;
    }
    if (tool.editsPixels) this.checkpoint();
    this.stroke = this.createStroke(p, secondary);
    this.strokeTool = id;
    tool.onDown(this.stroke, p, mods);
    this.pixelsChanged();
    return true;
  }

  /** Makes the layer under `p` the active one (see `layerAt`), without an undo step of its own. */
  private pickLayerAt(p: Point): void {
    const k = this.layerAt(p);
    if (k < 0 || k === this.doc.activeLayer) return;
    const id = this.doc.layers[k].id;
    this.doc.activeLayer = k;
    this.active.picked = [id];
    this.active.anchor = id;
    this.commit(false);
  }

  moveStroke(p: Point, mods: Modifiers): void {
    if (!this.stroke || !this.strokeTool) return;
    TOOLS[this.strokeTool].onMove(this.stroke, p, mods);
    this.pixelsChanged();
  }

  endStroke(): void {
    const s = this.stroke;
    const id = this.strokeTool;
    if (!s || !id) return;
    const tool = TOOLS[id];
    tool.onUp?.(s);
    this.stroke = null;
    this.strokeTool = null;
    if (tool.editsPixels && !changed(s.base, s.layer.pixels) && id !== 'move') {
      this.active.history.discardLast();
      this.commit(false);
      return;
    }
    if (tool.paintsColor) {
      const [c1, c2] = strokeColors(s);
      if (s.options.dither) this.remember(c1, c2);
      else this.remember(c1);
    }
    this.commit(tool.editsPixels);
  }

  cancelStroke(): void {
    const s = this.stroke;
    const id = this.strokeTool;
    if (!s || !id) return;
    this.stroke = null;
    this.strokeTool = null;
    if (TOOLS[id].editsPixels) {
      s.layer.pixels.set(s.base);
      this.active.history.discardLast();
    }
    this.active.selection = s.selection;
    this.commit(false);
  }
}

function changed(a: Uint32Array, b: Uint32Array): boolean {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return true;
  return false;
}

export { MAX_SIZE };
