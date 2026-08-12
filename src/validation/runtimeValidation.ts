// src/validation/runtimeValidation.ts
import { realizeLexeme } from '../services/grammar/morphology';
import { realizeClause } from '../services/grammar/syntax';
import { validate } from '../services/grammar/phonology';
import type { GrammarManifest } from '../types';

/**
 * Validates that the grammar engine is working correctly by performing
 * a simple smoke test: inflect a dummy lexeme, build a clause, and validate phonotactics.
 * 
 * @returns true if all subsystems pass, false otherwise
 */
export function validateGrammarEngine(): boolean {
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

    // Create a dummy lexicon entry
    const dummyLexeme = {
      ID: 'test',
      Raíz: 'test',
      Léxema: ['test'],
      Categoría: 'verbo',
      Significado: ['test'],
      extraData: {},
    };

    // Test morphology: inflect the dummy lexeme
    const lexResult = realizeLexeme(dummyLexeme, {}, testManifest);
    if (!lexResult || typeof lexResult.form !== 'string') {
      return false;
    }

    // Test syntax: build a simple clause with one word
    const clauseFeatures = {
      participants: [
        {
          role: 'V', // verb
          lexeme: dummyLexeme,
          features: {}, // empty features
        },
      ],
    };
    const clauseResult = realizeClause(clauseFeatures, testManifest);
    if (!clauseResult || typeof clauseResult.sentence !== 'string') {
      return false;
    }

    // Test phonology: validate a simple CV syllable (should pass with default phonology)
    const phonologyResult = validate('ka', {
      inventory: {
        vowels: ['a', 'e', 'i', 'o', 'u'],
        consonants: ['k'],
      },
      phonotactics: {
        syllableStructures: ['CV', 'CVC'],
      },
    } as any);
    if (!Array.isArray(phonologyResult)) {
      return false;
    }

    return true;
  } catch (error) {
    // Any error means the engine is not working correctly
    return false;
  }
}