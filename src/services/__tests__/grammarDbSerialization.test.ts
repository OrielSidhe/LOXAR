/**
 * P1 God Component — guards de las columnas JSON de `grammarDb.ts`.
 *
 * Las columnas JSON de SQLite no tienen garantía de forma en compilación:
 * `parseStringArray`/`parseBlockIds`/`parseClauseTypeIds`/`parseBlockRefs`/
 * `parseTemplates` y los type guards son la frontera que evita que el `any` de
 * `JSON.parse` llegue a los tipos de dominio.
 */
import { describe, it, expect } from 'vitest';
import {
  isPragmaticBlockId,
  isPragmaticClauseTypeId,
  isPragmaticBlockRef,
  isPragmaticClauseType,
  parseStringArray,
  parseBlockIds,
  parseClauseTypeIds,
  parseBlockRefs,
  parseTemplates,
} from '../grammarDb';

describe('grammarDb JSON column guards', () => {
  it('isPragmaticBlockId accepts only the E/A/R/I/C/K/Q/F union', () => {
    expect(isPragmaticBlockId('E')).toBe(true);
    expect(isPragmaticBlockId('F')).toBe(true);
    expect(isPragmaticBlockId('X')).toBe(false);
    expect(isPragmaticBlockId('')).toBe(false);
    expect(isPragmaticBlockId(3)).toBe(false);
    expect(isPragmaticBlockId(null)).toBe(false);
  });

  it('isPragmaticClauseTypeId accepts only seeded clause types', () => {
    expect(isPragmaticClauseTypeId('afirmation')).toBe(true);
    expect(isPragmaticClauseTypeId('justicial')).toBe(true);
    expect(isPragmaticClauseTypeId('nope')).toBe(false);
    expect(isPragmaticClauseTypeId(undefined)).toBe(false);
  });

  it('isPragmaticBlockRef requires a valid blockId and a numeric order', () => {
    expect(isPragmaticBlockRef({ blockId: 'E', order: 1 })).toBe(true);
    expect(isPragmaticBlockRef({ blockId: 'E', order: 1, defaultFunction: 'sustantivo' })).toBe(true);
    expect(isPragmaticBlockRef({ blockId: 'X', order: 1 })).toBe(false);
    expect(isPragmaticBlockRef({ blockId: 'E' })).toBe(false);
    expect(isPragmaticBlockRef({ order: 1 })).toBe(false);
    expect(isPragmaticBlockRef(null)).toBe(false);
  });

  it('parseStringArray returns [] on corrupt JSON or non-string arrays', () => {
    expect(parseStringArray('["a","b"]')).toEqual(['a', 'b']);
    expect(parseStringArray('[]')).toEqual([]);
    expect(parseStringArray(null)).toEqual([]);
    expect(parseStringArray(undefined)).toEqual([]);
    expect(parseStringArray('not json')).toEqual([]);
    expect(parseStringArray('[1,2]')).toEqual([]);
    expect(parseStringArray('{"a":1}')).toEqual([]);
  });

  it('parseBlockIds drops unknown ids', () => {
    expect(parseBlockIds('["E","X","A"]')).toEqual(['E', 'A']);
    expect(parseBlockIds('["X","Y"]')).toEqual([]);
  });

  it('parseClauseTypeIds drops unknown clause types', () => {
    expect(parseClauseTypeIds('["afirmation","nope","verse"]')).toEqual(['afirmation', 'verse']);
  });

  it('parseBlockRefs drops malformed entries and never throws', () => {
    expect(parseBlockRefs('[{"blockId":"E","order":1},{"blockId":"X","order":2},"nope"]'))
      .toEqual([{ blockId: 'E', order: 1 }]);
    expect(parseBlockRefs('nope')).toEqual([]);
    expect(parseBlockRefs(null)).toEqual([]);
  });

  it('parseTemplates keeps a valid record and fills missing typologies', () => {
    expect(parseTemplates('{"flexive":["a"],"agglutinative":["b"],"isolating":["c"]}')).toEqual({
      flexive: ['a'], agglutinative: ['b'], isolating: ['c'],
    });
    expect(parseTemplates('{"flexive":["a"]}')).toEqual({
      flexive: ['a'], agglutinative: [], isolating: [],
    });
    expect(parseTemplates('{"flexive":"a"}')).toEqual({
      flexive: [], agglutinative: [], isolating: [],
    });
    expect(parseTemplates('corrupt')).toEqual({ flexive: [], agglutinative: [], isolating: [] });
    expect(parseTemplates(null)).toEqual({ flexive: [], agglutinative: [], isolating: [] });
  });

  it('isPragmaticClauseType validates the full shape', () => {
    const valid = {
      id: 'afirmation', label: 'Afirmación', description: 'x',
      blocks: [{ blockId: 'E', order: 1 }],
      templates: { flexive: ['a'], agglutinative: [], isolating: [] },
    };
    expect(isPragmaticClauseType(valid)).toBe(true);
    // User-created clause types carry arbitrary ids (saveClauseType persists them).
    expect(isPragmaticClauseType({ ...valid, id: 'custom_test_clause' })).toBe(true);
    expect(isPragmaticClauseType({ ...valid, id: '' })).toBe(false);
    expect(isPragmaticClauseType({ ...valid, blocks: [{ blockId: 'X', order: 1 }] })).toBe(false);
    expect(isPragmaticClauseType({ ...valid, templates: { flexive: 'a' } })).toBe(false);
    expect(isPragmaticClauseType(null)).toBe(false);
    expect(isPragmaticClauseType('afirmation')).toBe(false);
  });
});
