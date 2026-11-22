import { describe, expect, it } from 'vitest';
import {
    buildLexiconCompletionStats,
    clampIncompleteIndex,
    filterPendingCompletion,
    isEntryPendingCompletion,
} from '../lexiconCompletion';
import type { LexiconEntry } from '../../types';

const entry = (overrides: Partial<LexiconEntry> = {}): LexiconEntry => ({
    ID: '1',
    Raíz: 'KAL',
    Léxema: ['kala'],
    Categoría: 'sustantivo',
    Significado: ['perro'],
    extraData: {},
    ...overrides,
});

describe('lexiconCompletion: isEntryPendingCompletion', () => {
    it('una entrada completa no está pendiente', () => {
        expect(isEntryPendingCompletion(entry())).toBe(false);
    });

    it('exige significado', () => {
        expect(isEntryPendingCompletion(entry({ Significado: [] }))).toBe(true);
        expect(isEntryPendingCompletion(entry({ Significado: ['   '] }))).toBe(true);
    });

    it('exige raíz y léxema', () => {
        expect(isEntryPendingCompletion(entry({ Raíz: '' }))).toBe(true);
        expect(isEntryPendingCompletion(entry({ Raíz: '  ' }))).toBe(true);
        expect(isEntryPendingCompletion(entry({ Léxema: [] }))).toBe(true);
        expect(isEntryPendingCompletion(entry({ Léxema: [''] }))).toBe(true);
    });

    it('exige categoría clasificada, con alias legacy en cualquier capitalización', () => {
        expect(isEntryPendingCompletion(entry({ Categoría: '' }))).toBe(true);
        expect(isEntryPendingCompletion(entry({ Categoría: 'desconocida' }))).toBe(true);
        expect(isEntryPendingCompletion(entry({ Categoría: 'Desconocida' }))).toBe(true);
        expect(isEntryPendingCompletion(entry({ Categoría: '  DESCONOCIDA  ' }))).toBe(true);
        expect(isEntryPendingCompletion(entry({ Categoría: 'n/a' }))).toBe(true);
        expect(isEntryPendingCompletion(entry({ Categoría: 'N/A' }))).toBe(true);
        expect(isEntryPendingCompletion(entry({ Categoría: 'verbo' }))).toBe(false);
    });
});

describe('lexiconCompletion: filterPendingCompletion', () => {
    it('conserva solo las pendientes y mantiene el orden', () => {
        const completa = entry({ ID: 'a' });
        const sinRaiz = entry({ ID: 'b', Raíz: '' });
        const sinSignificado = entry({ ID: 'c', Significado: [] });
        const resultado = filterPendingCompletion([completa, sinRaiz, sinSignificado]);
        expect(resultado.map(e => e.ID)).toEqual(['b', 'c']);
    });

    it('devuelve un array vacío si no hay pendientes', () => {
        expect(filterPendingCompletion([entry(), entry({ ID: 'x' })])).toEqual([]);
    });
});

describe('lexiconCompletion: buildLexiconCompletionStats', () => {
    it('cuenta el total y los pendientes', () => {
        const stats = buildLexiconCompletionStats(
            [entry(), entry({ ID: 'b' }), entry({ ID: 'c' })],
            [entry({ ID: 'b' })],
        );
        expect(stats).toEqual({ total: 3, needsFunction: 0, totalIncomplete: 1 });
    });

    it('needsFunction solo cuenta pendientes sin categoría o desconocida', () => {
        const stats = buildLexiconCompletionStats(
            [],
            [
                entry({ ID: 'b', Categoría: '', Significado: [] }),
                entry({ ID: 'c', Categoría: 'desconocida', Significado: [] }),
                entry({ ID: 'd', Categoría: 'verbo', Significado: [] }),
            ],
        );
        expect(stats.needsFunction).toBe(2);
        expect(stats.totalIncomplete).toBe(3);
    });
});

describe('lexiconCompletion: clampIncompleteIndex', () => {
    it('acota por arriba al último índice válido', () => {
        expect(clampIncompleteIndex(9, 3)).toBe(2);
    });

    it('acota por abajo a cero', () => {
        expect(clampIncompleteIndex(-4, 3)).toBe(0);
    });

    it('conserva el índice dentro del rango', () => {
        expect(clampIncompleteIndex(1, 3)).toBe(1);
    });

    it('con lote vacío el índice es cero', () => {
        expect(clampIncompleteIndex(5, 0)).toBe(0);
    });
});
