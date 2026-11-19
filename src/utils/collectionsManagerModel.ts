/**
 * Pure domain model for the Collections module.
 *
 * Extracted from `src/components/CollectionsManager.tsx` (P1 God Component cleanup).
 * Holds types, storage keys, collection operations, Excel export/import planning and
 * search normalization. No React state and no JSX live here.
 */
import { LexiconEntry, NewLexiconEntry, InflectionProfile } from '../types';
import { generateInflections, filterParadigmsForFunction } from './inflectionUtils';

export interface CollectionColumn {
    id: string;
    name: string;
    categoryLink: string;
}

export interface CollectionCustomCells {
    [rowEntryId: string]: {
        [columnCategory: string]: string; // local lexeme of the collection
    };
}

export interface Collection {
    id: string;
    name: string;
    entryIds: string[];
    columns?: CollectionColumn[];
    drafts?: string[];
    description?: string;
    customCells?: CollectionCustomCells;
}

export interface CollectionTemplate {
    name: string;
    description?: string;
    columns: CollectionColumn[];
}

export const ACTIVE_LEXICON_STORAGE_KEY = 'conlang_lexicon_manager_active';
export const COLLECTIONS_STORAGE_PREFIX = 'conlang_collections_';
export const COLLECTION_SHEET_NAME = 'Colección';
export const EXCEL_SYSTEM_KEYS: readonly string[] = [
    'ID',
    'Palabra Base',
    'Categoría Base',
    'Significado',
];

export const COLLECTION_TEMPLATES: Record<string, CollectionTemplate> = {
    pronombres: {
        name: 'Pronombres',
        description: 'Colección de pronombres personales, demostrativos, etc.',
        columns: [
            { id: '1sg', name: '1ra Sing', categoryLink: 'pronombre' },
            { id: '2sg', name: '2da Sing', categoryLink: 'pronombre' },
            { id: '3sg', name: '3ra Sing', categoryLink: 'pronombre' },
            { id: '1pl', name: '1ra Plur', categoryLink: 'pronombre' },
            { id: '2pl', name: '2da Plur', categoryLink: 'pronombre' },
            { id: '3pl', name: '3ra Plur', categoryLink: 'pronombre' },
        ],
    },
    preposiciones: {
        name: 'Preposiciones',
        description: 'Colección de preposiciones comunes',
        columns: [],
    },
    numeros: {
        name: 'Números',
        description: 'Colección de numerales cardinales',
        columns: [
            { id: '1', name: '1', categoryLink: 'sustantivo' },
            { id: '2', name: '2', categoryLink: 'sustantivo' },
            { id: '3', name: '3', categoryLink: 'sustantivo' },
            { id: '4', name: '4', categoryLink: 'sustantivo' },
            { id: '5', name: '5', categoryLink: 'sustantivo' },
            { id: '10', name: '10', categoryLink: 'sustantivo' },
        ],
    },
};

/** Accent/case-insensitive normalization used by collection search. */
export const normalizeText = (text: string): string =>
    text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export const collectionsStorageKey = (lexiconName: string): string =>
    `${COLLECTIONS_STORAGE_PREFIX}${lexiconName}`;

/** Runtime guard so malformed localStorage payloads cannot reach the UI as collections. */
export function isCollectionLike(value: unknown): value is Collection {
    if (typeof value !== 'object' || value === null) return false;
    const candidate = value as Record<string, unknown>;
    return (
        typeof candidate.id === 'string' &&
        typeof candidate.name === 'string' &&
        Array.isArray(candidate.entryIds) &&
        candidate.entryIds.every(id => typeof id === 'string')
    );
}

export function parseStoredCollections(raw: string | null): Collection[] {
    if (!raw) return [];
    try {
        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter(isCollectionLike);
    } catch (e) {
        console.error('Failed to parse collections', e);
        return [];
    }
}

export function readStoredCollections(activeLexiconName: string | null): Collection[] {
    if (!activeLexiconName) return [];
    return parseStoredCollections(localStorage.getItem(collectionsStorageKey(activeLexiconName)));
}

export function writeStoredCollections(
    activeLexiconName: string | null,
    collections: Collection[],
): void {
    if (!activeLexiconName) return;
    localStorage.setItem(collectionsStorageKey(activeLexiconName), JSON.stringify(collections));
}

export function createCollection(name: string, extra: Partial<Collection> = {}): Collection {
    return {
        id: Date.now().toString(),
        name: name.trim(),
        entryIds: [],
        drafts: [],
        ...extra,
    };
}

export function collectionFromTemplate(templateType: string): Collection | null {
    const template = COLLECTION_TEMPLATES[templateType];
    if (!template) return null;
    return {
        id: Date.now().toString(),
        name: template.name,
        description: template.description,
        columns: template.columns,
        entryIds: [],
        drafts: [],
    };
}

