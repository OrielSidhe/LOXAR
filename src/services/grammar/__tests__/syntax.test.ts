import { describe, it, expect } from 'vitest';
import { realizeClause } from '../syntax';
import type { GrammarManifest, LexiconEntry } from '../../../types';

const mk = (over: Partial<GrammarManifest> = {}): GrammarManifest => ({
  meta: { author: 't', version: '1', sourceFormat: 'json', lastUpdated: '' },
  typology: { wordOrder: 'SOV', alignment: 'n', morphology: 'a', headDirection: 'h' },
  roles: [], strategies: [], paradigms: [], mutationRules: [], exceptions: [], notes: [],
  ...over,
});

describe('syntax', () => {
  it('realizeClause produces correct SOV output', () => {
    const m = mk({ typology: { ...mk().typology, wordOrder: 'SOV' } });
    const clause = {
      participants: [
        { lexeme: { Raíz: 'na', Léxema: ['na'], Categoría: 'sustantivo', Significado: ['test'] } as any, features: {}, role: 'subject' },
        { lexeme: { Raíz: 'te', Léxema: ['te'], Categoría: 'verbo', Significado: ['test'] } as any, features: { tense: 'present' }, role: 'verb' },
        { lexeme: { Raíz: 'kor', Léxema: ['kor'], Categoría: 'sustantivo', Significado: ['test'] } as any, features: {}, role: 'object' },
      ],
    };
    const res = realizeClause(clause, m);
    expect(res.sentence).toBe('na kor te');
    expect(Array.isArray(res.canvas.nodes) && res.canvas.nodes.length > 0).toBe(true);
  });
});
