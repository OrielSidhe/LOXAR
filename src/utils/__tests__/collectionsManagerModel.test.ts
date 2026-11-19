import { describe, it, expect } from 'vitest';
import {
    Collection,
    addColumnToCollection,
    addDraftToCollection,
    buildCollectionExportData,
    buildExcelExportRows,
    buildExcelImportPlan,
    collectionFromTemplate,
    createCollection,
    isCollectionLike,
    normalizeText,
    parseStoredCollections,
    removeDraftFromCollection,
    renameColumnInCollection,
    setCollectionCell,
    toggleEntryInCollection,
} from '../collectionsManagerModel';
import type { InflectionProfile, LexiconEntry } from '../../types';

const entryA: LexiconEntry = {
    ID: '1',
    Raíz: 'kal',
    Léxema: ['kala'],
    Categoría: 'sustantivo',
    Significado: ['perro'],
    extraData: {},
};

const entryB: LexiconEntry = {
    ID: '2',
    Raíz: 'lum',
    Léxema: ['luma'],
    Categoría: 'verbo',
    Significado: ['correr'],
    extraData: {},
};

const pluralProfile: InflectionProfile = {
    paradigms: [
        {
            id: 'p1',
            name: 'plural',
            appliesTo: ['sustantivo'],
            rules: [{ id: 'r1', name: 'plural', type: 'simple', template: '{RAÍZ}s' }],
        },
    ],
};

describe('normalizeText', () => {
    it('minusculas, sin acentos y sin sensitividad a tildes', () => {
        expect(normalizeText('Árbol')).toBe('arbol');
        expect(normalizeText('arbol')).toBe(normalizeText('árbol'));
    });
});

describe('isCollectionLike / parseStoredCollections', () => {
    it('acepta colecciones con la forma mínima', () => {
        expect(isCollectionLike({ id: '1', name: 'X', entryIds: [] })).toBe(true);
        expect(isCollectionLike({ id: 1, name: 'X', entryIds: [] })).toBe(false);
        expect(isCollectionLike(null)).toBe(false);
    });

    it('filtra payloads corruptos sin lanzar', () => {
        expect(parseStoredCollections(null)).toEqual([]);
        expect(parseStoredCollections('no json')).toEqual([]);
        expect(parseStoredCollections('{"id":"1"}')).toEqual([]);
        expect(parseStoredCollections('[{"id":1,"name":"X","entryIds":[]}]')).toEqual([]);
        expect(parseStoredCollections('[{"id":"1","name":"X","entryIds":[]}]')).toHaveLength(1);
    });
});

describe('operaciones de colección', () => {
    it('createCollection recorta y aplica defaults', () => {
        const c = createCollection('  Pronombres  ');
        expect(c.name).toBe('Pronombres');
        expect(c.entryIds).toEqual([]);
        expect(c.drafts).toEqual([]);
    });

    it('collectionFromTemplate resuelve plantillas conocidas y desconocidas', () => {
        const c = collectionFromTemplate('pronombres');
        expect(c).not.toBeNull();
        expect(c!.name).toBe('Pronombres');
        expect(c!.columns).toHaveLength(6);
        expect(collectionFromTemplate('inventada')).toBeNull();
    });

    it('toggleEntryInCollection agrega y quita sin mutar', () => {
        const base: Collection = { id: 'c1', name: 'C', entryIds: [] };
        const added = toggleEntryInCollection(base, '1');
        expect(added.entryIds).toEqual(['1']);
        expect(base.entryIds).toEqual([]);
        expect(toggleEntryInCollection(added, '1').entryIds).toEqual([]);
    });

    it('setCollectionCell anida por entrada y columna', () => {
        const base: Collection = { id: 'c1', name: 'C', entryIds: ['1'] };
        const updated = setCollectionCell(base, '1', 'Plural', 'kalas');
        expect(updated.customCells).toEqual({ '1': { Plural: 'kalas' } });
        const second = setCollectionCell(updated, '1', 'Género', 'm');
        expect(second.customCells).toEqual({ '1': { Plural: 'kalas', Género: 'm' } });
    });

    it('addDraftToCollection deduplica y removeDraftFromCollection quita', () => {
        const base: Collection = { id: 'c1', name: 'C', entryIds: [] };
        const withDraft = addDraftToCollection(base, 'kala');
        expect(withDraft.drafts).toEqual(['kala']);
        expect(addDraftToCollection(withDraft, 'kala').drafts).toEqual(['kala']);
        expect(removeDraftFromCollection(withDraft, 'kala').drafts).toEqual([]);
    });

    it('addColumnToCollection y renameColumnInCollection', () => {
        const base: Collection = { id: 'c1', name: 'C', entryIds: [] };
        const withCol = addColumnToCollection(base, '  Plural  ');
        expect(withCol.columns).toHaveLength(1);
        expect(withCol.columns![0].name).toBe('Plural');
        expect(withCol.columns![0].categoryLink).toBe('Plural');

        const renamed = renameColumnInCollection(withCol, withCol.columns![0].id, 'Pl');
        expect(renamed.columns![0]).toEqual({ id: withCol.columns![0].id, name: 'Pl', categoryLink: 'Pl' });
    });
});