export function toggleEntryInCollection(collection: Collection, entryId: string): Collection {
    const exists = collection.entryIds.includes(entryId);
    return {
        ...collection,
        entryIds: exists
            ? collection.entryIds.filter(id => id !== entryId)
            : [...collection.entryIds, entryId],
    };
}

export function setCollectionCell(
    collection: Collection,
    entryId: string,
    colCategory: string,
    val: string,
): Collection {
    const cells = collection.customCells || {};
    const entryCells = cells[entryId] || {};
    return {
        ...collection,
        customCells: {
            ...cells,
            [entryId]: {
                ...entryCells,
                [colCategory]: val,
            },
        },
    };
}

export function addDraftToCollection(collection: Collection, term: string): Collection {
    const currentDrafts = collection.drafts || [];
    if (currentDrafts.includes(term)) return collection;
    return { ...collection, drafts: [...currentDrafts, term] };
}

export function removeDraftFromCollection(collection: Collection, draft: string): Collection {
    return { ...collection, drafts: (collection.drafts || []).filter(d => d !== draft) };
}

export function addColumnToCollection(collection: Collection, name: string): Collection {
    const trimmed = name.trim();
    const newCol: CollectionColumn = {
        id: Date.now().toString(),
        name: trimmed,
        categoryLink: trimmed,
    };
    return { ...collection, columns: [...(collection.columns || []), newCol] };
}

export function renameColumnInCollection(
    collection: Collection,
    colId: string,
    newName: string,
): Collection {
    return {
        ...collection,
        columns: collection.columns?.map(c =>
            c.id === colId ? { ...c, name: newName, categoryLink: newName } : c,
        ),
    };
}

export interface CollectionExportData {
    name: string;
    description?: string;
    columns?: CollectionColumn[];
    entries: LexiconEntry[];
}

export function buildCollectionExportData(
    collection: Collection,
    lexicon: LexiconEntry[],
): CollectionExportData {
    return {
        name: collection.name,
        description: collection.description,
        columns: collection.columns,
        entries: collection.entryIds
            .map(id => lexicon.find(e => e.ID === id))
            .filter((e): e is LexiconEntry => Boolean(e)),
    };
}

/**
 * Builds the spreadsheet rows for a collection, resolving each custom column from:
 * an existing lexicon match, then the collection's local cell, then an inflection
 * suggestion derived from the entry's paradigms.
 */
export function buildExcelExportRows(
    collection: Collection,
    lexicon: LexiconEntry[],
    inflection: InflectionProfile,
): Record<string, string>[] {
    const cols = collection.columns || [];
    const entries = collection.entryIds
        .map(id => lexicon.find(e => e.ID === id))
        .filter((e): e is LexiconEntry => Boolean(e));

    return entries.map(entry => {
        const rowData: Record<string, string> = {
            ID: entry.ID,
            'Palabra Base': entry.Léxema.join(', '),
            'Categoría Base': entry.Categoría,
            Significado: entry.Significado.join(', '),
        };

        cols.forEach(col => {
            const targetMeaning = entry.Significado[0]?.toLowerCase().trim();
            const match = targetMeaning
                ? lexicon.find(
                      e =>
                          e.Categoría.toLowerCase() === col.categoryLink.toLowerCase() &&
                          e.Significado.some(s => s.toLowerCase().trim() === targetMeaning),
                  )
                : null;

            const localVal = collection.customCells?.[entry.ID]?.[col.categoryLink] || '';

            let val = '';
            if (match) {
                val = match.Léxema.join(', ');
            } else if (localVal) {
                val = localVal;
            } else if (inflection) {
                const relevantParadigms = filterParadigmsForFunction(
                    inflection.paradigms,
                    entry.Categoría,
                );
                for (const p of relevantParadigms) {
                    const forms = generateInflections(entry, p, inflection);
                    const found = forms.find(
                        f => f.name.toLowerCase() === col.categoryLink.toLowerCase(),
                    );
                    if (found) {
                        val = found.result;
                        break;
                    }
                }
            }

            rowData[col.name] = val;
        });

        return rowData;
    });
}

export interface ExcelImportPlan {
    name: string;
    columns: CollectionColumn[];
    entryIds: string[];
    customCells: CollectionCustomCells;
    incomingEntries: NewLexiconEntry[];
}

type ImportableEntry = LexiconEntry | NewLexiconEntry;

interface PendingRow {
    row: Record<string, unknown>;
    searchQuery?: { word: string; meaning: string };
    isNew: boolean;
    tempIndex?: number;
    existingEntry?: LexiconEntry;
}

const cellText = (row: Record<string, unknown>, key: string): string => {
    const value = row[key];
    return value === undefined || value === null ? '' : value.toString().trim();
};

const splitList = (raw: string): string[] =>
    raw
        .split(',')
        .map(part => part.trim());

/**
 * Plans an Excel import without touching global state: matches rows against the active
 * lexicon, simulates the post-merge reindex, and produces the new collection plus the
 * entries that must be added to the lexicon.
 */
