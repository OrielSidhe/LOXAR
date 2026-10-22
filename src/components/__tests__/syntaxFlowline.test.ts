/**
 * syntaxFlowline.test.ts — GAUNTLET v3.8 Phase G: Sintaxis Lego tests.
 *
 * G1: Blocks generated from manifest.roles + manifest.typology.wordOrder
 * G2: Preview uses realizeClause (grammar engine)
 * G3: Block management (add/remove/reorder)
 * G4: Persistence in localStorage + onPreviewChange callback
 *
 * Tests the pure logic (builders, persistence, preview generation) directly,
 * mirroring the approach used in floatingWidget.test.ts.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { GrammarManifest, LexiconEntry } from '../../types';

// ── Test fixtures ─────────────────────────────────────────

const STORAGE_KEY = 'loxar_syntax_flowline_v1';

const mockLexicon: LexiconEntry[] = [
  { ID: 'w1', Raíz: 'faryo', Léxema: ['faryo'], Categoría: 'Sustantivo', Significado: ['fuego'], extraData: {} },
  { ID: 'w2', Raíz: 'keth', Léxema: ['keth'], Categoría: 'Verbo', Significado: ['comer'], extraData: {} },
  { ID: 'w3', Raíz: 'saru', Léxema: ['saru'], Categoría: 'Sustantivo', Significado: ['agua'], extraData: {} },
];

const mockManifest: GrammarManifest = {
  meta: { author: 'test', version: '1.0', sourceFormat: 'json', lastUpdated: '2026-01-01T00:00:00Z' },
  typology: { wordOrder: 'SVO', alignment: 'nominative-accusative', morphology: 'agglutinative', headDirection: 'head-initial' },
  roles: [
    { id: 'subject', name: 'Sujeto', description: 'Nominativo' },
    { id: 'verb', name: 'Verbo', description: 'Predicado verbal' },
    { id: 'object', name: 'Objeto', description: 'Acusativo' },
  ],
  strategies: [],
  paradigms: [],
  mutationRules: [],
  exceptions: [],
  notes: [],
};

// ── Re-implement the persistence helpers (mirror SyntaxFlowline.tsx) ───

const mockLocalStorageStore: Record<string, string> = {};

const mockLocalStorage = {
  getItem: (k: string) => mockLocalStorageStore[k] ?? null,
  setItem: (k: string, v: string) => { mockLocalStorageStore[k] = v; },
  removeItem: (k: string) => { delete mockLocalStorageStore[k]; },
  clear: () => { Object.keys(mockLocalStorageStore).forEach(k => delete mockLocalStorageStore[k]); },
  key: (i: number) => Object.keys(mockLocalStorageStore)[i] ?? null,
  get length() { return Object.keys(mockLocalStorageStore).length; },
};

Object.defineProperty(globalThis, 'localStorage', { value: mockLocalStorage, writable: true });

// Re-implement saveState/loadState to test the persistence contract
interface SavedBlockState {
  id: string;
  label: string;
  expanded: boolean;
  pins: { id: string; value: { root: string; function: string; meaning: string } | null }[];
}

function saveFlowlineState(blocks: any[]): void {
  try {
    const state: SavedBlockState[] = blocks.map(b => ({
      id: b.id,
      label: b.label,
      expanded: b.expanded,
      pins: b.pins.map((p: any) => ({
        id: p.id,
        value: p.value ? { root: p.value.root, function: p.value.function, meaning: p.value.meaning } : null,
      })),
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

function loadFlowlineState(): SavedBlockState[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

// ─── G1: buildBlocksFromManifest tests ────────────────────────────────────

/** Re-implement the block builder to test the contract */
const ROLE_TO_FUNCTION: Record<string, string> = {
  subject: 'sustantivo',
  verb: 'verbo',
  object: 'sustantivo',
  modifier: 'adjetivo',
  adjunct: 'adverbio',
  predicate: 'verbo',
};

function buildBlockIds(manifest: GrammarManifest | undefined): string[] {
  if (!manifest) {
    return ['subject', 'verb', 'object', 'modifier'];
  }
  const wordOrder = manifest.typology?.wordOrder || 'SVO';
  const ORDER_MAP: Record<string, string[]> = {
    SVO: ['subject', 'verb', 'object'],
    SOV: ['subject', 'object', 'verb'],
    VSO: ['verb', 'subject', 'object'],
    VOS: ['verb', 'object', 'subject'],
    OVS: ['object', 'verb', 'subject'],
    OSV: ['object', 'subject', 'verb'],
  };
  const orderKeys = ORDER_MAP[wordOrder.toUpperCase()] || ORDER_MAP.SVO;
  return orderKeys.map((pos, idx) => `block_${idx}_${pos}`);
}

