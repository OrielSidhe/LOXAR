import assert from 'node:assert';
import { describe, test } from 'vitest';
import { lintPhonotactics, isValidPhonotactics } from '../linter';
import type { PhonologyConfig } from '../../../types';

const config: PhonologyConfig = {
  inventory: {
    consonants: ['p', 't', 'k', 'm', 'n', 'l', 's', 'r'],
    vowels: ['a', 'e', 'i', 'o', 'u'],
  },
  phonotactics: {
    syllableStructures: ['CV', 'CVC', 'V', 'CCV'],
    maxConsonantClusters: 2,
    consonantClusters: ['pl', 'tr', 'st', 'pr'],
  },
};

describe('linter', () => {
  // Test 1: Valid CV word
  test('valid CV word has no issues', () => {
    const result = lintPhonotactics('pa', config);
    assert.strictEqual(result.length, 0, 'CV word "pa" should have no issues');
  });

  // Test 2: Valid CVC word
  test('valid CVC word has no issues', () => {
    const result = lintPhonotactics('pat', config);
    assert.strictEqual(result.length, 0, 'CVC word "pat" should have no issues');
  });

  // Test 3: Invalid segment (not in inventory)
  test('invalid segment is detected', () => {
    const result = lintPhonotactics('pax', config);
    assert.strictEqual(result.length, 1, 'Word "pax" should have 1 issue (x not in inventory)');
    assert.strictEqual(result[0].severity, 'error', 'Should be error severity');
  });

  // Test 4: Invalid syllable structure
  test('invalid syllable structure is detected', () => {
    const result = lintPhonotactics('ppt', config);
    assert.ok(result.some(i => i.msg.includes('syllable structure')), 'Should detect invalid structure');
  });

  // Test 5: isValidPhonotactics helper
  test('isValidPhonotactics helper works', () => {
    assert.strictEqual(isValidPhonotactics('pa', config), true, 'CV word should be valid');
    assert.strictEqual(isValidPhonotactics('pax', config), false, 'Word with invalid segment should be invalid');
  });

  // Test 6: Allowed consonant cluster
  test('allowed consonant cluster is accepted', () => {
    const result = lintPhonotactics('pla', config);
    // 'pl' is in allowed clusters, so no warning
    assert.strictEqual(result.length, 0, 'Allowed cluster "pl" should not produce warnings');
  });
});
