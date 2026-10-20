import { describe, it, expect } from 'vitest';
import { addDependent } from '../ast-view';
import { buildClauseAST } from '../ast-builder';
import type { GrammarManifest } from '../../../types';

const manifest: GrammarManifest = {
  meta: { author: 't', version: '1', sourceFormat: 'json', lastUpdated: '' },
  typology: { wordOrder: 'SVO', alignment: 'n', morphology: 'a', headDirection: 'h' },
  roles: [], strategies: [], paradigms: [], mutationRules: [], exceptions: [], notes: [],
};

const lex = (raiz: string, cat: string) => ({
  ID: raiz, Raíz: raiz, Léxema: [raiz], Categoría: cat, Significado: [raiz], extraData: {},
});

describe('A5: addDependent cycle detection', () => {
  it('returns the updated AST when adding a non-cyclic dependent', () => {
    const ast = buildClauseAST([
      { role: 'subject', lexeme: lex('ael', 'sustantivo'), features: {} },
      { role: 'verb', lexeme: lex('vilya', 'verbo'), features: {} },
    ]);
    const subject = ast.root.dependents.find((d: any) => d.role === 'subject');
    const child = { role: 'modifier', lexeme: lex('azul', 'adjetivo'), features: {} };

    const next = addDependent(ast, subject.id, child);
    expect(next).not.toBeNull();
    const updatedSubject = next!.root.dependents.find((d: any) => d.id === subject.id);
    expect(updatedSubject.dependents).toHaveLength(1);
    expect(updatedSubject.dependents[0].role).toBe('modifier');
  });

  it('returns null when adding a node under its own ancestor (cycle)', () => {
    const ast = buildClauseAST([
      {
        role: 'subject',
        lexeme: lex('ael', 'sustantivo'),
        features: {},
        dependents: [{ role: 'modifier', lexeme: lex('azul', 'adjetivo'), features: {} }],
      },
      { role: 'verb', lexeme: lex('vilya', 'verbo'), features: {} },
    ]);
    const root = ast.root;
    const subject = root.dependents.find((d: any) => d.role === 'subject');
    const modifier = subject.dependents.find((d: any) => d.role === 'modifier');

    // Try to attach `modifier` as a dependent of itself — cycle
    const result = addDependent(ast, modifier.id, modifier);
    expect(result).toBeNull();
  });

  it('returns null when adding root as its own dependent (self-cycle)', () => {
    const ast = buildClauseAST([
      { role: 'subject', lexeme: lex('ael', 'sustantivo'), features: {} },
      { role: 'verb', lexeme: lex('vilya', 'verbo'), features: {} },
    ]);

    const result = addDependent(ast, ast.root.id, ast.root);
    expect(result).toBeNull();
  });

  it('rejects attaching a parent node under its child', () => {
    const ast = buildClauseAST([
      {
        role: 'subject',
        lexeme: lex('ael', 'sustantivo'),
        features: {},
        dependents: [{ role: 'modifier', lexeme: lex('azul', 'adjetivo'), features: {} }],
      },
      { role: 'verb', lexeme: lex('vilya', 'verbo'), features: {} },
    ]);
    const root = ast.root;
    const subject = root.dependents.find((d: any) => d.role === 'subject');
    const modifier = subject.dependents.find((d: any) => d.role === 'modifier');

    // Attach the subject (parent) under its own modifier (child) — cycle
    const result = addDependent(ast, modifier.id, subject);
    expect(result).toBeNull();
  });
});