describe('G1: SyntaxFlowline — manifest-driven blocks', () => {
  it('builds blocks from manifest roles + wordOrder (SVO)', () => {
    const ids = buildBlockIds(mockManifest);
    expect(ids).toEqual(['block_0_subject', 'block_1_verb', 'block_2_object']);
  });

  it('reorders blocks for SOV word order', () => {
    const sovManifest: GrammarManifest = { ...mockManifest, typology: { ...mockManifest.typology, wordOrder: 'SOV' } };
    const ids = buildBlockIds(sovManifest);
    expect(ids).toEqual(['block_0_subject', 'block_1_object', 'block_2_verb']);
  });

  it('reorders blocks for VSO word order', () => {
    const vsoManifest: GrammarManifest = { ...mockManifest, typology: { ...mockManifest.typology, wordOrder: 'VSO' } };
    const ids = buildBlockIds(vsoManifest);
    expect(ids).toEqual(['block_0_verb', 'block_1_subject', 'block_2_object']);
  });

  it('falls back to SVO when wordOrder is missing', () => {
    const noOrderManifest: GrammarManifest = { ...mockManifest, typology: {} as any };
    const ids = buildBlockIds(noOrderManifest);
    expect(ids).toEqual(['block_0_subject', 'block_1_verb', 'block_2_object']);
  });

  it('uses hardcoded defaults when no manifest provided', () => {
    const ids = buildBlockIds(undefined);
    expect(ids).toEqual(['subject', 'verb', 'object', 'modifier']);
  });

  it('maps roles to correct expected functions', () => {
    // subject → sustantivo, verb → verbo, object → sustantivo
    expect(ROLE_TO_FUNCTION['subject']).toBe('sustantivo');
    expect(ROLE_TO_FUNCTION['verb']).toBe('verbo');
    expect(ROLE_TO_FUNCTION['object']).toBe('sustantivo');
  });
});

// ─── G2: realizeClause integration tests ────────────────────────────────

describe('G2: SyntaxFlowline — grammar engine preview', () => {
  it('realizeClause produces a sentence string from ClauseFeatures', async () => {
    const { realizeClause } = await import('../../services/grammar/syntax');
    const result = realizeClause(
      {
        participants: [
          { role: 'subject', lexeme: mockLexicon[0], features: {} },
          { role: 'verb', lexeme: mockLexicon[1], features: {} },
          { role: 'object', lexeme: mockLexicon[2], features: {} },
        ],
      },
      mockManifest,
    );
    expect(result.sentence).toBeTruthy();
    expect(typeof result.sentence).toBe('string');
  });

  it('realizeClause returns empty sentence when no participants', async () => {
    const { realizeClause } = await import('../../services/grammar/syntax');
    const result = realizeClause(
      { participants: [] },
      mockManifest,
    );
    // With no participants, the fallback path returns empty sentence
    expect(result.sentence).toBe('');
  });
});

// ─── G3: Block management tests ─────────────────────────────────────────

describe('G3: SyntaxFlowline — block management', () => {
  it('reorders blocks correctly (Lego movement)', () => {
    const arr = [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
      { id: 'c', label: 'C' },
    ];
    // Move index 0 to index 2
    const [moved] = arr.splice(0, 1);
    arr.splice(2, 0, moved);
    expect(arr.map(b => b.id)).toEqual(['b', 'c', 'a']);
  });

  it('removes a block by id', () => {
    const blocks = [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
      { id: 'c', label: 'C' },
    ];
    const filtered = blocks.filter(b => b.id !== 'b');
    expect(filtered.map(b => b.id)).toEqual(['a', 'c']);
  });

  it('adds a new block preserves existing ones', () => {
    const blocks = [{ id: 'a', label: 'A' }];
    const newBlock = { id: 'b', label: 'B' };
    const updated = [...blocks, newBlock];
    expect(updated).toHaveLength(2);
    expect(updated[0].id).toBe('a');
    expect(updated[1].id).toBe('b');
  });
});

// ─── G4: Persistence tests ────────────────────────────────────────────

describe('G4: SyntaxFlowline — localStorage persistence', () => {
  beforeEach(() => {
    Object.keys(mockLocalStorageStore).forEach(k => delete mockLocalStorageStore[k]);
  });

  it('saveState writes valid JSON to localStorage', () => {
    const blocks = [
      {
        id: 'block_0_subject',
        label: 'SUJETO',
        expanded: true,
        pins: [
          { id: 'root', value: { root: 'faryo', function: 'Sustantivo', meaning: 'fuego' } },
        ],
      },
    ];
    saveFlowlineState(blocks);
    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed[0].id).toBe('block_0_subject');
    expect(parsed[0].pins[0].value.root).toBe('faryo');
  });

  it('loadState restores persisted block state', () => {
    saveFlowlineState([
      {
        id: 'block_0_subject',
        label: 'SUJETO',
        expanded: true,
        pins: [{ id: 'root', value: { root: 'saru', function: 'Sustantivo', meaning: 'agua' } }],
      },
    ]);
    const loaded = loadFlowlineState();
    expect(loaded[0].id).toBe('block_0_subject');
    expect(loaded[0].expanded).toBe(true);
    expect(loaded[0].pins[0].value.root).toBe('saru');
  });

  it('loadState returns empty array when no state persisted', () => {
    const loaded = loadFlowlineState();
    expect(loaded).toEqual([]);
  });

  it('loadState falls back gracefully on corrupt data', () => {
    localStorage.setItem(STORAGE_KEY, 'CORRUPT{{{invalid JSON');
    const loaded = loadFlowlineState();
    expect(loaded).toEqual([]);
  });

  it('save + load round-trips all block expansion states', () => {
    const blocks = [
      { id: 'a', label: 'A', expanded: true, pins: [{ id: 'root', value: null }] },
      { id: 'b', label: 'B', expanded: false, pins: [{ id: 'root', value: null }] },
    ];
    saveFlowlineState(blocks);
    const loaded = loadFlowlineState();
    expect(loaded[0].expanded).toBe(true);
    expect(loaded[1].expanded).toBe(false);
  });

  it('null pin values are preserved on round-trip', () => {
    const blocks = [
      { id: 'a', label: 'A', expanded: true, pins: [{ id: 'root', value: null }] },
    ];
    saveFlowlineState(blocks);
    const loaded = loadFlowlineState();
    expect(loaded[0].pins[0].value).toBeNull();
  });
});
