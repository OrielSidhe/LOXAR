import type { GenerationMode, LexiconEntry } from '../types';
import { inferRootFromLexeme } from '../services/parser';
import { resolveLexicalCategory } from '../data/taxonomy';

/** Opción de modo de generación con IA, tal como la consume `EntryEditorForm`. */
export interface GenerationModeOption {
    id: GenerationMode;
    name: string;
    label: string;
    tip: string;
}

/** Estado editable del formulario del editor de entradas. */
export interface EntryEditorFormData {
    Raíz: string;
    Léxema: string;
    Categoría: string;
}

/** Datos base de una entrada, listos para `onAddWord`/`onUpdateWord`. */
export interface EntryBaseData {
    Raíz: string;
    Léxema: string[];
    Categoría: string;
    Significado: string[];
}

/** Resultado del mapeo tolerante de la respuesta de IA de "completar entrada". */
export interface AiEntryResult {
    formData: EntryEditorFormData;
    significados: string[] | null;
}

/** Entrada inicial opcional para el modo "add" (viene del workbench o de un bookmark). */
export type EntryEditorInitialData = {
    Significado?: string | string[];
    Léxema?: string | string[];
    Categoría?: string;
    Raíz?: string;
    extraData?: Record<string, unknown>;
};

/** Estado resuelto al sincronizar el formulario con `entryToEdit`/`initialDataForAdd`. */
export interface InitialFormState {
    significados: string[];
    formData: EntryEditorFormData;
    isCompleteWarning: boolean;
}

/** Insumo de las derivaciones de deshabilitación de botones. */
export interface EntryEditorActionState {
    isSubmitting: boolean;
    isGenerating: boolean;
    isCompleting: boolean;
    significados: string[];
    categoria: string;
}

/** Payload que recibe `onAiCompleteEntry`: el formulario actual + significados unidos. */
export type EntryEditorFormPayload = EntryEditorFormData & { Significado: string };

export const generationModeOptions: GenerationModeOption[] = [
    { id: 'generative', name: 'Perfil Generativo', label: 'Generativo', tip: 'Genera una palabra nueva siguiendo estrictamente las reglas del Perfil Generativo.' },
    { id: 'etymological', name: 'Etimológico', label: 'Etimológico', tip: 'Busca raíces de palabras relacionadas en tu léxico y las usa como inspiración.' },
    { id: 'derivational', name: 'Derivacional', label: 'Derivacional', tip: 'Crea una palabra aplicando los afijos definidos en tu Perfil Generativo.' },
];

export const EMPTY_FORM_DATA: EntryEditorFormData = { Raíz: '', Léxema: '', Categoría: '' };

/** Categorías que la taxonomía devuelve como "desconocida" y que NO deben tratarse como custom. */
const UNCATEGORIZED_CATEGORY_PATTERN = /^(n\/a|sin_clasificar|pendiente|\?|-|n\.a|na|desconocid[oa])$/i;

const DIACRITICS_PATTERN = /[\u0300-\u036f]/g;

/** Extrae un mensaje legible de un error desconocido sin depender de `any`. */
export const getErrorMessage = (error: unknown): string =>
    error instanceof Error ? error.message : String(error);

const normalizeKey = (key: string): string =>
    key.normalize('NFD').replace(DIACRITICS_PATTERN, '').toLowerCase();

/** Una entrada está completa cuando tiene significado, categoría válida, raíz y léxema. */
export const isEntryComplete = (entry: LexiconEntry): boolean =>
    !!(
        entry.Significado?.[0]?.trim() &&
        entry.Categoría?.trim() &&
        entry.Categoría !== 'desconocida' &&
        entry.Categoría !== 'n/a' &&
        entry.Raíz?.trim() &&
        entry.Léxema?.[0]?.trim()
    );

/** Texto de ayuda que describe los modos de generación seleccionados. */
export const getActiveModeDescription = (modes: GenerationMode[]): string => {
    if (modes.length === 0) return 'Selecciona al menos un modo para generar con IA.';
    return modes
        .map(mode => generationModeOptions.find(option => option.id === mode)?.tip)
        .filter((tip): tip is string => Boolean(tip))
        .join(' ');
};

/** Entradas del léxico cuyo significado coincide con alguno de los introducidos. */
export const findDuplicateSignificados = (
    significados: string[],
    lexicon: LexiconEntry[] | undefined,
    currentEntryId?: string
): LexiconEntry[] => {
    if (!significados.length || !lexicon) return [];
    const normalized = significados.map(value => value.toLowerCase().trim());
    return lexicon.filter(entry =>
        entry.ID !== currentEntryId &&
        entry.Significado.some(sig => normalized.includes(sig.toLowerCase().trim()))
    );
};

/** Entradas del léxico con la misma raíz (comparación en mayúsculas). */
export const findDuplicateRaices = (
    raiz: string,
    lexicon: LexiconEntry[] | undefined,
    currentEntryId?: string
): LexiconEntry[] => {
    if (!raiz.trim() || !lexicon) return [];
    const currentRaiz = raiz.trim().toUpperCase();
    return lexicon.filter(entry =>
        entry.ID !== currentEntryId &&
        entry.Raíz?.trim().toUpperCase() === currentRaiz
    );
};

/** Entradas del léxico que comparten al menos un léxema. */
export const findDuplicateLexemas = (
    lexemaValue: string,
    lexicon: LexiconEntry[] | undefined,
    currentEntryId?: string
): LexiconEntry[] => {
    if (!lexemaValue.trim() || !lexicon) return [];
    const currentLexemas = splitLexemas(lexemaValue).map(value => value.toLowerCase());
    return lexicon.filter(entry =>
        entry.ID !== currentEntryId &&
        entry.Léxema.some(value => currentLexemas.includes(value.toLowerCase().trim()))
    );
};

