import { useState, useCallback, useEffect } from 'react';
import { LexiconEntry, NewLexiconEntry, GenerativeProfile, MissingWord, CategoryOperation, HyphenOperation, NeographyProfile, InflectionProfile, LexiconData, GrammarManifest, CorpusEntry } from '../types';
import { batchDetermineCategory, generateBatchWords } from '../services/geminiService';
import { parseFileContent, processMappedData, inferRootFromLexeme } from '../services/parser';
import { isTauri, listLexiconNames, loadLexicon, saveLexicon, deleteLexicon as sqlDeleteLexicon } from '../services/sqlStorage';
import {
  DEFAULT_FUNCTIONS,
  getDefaultProfile,
  getDefaultNeographyProfile,
  getDefaultInflectionProfile,
  getDefaultGrammarManifest,
  normalizeGrammarManifest,
  normalizeLexiconData,
} from '../services/normalize';
import { useUndoRedo } from './useUndoRedo';

const LEXICON_STORAGE_KEY_PREFIX = 'conlang_lexicon_manager_';

export interface Conflict {
    existing: LexiconEntry;
    incoming: NewLexiconEntry;
}

interface ImportState {
    step: 'idle' | 'map_headers' | 'resolve_conflicts' | 'sanitize_file' | 'repair_characters' | 'error';
    rawData?: any[];
    headers?: string[];
    mapping?: { [key: string]: keyof NewLexiconEntry | 'extra' | '' };
    conflicts?: Conflict[];
    processedData?: NewLexiconEntry[];
    error?: string;
    warnings?: string[];
    errorContent?: string | null;
    parseError?: string | null;
    rawContent?: string; // Original file content for character repair
}

interface LexiconState {
    activeLexiconName: string | null;
    lexicons: { [name: string]: LexiconData };
    isDirty: boolean;
}

// NOTE: DEFAULT_FUNCTIONS and the getDefault*/normalize* helpers now live in
// `src/services/normalize.ts` (single source of truth for normalization).
// They are imported at the top of this file.

const reindexLexicon = (lexicon: NewLexiconEntry[]): LexiconEntry[] => {
    return lexicon.map((entry, index) => ({ ...entry, ID: (index + 1).toString() } as LexiconEntry));
};

const areArraysEqualIgnoringOrder = (a: string[], b: string[]): boolean => {
    if (a.length !== b.length) return false;
    const sortedA = [...a].sort();
    const sortedB = [...b].sort();
    return sortedA.every((val, index) => val === sortedB[index]);
};

const sortAndReindex = (lexicon: NewLexiconEntry[]): LexiconEntry[] => {
    const sorted = [...lexicon].sort((a, b) => (a.Significado[0] || '').localeCompare(b.Significado[0] || ''));
    return reindexLexicon(sorted);
};

const getUniqueLexiconName = (baseName: string, lexicons: { [name: string]: LexiconData }): string => {
    if (!lexicons[baseName]) return baseName;
    let index = 2;
    let candidate = `${baseName} ${index}`;
    while (lexicons[candidate]) {
        index += 1;
        candidate = `${baseName} ${index}`;
    }
    return candidate;
};

// NOTE: `normalizeEntry` and `normalizeLexiconData` now live in
// `src/services/normalize.ts` (single source of truth for normalization).

const getInitialState = (): LexiconState => {
    try {
        const lexiconListKey = `${LEXICON_STORAGE_KEY_PREFIX}list`;
        const storedLexiconList = localStorage.getItem(lexiconListKey);
        const lexiconNames = storedLexiconList ? JSON.parse(storedLexiconList) : [];

        const lexicons: { [name: string]: LexiconData } = {};
        for (const name of lexiconNames) {
            const storedLexicon = localStorage.getItem(`${LEXICON_STORAGE_KEY_PREFIX}${name}`);
            if (storedLexicon) {
                try {
                    lexicons[name] = normalizeLexiconData(JSON.parse(storedLexicon), name, '');
                } catch (e) {
                    console.error(`Failed to load lexicon "${name}" from localStorage`, e);
                }
            }
        }

        const activeLexiconName = localStorage.getItem(`${LEXICON_STORAGE_KEY_PREFIX}active`) || (lexiconNames.length > 0 ? lexiconNames[0] : null);
        if (Object.keys(lexicons).length > 0) return { lexicons, activeLexiconName, isDirty: false };

    } catch (error) { console.error("Failed to load lexicons from localStorage", error); }

    return { activeLexiconName: null, lexicons: {}, isDirty: false };
};

