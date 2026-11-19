import { describe, expect, it } from 'vitest';
import {
    DEFAULT_VISIBLE_COLUMNS,
    ITEMS_PER_PAGE,
    applyEditFormChange,
    filterLexiconData,
    formatLexemeDisplay,
    getCategoryColor,
    getTotalPages,
    getUniqueCategories,
    isEntryIncomplete,
    normalizeText,
    paginateEntries,
} from '../lexiconTableModel';
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

const lexicon: LexiconEntry[] = [
    entry(),
    entry({ ID: '2', Raíz: 'TIN', Léxema: ['tini'], Categoría: 'verbo', Significado: ['correr'] }),
    entry({ ID: '3', Raíz: 'SOR', Léxema: ['soro'], Categoría: 'sustantivo', Significado: ['sol'] }),
];

describe('lexiconTableModel: normalizeText', () => {
    it('minusculiza y quita diacríticos', () => {
        expect(normalizeText('Árbol')).toBe('arbol');
        expect(normalizeText('KAL')).toBe('kal');
        expect(normalizeText('arbol')).toBe(normalizeText('árbol'));
    });
});

describe('lexiconTableModel: isEntryIncomplete', () => {
    it('exige raíz, léxema y categoría canónica', () => {
        expect(isEntryIncomplete(entry())).toBe(false);
        expect(isEntryIncomplete(entry({ Raíz: '   ' }))).toBe(true);
        expect(isEntryIncomplete(entry({ Léxema: [] }))).toBe(true);
        expect(isEntryIncomplete(entry({ Léxema: ['  '] }))).toBe(true);
        expect(isEntryIncomplete(entry({ Categoría: 'desconocida' }))).toBe(true);
        expect(isEntryIncomplete(entry({ Categoría: 'n/a' }))).toBe(true);
        expect(isEntryIncomplete(entry({ Categoría: 'Sustantivo' }))).toBe(false);
    });
});

describe('lexiconTableModel: getCategoryColor', () => {
    it('es determinista y devuelve un par de clases', () => {
        const [bg, text] = getCategoryColor('sustantivo');
        expect(typeof bg).toBe('string');
        expect(typeof text).toBe('string');
        expect(getCategoryColor('sustantivo')).toEqual([bg, text]);
    });

    it('categoría vacía cae al color gris por defecto', () => {
        expect(getCategoryColor('')).toEqual(['bg-gray-500/20 border-gray-500/40', 'text-gray-400']);
    });
});

describe('lexiconTableModel: getUniqueCategories', () => {
    it('devuelve categorías únicas ordenadas y sin vacías', () => {
        expect(getUniqueCategories(lexicon)).toEqual(['sustantivo', 'verbo']);
        expect(getUniqueCategories([
            entry({ ID: '4', Categoría: '' }),
            entry({ ID: '5', Categoría: '   ' }),
        ])).toEqual([]);
        expect(getUniqueCategories([])).toEqual([]);
    });
});

describe('lexiconTableModel: formatLexemeDisplay', () => {
    it('sin formato de afijos une con coma', () => {
        expect(formatLexemeDisplay(entry({ Léxema: ['kala', 'kalu'] }), false)).toBe('kala, kalu');
    });

    it('aplica sufijo, prefijo, infijo y verbo', () => {
        expect(formatLexemeDisplay(entry({ Categoría: 'sufijo', Léxema: ['ka'] }), true)).toBe('-ka');
        expect(formatLexemeDisplay(entry({ Categoría: 'prefijo', Léxema: ['ka'] }), true)).toBe('ka-');
        expect(formatLexemeDisplay(entry({ Categoría: 'infijo', Léxema: ['ka'] }), true)).toBe('-ka-');
        expect(formatLexemeDisplay(entry({ Categoría: 'verbo', Léxema: ['kala'] }), true)).toBe('kala-');
    });

    it('conserva el guion ya presente y no toca otras categorías', () => {
        expect(formatLexemeDisplay(entry({ Categoría: 'sufijo', Léxema: ['-ka'] }), true)).toBe('-ka');
        expect(formatLexemeDisplay(entry({ Categoría: 'caso', Léxema: ['ka'] }), true)).toBe('ka');
    });
});

