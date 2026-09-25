import { alpha, opaque, type Color } from './color';
import { flatten, mergeLayerInto, type FlattenOptions } from './composite';
import {
  activeLayer,
  cloneDocument,
  cloneLayer,
  createDocument,
  createLayer,
  MAX_SIZE,
  resizeDocument,
  type PixelDoc,
  type RenderSettings,
} from './document';
import { History, takeSnapshot, type Snapshot } from './history';
import { clamp, clipRect, type Point, type Rect } from './math';
import { PaletteIndex, hueShiftedRamp, presetColors, sortByLightness } from './palette';
import { extractBlock, fillRect, flipRect, uniqueColors, type PixelBlock } from './region';
import {
  DEFAULT_TOOL_OPTIONS,
  TOOLS,
  type Modifiers,
  type Stroke,
  type ToolId,
  type ToolOptions,
} from './tools';
import { applyMove, beginMove } from './tools/move';

export interface ViewSettings {
  grid: boolean;
  tile: boolean;
  mirrorX: boolean;
  mirrorY: boolean;
  /** Preview the render gap on the canvas. */
  showGap: boolean;
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
  view: ViewSettings;
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
  | { type: 'keepOneFile' }
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
  view: ViewSettings;
}

interface Session {
  doc: PixelDoc;
  history: History;
  selection: Rect | null;
}

type Listener = () => void;

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
  private view: ViewSettings = { grid: true, tile: false, mirrorX: false, mirrorY: false, showGap: true };
  private clipboard: PixelBlock | null = null;
  private stroke: Stroke | null = null;
  private strokeTool: ToolId | null = null;
  private opacityChange = false;
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
    this.state = {
      files: this.sessions.map(({ doc }) => ({
        id: doc.id,
        name: doc.name,
        width: doc.width,
        height: doc.height,
      })),
      activeId: s.doc.id,
      doc: s.doc,
      selection: s.selection,
      tool: this.tool,
      options: this.options,
      primary: this.primary,
      secondary: this.secondary,
      palette: this.palette,
      view: this.view,
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
  }

  private restore(snapshot: Snapshot): void {
    this.active.doc = snapshot.doc;
    this.active.selection = snapshot.selection;
  }

  undo(): void {
    if (this.stroke) return;
    const prev = this.active.history.undo(takeSnapshot(this.doc, this.active.selection));
    if (prev) {
      this.restore(prev);
      this.commit();
    }
  }

  redo(): void {
    if (this.stroke) return;
    const next = this.active.history.redo(takeSnapshot(this.doc, this.active.selection));
    if (next) {
      this.restore(next);
      this.commit();
    }
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
    this.addSession(doc);
    this.commit();
  }

  /** Replaces every file, e.g. when restoring a saved workspace. */
  loadDocuments(docs: PixelDoc[], activeId?: string): void {
    if (!docs.length) return;
    this.cancelStroke();
    this.sessions = docs.map((doc) => ({ doc, history: new History(), selection: null }));
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
    this.active = target;
    this.commit();
  }

  renameFile(id: string, name: string): void {
    const s = this.sessions.find((x) => x.doc.id === id);
    const clean = name.trim().slice(0, 120);
    if (!s || !clean || clean === s.doc.name) return;
    s.doc.name = clean;
    this.commit();
  }

  duplicateFile(id: string): void {
    const i = this.sessions.findIndex((x) => x.doc.id === id);
    if (i < 0) return;
    this.cancelStroke();
    const copy = cloneDocument(this.sessions[i].doc, false);
    copy.name = this.labels.copyOf(copy.name);
    const session: Session = { doc: copy, history: new History(), selection: null };
    this.sessions.splice(i + 1, 0, session);
    this.active = session;
    this.commit();
  }

  deleteFile(id: string): void {
    if (this.sessions.length < 2) {
      this.notice({ type: 'keepOneFile' });
      return;
    }
    const i = this.sessions.findIndex((x) => x.doc.id === id);
    if (i < 0) return;
    this.cancelStroke();
    const [removed] = this.sessions.splice(i, 1);
    if (removed === this.active) this.active = this.sessions[Math.max(0, i - 1)];
    this.commit();
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

  setRender(render: Partial<RenderSettings>): void {
    this.doc.render = {
      pixelSize: clamp(render.pixelSize ?? this.doc.render.pixelSize, 1, 64),
      gap: clamp(render.gap ?? this.doc.render.gap, 0, 64),
    };
    if (this.doc.render.gap > 0 && !this.view.showGap) this.view = { ...this.view, showGap: true };
    this.commit();
  }

  flatten(options?: FlattenOptions): Uint32Array {
    return flatten(this.doc, options);
  }

  /* ------------------------------------------------------------------ layers */

  setActiveLayer(index: number): void {
    if (index < 0 || index >= this.doc.layers.length || index === this.doc.activeLayer) return;
    this.doc.activeLayer = index;
    this.commit();
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

  deleteLayer(): void {
    if (this.doc.layers.length < 2) return;
    this.edit((doc) => {
      doc.layers.splice(doc.activeLayer, 1);
      doc.activeLayer = Math.max(0, doc.activeLayer - 1);
    });
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

  mergeDown(): void {
    const i = this.doc.activeLayer;
    if (i <= 0) return;
    this.edit((doc) => {
      mergeLayerInto(doc.layers[i], doc.layers[i - 1]);
      doc.layers.splice(i, 1);
      doc.activeLayer = i - 1;
    });
    this.notice({ type: 'merged' });
  }

  setLayerVisible(index: number, visible: boolean): void {
    this.edit((doc) => {
      doc.layers[index].visible = visible;
    });
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
      view: this.view,
    };
  }

  setPreferences(p: Partial<Preferences>): void {
    if (p.tool && p.tool in TOOLS) this.tool = p.tool;
    if (p.options) this.options = { ...DEFAULT_TOOL_OPTIONS, ...p.options };
    if (typeof p.primary === 'number') this.primary = p.primary >>> 0;
    if (typeof p.secondary === 'number') this.secondary = p.secondary >>> 0;
    if (p.view) this.view = { ...this.view, ...p.view };
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
    if (!this.active.selection) return;
    this.edit((doc) => fillRect(activeLayer(doc).pixels, doc.width, doc.height, this.targetRect(), 0));
  }

  /** Fills the selection, or the whole layer, with the primary color. */
  fill(): void {
    if (!activeLayer(this.doc).visible) {
      this.notice({ type: 'layerHidden' });
      return;
    }
    this.edit((doc) =>
      fillRect(activeLayer(doc).pixels, doc.width, doc.height, this.targetRect(), this.primary),
    );
  }

  flip(horizontal: boolean): void {
    this.edit((doc) =>
      flipRect(activeLayer(doc).pixels, doc.width, doc.height, this.targetRect(), horizontal),
    );
  }

  /** Moves the selection (or the layer) by a few pixels, as one undo step. */
  nudge(dx: number, dy: number): void {
    if (this.stroke || !activeLayer(this.doc).visible) return;
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
    if (!this.copy()) return false;
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
    const id = toolOverride ?? this.tool;
    const tool = TOOLS[id];
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
