import type { LexiconEntry, LexiconFilter } from '../types';
import { resolveLexicalCategory } from '../data/taxonomy';

/** Tamaño de página de la tabla de léxico. */
export const ITEMS_PER_PAGE = 25;

/** Columnas visibles por defecto de la tabla de léxico. */
export const DEFAULT_VISIBLE_COLUMNS: string[] = [
    'id',
    'raiz',
    'lexema',
    'categoria',
    'significado',
    'acciones',
];

const DIACRITICS_PATTERN = /[\u0300-\u036f]/g;

/** Normaliza texto para comparaciones insensibles a acentos y mayúsculas. */
export const normalizeText = (text: string): string =>
    text.normalize('NFD').replace(DIACRITICS_PATTERN, '').toLowerCase();

/**
 * Categorías canónicas de "sin clasificar": la entrada sigue incompleta.
 * Se usa el resolver de taxonomía para normalizar cualquier alias legacy.
 */
export const INCOMPLETE_CATEGORY_CANONICAL = new Set(['desconocida']);

/** Una entrada está incompleta si le falta raíz, léxema o categoría canónica. */
export const isEntryIncomplete = (entry: LexiconEntry): boolean => {
    if (!entry.Raíz?.trim()) return true;
    if (entry.Léxema.length === 0 || !entry.Léxema[0]?.trim()) return true;
    const resolved = resolveLexicalCategory(entry.Categoría);
    if (INCOMPLETE_CATEGORY_CANONICAL.has(resolved)) return true;
    return false;
};

// ── Category Color System ─────────────────────────────────────────────────────
const CATEGORY_PALETTE: [string, string][] = [
    // [bgClass, textClass] - specific named categories
    ['bg-blue-500/20 border-blue-500/40', 'text-blue-400'],       // sustantivo
    ['bg-emerald-500/20 border-emerald-500/40', 'text-emerald-400'],  // verbo
    ['bg-violet-500/20 border-violet-500/40', 'text-violet-400'],  // adjetivo
    ['bg-amber-500/20 border-amber-500/40', 'text-amber-400'],     // adverbio
    ['bg-rose-500/20 border-rose-500/40', 'text-rose-400'],        // pronombre
    ['bg-cyan-500/20 border-cyan-500/40', 'text-cyan-400'],        // preposición
    ['bg-fuchsia-500/20 border-fuchsia-500/40', 'text-fuchsia-400'], // conjunción
    ['bg-orange-500/20 border-orange-500/40', 'text-orange-400'],  // afijo/sufijo/prefijo
    ['bg-teal-500/20 border-teal-500/40', 'text-teal-400'],        // caso
    ['bg-indigo-500/20 border-indigo-500/40', 'text-indigo-400'],  // frase verbal
    ['bg-lime-500/20 border-lime-500/40', 'text-lime-400'],
    ['bg-pink-500/20 border-pink-500/40', 'text-pink-400'],
    ['bg-sky-500/20 border-sky-500/40', 'text-sky-400'],
    ['bg-yellow-500/20 border-yellow-500/40', 'text-yellow-400'],
    ['bg-red-500/20 border-red-500/40', 'text-red-400'],
];

const categoryColorCache = new Map<string, [string, string]>();

/** Color determinista por categoría: mismo color en todas las renderizaciones. */
export const getCategoryColor = (category: string): [string, string] => {
    if (!category) return ['bg-gray-500/20 border-gray-500/40', 'text-gray-400'];
    const cached = categoryColorCache.get(category);
    if (cached) return cached;

    // Deterministic hash → consistent color for same category across renders
    let hash = 0;
    for (let i = 0; i < category.length; i++) {
        hash = ((hash << 5) - hash) + category.charCodeAt(i);
        hash |= 0;
    }
    const index = Math.abs(hash) % CATEGORY_PALETTE.length;
    const color = CATEGORY_PALETTE[index];
    categoryColorCache.set(category, color);
    return color;
};

/** Categorías únicas del léxico, ordenadas alfabéticamente. */
export const getUniqueCategories = (data: LexiconEntry[]): string[] => {
    if (!data) return [];
    const categories = new Set(data.map(entry => entry.Categoría).filter(cat => cat && cat.trim() !== ''));
    return Array.from(categories).sort((a, b) => a.localeCompare(b));
};

/** Insumos del filtrado de la tabla de léxico. */
export interface LexiconFilterOptions {
    searchTerm: string;
    categoryFilter: string;
    viewFilter: LexiconFilter;
    ftsResults?: LexiconEntry[] | null;
    /** Cuando hay buscador externo (FTS5), el filtro local se limita a intersectar. */
    useExternalSearch?: boolean;
}

