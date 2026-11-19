import { describe, expect, it } from 'vitest';
import {
    EMPTY_FORM_DATA,
    buildEntryBaseData,
    buildInitialFormState,
    findDuplicateLexemas,
    findDuplicateRaices,
    findDuplicateSignificados,
    generationModeOptions,
    getActiveModeDescription,
    getErrorMessage,
    isActionDisabled,
    isAiButtonDisabled,
    isEntryComplete,
    mapAiEntryResult,
    pickNormalizedField,
    resolveNewCategory,
    splitLexemas,
    toggleGenerationMode,
} from '../entryEditorModel';
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

describe('entryEditorModel: isEntryComplete', () => {
    it('exige significado, categoría válida, raíz y léxema', () => {
        expect(isEntryComplete(entry())).toBe(true);
        expect(isEntryComplete(entry({ Raíz: '   ' }))).toBe(false);
        expect(isEntryComplete(entry({ Categoría: 'desconocida' }))).toBe(false);
        expect(isEntryComplete(entry({ Categoría: 'n/a' }))).toBe(false);
        expect(isEntryComplete(entry({ Significado: [] }))).toBe(false);
        expect(isEntryComplete(entry({ Léxema: [] }))).toBe(false);
    });
});

describe('entryEditorModel: getActiveModeDescription', () => {
    it('avisa cuando no hay modos seleccionados', () => {
        expect(getActiveModeDescription([])).toBe('Selecciona al menos un modo para generar con IA.');
    });

    it('une las descripciones de los modos activos', () => {
        const expected = generationModeOptions
            .filter(option => option.id === 'generative' || option.id === 'etymological')
            .map(option => option.tip)
            .join(' ');

        expect(getActiveModeDescription(['generative', 'etymological'])).toBe(expected);
    });
});

describe('entryEditorModel: duplicados', () => {
    it('findDuplicateSignificados ignora mayúsculas y excluye la entrada actual', () => {
        expect(findDuplicateSignificados(['PERRO'], lexicon).map(e => e.ID)).toEqual(['1']);
        expect(findDuplicateSignificados(['perro'], lexicon, '1')).toEqual([]);
        expect(findDuplicateSignificados([], lexicon)).toEqual([]);
        expect(findDuplicateSignificados(['perro'], undefined)).toEqual([]);
    });

    it('findDuplicateRaices compara en mayúsculas', () => {
        expect(findDuplicateRaices('kal', lexicon).map(e => e.ID)).toEqual(['1']);
        expect(findDuplicateRaices('KAL', lexicon, '1')).toEqual([]);
        expect(findDuplicateRaices('   ', lexicon)).toEqual([]);
    });

    it('findDuplicateLexemas detecta coincidencias parciales de la lista', () => {
        expect(findDuplicateLexemas('tini, otro', lexicon).map(e => e.ID)).toEqual(['2']);
        expect(findDuplicateLexemas('TINI', lexicon, '2')).toEqual([]);
        expect(findDuplicateLexemas('', lexicon)).toEqual([]);
    });
});

describe('entryEditorModel: splitLexemas', () => {
    it('separa, recorta y descarta vacíos', () => {
        expect(splitLexemas('a, b ,,c')).toEqual(['a', 'b', 'c']);
        expect(splitLexemas('   ')).toEqual([]);
        expect(splitLexemas('')).toEqual([]);
    });
});

describe('entryEditorModel: resolveNewCategory', () => {
    it('resuelve categorías canónicas y reporta si son nuevas', () => {
        expect(resolveNewCategory('sustantivo', ['sustantivo'])).toEqual({ category: 'sustantivo', isNew: false });
        expect(resolveNewCategory('Sustantivo', [])).toEqual({ category: 'sustantivo', isNew: true });
    });

    it('conserva como custom una categoría no reconocida normalizada', () => {
        expect(resolveNewCategory('Mi Custom', [])).toEqual({ category: 'mi_custom', isNew: true });
    });

    it('no trata los sinónimos de desconocida como custom', () => {
        expect(resolveNewCategory('n/a', ['desconocida'])).toEqual({ category: 'desconocida', isNew: false });
        expect(resolveNewCategory('   ', [])).toEqual({ category: '', isNew: false });
    });
});

describe('entryEditorModel: pickNormalizedField', () => {
    it('ignora acentos y mayúsculas en claves y valores', () => {
        expect(pickNormalizedField({ Raiz: 'kal' }, ['Raíz'])).toBe('kal');
        expect(pickNormalizedField({ 'LÉXEMA': ['a', 'b'] }, ['Léxema'])).toBe('a, b');
        expect(pickNormalizedField({ root: 'kal' }, ['Raíz', 'Raiz', 'raiz', 'root'])).toBe('kal');
    });

    it('cae a cadena vacía si no hay coincidencia', () => {
        expect(pickNormalizedField({ Otro: 'x' }, ['Raíz'])).toBe('');
        expect(pickNormalizedField({}, ['Raíz'])).toBe('');
    });
});

