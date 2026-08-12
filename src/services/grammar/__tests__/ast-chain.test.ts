import { describe, it, expect } from 'vitest';
import { buildClauseAST } from '../ast-builder';
import { realizeClause } from '../syntax';
import type { GrammarManifest } from '../../../types';

const manifest: GrammarManifest = {
  meta: { author: 't', version: '1', sourceFormat: 'json', lastUpdated: '' },
  typology: { wordOrder: 'SVO', alignment: 'n', morphology: 'a', headDirection: 'h' },
  roles: [], strategies: [], paradigms: [], mutationRules: [], exceptions: [], notes: [],
};

const lex = (raiz: string, cat: string) => ({ ID: raiz, Raíz: raiz, Léxema: [raiz], Categoría: cat, Significado: [raiz], extraData: {} });

describe('ast-chain', () => {
  it('handles independent preverbal particle', () => {
    const ast = buildClauseAST([
      { role: 'subject', lexeme: lex('ael', 'sustantivo'), features: {} },
      { role: 'verb', lexeme: lex('vilya', 'verbo'), features: { tense: 'present' } },
      { role: 'particle', lexeme: lex('vo', 'partícula'), features: { aspect: 'perfect' } },
    ]);
    const pNode = ast.root.dependents.find((d: any) => d.role === 'particle');
    pNode.isIndependentWord = true;

    const result = realizeClause(ast, manifest);
    expect(result.sentence.includes('vo')).toBeTruthy();
    expect(result.sentence.startsWith('vo ') || result.sentence.includes(' vo ')).toBeTruthy();
  });

  it('handles verbal chain with auxiliaries', () => {
    const ast = buildClauseAST([
      { role: 'subject', lexeme: lex('ren', 'sustantivo'), features: {} },
      { role: 'verb', lexeme: lex('dwa', 'verbo'), features: { tense: 'past' } },
      { role: 'auxiliary_verb', lexeme: lex('tiet', 'verbo'), features: {} },
      { role: 'auxiliary_verb', lexeme: lex('vlent', 'verbo'), features: {} },
    ]);
    ast.root.dependents
      .filter((d: any) => d.role === 'auxiliary_verb')
      .forEach((d: any) => { d.conjugateRoot = false; });

    const result = realizeClause(ast, manifest);
    expect(result.sentence.includes('tiet')).toBeTruthy();
    expect(result.sentence.includes('vlent')).toBeTruthy();
  });

  it('handles nested modifier', () => {
    const subjectWithModifier = {
      role: 'subject',
      lexeme: lex('ael', 'sustantivo'),
      features: {},
      dependents: [
        { role: 'modifier', lexeme: lex('azul', 'adjetivo'), features: {} },
      ],
    };
    const ast = buildClauseAST([
      subjectWithModifier as any,
      { role: 'verb', lexeme: lex('vilya', 'verbo'), features: {} },
    ]);
    const result = realizeClause(ast, manifest);
    expect(result.sentence.includes('azul')).toBeTruthy();
  });
});
