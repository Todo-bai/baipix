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
});