export const useLexicon = (
    showNotification: (message: string, type: 'success' | 'error') => void,
    setIsLoading: (loading: boolean) => void,
    setLoadingMessage: (message: string) => void,
) => {
    const [state, setState] = useState<LexiconState>(getInitialState);
    const [importState, setImportState] = useState<ImportState>({ step: 'idle' });
    const [previousState, setPreviousState] = useState<LexiconState | null>(null);
    
    // Undo/Redo stack for lexical entries changes
    const undoRedo = useUndoRedo<LexiconState>(state);

    const activeLexicon = state.activeLexiconName ? state.lexicons[state.activeLexiconName]?.entries || [] : [];
    const activeProfile = state.activeLexiconName ? state.lexicons[state.activeLexiconName]?.profile || getDefaultProfile() : getDefaultProfile();
    const activeNeographyProfile = state.activeLexiconName ? state.lexicons[state.activeLexiconName]?.neography || getDefaultNeographyProfile() : getDefaultNeographyProfile();
    const activeInflectionProfile = state.activeLexiconName ? state.lexicons[state.activeLexiconName]?.inflection || getDefaultInflectionProfile() : getDefaultInflectionProfile();
    const activeGrammar = state.activeLexiconName ? normalizeGrammarManifest(state.lexicons[state.activeLexiconName]?.grammar) : getDefaultGrammarManifest();
    const activeCorpus = state.activeLexiconName ? (state.lexicons[state.activeLexiconName]?.corpus || []) : [];
    const activeMetadata = state.activeLexiconName ? state.lexicons[state.activeLexiconName]?.metadata : null;
    const activeCustomFunctions = state.activeLexiconName ? state.lexicons[state.activeLexiconName]?.customFunctions || [] : [];
    const wordsAddedSinceSave = state.activeLexiconName ? state.lexicons[state.activeLexiconName]?.wordsAddedSinceSave || 0 : 0;
    const lexiconNames = Object.keys(state.lexicons);

    const updateActiveLexicon = useCallback((updates: Partial<LexiconData>, makeDirty: boolean = true, newWordsCount?: number) => {
        setState(prevState => {
            if (!prevState.activeLexiconName) return prevState;
            if (makeDirty && !prevState.isDirty) setPreviousState(prevState);

            const currentLexicon = prevState.lexicons[prevState.activeLexiconName];
            const updatedLexicon = { ...currentLexicon, ...updates };
            if (newWordsCount !== undefined) {
                updatedLexicon.wordsAddedSinceSave = (currentLexicon.wordsAddedSinceSave || 0) + newWordsCount;
            }

            const newState = {
                ...prevState,
                lexicons: { ...prevState.lexicons, [prevState.activeLexiconName!]: updatedLexicon },
                isDirty: makeDirty ? true : prevState.isDirty,
            };
            
            undoRedo.set(newState);
            return newState;
        });
    }, [undoRedo]);

    const updateActiveLexiconEntries = useCallback((newEntries: LexiconEntry[], makeDirty: boolean = true, newWordsCount: number = 0) => {
        updateActiveLexicon({ entries: newEntries }, makeDirty, newWordsCount);
    }, [updateActiveLexicon]);

    const createImportedLexicon = useCallback((requestedName: string, mainLanguage: string, data?: Partial<LexiconData>, makeDirty: boolean = true) => {
        const lexiconName = getUniqueLexiconName(requestedName, state.lexicons);
        const lexiconData = normalizeLexiconData(
            {
                ...data,
                metadata: {
                    conlangName: lexiconName,
                    mainLanguage,
                    ...(data?.metadata || {}),
                },
            },
            lexiconName,
            mainLanguage
        );

        setPreviousState(state);
        setState(prevState => ({
            lexicons: { ...prevState.lexicons, [lexiconName]: lexiconData },
            activeLexiconName: lexiconName,
            isDirty: makeDirty,
        }));
        localStorage.setItem(`${LEXICON_STORAGE_KEY_PREFIX}active`, lexiconName);
        return { lexiconName, lexiconData };
    }, [state]);

    const setActiveLexicon = useCallback((name: string | null) => {
        if (state.isDirty && !window.confirm("Tienes cambios sin guardar. ¿Estás seguro de que quieres cambiar? Los cambios no guardados se perderán.")) return;
        if (name === null || state.lexicons[name]) {
            setPreviousState(null);
            setState(prevState => ({ ...prevState, activeLexiconName: name, isDirty: false }));
            localStorage.setItem(`${LEXICON_STORAGE_KEY_PREFIX}active`, name || '');
        }
    }, [state.lexicons, state.isDirty]);

    const createNewLexicon = useCallback((conlangName: string, mainLanguage: string) => {
        if (state.lexicons[conlangName]) throw new Error(`Ya existe un léxico con el nombre "${conlangName}".`);
        setPreviousState(state);
        setState(prevState => {
            const newLexiconData: LexiconData = {
                entries: [],
                profile: getDefaultProfile(), neography: getDefaultNeographyProfile(), inflection: getDefaultInflectionProfile(),
                grammar: getDefaultGrammarManifest(),
                corpus: [],
                metadata: { conlangName, mainLanguage }, wordsAddedSinceSave: 0,
                customFunctions: [...DEFAULT_FUNCTIONS].sort(),
            };
            return {
                lexicons: { ...prevState.lexicons, [conlangName]: newLexiconData },
                activeLexiconName: conlangName, isDirty: true,
            };
        });
    }, [state]);

    const renameLexicon = useCallback((oldName: string, newName: string) => {
        if (!oldName || !newName || oldName === newName) return;
        if (state.lexicons[newName]) throw new Error(`Ya existe un léxico con el nombre "${newName}".`);
        localStorage.removeItem(`${LEXICON_STORAGE_KEY_PREFIX}${oldName}`);
        if (isTauri()) sqlDeleteLexicon(oldName).catch(console.error);
        setPreviousState(state);
        setState(prevState => {
            const newLexicons = { ...prevState.lexicons };
            const lexiconData = newLexicons[oldName];
            delete newLexicons[oldName];
            lexiconData.metadata.conlangName = newName;
            newLexicons[newName] = lexiconData;
            return { ...prevState, lexicons: newLexicons, activeLexiconName: newName, isDirty: true };
        });
    }, [state]);

    const deleteLexicon = useCallback((name: string) => {
        if (!state.lexicons[name]) return;
        localStorage.removeItem(`${LEXICON_STORAGE_KEY_PREFIX}${name}`);
        if (isTauri()) sqlDeleteLexicon(name).catch(console.error);
        setPreviousState(state);
        setState(prevState => {
            const newLexicons = { ...prevState.lexicons };
            delete newLexicons[name];
            let newActiveLexiconName = prevState.activeLexiconName;
            if (prevState.activeLexiconName === name) {
                const remainingNames = Object.keys(newLexicons);
                newActiveLexiconName = remainingNames.length > 0 ? remainingNames[0] : null;
            }
            localStorage.setItem(`${LEXICON_STORAGE_KEY_PREFIX}list`, JSON.stringify(Object.keys(newLexicons)));
            localStorage.setItem(`${LEXICON_STORAGE_KEY_PREFIX}active`, newActiveLexiconName || '');
            return { lexicons: newLexicons, activeLexiconName: newActiveLexiconName, isDirty: true };
        });
    }, [state]);

    const addWord = useCallback((newEntryData: NewLexiconEntry) => {
        if (!state.activeLexiconName) return;
        const currentEntries = [...(state.lexicons[state.activeLexiconName]?.entries || [])];
        currentEntries.push({ ...newEntryData, ID: '0' });
        updateActiveLexiconEntries(sortAndReindex(currentEntries), true, 1);
    }, [state.activeLexiconName, state.lexicons, updateActiveLexiconEntries]);

    const addBatchWords = useCallback((entries: NewLexiconEntry[]) => {
        if (!state.activeLexiconName) return;
        let currentEntries = [...(state.lexicons[state.activeLexiconName]?.entries || [])];
        currentEntries.push(...entries.map(e => ({ ...e, ID: '0' })));
        updateActiveLexiconEntries(sortAndReindex(currentEntries), true, entries.length);
    }, [state.activeLexiconName, state.lexicons, updateActiveLexiconEntries]);

    const editWord = useCallback((id: string, updatedEntry: LexiconEntry) => {
        const index = activeLexicon.findIndex(entry => entry.ID === id);
        if (index !== -1) {
            const newEntries = [...activeLexicon];
            newEntries[index] = updatedEntry;
            updateActiveLexiconEntries(sortAndReindex(newEntries));
        }
    }, [activeLexicon, updateActiveLexiconEntries]);

    const deleteWord = useCallback((id: string) => {
        const newEntries = activeLexicon.filter(entry => entry.ID !== id);
        updateActiveLexiconEntries(sortAndReindex(newEntries), true, -1);
    }, [activeLexicon, updateActiveLexiconEntries]);

    const deleteBatchWords = useCallback((ids: Set<string>) => {
        const newEntries = activeLexicon.filter(entry => !ids.has(entry.ID));
        updateActiveLexiconEntries(sortAndReindex(newEntries), true, -ids.size);
    }, [activeLexicon, updateActiveLexiconEntries]);

    const batchUpdateFunction = useCallback((ids: Set<string>, newFunction: string) => {
        const newEntries = activeLexicon.map(entry => ids.has(entry.ID) ? { ...entry, Categoría: newFunction } : entry);
        updateActiveLexiconEntries(sortAndReindex(newEntries));
    }, [activeLexicon, updateActiveLexiconEntries]);

    const getLexiconSample = useCallback((count: number): LexiconEntry[] => {
        if (!state.activeLexiconName) return [];
        const shuffled = [...(state.lexicons[state.activeLexiconName]?.entries || [])].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }, [state.lexicons, state.activeLexiconName]);

    const updateGenerativeProfile = useCallback((newProfile: GenerativeProfile) => updateActiveLexicon({ profile: newProfile }), [updateActiveLexicon]);
    const updateNeographyProfile = useCallback((newProfile: NeographyProfile) => updateActiveLexicon({ neography: newProfile }), [updateActiveLexicon]);
    const updateInflectionProfile = useCallback((newProfile: InflectionProfile) => updateActiveLexicon({ inflection: newProfile }), [updateActiveLexicon]);
    const updateCorpus = useCallback((newCorpus: CorpusEntry[]) => updateActiveLexicon({ corpus: newCorpus }), [updateActiveLexicon]);

    const cancelImport = useCallback(() => setImportState({ step: 'idle' }), []);

    // Import process handler - detects backup files vs individual entries
    const startImportProcess = useCallback(async (fileContent: string) => {
        try {
            // First check for corrupted characters
            const replacementChar = '\uFFFD';
            const hasCorruption = fileContent.includes(replacementChar) || /Ã[\x80-\xBF]/g.test(fileContent);

            if (hasCorruption) {
                // Start character repair flow
                setImportState({ step: 'repair_characters', rawContent: fileContent });
                return;
            }

            // No corruption, proceed with normal import
            const parseResult = await parseFileContent(fileContent);
            const { successfulData, errorContent, error, headers, warnings, isLexiconBackup, backupData } = parseResult;

            // Check if this is a full lexicon backup
            if (isLexiconBackup && backupData) {
                const requestedName = backupData.metadata?.conlangName || 'Léxico Importado';
                const mainLanguage = backupData.metadata?.mainLanguage || 'Español';

                const { lexiconName, lexiconData } = createImportedLexicon(requestedName, mainLanguage, backupData, false);
                localStorage.setItem(`${LEXICON_STORAGE_KEY_PREFIX}${lexiconName}`, JSON.stringify(lexiconData));
                localStorage.setItem(`${LEXICON_STORAGE_KEY_PREFIX}list`, JSON.stringify([...Object.keys(state.lexicons), lexiconName]));

                showNotification(`Léxico "${lexiconName}" importado exitosamente con ${lexiconData.entries.length} entradas.`, 'success');
                setImportState({ step: 'idle' });
                return;
            }

            if (!state.activeLexiconName) {
                createImportedLexicon('Léxico Importado', 'Español', undefined, true);
                showNotification('Creé un léxico nuevo para recibir la importación.', 'success');
            }

            // Otherwise, proceed with header mapping for individual entries
            if (errorContent) {
                setImportState({ step: 'sanitize_file', rawData: successfulData, errorContent, parseError: error, headers, warnings, rawContent: fileContent });
            } else {
                setImportState({ step: 'map_headers', rawData: successfulData, headers, warnings, mapping: {}, conflicts: [], processedData: [], rawContent: fileContent });
            }
        } catch (e: any) { setImportState({ step: 'error', error: e.message || 'Error al procesar el archivo.' }); }
    }, [showNotification, state.lexicons, state.activeLexiconName, createImportedLexicon]);

    const proceedWithValidEntries = useCallback(() => {
        if (importState.step !== 'sanitize_file' || !importState.rawData || importState.rawData.length === 0) {
            cancelImport();
            return;
        }
        setImportState(prev => ({ ...prev, step: 'map_headers', errorContent: null, parseError: null }));
    }, [importState, cancelImport]);

    const resanitizeAndContinue = useCallback(async (updatedErrorContent: string): Promise<{ success: boolean; error?: string }> => {
        if (importState.step !== 'sanitize_file') return { success: false, error: 'Invalid state' };
        try {
            const { successfulData, errorContent, error } = await parseFileContent(updatedErrorContent);
            if (errorContent) {
                setImportState(prev => ({ ...prev, errorContent, parseError: error }));
                return { success: false, error: error || 'El contenido todavía tiene errores.' };
            }
            setImportState(prev => ({ ...prev, step: 'map_headers', rawData: [...(prev.rawData || []), ...successfulData], errorContent: null, parseError: null }));
            return { success: true };
        } catch (e: any) {
            setImportState(prev => ({ ...prev, parseError: e.message }));
            return { success: false, error: e.message };
        }
    }, [importState]);

    const setImportMapping = useCallback((mapping: { [key: string]: keyof NewLexiconEntry | 'extra' | '' }) => {
        if (!importState.rawData) return;
        const processed = processMappedData(importState.rawData, mapping);
        const conflicts: Conflict[] = [];
        const nonConflicts: NewLexiconEntry[] = [];
        processed.forEach(incoming => {
            const existing = activeLexicon.find(e => e.Significado.some(s => incoming.Significado.includes(s)) && e.Categoría === incoming.Categoría);
            if (existing && (existing.Raíz !== incoming.Raíz || !areArraysEqualIgnoringOrder(existing.Léxema, incoming.Léxema))) {
                conflicts.push({ existing, incoming });
            } else if (!existing) {
                nonConflicts.push(incoming);
            }
        });
        if (conflicts.length > 0) {
            setImportState(prev => ({ ...prev, step: 'resolve_conflicts', processedData: nonConflicts, conflicts }));
        } else {
            addBatchWords(nonConflicts);
            showNotification(`${nonConflicts.length} entradas importadas.`, 'success');
            setImportState({ step: 'idle' });
        }
    }, [importState.rawData, activeLexicon, addBatchWords, showNotification]);

    const resolveConflict = useCallback((resolution: 'keep' | 'replace') => {
        if (!importState.conflicts || importState.conflicts.length === 0) return;
        const remainingConflicts = [...importState.conflicts];
        const conflict = remainingConflicts.shift();
        let newProcessed = [...(importState.processedData || [])];
        if (resolution === 'replace' && conflict) {
            deleteWord(conflict.existing.ID);
            newProcessed.push(conflict.incoming);
        }
        if (remainingConflicts.length > 0) {
            setImportState(prev => ({ ...prev, processedData: newProcessed, conflicts: remainingConflicts }));
        } else {
            addBatchWords(newProcessed);
            showNotification(`${newProcessed.length} entradas importadas.`, 'success');
            setImportState({ step: 'idle' });
        }
    }, [importState.conflicts, importState.processedData, addBatchWords, deleteWord, showNotification]);

    const applyCharacterRepair = useCallback(async (repairedData: string, replacements: Map<string, string>) => {
        // Log repairs for user feedback
        const repairCount = replacements.size;
        if (repairCount > 0) {
            showNotification(`${repairCount} tipo(s) de caracteres reparados.`, 'success');
        }

        // Continue with normal import flow using repaired data
        try {
            const { successfulData, errorContent, error, headers, warnings } = await parseFileContent(repairedData);
            if (errorContent) {
                setImportState({ step: 'sanitize_file', rawData: successfulData, errorContent, parseError: error, headers, warnings, rawContent: repairedData });
            } else {
                setImportState({ step: 'map_headers', rawData: successfulData, headers, warnings, mapping: {}, conflicts: [], processedData: [], rawContent: repairedData });
            }
        } catch (e: any) {
            setImportState({ step: 'error', error: e.message || 'Error al procesar el archivo reparado.' });
        }
    }, [showNotification]);

    const aiCompleteFunctions = useCallback(async (allowedFunctions: string[], onProgress?: (p: number, t: number) => void) => {
        if (!activeLexicon || activeLexicon.length === 0) return { count: 0 };
        const entriesToComplete = activeLexicon
            .filter(e => e.Significado?.[0] && (!e.Categoría || ['desconocida', 'n/a'].includes(e.Categoría)))
            .map(e => ({ id: e.ID, significado: e.Significado[0] }));
        if (entriesToComplete.length === 0) return { count: 0 };

        const results = await batchDetermineCategory(entriesToComplete.map(e => ({ id: e.id, significado: e.significado })), onProgress);
        const functionsById = new Map(results.map((res: any) => [res.id, res.categoria]));
        const newEntries = activeLexicon.map(entry => functionsById.has(entry.ID) ? { ...entry, Categoría: functionsById.get(entry.ID) as string } : entry);
        const newFunctions = new Set(results.map((r: any) => r.categoria).filter(Boolean) as string[]);

        updateActiveLexicon({
            entries: sortAndReindex(newEntries),
            customFunctions: Array.from(new Set([...allowedFunctions, ...newFunctions])).sort(),
        });
        return { count: results.length };
    }, [activeLexicon, updateActiveLexicon]);

    const aiFillMissingFields = useCallback(async (onProgress?: (p: number, t: number) => void) => {
        if (!activeProfile?.consonants?.length || !activeProfile.vowels?.length || !activeProfile.syllableStructures?.length) {
            showNotification("Por favor, completa el Perfil Generativo antes de usar esta función.", "error"); return;
        }
        setIsLoading(true);
        let currentEntries = [...activeLexicon];
        let totalFuncs = 0, totalLex = 0, totalRoots = 0;
        try {
            setLoadingMessage("Paso 1/3: Completando categorías...");
            const entriesToCat = currentEntries.filter(e => e.Significado?.[0] && (!e.Categoría || ['desconocida', 'n/a'].includes(e.Categoría)));
            if (entriesToCat.length > 0) {
                const results = await batchDetermineCategory(entriesToCat.map(e => ({ id: e.ID, significado: e.Significado[0] })), onProgress);
                const functionsById = new Map(results.map((r: any) => [r.id, r.categoria]));
                currentEntries = currentEntries.map(e => functionsById.has(e.ID) ? { ...e, Categoría: functionsById.get(e.ID) as string } : e);
                totalFuncs = results.length;
            }

            setLoadingMessage(`Paso 2/3: Generando lexemas...\n${totalFuncs} categorías completadas.`);
            const entriesToGen = currentEntries.filter(e => e.Significado?.[0] && e.Categoría && !['desconocida', 'n/a'].includes(e.Categoría) && (!e.Léxema || e.Léxema.length === 0 || !e.Léxema[0]));
            if (entriesToGen.length > 0) {
                const wordsToGen: MissingWord[] = entriesToGen.map(e => ({ Significado: e.Significado[0], Categoría: e.Categoría }));
                const generated = await generateBatchWords(wordsToGen, getLexiconSample(50), activeProfile, onProgress);
                const genMap = new Map(generated.map(w => [`${w.Significado[0]}-${w.Categoría}`, w]));
                currentEntries = currentEntries.map(e => {
                    const key = `${e.Significado[0]}-${e.Categoría}`;
                    if (genMap.has(key)) {
                        const g = genMap.get(key)!;
                        return { ...e, Raíz: g.Raíz, Léxema: g.Léxema, extraData: { ...e.extraData, aiGenerated: true } };
                    }
                    return e;
                });
                totalLex = generated.length;
            }

            setLoadingMessage(`Paso 3/3: Infiriendo raíces...\n${totalLex} lexemas generados.`);
            currentEntries = currentEntries.map(e => {
                if (e.Léxema?.[0] && !e.Raíz) {
                    totalRoots++;
                    return { ...e, Raíz: inferRootFromLexeme(e.Léxema[0]) };
                }
                return e;
            });
            updateActiveLexiconEntries(sortAndReindex(currentEntries));
            showNotification(`¡Proceso finalizado! ${totalFuncs} categorías, ${totalLex} lexemas, y ${totalRoots} raíces completadas.`, 'success');
        } catch (e) {
            showNotification(e instanceof Error ? e.message : "Ocurrió un error.", 'error');
        }
        finally { setIsLoading(false); }
    }, [activeLexicon, activeProfile, activeCustomFunctions, getLexiconSample, showNotification, setIsLoading, setLoadingMessage, updateActiveLexiconEntries]);

    const manageFunctions = useCallback((operations: CategoryOperation[]) => {
        if (!state.activeLexiconName) return;
        let currentEntries = [...(state.lexicons[state.activeLexiconName]?.entries || [])];
        let currentFunctions = new Set(state.lexicons[state.activeLexiconName]?.customFunctions || []);
        operations.forEach(op => {
            if (op.type === 'merge') {
                const fromSet = new Set(op.from);
                currentEntries = currentEntries.map(e => fromSet.has(e.Categoría) ? { ...e, Categoría: op.to } : e);
                op.from.forEach(f => currentFunctions.delete(f)); currentFunctions.add(op.to);
            } else if (op.type === 'rename') {
                currentEntries = currentEntries.map(e => e.Categoría === op.from ? { ...e, Categoría: op.to } : e);
                currentFunctions.delete(op.from); currentFunctions.add(op.to);
            } else if (op.type === 'delete') {
                currentEntries = currentEntries.map(e => e.Categoría === op.category ? { ...e, Categoría: 'desconocida' } : e);
                currentFunctions.delete(op.category);
            }
        });
        updateActiveLexicon({ entries: sortAndReindex(currentEntries), customFunctions: Array.from(currentFunctions).sort() });
    }, [state.activeLexiconName, state.lexicons, updateActiveLexicon]);

    const addCustomFunction = useCallback((newFunction: string) => {
        if (!state.activeLexiconName) return;
        const trimmed = newFunction.trim();
        if (!trimmed) return;
        const currentFns = state.lexicons[state.activeLexiconName]?.customFunctions || [];
        if (currentFns.includes(trimmed)) return;
        updateActiveLexicon({ customFunctions: [...currentFns, trimmed].sort() });
    }, [state.activeLexiconName, state.lexicons, updateActiveLexicon]);

    const manageHyphens = useCallback((op: HyphenOperation) => {
        const categorySet = new Set(op.categories);
        let changedCount = 0;
        const updatedEntries = activeLexicon.map(entry => {
            if (!categorySet.has(entry.Categoría.toLowerCase())) return entry;
            let hasChanged = false;
            const newLexemas = entry.Léxema.map(lex => {
                let newLex = lex;
                if (op.type === 'add') {
                    const cat = entry.Categoría.toLowerCase();
                    if (cat.includes('prefijo') && !newLex.endsWith('-')) newLex = `${newLex}-`;
                    if (cat.includes('sufijo') && !newLex.startsWith('-')) newLex = `-${newLex}`;
                    if (cat.includes('infijo') && (!newLex.startsWith('-') || !newLex.endsWith('-'))) newLex = `-${newLex}-`.replace(/--/g, '-');
                    if (cat.includes('verbo') && !newLex.endsWith('-')) newLex = `${newLex}-`;
                } else { newLex = newLex.replace(/^-+|-+$/g, ''); }
                if (newLex !== lex) hasChanged = true;
                return newLex;
            });
            if (hasChanged) { changedCount++; return { ...entry, Léxema: newLexemas }; }
            return entry;
        });
        if (changedCount > 0) {
            updateActiveLexiconEntries(sortAndReindex(updatedEntries));
            showNotification(`${changedCount} entradas fueron actualizadas.`, 'success');
        } else { showNotification('Ninguna entrada necesitó cambios.', 'success'); }
    }, [activeLexicon, updateActiveLexiconEntries, showNotification]);

    const updateGrammarManifest = useCallback((manifest: GrammarManifest) => {
        if (!state.activeLexiconName) return;
        setState(prev => ({
            ...prev,
            lexicons: {
                ...prev.lexicons,
                [prev.activeLexiconName!]: {
                    ...prev.lexicons[prev.activeLexiconName!],
                    grammar: manifest
                }
            },
            isDirty: true
        }));
    }, [state.activeLexiconName]);

    const undoChange = useCallback(() => {
        if (undoRedo.canUndo) {
            undoRedo.undo();
            setState(undoRedo.present);
        } else if (previousState) {
            setState(previousState);
            setPreviousState(null);
        }
    }, [undoRedo, previousState]);

    // On mount inside Tauri, hydrate state from the SQLite store.
    // In the browser the state already came from localStorage in getInitialState.
    useEffect(() => {
        if (!isTauri()) return;
        let cancelled = false;
        (async () => {
            const names = await listLexiconNames();
            const lexicons: { [name: string]: LexiconData } = {};
            for (const name of names) {
                const data = await loadLexicon(name);
                if (data) lexicons[name] = data;
            }
            if (cancelled || Object.keys(lexicons).length === 0) return;
            const active = localStorage.getItem(`${LEXICON_STORAGE_KEY_PREFIX}active`) || names[0];
            setState({ lexicons, activeLexiconName: active, isDirty: false });
        })().catch((e) => console.error('Failed to hydrate lexicons from SQLite', e));
        return () => { cancelled = true; };
    }, []);

    const saveChanges = useCallback(() => {
        if (!state.activeLexiconName) return;
        try {
            const lexiconToSave = { ...state.lexicons[state.activeLexiconName], wordsAddedSinceSave: 0 };
            localStorage.setItem(`${LEXICON_STORAGE_KEY_PREFIX}${state.activeLexiconName}`, JSON.stringify(lexiconToSave));
            localStorage.setItem(`${LEXICON_STORAGE_KEY_PREFIX}list`, JSON.stringify(Object.keys(state.lexicons)));
            localStorage.setItem(`${LEXICON_STORAGE_KEY_PREFIX}active`, state.activeLexiconName);

            // Mirror to SQLite when running inside Tauri.
            if (isTauri()) saveLexicon(state.activeLexiconName, lexiconToSave).catch(console.error);

            setState(prev => {
                if (!state.activeLexiconName) return prev;
                return {
                    ...prev,
                    lexicons: { ...prev.lexicons, [state.activeLexiconName!]: { ...prev.lexicons[state.activeLexiconName!], wordsAddedSinceSave: 0 } },
                    isDirty: false,
                };
            });
            setPreviousState(null);
        } catch (error) {
            console.error("Failed to save lexicon", error);
            showNotification('Error al guardar los cambios.', 'error');
        }
    }, [state, showNotification]);

    return {
        activeLexicon, activeLexiconName: state.activeLexiconName, activeProfile, activeNeographyProfile,
        activeInflectionProfile, activeGrammar, activeCorpus, activeMetadata, activeCustomFunctions, lexicons: state.lexicons,
        lexiconNames, isDirty: state.isDirty, canUndo: undoRedo.canUndo || previousState !== null, importState, wordsAddedSinceSave,

        setActiveLexicon, createNewLexicon, renameLexicon, deleteLexicon, addWord, addBatchWords, editWord,
        deleteWord, deleteBatchWords, batchUpdateFunction, getLexiconSample, updateActiveLexicon,
        updateGenerativeProfile, updateNeographyProfile, updateInflectionProfile, updateCorpus, updateGrammarManifest, saveChanges, undoChange,
        startImportProcess, cancelImport, setImportMapping, resolveConflict, proceedWithValidEntries,
        resanitizeAndContinue, applyCharacterRepair, aiCompleteFunctions, aiFillMissingFields, manageFunctions, addCustomFunction, manageHyphens,
    };
};
