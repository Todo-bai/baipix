import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { pack } from '../src/engine/color';
import { createDocument } from '../src/engine/document';
import {
  decodePixels,
  documentFromJson,
  documentToJson,
  encodePixels,
  FileFormatError,
} from '../src/storage/fileFormat';
import { IndexedDbStorage } from '../src/storage/indexedDb';

describe('.baipix format', () => {
  it('run-length encodes pixels losslessly', () => {
    const px = Uint32Array.from([0, 0, 0, 5, 5, 0, 7]);
    const { colors, runs } = encodePixels(px);
    expect(runs).toEqual([0, 3, 1, 2, 0, 1, 2, 1]);
    expect([...decodePixels(colors, runs, px.length)]).toEqual([...px]);
  });

  it('keeps the last modified date, and reads files without one', () => {
    const doc = createDocument('Hero', 4, 4);
    doc.updatedAt = 1_700_000_000_000;
    expect(documentFromJson(documentToJson(doc)).updatedAt).toBe(1_700_000_000_000);
    delete doc.updatedAt;
    expect(documentFromJson(documentToJson(doc)).updatedAt).toBeUndefined();
  });

  it('round-trips a document', () => {
    const doc = createDocument('Hero', 8, 4);
    doc.layers[0].pixels[3] = pack(1, 2, 3);
    doc.background = pack(9, 9, 9);
    doc.render = { pixelSize: 16, gap: 2 };
    const back = documentFromJson(documentToJson(doc));
    expect(back.name).toBe('Hero');
    expect(back.render).toEqual({ pixelSize: 16, gap: 2 });
    expect([...back.layers[0].pixels]).toEqual([...doc.layers[0].pixels]);
  });

  it('keeps locked layers locked, and older files unlocked', () => {
    const doc = createDocument('Hero', 2, 2);
    doc.layers[0].locked = true;
    const json = documentToJson(doc);
    expect(documentFromJson(json).layers[0].locked).toBe(true);
    expect(documentFromJson(json.replace('"locked":true,', '')).layers[0].locked).toBe(false);
  });

  it('rejects other files', () => {
    expect(() => documentFromJson('{"hello":1}')).toThrow(FileFormatError);
    expect(() => documentFromJson('not json')).toThrow(FileFormatError);
  });
});

describe('IndexedDbStorage', () => {
  it('saves and loads a workspace', async () => {
    const storage = new IndexedDbStorage();
    const doc = createDocument('A', 4, 4);
    doc.layers[0].pixels[0] = pack(255, 0, 0);
    await storage.save({ documents: [doc], activeId: doc.id, preferences: {}, ui: { lang: 'fr' } });
    const loaded = await storage.load();
    expect(loaded?.documents[0].name).toBe('A');
    expect(loaded?.documents[0].layers[0].pixels[0]).toBe(pack(255, 0, 0));
    expect(loaded?.ui).toEqual({ lang: 'fr' });
  });

  it('keeps pixels outside the canvas in the workspace, not in .baipix files', async () => {
    const storage = new IndexedDbStorage();
    const doc = createDocument('A', 4, 4);
    doc.layers[0].outside = { x: 5, y: -2, w: 2, h: 1, pixels: Uint32Array.from([pack(1, 2, 3), 0]) };
    await storage.save({ documents: [doc], activeId: doc.id, preferences: {}, ui: {} });
    const back = (await storage.load())?.documents[0].layers[0].outside;
    expect(back).toMatchObject({ x: 5, y: -2, w: 2, h: 1 });
    expect([...back!.pixels]).toEqual([pack(1, 2, 3), 0]);
    expect(documentFromJson(documentToJson(doc)).layers[0].outside).toBeUndefined();
  });

  it('keeps the reference image in the workspace, never in .baipix files', async () => {
    const storage = new IndexedDbStorage();
    const doc = createDocument('A', 4, 4);
    const reference = {
      src: 'data:image/webp;base64,AAAA',
      width: 8,
      height: 4,
      x: 0,
      y: 1,
      w: 4,
      h: 2,
      opacity: 0.5,
      visible: false,
      locked: true,
    };
    doc.reference = reference;
    await storage.save({ documents: [doc], activeId: doc.id, preferences: {}, ui: {} });
    expect((await storage.load())?.documents[0].reference).toEqual(reference);
    expect(documentToJson(doc)).not.toContain('reference');
    expect(documentFromJson(documentToJson(doc)).reference).toBeUndefined();
  });
});