describe('entryEditorModel: mapAiEntryResult', () => {
    it('mapea la respuesta de IA al formulario canónico', () => {
        const mapped = mapAiEntryResult({
            Raiz: 'kal',
            Lexema: 'kala',
            Categoría: 'sustantivo',
            Significado: 'perro, perros',
        });

        expect(mapped.formData).toEqual({ Raíz: 'KAL', Léxema: 'kala', Categoría: 'sustantivo' });
        expect(mapped.significados).toEqual(['perro', 'perros']);
    });

    it('devuelve significados nulos y categoría desconocida si vacíos', () => {
        const mapped = mapAiEntryResult({});

        expect(mapped.formData).toEqual({ Raíz: '', Léxema: '', Categoría: 'desconocida' });
        expect(mapped.significados).toBeNull();
    });
});

describe('entryEditorModel: buildEntryBaseData', () => {
    it('infiere la raíz del léxema cuando está vacía', () => {
        expect(buildEntryBaseData(['perro'], { Raíz: '', Léxema: 'boskel', Categoría: 'sustantivo' })).toEqual({
            Raíz: 'BOSK',
            Léxema: ['boskel'],
            Categoría: 'sustantivo',
            Significado: ['perro'],
        });
    });

    it('normaliza la raíz escrita y splitting de léxemas', () => {
        expect(buildEntryBaseData(['sol'], { Raíz: 'sor', Léxema: 'soro, soros', Categoría: 'sustantivo' })).toEqual({
            Raíz: 'SOR',
            Léxema: ['soro', 'soros'],
            Categoría: 'sustantivo',
            Significado: ['sol'],
        });
    });
});

describe('entryEditorModel: toggleGenerationMode', () => {
    it('agrega un modo nuevo', () => {
        expect(toggleGenerationMode(['generative'], 'derivational')).toEqual(['generative', 'derivational']);
    });

    it('quita un modo pero nunca deja la selección vacía', () => {
        expect(toggleGenerationMode(['generative', 'etymological'], 'generative')).toEqual(['etymological']);
        expect(toggleGenerationMode(['generative'], 'generative')).toEqual(['generative']);
    });
});

describe('entryEditorModel: deshabilitación de botones', () => {
    const base = {
        isSubmitting: false,
        isGenerating: false,
        isCompleting: false,
        significados: ['perro'],
        categoria: 'sustantivo',
    };

    it('habilita la acción con significado y categoría', () => {
        expect(isActionDisabled(base)).toBe(false);
        expect(isAiButtonDisabled(base)).toBe(false);
    });

    it('exige significado para la IA y significado + categoría para guardar', () => {
        expect(isActionDisabled({ ...base, significados: [] })).toBe(true);
        expect(isAiButtonDisabled({ ...base, significados: [] })).toBe(true);
        expect(isActionDisabled({ ...base, categoria: '  ' })).toBe(true);
        expect(isAiButtonDisabled({ ...base, categoria: '  ' })).toBe(false);
    });

    it('deshabilita todo mientras hay una operación en curso', () => {
        expect(isActionDisabled({ ...base, isSubmitting: true })).toBe(true);
        expect(isAiButtonDisabled({ ...base, isGenerating: true })).toBe(true);
        expect(isActionDisabled({ ...base, isCompleting: true })).toBe(true);
    });
});

describe('entryEditorModel: buildInitialFormState', () => {
    it('hidrata desde entryToEdit', () => {
        const state = buildInitialFormState(entry({ Léxema: ['kala', 'kalas'] }), null, 'complete');

        expect(state.significados).toEqual(['perro']);
        expect(state.formData).toEqual({ Raíz: 'KAL', Léxema: 'kala, kalas', Categoría: 'sustantivo' });
        expect(state.isCompleteWarning).toBe(true);
    });

    it('hidrata desde initialDataForAdd en modo add', () => {
        const state = buildInitialFormState(undefined, { Significado: 'bosque', Léxema: ['boskel'], Categoría: 'sustantivo', Raíz: 'BOS' }, 'add');

        expect(state.significados).toEqual(['bosque']);
        expect(state.formData).toEqual({ Raíz: 'BOS', Léxema: 'boskel', Categoría: 'sustantivo' });
        expect(state.isCompleteWarning).toBe(false);
    });

    it('cae al formulario vacío', () => {
        expect(buildInitialFormState(undefined, null, 'add')).toEqual({
            significados: [],
            formData: EMPTY_FORM_DATA,
            isCompleteWarning: false,
        });
    });
});

describe('entryEditorModel: getErrorMessage', () => {
    it('extrae el mensaje de un Error y de un valor plano', () => {
        expect(getErrorMessage(new Error('boom'))).toBe('boom');
        expect(getErrorMessage('boom')).toBe('boom');
        expect(getErrorMessage(undefined)).toBe('undefined');
    });
});
