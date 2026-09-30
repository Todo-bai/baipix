import { alpha, type Color } from '../engine/color';
import { hasBackground, MAX_SIZE, createDocument } from '../engine/document';
import type { Editor } from '../engine/editor';
import { renderGeometry, toSvg } from '../engine/export/svg';
import { parsePaletteFile, toGpl, toHexList } from '../engine/palette';
import { t } from '../i18n';
import { copyPng, copyText } from '../io/clipboard';
import { saveFile, safeFileName } from '../io/download';
import { imageToBlock, loadImage } from '../io/image';
import { pickFile } from '../io/pickFile';
import { canvasToBlob, renderToCanvas } from '../io/png';
import { documentFromJson, documentToJson, FILE_EXTENSION } from '../storage/fileFormat';
import { leaveHome, showEmptyHome } from './home';
import { openDialog, toast, uiStore } from './uiStore';

export type ExportFormat = 'png' | 'svg';

const PALETTE_FILES = '.hex,.gpl,.txt,text/plain';

/** User-level commands shared by menus, buttons and shortcuts. */
export function createActions(editor: Editor) {
  const doc = () => editor.getState().doc;
  const undoDelete = () => ({ label: t('common.undo'), run: () => editor.restoreDeleted() });
  const baseName = () => safeFileName(doc().name);

  function renderInput(onlyActiveLayer: boolean) {
    const d = doc();
    const pixels = editor.flatten(
      onlyActiveLayer ? { onlyLayer: d.layers[d.activeLayer] } : { includeBackground: false },
    );
    const geometry = renderGeometry(d.width, d.height, d.render.pixelSize, d.render.gap);
    const withBackground = uiStore.get().exportBackground && !onlyActiveLayer && hasBackground(d);
    const background: Color = withBackground ? d.background : 0;
    if (geometry.pixelSize !== d.render.pixelSize)
      toast(t('toast.exportShrunk', { size: geometry.pixelSize }));
    return { d, pixels, geometry, background };
  }

  /** Replaces the palette with a .hex, .gpl or .txt file (picked, or dropped on the canvas). */
  async function importPalette(file?: File | null) {
    const f = file ?? (await pickFile(PALETTE_FILES));
    if (!f) return;
    const colors = parsePaletteFile(await f.text());
    if (!colors.length) {
      toast(t('toast.noPaletteColors'));
      return;
    }
    editor.setPaletteColors(colors);
    toast(t('toast.colorsImported', { count: colors.length }));
  }

  async function report(filename: string, result: Promise<string>) {
    const r = await result;
    if (r === 'saved') toast(t('toast.saved', { name: filename }));
    else if (r === 'cancelled') toast(t('toast.downloadCancelled'));
    else toast(t('toast.downloadBusy'));
  }

  const actions = {
    async exportImage(format: ExportFormat, onlyActiveLayer = false) {
      const { d, pixels, geometry, background } = renderInput(onlyActiveLayer);
      const filename = `${baseName()}.${format}`;
      if (format === 'svg') {
        await report(
          filename,
          saveFile(filename, toSvg(pixels, d.width, d.height, geometry, background), 'image/svg+xml'),
        );
        return;
      }
      const blob = await canvasToBlob(renderToCanvas(pixels, d.width, d.height, geometry, background));
      await report(filename, saveFile(filename, blob, 'image/png'));
    },

    async copySvg(onlyActiveLayer = false) {
      const { d, pixels, geometry, background } = renderInput(onlyActiveLayer);
      const svg = toSvg(pixels, d.width, d.height, geometry, background);
      if (await copyText(svg)) toast(t('toast.svgCopied'));
      else
        openDialog({
          type: 'output',
          title: t('output.copySvgTitle'),
          message: t('output.copySvgBlocked'),
          text: svg,
        });
    },

    async copyPng(onlyActiveLayer = false) {
      const { d, pixels, geometry, background } = renderInput(onlyActiveLayer);
      const canvas = renderToCanvas(pixels, d.width, d.height, geometry, background);
      if (await copyPng(await canvasToBlob(canvas))) toast(t('toast.pngCopied'));
      else
        openDialog({
          type: 'output',
          title: t('output.copyPngTitle'),
          message: t('output.copyPngBlocked'),
          image: canvas.toDataURL('image/png'),
        });
    },

    /** `.hex` (one hex code per line, Lospec) or `.gpl` (GIMP, Aseprite, Krita). */
    async exportPalette(format: 'hex' | 'gpl' = 'hex') {
      const colors = editor.getState().palette.colors;
      const filename = `${baseName()}-palette.${format}`;
      const content = format === 'gpl' ? toGpl(colors, `${doc().name} palette`) : toHexList(colors);
      await report(filename, saveFile(filename, content, 'text/plain'));
    },

    importPalette,

    async saveDocument() {
      const filename = `${baseName()}${FILE_EXTENSION}`;
      await report(filename, saveFile(filename, documentToJson(doc()), 'application/json'));
    },

    async openDocument() {
      const file = await pickFile(`${FILE_EXTENSION},application/json`);
      if (!file) return;
      try {
        editor.addDocument(documentFromJson(await file.text()));
        toast(t('toast.opened', { name: file.name }));
      } catch {
        toast(t('toast.notBaipix'));
      }
    },

    /** Same size as the canvas: added as a layer (unless `asNewFile`). Otherwise: a new file. */
    async importImage(file?: File | null, asNewFile = false) {
      const f = file ?? (await pickFile('image/*'));
      if (!f) return;
      if (/\.(hex|gpl)$/i.test(f.name)) {
        await importPalette(f);
        return;
      }
      if (f.name.endsWith(FILE_EXTENSION)) {
        try {
          editor.addDocument(documentFromJson(await f.text()));
        } catch {
          toast(t('toast.notBaipix'));
        }
        return;
      }
      if (!f.type.startsWith('image/')) {
        toast(t('toast.notImage'));
        return;
      }
      let img: HTMLImageElement;
      try {
        img = await loadImage(f);
      } catch {
        toast(t('toast.unreadableImage'));
        return;
      }
      const name = f.name.replace(/\.[^.]+$/, '') || t('default.image');
      const d = doc();
      if (!asNewFile && img.naturalWidth === d.width && img.naturalHeight === d.height) {
        editor.paste(imageToBlock(img, d.width, d.height), name);
        editor.deselect();
        editor.setTool('pencil');
        toast(t('toast.imageAsLayer'));
        return;
      }
      const block = imageToBlock(img, MAX_SIZE, MAX_SIZE);
      const next = createDocument(name, block.width, block.height, t('default.image'));
      next.layers[0].pixels.set(block.pixels);
      editor.addDocument(next);
      toast(
        block.scaled
          ? t('toast.imageShrunk', { w: block.width, h: block.height, max: MAX_SIZE })
          : t('toast.imageAsFile', { w: block.width, h: block.height }),
      );
    },

    /** Paste event: images from the system clipboard go on a new layer, otherwise the internal clipboard. */
    async pasteFromClipboard(files: File[]) {
      const image = files.find((f) => f.type.startsWith('image/'));
      if (image) {
        try {
          const d = doc();
          editor.paste(imageToBlock(await loadImage(image), d.width, d.height), t('default.pastedImage'));
        } catch {
          toast(t('toast.unreadableImage'));
        }
        return true;
      }
      if (editor.hasClipboard()) {
        editor.paste();
        return true;
      }
      return false;
    },

    // No confirmation: deleting is instant, and the toast offers to bring it back.
    /** Deleting the last file goes back to the empty home screen; Undo brings the file back. */
    deleteFile(id: string, name: string) {
      const last = editor.getState().files.length === 1;
      if (!editor.deleteFile(id)) return;
      if (!last) return toast(t('toast.deleted', { name }), undoDelete());
      showEmptyHome(editor);
      toast(t('toast.deleted', { name }), {
        label: t('common.undo'),
        run: () => editor.restoreDeleted() && leaveHome(editor),
      });
    },

    /** Deletes the selected layers (or the active one), with an Undo toast. */
    deleteLayers() {
      const { name } = doc().layers[doc().activeLayer];
      const count = editor.deleteLayers();
      if (count === 1) toast(t('toast.deleted', { name }), undoDelete());
      else if (count > 1) toast(t('toast.layersDeleted', { count }), undoDelete());
    },

    hasTransparentBackground: () => !alpha(doc().background),

    /**
     * Home screen import: a .baipix file or an image, always as a new file.
     * Resolves true when a file was added.
     */
    async openFile(file?: File | null): Promise<boolean> {
      const f = file ?? (await pickFile(`${FILE_EXTENSION},application/json,image/*`));
      if (!f) return false;
      const before = editor.getState().files.length;
      if (f.name.endsWith(FILE_EXTENSION) || f.type === 'application/json') {
        try {
          editor.addDocument(documentFromJson(await f.text()));
          toast(t('toast.opened', { name: f.name }));
        } catch {
          toast(t('toast.notBaipix'));
        }
      } else {
        await actions.importImage(f, true);
      }
      return editor.getState().files.length > before;
    },
  };
  return actions;
}

export type Actions = ReturnType<typeof createActions>;
