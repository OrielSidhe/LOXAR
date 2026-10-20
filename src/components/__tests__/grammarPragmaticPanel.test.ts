/**
 * Bloque C tests:
 * - saveClauseType / getPragmaticClauseTypes / deleteClauseType (browser mode localStorage)
 * - BLOCK_ROLE_MAP mapping
 * - Nominalization detection (verb in E slot → verboide_sn)
 * - Custom sentence type persistence
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { saveClauseType, getPragmaticClauseTypes, deleteClauseType } from '../../services/grammarDb';
import { BLOCK_ROLE_MAP } from '../GrammarPragmaticPanel';
import { resolveLexicalCategory, isSubcategory } from '../../data/taxonomy';

// Mock localStorage for browser-mode tests
const store: Record<string, string> = {};
globalThis.localStorage = {
  getItem: vi.fn((k: string) => store[k] ?? null),
  setItem: vi.fn((k: string, v: string) => { store[k] = v; }),
  removeItem: vi.fn((k: string) => { delete store[k]; }),
  clear: vi.fn(() => { Object.keys(store).forEach(k => delete store[k]); }),
  key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
  get length() { return Object.keys(store).length; },
} as any;

describe('Bloque C: saveClauseType (browser mode)', () => {
  const CUSTOM_TYPE = {
    id: 'custom_test_clause',
    label: 'Test Clause',
    description: 'A test clause type',
    blocks: [
      { blockId: 'E' as const, order: 1 },
      { blockId: 'A' as const, order: 2 },
      { blockId: 'K' as const, order: 3 },
    ],
    templates: { flexive: [], agglutinative: [], isolating: [] },
  };

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('persists a custom clause type via localStorage', async () => {
    await saveClauseType(CUSTOM_TYPE);
    const types = await getPragmaticClauseTypes();
    const found = types.find((t) => t.id === 'custom_test_clause');
    expect(found).toBeDefined();
    expect(found?.label).toBe('Test Clause');
    expect(found?.description).toBe('A test clause type');
    expect(found?.blocks).toHaveLength(3);
    expect(found?.blocks[0].blockId).toBe('E');
    expect(found?.blocks[0].order).toBe(1);
  });

  it('loads seed types alongside custom types', async () => {
    await saveClauseType(CUSTOM_TYPE);
    const types = await getPragmaticClauseTypes();
    const ids = types.map((t) => t.id);
    expect(ids).toContain('afirmation');
    expect(ids).toContain('custom_test_clause');
  });

  it('deletes a custom clause type', async () => {
    await saveClauseType(CUSTOM_TYPE);
    let types = await getPragmaticClauseTypes();
    expect(types.find((t) => t.id === 'custom_test_clause')).toBeDefined();

    await deleteClauseType('custom_test_clause');
    types = await getPragmaticClauseTypes();
    expect(types.find((t) => t.id === 'custom_test_clause')).toBeUndefined();
  });

  it('does not delete seed clause types (browser mode is no-op)', async () => {
    // In browser mode, deleteClauseType just removes from localStorage,
    // so seed types are unaffected
    await deleteClauseType('afirmation');
    const types = await getPragmaticClauseTypes();
    expect(types.find((t) => t.id === 'afirmation')).toBeDefined();
  });

  it('custom type blocks preserve order from seed data', async () => {
    const ct = {
      ...CUSTOM_TYPE,
      id: 'custom_ordered',
      label: 'Ordered Clause',
      blocks: [
        { blockId: 'K' as const, order: 1 },
        { blockId: 'A' as const, order: 2 },
        { blockId: 'E' as const, order: 3 },
      ],
    };
    await saveClauseType(ct);
    const types = await getPragmaticClauseTypes();
    const found = types.find((t) => t.id === 'custom_ordered');
    expect(found?.blocks[0].blockId).toBe('K');
    expect(found?.blocks[1].blockId).toBe('A');
    expect(found?.blocks[2].blockId).toBe('E');
  });
});

describe('Bloque C: BLOCK_ROLE_MAP', () => {
  it('maps E (Entidad) to subject', () => {
    expect(BLOCK_ROLE_MAP.E).toBe('subject');
  });

  it('maps A (Acción) to verb', () => {
    expect(BLOCK_ROLE_MAP.A).toBe('verb');
  });

  it('maps R (Receptor) to object', () => {
    expect(BLOCK_ROLE_MAP.R).toBe('object');
  });

  it('maps I (Intención) to particle', () => {
    expect(BLOCK_ROLE_MAP.I).toBe('particle');
  });

  it('maps modifier blocks (K, Q, F, C) to modifier', () => {
    expect(BLOCK_ROLE_MAP.K).toBe('modifier');
    expect(BLOCK_ROLE_MAP.Q).toBe('modifier');
    expect(BLOCK_ROLE_MAP.F).toBe('modifier');
    expect(BLOCK_ROLE_MAP.C).toBe('modifier');
  });
});

describe('Bloque C: verb-in-Entity offers nominalización', () => {
  it('detects a verb in the E slot via resolveLexicalCategory', () => {
    // Simulate a verbo entry in the E slot
    const verbEntry = { ID: 'v1', Raíz: 'amar', Categoría: 'verbo', Significado: ['amar'], Léxema: ['amar'] };
    const catKey = resolveLexicalCategory(verbEntry.Categoría);
    expect(catKey).toBe('verbo');

    // The verboide_sn (nominalized) category
    const nominalizedEntry = { ...verbEntry, Categoría: 'verboide_sn' };
    const catKeyNom = resolveLexicalCategory(nominalizedEntry.Categoría);
    expect(catKeyNom).toBe('verboide_sn');
    // verboide_sn is a subcategory of sustantivo
    expect(catKeyNom).not.toBe('verbo');
  });

  it('verboide_sn is subcategory of sustantivo', () => {
    expect(isSubcategory('verboide_sn', 'sustantivo')).toBe(true);
  });
});