describe('lexiconTableModel: filterLexiconData', () => {
    it('sin filtros devuelve todo', () => {
        expect(filterLexiconData(lexicon, { searchTerm: '', categoryFilter: 'all', viewFilter: 'all' }))
            .toHaveLength(3);
    });

    it('filtra por categoría exacta', () => {
        const result = filterLexiconData(lexicon, { searchTerm: '', categoryFilter: 'verbo', viewFilter: 'all' });
        expect(result.map(e => e.ID)).toEqual(['2']);
    });

    it('filtra por vista incompleta, completa y generada por IA', () => {
        const withIncomplete = [...lexicon, entry({ ID: '9', Raíz: '', Léxema: ['x'] })];
        expect(filterLexiconData(withIncomplete, { searchTerm: '', categoryFilter: 'all', viewFilter: 'incomplete' }).map(e => e.ID))
            .toEqual(['9']);
        expect(filterLexiconData(withIncomplete, { searchTerm: '', categoryFilter: 'all', viewFilter: 'complete' }).map(e => e.ID))
            .toEqual(['1', '2', '3']);
        expect(filterLexiconData(lexicon, { searchTerm: '', categoryFilter: 'all', viewFilter: 'ai-generated' })).toEqual([]);
        expect(filterLexiconData(
            [entry({ ID: '7', extraData: { aiGenerated: true } })],
            { searchTerm: '', categoryFilter: 'all', viewFilter: 'ai-generated' }
        ).map(e => e.ID)).toEqual(['7']);
    });

    it('la búsqueda local ignora acentos y cubre raíz y extraData', () => {
        expect(filterLexiconData(lexicon, { searchTerm: 'TIN', categoryFilter: 'all', viewFilter: 'all' }).map(e => e.ID))
            .toEqual(['2']);
        expect(filterLexiconData(
            [entry({ ID: '4', extraData: { nota: 'Árbol' } })],
            { searchTerm: 'arbol', categoryFilter: 'all', viewFilter: 'all' }
        ).map(e => e.ID)).toEqual(['4']);
    });

    it('con resultados FTS intersecta y prioriza sobre la búsqueda local', () => {
        const ftsResults = [lexicon[1], lexicon[2]];
        const result = filterLexiconData(lexicon, {
            searchTerm: 'kal',
            categoryFilter: 'all',
            viewFilter: 'all',
            ftsResults,
            useExternalSearch: true,
        });
        expect(result.map(e => e.ID)).toEqual(['2', '3']);
    });

    it('con buscador externo difiere la resolución y solo aplica filtros', () => {
        const result = filterLexiconData(lexicon, {
            searchTerm: 'kal',
            categoryFilter: 'all',
            viewFilter: 'all',
            useExternalSearch: true,
        });
        expect(result.map(e => e.ID)).toEqual(['1', '2', '3']);
    });
});

describe('lexiconTableModel: paginación', () => {
    const many = Array.from({ length: 30 }, (_, i) => entry({ ID: String(i + 1) }));

    it('getTotalPages usa ITEMS_PER_PAGE', () => {
        expect(getTotalPages(30)).toBe(2);
        expect(getTotalPages(0)).toBe(0);
        expect(ITEMS_PER_PAGE).toBe(25);
    });

    it('paginateEntries devuelve la rebanada correcta', () => {
        expect(paginateEntries(many, 1)).toHaveLength(25);
        expect(paginateEntries(many, 2).map(e => e.ID)).toEqual(['26', '27', '28', '29', '30']);
        expect(paginateEntries(many, 3)).toEqual([]);
    });
});

describe('lexiconTableModel: applyEditFormChange', () => {
    it('reinterpretra Léxema y Significado como CSV', () => {
        expect(applyEditFormChange(entry(), 'Léxema', 'kala, kalu').Léxema).toEqual(['kala', 'kalu']);
        expect(applyEditFormChange(entry(), 'Significado', 'perro, can').Significado).toEqual(['perro', 'can']);
        expect(applyEditFormChange(entry(), 'Léxema', ' kala , , kalu ').Léxema).toEqual(['kala', 'kalu']);
    });

    it('asigna Raíz, externalID y Categoría', () => {
        expect(applyEditFormChange(entry(), 'Raíz', 'TIN').Raíz).toBe('TIN');
        expect(applyEditFormChange(entry(), 'Categoría', 'verbo').Categoría).toBe('verbo');
        expect(applyEditFormChange(entry(), 'externalID', 'ext-1').externalID).toBe('ext-1');
    });

    it('ignora campos desconocidos sin perder la entrada', () => {
        const original = entry();
        expect(applyEditFormChange(original, 'exceptions', 'x')).toBe(original);
    });
});

describe('lexiconTableModel: DEFAULT_VISIBLE_COLUMNS', () => {
    it('incluye las columnas base de la tabla', () => {
        expect(DEFAULT_VISIBLE_COLUMNS).toEqual(['id', 'raiz', 'lexema', 'categoria', 'significado', 'acciones']);
    });
});