/** Separa y limpia la lista de léxemas escrita separada por comas. */
export const splitLexemas = (value: string): string[] =>
    value.split(',').map(part => part.trim()).filter(Boolean);

export interface ResolvedCategory {
    category: string;
    isNew: boolean;
}

/**
 * Resuelve una categoría escrita a mano: usa la taxonomía cuando la reconoce y,
 * si no, la conserva como categoría custom (normalizada) salvo que sea un
 * sinónimo de "desconocida". `isNew` indica si no estaba entre las conocidas.
 */
export const resolveNewCategory = (raw: string, knownCategories: string[]): ResolvedCategory => {
    const trimmed = raw.trim();
    if (!trimmed) return { category: '', isNew: false };
    const resolved = resolveLexicalCategory(trimmed);
    const category =
        resolved === 'desconocida' && !trimmed.match(UNCATEGORIZED_CATEGORY_PATTERN)
            ? trimmed.toLowerCase().replace(/\s+/g, '_')
            : resolved;
    return {
        category,
        isNew: !knownCategories.includes(category) && !knownCategories.includes(trimmed),
    };
};

/**
 * Busca el primer campo de `obj` que coincida con alguna de `keys` ignorando
 * mayúsculas, acentos y guiones. Tolerante a respuestas de IA heterogéneas.
 */
export const pickNormalizedField = (obj: Record<string, unknown>, keys: string[]): string => {
    for (const key of keys) {
        const normalizedKey = normalizeKey(key);
        for (const objKey in obj) {
            if (normalizeKey(objKey) !== normalizedKey) continue;
            const value = obj[objKey];
            if (Array.isArray(value)) return value.join(', ');
            return String(value || '');
        }
    }
    return '';
};

/** Mapea la respuesta de "completar entrada" de IA al formulario canónico. */
export const mapAiEntryResult = (result: Record<string, unknown>): AiEntryResult => {
    const root = pickNormalizedField(result, ['Raíz', 'Raiz', 'raiz', 'root']);
    const lexeme = pickNormalizedField(result, ['Léxema', 'Lexema', 'lexema', 'lexeme']);
    const category = pickNormalizedField(result, ['Categoría', 'Categoria', 'categoria', 'category']);
    const meaning = pickNormalizedField(result, ['Significado', 'significado', 'meaning']);

    return {
        formData: {
            Raíz: root.toUpperCase(),
            Léxema: lexeme,
            Categoría: resolveLexicalCategory(category),
        },
        significados: meaning ? meaning.split(',').map(part => part.trim()).filter(Boolean) : null,
    };
};

/** Arma los datos base de la entrada; infiere la raíz del léxema si está vacía. */
export const buildEntryBaseData = (
    significados: string[],
    formData: EntryEditorFormData
): EntryBaseData => {
    const lexemas = splitLexemas(formData.Léxema);
    let raiz = formData.Raíz.trim().toUpperCase();
    if (!raiz && lexemas.length > 0) {
        raiz = inferRootFromLexeme(lexemas[0]).toUpperCase();
    }
    return {
        Raíz: raiz,
        Léxema: lexemas,
        Categoría: formData.Categoría,
        Significado: significados,
    };
};

/** Alterna un modo de generación; nunca deja la selección vacía. */
export const toggleGenerationMode = (modes: GenerationMode[], mode: GenerationMode): GenerationMode[] => {
    const next = new Set(modes);
    if (next.has(mode)) {
        if (next.size > 1) next.delete(mode);
    } else {
        next.add(mode);
    }
    return Array.from(next);
};

export const isActionDisabled = (state: EntryEditorActionState): boolean =>
    state.isSubmitting ||
    state.isGenerating ||
    state.isCompleting ||
    state.significados.length === 0 ||
    !state.categoria.trim();

export const isAiButtonDisabled = (state: EntryEditorActionState): boolean =>
    state.isSubmitting ||
    state.isGenerating ||
    state.isCompleting ||
    state.significados.length === 0;

/** Resuelve el estado inicial del formulario según el modo y la entrada activa. */
export const buildInitialFormState = (
    entryToEdit: LexiconEntry | undefined,
    initialDataForAdd: EntryEditorInitialData | null | undefined,
    mode: 'add' | 'complete'
): InitialFormState => {
    if (entryToEdit) {
        return {
            significados: entryToEdit.Significado || [],
            formData: {
                Raíz: entryToEdit.Raíz || '',
                Léxema: entryToEdit.Léxema.join(', ') || '',
                Categoría: entryToEdit.Categoría || '',
            },
            isCompleteWarning: mode === 'complete' ? isEntryComplete(entryToEdit) : false,
        };
    }

    if (mode === 'add' && initialDataForAdd) {
        const initialSignificados = Array.isArray(initialDataForAdd.Significado)
            ? initialDataForAdd.Significado
            : initialDataForAdd.Significado
                ? [initialDataForAdd.Significado]
                : [];
        const initialLexemas = Array.isArray(initialDataForAdd.Léxema)
            ? initialDataForAdd.Léxema.join(', ')
            : initialDataForAdd.Léxema || '';

        return {
            significados: initialSignificados,
            formData: {
                Categoría: initialDataForAdd.Categoría || '',
                Raíz: initialDataForAdd.Raíz || '',
                Léxema: initialLexemas,
            },
            isCompleteWarning: false,
        };
    }

    return { significados: [], formData: { ...EMPTY_FORM_DATA }, isCompleteWarning: false };
};