export function buildExcelImportPlan(
    sheetRows: Record<string, unknown>[],
    lexicon: LexiconEntry[],
    fileName: string,
): ExcelImportPlan | null {
    if (sheetRows.length === 0) return null;

    const firstRow = sheetRows[0];
    const allKeys = Object.keys(firstRow);
    const customColNames = allKeys.filter(k => !EXCEL_SYSTEM_KEYS.includes(k));

    const newColumns: CollectionColumn[] = customColNames.map(name => ({
        id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 5),
        name,
        categoryLink: name,
    }));

    const incomingEntries: NewLexiconEntry[] = [];
    const excelRowsToProcess: PendingRow[] = [];

    sheetRows.forEach(row => {
        let entry: LexiconEntry | undefined;

        if (cellText(row, 'ID') !== '') {
            const rowId = cellText(row, 'ID');
            entry = lexicon.find(e => e.ID === rowId);
        }

        const baseWord = cellText(row, 'Palabra Base');
        if (!entry && baseWord !== '') {
            const targetWord = baseWord.toLowerCase();
            const rawMeaning = row['Significado'];
            const targetMeaning = rawMeaning ? cellText(row, 'Significado').toLowerCase() : '';

            entry = lexicon.find(
                e =>
                    e.Léxema.some(l => l.trim().toLowerCase() === targetWord) &&
                    (targetMeaning
                        ? e.Significado.some(s => s.trim().toLowerCase() === targetMeaning)
                        : true),
            );
        }

        if (entry) {
            excelRowsToProcess.push({ row, isNew: false, existingEntry: entry });
        } else if (baseWord !== '') {
            const newEntry: NewLexiconEntry = {
                Raíz: '',
                Léxema: splitList(baseWord),
                Categoría: cellText(row, 'Categoría Base') || 'desconocida',
                Significado: row['Significado'] ? splitList(cellText(row, 'Significado')) : ['Pendiente'],
                extraData: { sourceCollection: 'Importación Excel' },
            };

            const tempIndex = incomingEntries.length;
            incomingEntries.push(newEntry);

            excelRowsToProcess.push({
                row,
                isNew: true,
                tempIndex,
                searchQuery: {
                    word: newEntry.Léxema[0]?.trim().toLowerCase() || '',
                    meaning: newEntry.Significado[0]?.trim().toLowerCase() || '',
                },
            });
        }
    });

    // Simulate the result of merging and reindexing the lexicon.
    const combinedList: ImportableEntry[] = [...lexicon, ...incomingEntries];
    const sortedCombined = [...combinedList].sort((a, b) =>
        (a.Significado[0] || '').localeCompare(b.Significado[0] || ''),
    );
    const reindexedCombined: LexiconEntry[] = sortedCombined.map((entry, index) => ({
        ...entry,
        ID: (index + 1).toString(),
    }));

    const newEntryIds: string[] = [];
    const customCells: CollectionCustomCells = {};

    excelRowsToProcess.forEach(item => {
        let finalEntry: LexiconEntry | undefined;

        if (!item.isNew && item.existingEntry) {
            finalEntry = reindexedCombined.find(
                e =>
                    e.ID === item.existingEntry!.ID ||
                    (e.Léxema.some(l => item.existingEntry!.Léxema.includes(l)) &&
                        e.Significado.some(s => item.existingEntry!.Significado.includes(s))),
            );
        } else if (item.isNew && item.searchQuery) {
            finalEntry = reindexedCombined.find(
                e =>
                    e.Léxema.some(l => l.trim().toLowerCase() === item.searchQuery!.word) &&
                    e.Significado.some(s => s.trim().toLowerCase() === item.searchQuery!.meaning),
            );
        }

        if (finalEntry) {
            const finalId = finalEntry.ID;
            newEntryIds.push(finalId);

            customColNames.forEach(colName => {
                const rawVal = item.row[colName];
                if (rawVal !== undefined && rawVal !== null && rawVal.toString().trim() !== '') {
                    const targetMeaning = finalEntry.Significado[0]?.toLowerCase().trim();
                    const hasLexiconMatch = targetMeaning
                        ? lexicon.some(
                              e =>
                                  e.Categoría.toLowerCase() === colName.toLowerCase() &&
                                  e.Significado.some(
                                      s => s.toLowerCase().trim() === targetMeaning,
                                  ) &&
                                  e.Léxema.some(
                                      l => l.trim().toLowerCase() === rawVal.toString().trim().toLowerCase(),
                                  ),
                          )
                        : false;

                    if (!hasLexiconMatch) {
                        if (!customCells[finalId]) {
                            customCells[finalId] = {};
                        }
                        customCells[finalId][colName] = rawVal.toString().trim();
                    }
                }
            });
        }
    });

    return {
        name: fileName.replace(/\.[^/.]+$/, '').replace(/_/g, ' '),
        columns: newColumns,
        entryIds: newEntryIds,
        customCells,
        incomingEntries,
    };
}