describe('buildCollectionExportData', () => {
    it('incluye solo entradas resueltas del léxico', () => {
        const collection: Collection = {
            id: 'c1',
            name: 'C',
            entryIds: ['1', '999'],
            description: 'desc',
            columns: [{ id: 'p', name: 'Plural', categoryLink: 'plural' }],
        };
        const data = buildCollectionExportData(collection, [entryA, entryB]);
        expect(data.name).toBe('C');
        expect(data.entries.map(e => e.ID)).toEqual(['1']);
        expect(data.columns).toHaveLength(1);
    });
});

describe('buildExcelExportRows', () => {
    it('resuelve la columna desde la inflexión cuando no hay match local', () => {
        const collection: Collection = {
            id: 'c1',
            name: 'C',
            entryIds: ['1'],
            columns: [{ id: 'p', name: 'Plural', categoryLink: 'plural' }],
        };
        const rows = buildExcelExportRows(collection, [entryA, entryB], pluralProfile);
        expect(rows).toHaveLength(1);
        expect(rows[0].ID).toBe('1');
        expect(rows[0].Plural).toBe('kalas');
    });

    it('prioriza el match del léxico sobre la inflexión', () => {
        const matchEntry: LexiconEntry = {
            ID: '3',
            Raíz: '',
            Léxema: ['kalo'],
            Categoría: 'plural',
            Significado: ['perro'],
            extraData: {},
        };
        const collection: Collection = {
            id: 'c1',
            name: 'C',
            entryIds: ['1'],
            columns: [{ id: 'p', name: 'Plural', categoryLink: 'plural' }],
        };
        const rows = buildExcelExportRows(collection, [entryA, matchEntry], pluralProfile);
        expect(rows[0].Plural).toBe('kalo');
    });

    it('prioriza la celda local sobre la inflexión', () => {
        const collection: Collection = {
            id: 'c1',
            name: 'C',
            entryIds: ['1'],
            columns: [{ id: 'p', name: 'Plural', categoryLink: 'plural' }],
            customCells: { '1': { plural: 'kala-k' } },
        };
        const rows = buildExcelExportRows(collection, [entryA], pluralProfile);
        expect(rows[0].Plural).toBe('kala-k');
    });
});

describe('buildExcelImportPlan', () => {
    it('devuelve null para una hoja vacía', () => {
        expect(buildExcelImportPlan([], [entryA], 'datos.xlsx')).toBeNull();
    });

    it('empareja filas existentes y planifica entradas nuevas', () => {
        const sheetRows = [
            { ID: '2', 'Palabra Base': 'luma', 'Categoría Base': 'verbo', Significado: 'correr', Plural: 'lumas' },
            { 'Palabra Base': 'nova', 'Categoría Base': 'sustantivo', Significado: 'casa', Plural: 'novas' },
        ];
        const plan = buildExcelImportPlan(sheetRows, [entryA, entryB], 'mislabras.xlsx');

        expect(plan).not.toBeNull();
        expect(plan!.name).toBe('mislabras');
        expect(plan!.columns).toEqual([
            expect.objectContaining({ name: 'Plural', categoryLink: 'Plural' }),
        ]);
        expect(plan!.incomingEntries).toHaveLength(1);
        expect(plan!.incomingEntries[0].Léxema).toEqual(['nova']);
        expect(plan!.incomingEntries[0].Categoría).toBe('sustantivo');
        expect(plan!.incomingEntries[0].Significado).toEqual(['casa']);
        expect(plan!.incomingEntries[0].extraData).toEqual({ sourceCollection: 'Importación Excel' });

        // 'casa' < 'correr' < 'perro' -> la entrada nueva queda reindexada en 1, la existente en 2.
        expect(plan!.entryIds).toEqual(['2', '1']);
        expect(plan!.customCells).toEqual({
            '2': { Plural: 'lumas' },
            '1': { Plural: 'novas' },
        });
    });

    it('no guarda como celda local un valor que ya existe en el léxico', () => {
        const matchEntry: LexiconEntry = {
            ID: '3',
            Raíz: '',
            Léxema: ['kalo'],
            Categoría: 'plural',
            Significado: ['perro'],
            extraData: {},
        };
        const sheetRows = [
            { ID: '1', 'Palabra Base': 'kala', 'Categoría Base': 'sustantivo', Significado: 'perro', Plural: 'kalo' },
        ];
        const plan = buildExcelImportPlan(sheetRows, [entryA, matchEntry], 'x.xlsx');
        expect(plan!.customCells).toEqual({});
    });
});
