import { describe, it, expect } from 'vitest';
import { buildClauseAST } from '../ast-builder';
import { realizeClause } from '../syntax';
import { astToDiagram } from '../ast-view';
import { validate } from '../phonology';
import type { GrammarManifest } from '../../../types';

/**
 * Phase 4: integración extremo-a-extremo.
 * Simula una cláusula tipo Quavanol completa y verifica que el pipeline
 * AST produce superficie correcta + diagrama de nodos/aristas + fonotáctica.
 */
const manifest: GrammarManifest = {
  meta: { author: 't', version: '1', sourceFormat: 'json', lastUpdated: '' },
  typology: { wordOrder: 'SVO', alignment: 'n', morphology: 'a', headDirection: 'h' },
  roles: [], strategies: [], paradigms: [], mutationRules: [], exceptions: [], notes: [],
  phonology: {
    inventory: { vowels: ['a', 'e', 'i', 'o', 'u'], consonants: ['v', 'l', 'd', 't', 'r', 'm', 's', 'n', 'b'] },
    phonotactics: { syllableStructures: ['CV', 'CVC', 'VC'] },
  } as any,
};

const lex = (raiz: string, cat: string) => ({ ID: raiz, Raíz: raiz, Léxema: [raiz], Categoría: cat, Significado: [raiz], extraData: {} });

describe('ast-integration', () => {
  it('build -> realize -> diagram -> phonology pipeline', () => {
    const ast = buildClauseAST([
      { role: 'subject', lexeme: lex('aevin', 'sustantivo'), features: { case: 'nominative' } },
      { role: 'verb', lexeme: lex('come', 'verbo'), features: { tense: 'past' } },
      { role: 'object', lexeme: lex('pistaches', 'sustantivo'), features: { case: 'accusative' } },
      { role: 'particle', lexeme: lex('vo', 'partícula'), features: { aspect: 'perfect' } },
    ]);
    ast.root.dependents.find((d: any) => d.role === 'particle').isIndependentWord = true;

    // 1) realizeClause sobre el AST
    const result = realizeClause(ast, manifest);
    expect(typeof result.sentence).toBe('string');
    expect(result.sentence.length > 0).toBeTruthy();
    expect(result.sentence.includes('vo')).toBeTruthy();

    // 2) Diagrama derivado
    const diagram = astToDiagram(ast);
    expect(diagram.nodes.length).toBe(4);
    expect(diagram.edges.length).toBe(3);

    // 3) Validación fonotáctica de la superficie generada
    const phon = validate(result.sentence.replace(/ /g, ''), manifest.phonology);
    expect(Array.isArray(phon)).toBeTruthy();

    // 4) El canvas del resultado debe existir
    expect(result.canvas).toBeTruthy();
  });
});
