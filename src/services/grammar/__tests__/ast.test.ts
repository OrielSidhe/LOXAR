import { describe, it, expect } from 'vitest';
import { buildClauseAST } from '../ast-builder';
import { astToDiagram } from '../ast-view';

const participants = [
  { role: 'subject', lexeme: { Raíz: 'ael', Categoría: 'sustantivo' }, features: {} },
  { role: 'verb', lexeme: { Raíz: 'vilya', Categoría: 'verbo' }, features: { tense: 'present' } },
  { role: 'object', lexeme: { Raíz: 'lafa', Categoría: 'sustantivo' }, features: {} },
  { role: 'particle', lexeme: { Raíz: 'vo', Categoría: 'partícula' }, features: { aspect: 'perfect' } },
];

describe('ast', () => {
  it('builds correct AST and diagram', () => {
    const ast = buildClauseAST(participants);
    expect(ast.root.role).toBe('root');
    expect(ast.root.lexeme.category).toBe('verb');
    expect(ast.root.conjugateRoot).toBe(true);
    expect(ast.root.dependents.length).toBe(3);

    const diagram = astToDiagram(ast);
    expect(diagram.nodes.length).toBe(4);
    expect(diagram.edges.length).toBe(3);
    for (const edge of diagram.edges) {
      expect(edge.fromId).toBe(ast.root.id);
    }
  });
});
