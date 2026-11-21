/**
 * lexiconMergeModel.test.ts — decision pura de la fusion de lexicos.
 *
 * Cubre los contratos del `App.tsx` original:
 *  - sin lexico activo no se fusiona (`canMerge: false`) y la base queda intacta;
 *  - con lexico activo la fusion concatena las entradas al final, sin mutar;
 *  - `addedCount` refleja la cantidad anadida.
 */
import { describe, it, expect } from 'vitest';
import {
  buildLexiconMerge,
  NO_ACTIVE_LEXICON_MESSAGE,
  type LexiconMergeDeps,
} from '../lexiconMergeModel';
import type { LexiconEntry } from '../../types';

const entry = (overrides: Partial<LexiconEntry> = {}): LexiconEntry => ({
  ID: '1',
  Raíz: 'raiz',
  Léxema: ['lexema'],
  Categoría: 'sustantivo',
  Significado: ['meaning'],
  extraData: {},
  ...overrides,
});

const deps = (overrides: Partial<LexiconMergeDeps> = {}): LexiconMergeDeps => ({
  activeLexiconName: 'Quavanol',
  activeLexicon: [entry({ ID: '1', Léxema: ['kira'], Significado: ['fuego'] })],
  ...overrides,
});

describe('buildLexiconMerge', () => {
  it('concatena las entradas al final del lexico activo', () => {
    const base = deps();
    const plan = buildLexiconMerge(base, [
      entry({ ID: 'otro-2', Léxema: ['nova'], Significado: ['nuevo'] }),
    ]);

    expect(plan.canMerge).toBe(true);
    expect(plan.mergedEntries).toHaveLength(2);
    expect(plan.mergedEntries[0].ID).toBe('1');
    expect(plan.mergedEntries[1].Léxema).toEqual(['nova']);
    expect(plan.addedCount).toBe(1);
  });

  it('no muta la lista de entrada ni el lexico base', () => {
    const base = deps();
    const snapshot = [...base.activeLexicon];
    const incoming = [entry({ ID: 'otro-2', Léxema: ['nova'] })];

    buildLexiconMerge(base, incoming);

    expect(base.activeLexicon).toEqual(snapshot);
    expect(incoming).toHaveLength(1);
  });

  it('reporta cero anadidas con una lista vacia', () => {
    const base = deps();
    const plan = buildLexiconMerge(base, []);

    expect(plan.canMerge).toBe(true);
    expect(plan.mergedEntries).toEqual(base.activeLexicon);
    expect(plan.addedCount).toBe(0);
  });

  it('sin lexico activo no fusiona y deja la base intacta', () => {
    const base = deps({ activeLexiconName: null });
    const plan = buildLexiconMerge(base, [entry({ ID: 'otro-2' })]);

    expect(plan.canMerge).toBe(false);
    expect(plan.mergedEntries).toBe(base.activeLexicon);
    expect(plan.addedCount).toBe(0);
  });

  it('el aviso de lexico ausente es el contrato del modal', () => {
    expect(NO_ACTIVE_LEXICON_MESSAGE).toBe('No hay un léxico activo que fusionar.');
  });
});
