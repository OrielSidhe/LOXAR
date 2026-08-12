import assert from 'node:assert';
import { validateGrammarEngine } from '../runtimeValidation';
import { realizeLexeme } from '../../services/grammar/morphology';
import { realizeClause } from '../../services/grammar/syntax';
import { validate } from '../../services/grammar/phonology';
import type { GrammarManifest } from '../../types';

console.log('Testing runtime validation...');

// Test 1: verify validateGrammarEngine runs without throwing
try {
  const result = validateGrammarEngine();
  console.log(`validateGrammarEngine() returned: ${result}`);
  assert(typeof result === 'boolean', 'Should return a boolean');
  console.log('Test 1 PASSED: validateGrammarEngine returns boolean');
} catch (e) {
  console.error('Test 1 FAILED:', e);
  process.exit(1);
}

// Test 2: verify individual components work
try {
  // Create a minimal manifest for testing
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

  // Test morphology
  const morphResult = realizeLexeme(dummyLexeme, {}, testManifest);
  assert(morphResult && typeof morphResult.form === 'string', 'Morphology should return a form');
  console.log(`Morphology result: ${morphResult.form}`);
  console.log('Test 2a PASSED: Morphology works');

  // Test syntax
  const clauseFeatures = {
    participants: [
      { role: 'V', lexeme: dummyLexeme, features: {} },
    ],
  };
  const syntaxResult = realizeClause(clauseFeatures, testManifest);
  assert(syntaxResult && typeof syntaxResult.sentence === 'string', 'Syntax should return a sentence');
  console.log(`Syntax result: ${syntaxResult.sentence}`);
  console.log('Test 2b PASSED: Syntax works');

  // Test phonology
  const phonologyResult = validate('ka', {
    inventory: { vowels: ['a', 'e', 'i', 'o', 'u'], consonants: ['k'] },
    phonotactics: { syllableStructures: ['CV', 'CVC'] },
  } as any);
  assert(Array.isArray(phonologyResult), 'Phonology should return array');
  console.log(`Phonology violations: ${phonologyResult.length}`);
  console.log('Test 2c PASSED: Phonology works');

  console.log('ALL TESTS PASSED');
} catch (e) {
  console.error('Test 2 FAILED:', e);
  process.exit(1);
}