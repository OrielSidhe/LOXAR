import assert from 'node:assert';
import { describe, test } from 'vitest';
import { validateGrammarEngine } from '../runtimeValidation';
import { realizeLexeme } from '../../services/grammar/morphology';
import { realizeClause } from '../../services/grammar/syntax';
import { validate } from '../../services/grammar/phonology';
import type { GrammarManifest } from '../../types';

const testManifest: GrammarManifest = {
  meta: { author: 'test', version: '1', sourceFormat: 'json', lastUpdated: '' },
  typology: { wordOrder: 'SVO', alignment: 'n', morphology: 'a', headDirection: 'h' },
  roles: [],
  strategies: [],
  paradigms: [],
  mutationRules: [],
  exceptions: [],
  notes: [],
};

const dummyLexeme = {
  ID: 'test',
  Raíz: 'test',
  Léxema: ['test'],
  Categoría: 'verbo',
  Significado: ['test'],
  extraData: {},
};

describe('runtimeValidation', () => {
  // Test 1: verify validateGrammarEngine runs without throwing
  test('validateGrammarEngine returns boolean', () => {
    const result = validateGrammarEngine();
    assert(typeof result === 'boolean', 'Should return a boolean');
  });

  // Test 2: verify individual components work
  test('morphology syntax and phonology work', () => {
    // Test morphology
    const morphResult = realizeLexeme(dummyLexeme, {}, testManifest);
    assert(morphResult && typeof morphResult.form === 'string', 'Morphology should return a form');

    // Test syntax
    const clauseFeatures = {
      participants: [
        { role: 'V', lexeme: dummyLexeme, features: {} },
      ],
    };
    const syntaxResult = realizeClause(clauseFeatures, testManifest);
    assert(syntaxResult && typeof syntaxResult.sentence === 'string', 'Syntax should return a sentence');

    // Test phonology
    const phonologyResult = validate('ka', {
      inventory: { vowels: ['a', 'e', 'i', 'o', 'u'], consonants: ['k'] },
      phonotactics: { syllableStructures: ['CV', 'CVC'] },
    } as any);
    assert(Array.isArray(phonologyResult), 'Phonology should return array');
  });
});