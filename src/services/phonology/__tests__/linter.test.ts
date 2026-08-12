import assert from 'node:assert';
import { lintPhonotactics, isValidPhonotactics } from '../linter';
import type { PhonologyConfig } from '../../../types';

console.log('Testing phonotactic linter...');

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

// Test 1: Valid CV word
try {
  const result = lintPhonotactics('pa', config);
  assert.strictEqual(result.length, 0, 'CV word "pa" should have no issues');
  console.log('Test 1 PASSED: CV word valid');
} catch (e) {
  console.error('Test 1 FAILED:', e);
  process.exit(1);
}

// Test 2: Valid CVC word
try {
  const result = lintPhonotactics('pat', config);
  assert.strictEqual(result.length, 0, 'CVC word "pat" should have no issues');
  console.log('Test 2 PASSED: CVC word valid');
} catch (e) {
  console.error('Test 2 FAILED:', e);
  process.exit(1);
}

// Test 3: Invalid segment (not in inventory)
try {
  const result = lintPhonotactics('pax', config);
  assert.strictEqual(result.length, 1, 'Word "pax" should have 1 issue (x not in inventory)');
  assert.strictEqual(result[0].severity, 'error', 'Should be error severity');
  console.log('Test 3 PASSED: Invalid segment detected');
} catch (e) {
  console.error('Test 3 FAILED:', e);
  process.exit(1);
}

// Test 4: Invalid syllable structure
try {
  const result = lintPhonotactics('ppt', config);
  assert.ok(result.some(i => i.msg.includes('syllable structure')), 'Should detect invalid structure');
  console.log('Test 4 PASSED: Invalid syllable structure detected');
} catch (e) {
  console.error('Test 4 FAILED:', e);
  process.exit(1);
}

// Test 5: isValidPhonotactics helper
try {
  assert.strictEqual(isValidPhonotactics('pa', config), true, 'CV word should be valid');
  assert.strictEqual(isValidPhonotactics('pax', config), false, 'Word with invalid segment should be invalid');
  console.log('Test 5 PASSED: isValidPhonotactics helper works');
} catch (e) {
  console.error('Test 5 FAILED:', e);
  process.exit(1);
}

// Test 6: Allowed consonant cluster
try {
  const result = lintPhonotactics('pla', config);
  // 'pl' is in allowed clusters, so no warning
  assert.strictEqual(result.length, 0, 'Allowed cluster "pl" should not produce warnings');
  console.log('Test 6 PASSED: Allowed consonant cluster accepted');
} catch (e) {
  console.error('Test 6 FAILED:', e);
  process.exit(1);
}

console.log('ALL LINTER TESTS PASSED');