/**
 * Aplica los filtros de categoría, vista y búsqueda. La búsqueda local es insensible
 * a acentos y cubre ID, externalID, raíz, léxema, categoría, significado y `extraData`.
 */
export const filterLexiconData = (
    data: LexiconEntry[],
    options: LexiconFilterOptions
): LexiconEntry[] => {
    const { searchTerm, categoryFilter, viewFilter, ftsResults, useExternalSearch } = options;
    let results = data;

    if (categoryFilter !== 'all') {
        results = results.filter(entry => entry.Categoría === categoryFilter);
    }

    // Filtro de vista (el selector "Ver:" del panel de filtros).
    if (viewFilter === 'incomplete') {
        results = results.filter(isEntryIncomplete);
    } else if (viewFilter === 'complete') {
        results = results.filter(entry => !isEntryIncomplete(entry));
    } else if (viewFilter === 'ai-generated') {
        results = results.filter(entry => !!entry.extraData?.aiGenerated);
    }

    if (!searchTerm) return results;

    // If FTS5 results are available, use them as the base set.
    if (ftsResults) {
        const ftsIds = new Set(ftsResults.map(entry => entry.ID));
        return results.filter(entry => ftsIds.has(entry.ID));
    }

    if (useExternalSearch) return results;

    const lowercasedFilter = normalizeText(searchTerm);
    return results.filter(entry =>
        normalizeText(entry.ID).includes(lowercasedFilter) ||
        (entry.externalID && normalizeText(entry.externalID).includes(lowercasedFilter)) ||
        normalizeText(entry.Raíz).includes(lowercasedFilter) ||
        normalizeText(entry.Léxema.join(', ')).includes(lowercasedFilter) ||
        normalizeText(entry.Categoría).includes(lowercasedFilter) ||
        normalizeText(entry.Significado.join(', ')).includes(lowercasedFilter) ||
        (entry.extraData && Object.values(entry.extraData).some(val => normalizeText(String(val)).includes(lowercasedFilter)))
    );
};

/** Total de páginas para un conteo de entradas. */
export const getTotalPages = (count: number, perPage: number = ITEMS_PER_PAGE): number =>
    Math.ceil(count / perPage);

/** Devuelve la rebanada de entradas correspondiente a la página pedida. */
export const paginateEntries = (
    entries: LexiconEntry[],
    page: number,
    perPage: number = ITEMS_PER_PAGE
): LexiconEntry[] => {
    const startIndex = (page - 1) * perPage;
    return entries.slice(startIndex, startIndex + perPage);
};

/**
 * Muestra los léxemas de una entrada aplicando el formato de afijos activado.
 * Sufijo → `-lex`, prefijo → `lex-`, infijo → `-lex-`, verbo → `lex-`.
 */
export const formatLexemeDisplay = (entry: LexiconEntry, showAffixFormatting: boolean): string => {
    let lexemes = entry.Léxema;
    if (showAffixFormatting) {
        const cat = entry.Categoría.toLowerCase();
        if (cat.includes('sufijo') && !cat.includes('prefijo')) {
            lexemes = lexemes.map(l => l.startsWith('-') ? l : `-${l}`);
        } else if (cat.includes('prefijo') && !cat.includes('sufijo')) {
            lexemes = lexemes.map(l => l.endsWith('-') ? l : `${l}-`);
        } else if (cat.includes('infijo')) {
            lexemes = lexemes.map(l => (l.startsWith('-') && l.endsWith('-')) ? l : `-${l}-`);
        } else if (cat.includes('verbo')) {
            lexemes = lexemes.map(l => l.endsWith('-') ? l : `${l}-`);
        }
    }
    return lexemes.join(', ');
};

/** Separa y limpia una lista escrita separada por comas. */
export const splitCommaSeparated = (value: string): string[] =>
    value.split(',').map(part => part.trim()).filter(Boolean);

/**
 * Aplica un cambio del formulario de edición en línea sobre una copia de la entrada.
 * Los campos de lista (`Léxema`, `Significado`) se reinterpretan como CSV.
 */
export const applyEditFormChange = (entry: LexiconEntry, name: string, value: string): LexiconEntry => {
    if (name === 'Léxema') {
        return { ...entry, Léxema: splitCommaSeparated(value) };
    }
    if (name === 'Significado') {
        return { ...entry, Significado: splitCommaSeparated(value) };
    }
    if (name === 'externalID') {
        return { ...entry, externalID: value };
    }
    if (name === 'Raíz') {
        return { ...entry, Raíz: value };
    }
    if (name === 'Categoría') {
        return { ...entry, Categoría: value };
    }
    return entry;
};
