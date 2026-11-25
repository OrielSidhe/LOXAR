import { describe, expect, it } from 'vitest';
import { getNormalizedProp, normalizeResponseKey } from '../aiResponseModel';

describe('getNormalizedProp', () => {
    it('resolves keys ignoring accents and case', () => {
        expect(getNormalizedProp({ 'Raíz': 'kala', 'LÉXEMA': 'kalas' }, ['raiz', 'lexema'])).toBe('kala');
        expect(getNormalizedProp({ 'Raíz': 'kala', 'LÉXEMA': 'kalas' }, ['lexema', 'raiz'])).toBe('kalas');
    });

    it('joins arrays with comma and space', () => {
        expect(getNormalizedProp({ lexeme: ['a', 'b', 'c'] }, ['lexema', 'lexeme'])).toBe('a, b, c');
    });

    it('keeps legacy falsy-to-empty behavior', () => {
        expect(getNormalizedProp({ raiz: 0, lexema: false, glosa: null }, ['raiz'])).toBe('');
        expect(getNormalizedProp({ raiz: 0, lexema: false, glosa: null }, ['lexema'])).toBe('');
        expect(getNormalizedProp({ raiz: 0, lexema: false, glosa: null }, ['glosa'])).toBe('');
    });

    it('returns empty string for missing keys, non-objects and arrays', () => {
        expect(getNormalizedProp({ raiz: 'kala' }, ['lexema'])).toBe('');
        expect(getNormalizedProp(null, ['raiz'])).toBe('');
        expect(getNormalizedProp('kala', ['raiz'])).toBe('');
        expect(getNormalizedProp([{ raiz: 'kala' }], ['raiz'])).toBe('');
    });

    it('normalizes keys consistently', () => {
        expect(normalizeResponseKey('  LÉXEMA ')).toBe('  lexema ');
        expect(normalizeResponseKey('Raíz')).toBe(normalizeResponseKey('RAÍZ'));
    });
});
