import { describe, it, expect } from 'vitest';
import { validate } from '../phonology';
import type { PhonologyConfig } from '../../../types';

describe('phonology', () => {
  const ph: PhonologyConfig = {
    inventory: { consonants: ['p','t','k','n','s'], vowels: ['a','e','i','o','u'] },
    phonotactics: { syllableStructures: ['CV','CVC'], maxConsonantClusters: 1 },
  };

  it('validates pato as CV.CV', () => {
    expect(validate('pato', ph)).toEqual([]);
  });

  it('rejects invalid segments', () => {
    expect(validate('xzq', ph).length).toBeGreaterThan(0);
  });
});
