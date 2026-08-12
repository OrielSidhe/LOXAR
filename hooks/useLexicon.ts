
import { useState, useEffect, useCallback } from 'react';
import { LexiconEntry, NewLexiconEntry, GenerativeProfile, MissingWord, LexiconMetadata, CategoryOperation, HyphenOperation, NeographyProfile, GrammarManifest } from '../types';
import { batchDetermineCategory, generateBatchWords } from '../services/geminiService';
import { parseFileContent, processMappedData, inferRootFromLexeme } from '../services/parser';

const LEXICON_STORAGE_KEY_PREFIX = 'conlang_lexicon_manager_'; // New prefix for dynamic keys

export interface Conflict {
    existing: LexiconEntry;
    incoming: NewLexiconEntry;
}

interface ImportState {
    step: 'idle' | 'map_headers' | 'resolve_conflicts' | 'sanitize_file' | 'error';
    rawData?: any[]; // Holds successful data
    headers?: string[];
    mapping?: { [key: string]: keyof NewLexiconEntry | 'extra' | '' };
    conflicts?: Conflict[];
    processedData?: NewLexiconEntry[];
    error?: string;
    warnings?: string[];
    // For sanitization step
    errorContent?: string | null;
    parseError?: string | null;
}

interface LexiconData {
    entries: LexiconEntry[];
    profile: GenerativeProfile;
    neography: NeographyProfile;
    metadata: LexiconMetadata;
    wordsAddedSinceSave: number;
    grammar: GrammarManifest | null;
}

interface LexiconState {
    activeLexiconName: string | null;
    lexicons: { [name: string]: LexiconData };
    isDirty: boolean;
}

const getDefaultProfile = (): GenerativeProfile => ({
    consonants: [],
    vowels: [],
    syllableStructures: [],
    consonantClusters: [],
    vowelClusters: [],
    sampleText: "",
    grammarNotes: "",
    derivationalAffixes: [],
});

const getDefaultNeographyProfile = (): NeographyProfile => ({
    glyphs: [],
    characterMap: {},
    writingDirection: 'ltr',
    guideLines: {
        baseline: 150,
        xHeight: 100,
        ascender: 50,
        descender: 175,
    },
});

const getDefaultGrammarManifest = (): GrammarManifest => ({
    meta: {
        author: '',
        version: '1.0',
        sourceFormat: 'json',
        lastUpdated: new Date().toISOString(),
    },
    typology: {
        wordOrder: 'SVO',
        alignment: 'Nominative-Accusative',
        morphology: 'Isolating',
        headDirection: 'Head-Initial',
    },
    strategies: [],
    roles: [],
    notes: [],
});


const reindexLexicon = (lexicon: NewLexiconEntry[]): LexiconEntry[] => {
    return lexicon.map((entry, index) => ({
        ...entry,
        ID: (index + 1).toString(),
    } as LexiconEntry));
};

const sortAndReindex = (lexicon: NewLexiconEntry[]): LexiconEntry[] => {
    const sorted = [...lexicon].sort((a, b) => {
        const sigA = a.Significado[0] || '';
        const sigB = b.Significado[0] || '';
        return sigA.localeCompare(sigB);
    });
    return reindexLexicon(sorted);
};

// Initial state logic adjusted for individual lexicon storage
const getInitialState = (): LexiconState => {
    try {
        const lexiconListKey = `${LEXICON_STORAGE_KEY_PREFIX}list`;
        const storedLexiconList = localStorage.getItem(lexiconListKey);
        const lexiconNames = storedLexiconList ? JSON.parse(storedLexiconList) : [];
        
        const lexicons: { [name: string]: LexiconData } = {};
        for (const name of lexiconNames) {
            const storedLexicon = localStorage.getItem(`${LEXICON_STORAGE_KEY_PREFIX}${name}`);
            if (storedLexicon) {
                const parsedData = JSON.parse(storedLexicon);
                lexicons[name] = {
                    ...parsedData,
                    neography: parsedData.neography || getDefaultNeographyProfile(),
                    grammar: parsedData.grammar || getDefaultGrammarManifest(),
                };
            }
        }
        
        const activeLexiconName = localStorage.getItem(`${LEXICON_STORAGE_KEY_PREFIX}active`) || (lexiconNames.length > 0 ? lexiconNames[0] : null);

        if (Object.keys(lexicons).length > 0) {
            return { lexicons, activeLexiconName, isDirty: false };
        }
    } catch (error) {
        console.error("Failed to load lexicons from localStorage", error);
    }
    
    // Default state for a new user: no lexicons.
    return {
        activeLexiconName: null,
        lexicons: {},
        isDirty: false,
    };
};

export const useLexicon = (
    showNotification: (message: string, type: 'success' | 'error') => void,
    setIsLoading: (loading: boolean) => void,
    setLoadingMessage: (message: string) => void,
) => {
    const [state, setState] = useState<LexiconState>(getInitialState);
    const [importState, setImportState] = useState<ImportState>({ step: 'idle' });
    const [previousState, setPreviousState] = useState<LexiconState | null>(null);

    const activeLexicon = state.activeLexiconName ? state.lexicons[state.activeLexiconName]?.entries || [] : [];
    const activeProfile = state.activeLexiconName ? state.lexicons[state.activeLexiconName]?.profile || getDefaultProfile() : getDefaultProfile();
    const activeNeographyProfile = state.activeLexiconName ? state.lexicons[state.activeLexiconName]?.neography || getDefaultNeographyProfile() : getDefaultNeographyProfile();
    const activeGrammar = state.activeLexiconName ? state.lexicons[state.activeLexiconName]?.grammar || getDefaultGrammarManifest() : getDefaultGrammarManifest();
    const activeMetadata = state.activeLexiconName ? state.lexicons[state.activeLexiconName]?.metadata : null;
    const wordsAddedSinceSave = state.activeLexiconName ? state.lexicons[state.activeLexiconName]?.wordsAddedSinceSave || 0 : 0;
    const lexiconNames = Object.keys(state.lexicons);

    const updateActiveLexiconEntries = useCallback((newEntries: LexiconEntry[], makeDirty: boolean = true, newWordsCount: number = 0) => {
        setState(prevState => {
            if (!prevState.activeLexiconName) return prevState;
            if (makeDirty && !prevState.isDirty) {
                setPreviousState(prevState);
            }
            const currentLexicon = prevState.lexicons[prevState.activeLexiconName];
            return {
                ...prevState,
                lexicons: {
                    ...prevState.lexicons,
                    [prevState.activeLexiconName!]: {
                        ...currentLexicon,
                        entries: newEntries,
                        wordsAddedSinceSave: (currentLexicon.wordsAddedSinceSave || 0) + newWordsCount,
                    },
                },
                isDirty: makeDirty ? true : prevState.isDirty,
            };
        });
    }, []);

    const setActiveLexicon = useCallback((name: string | null) => {
        if (state.isDirty) {
            if (!window.confirm("Tienes cambios sin guardar en el léxico actual. ¿Estás seguro de que quieres cambiar? Los cambios no guardados se perderán.")) {
                return;
            }
        }
        if (name === null || state.lexicons[name]) {
            setPreviousState(null); 
            setState(prevState => ({ ...prevState, activeLexiconName: name, isDirty: false }));
            localStorage.setItem(`${LEXICON_STORAGE_KEY_PREFIX}active`, name || '');
        }
    }, [state.lexicons, state.isDirty]);

    const createNewLexicon = useCallback((conlangName: string, mainLanguage: string) => {
        if (state.lexicons[conlangName]) {
            throw new Error(`Ya existe un léxico con el nombre "${conlangName}".`);
        }
        setPreviousState(state);
        setState(prevState => {
            const newLexiconData: LexiconData = {
                entries: [],
                profile: getDefaultProfile(),
                neography: getDefaultNeographyProfile(),
                metadata: { conlangName, mainLanguage },
                wordsAddedSinceSave: 0,
                grammar: getDefaultGrammarManifest(),
            };
            const newLexicons = { ...prevState.lexicons, [conlangName]: newLexiconData };
            return {
                lexicons: newLexicons,
                activeLexiconName: conlangName,
                isDirty: true,
            };
        });
    }, [state]);
    
    const renameLexicon = useCallback((oldName: string, newName: string) => {
        if (!oldName || !newName || oldName === newName) return;
        if (state.lexicons[newName]) {
            throw new Error(`Ya existe un léxico con el nombre "${newName}".`);
        }
        
        // Save old lexicon before renaming
        const oldLexiconKey = `${LEXICON_STORAGE_KEY_PREFIX}${oldName}`;
        localStorage.removeItem(oldLexiconKey);

        setPreviousState(state);
        setState(prevState => {
            const newLexicons = { ...prevState.lexicons };
            const lexiconData = newLexicons[oldName];
            delete newLexicons[oldName];

            lexiconData.metadata.conlangName = newName;
            newLexicons[newName] = lexiconData;

            return {
                ...prevState,
                lexicons: newLexicons,
                activeLexiconName: newName,
                isDirty: true,
            };
        });
    }, [state]);

    const deleteLexicon = useCallback((name: string) => {
        if (!state.lexicons[name]) return;
        
        localStorage.removeItem(`${LEXICON_STORAGE_KEY_PREFIX}${name}`);
        
        setPreviousState(state);
        setState(prevState => {
            const newLexicons = { ...prevState.lexicons };
            delete newLexicons[name];
            let newActiveLexiconName = prevState.activeLexiconName;
            if (prevState.activeLexiconName === name) {
                const remainingNames = Object.keys(newLexicons);
                newActiveLexiconName = remainingNames.length > 0 ? remainingNames[0] : null;
            }
            // Update the list in localStorage
            localStorage.setItem(`${LEXICON_STORAGE_KEY_PREFIX}list`, JSON.stringify(Object.keys(newLexicons)));
            localStorage.setItem(`${LEXICON_STORAGE_KEY_PREFIX}active`, newActiveLexiconName || '');

            return {
                lexicons: newLexicons,
                activeLexiconName: newActiveLexiconName,
                isDirty: true, 
            };
        });
    }, [state]);

    const addWord = useCallback((newEntryData: NewLexiconEntry) => {
        if (!state.activeLexiconName) return;
        const currentEntries = [...(state.lexicons[state.activeLexiconName]?.entries || [])];
        currentEntries.push({ ...newEntryData, ID: '0' });
        const finalEntries = sortAndReindex(currentEntries);
        updateActiveLexiconEntries(finalEntries, true, 1);
    }, [state.activeLexiconName, state.lexicons, updateActiveLexiconEntries]);

    const addBatchWords = useCallback((entries: NewLexiconEntry[]) => {
        if (!state.activeLexiconName) return;
        let currentEntries = [...(state.lexicons[state.activeLexiconName]?.entries || [])];
        currentEntries.push(...entries.map(e => ({ ...e, ID: '0' })));
        const finalEntries = sortAndReindex(currentEntries);
        updateActiveLexiconEntries(finalEntries, true, entries.length);
    }, [state.activeLexiconName, state.lexicons, updateActiveLexiconEntries]);
    
    const editWord = useCallback((id: string, updatedEntry: LexiconEntry) => {
        const currentEntries = [...activeLexicon];
        const index = currentEntries.findIndex(entry => entry.ID === id);
        if (index !== -1) {
            currentEntries[index] = updatedEntry;
            const finalEntries = sortAndReindex(currentEntries);
            updateActiveLexiconEntries(finalEntries);
        }
    }, [activeLexicon, updateActiveLexiconEntries]);

    const deleteWord = useCallback((id: string) => {
        const newEntries = activeLexicon.filter(entry => entry.ID !== id);
        updateActiveLexiconEntries(sortAndReindex(newEntries), true, -1);
    }, [activeLexicon, updateActiveLexiconEntries]);

    const getLexiconSample = useCallback((count: number): LexiconEntry[] => {
        if (!state.activeLexiconName) return [];
        const currentEntries = state.lexicons[state.activeLexiconName]?.entries || [];
        const shuffled = [...currentEntries].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }, [state.lexicons, state.activeLexiconName]);
    
    const updateGenerativeProfile = useCallback((newProfile: GenerativeProfile) => {
        if (!state.activeLexiconName) return;
        setPreviousState(state);
        setState(prevState => ({
            ...prevState,
            lexicons: {
                ...prevState.lexicons,
                [prevState.activeLexiconName!]: {
                    ...prevState.lexicons[prevState.activeLexiconName!],
                    profile: newProfile,
                }
            },
            isDirty: true,
        }));
    }, [state]);
    
    const updateNeographyProfile = useCallback((newProfile: NeographyProfile) => {
        if (!state.activeLexiconName) return;
        setPreviousState(state);
        setState(prevState => ({
            ...prevState,
            lexicons: {
                ...prevState.lexicons,
                [prevState.activeLexiconName!]: {
                    ...prevState.lexicons[prevState.activeLexiconName!],
                    neography: newProfile,
                }
            },
            isDirty: true,
        }));
    }, [state]);

    const updateGrammar = useCallback((newGrammar: GrammarManifest) => {
        if (!state.activeLexiconName) return;
        setPreviousState(state);
        setState(prevState => ({
            ...prevState,
            lexicons: {
                ...prevState.lexicons,
                [prevState.activeLexiconName!]: {
                    ...prevState.lexicons[prevState.activeLexiconName!],
                    grammar: newGrammar,
                }
            },
            isDirty: true,
        }));
    }, [state]);

    // --- IMPORT LOGIC ---
    const cancelImport = useCallback(() => {
        setImportState({ step: 'idle' });
    }, []);

    const startImportProcess = useCallback(async (fileContent: string) => {
        try {
            const { successfulData, errorContent, error, headers, warnings } = await parseFileContent(fileContent);
            
            if (errorContent) {
                setImportState({
                    step: 'sanitize_file',
                    rawData: successfulData,
                    errorContent: errorContent,
                    parseError: error,
                    headers: headers,
                    warnings: warnings,
                });
            } else {
                setImportState({ 
                    step: 'map_headers', 
                    rawData: successfulData, 
                    headers, 
                    warnings,
                    mapping: {}, 
                    conflicts: [], 
                    processedData: []
                });
            }
        } catch (e: any) {
            setImportState({ step: 'error', error: e.message || 'Error al procesar el archivo.' });
        }
    }, []);

    const proceedWithValidEntries = useCallback(() => {
        if (importState.step !== 'sanitize_file') return;
        if (!importState.rawData || importState.rawData.length === 0) {
            cancelImport();
            return;
        }
        setImportState(prev => ({
            ...prev,
            step: 'map_headers',
            errorContent: null,
            parseError: null,
        }));
    }, [importState.step, cancelImport]);

    const resanitizeAndContinue = useCallback(async (updatedErrorContent: string): Promise<{ success: boolean; error?: string }> => {
        if (importState.step !== 'sanitize_file') return { success: false, error: 'Invalid state' };
    
        try {
            // Re-parse only the content that was erroneous
            const { successfulData: newlyParsedData, errorContent: newErrorContent, error: newError } = await parseFileContent(updatedErrorContent);
            
            if (newErrorContent) {
                // Still errors, update the modal state but keep existing good data
                setImportState(prev => ({
                    ...prev,
                    errorContent: newErrorContent,
                    parseError: newError
                }));
                return { success: false, error: newError || 'El contenido todavía tiene errores.' };
            }
            
            // Success! Merge with existing good data.
            const combinedData = [...(importState.rawData || []), ...newlyParsedData];
            
            setImportState(prev => ({
                ...prev,
                step: 'map_headers',
                rawData: combinedData,
                errorContent: null,
                parseError: null,
                // keep headers and warnings from original parse
            }));
            return { success: true };
    
        } catch(e: any) {
            setImportState(prev => ({
                ...prev,
                parseError: e.message
            }));
            return { success: false, error: e.message };
        }
    }, [importState]);


    const setImportMapping = useCallback((mapping: { [key: string]: keyof NewLexiconEntry | 'extra' | '' }) => {
        if (!importState.rawData) return;
        const processed = processMappedData(importState.rawData, mapping);
        const conflicts: Conflict[] = [];
        const nonConflicts: NewLexiconEntry[] = [];

        processed.forEach(incoming => {
            const existingEntry = activeLexicon.find(existing => 
                existing.Significado.some(s => incoming.Significado.includes(s)) && existing.Categoría === incoming.Categoría
            );
            if (existingEntry) {
                 const hasConflict = existingEntry.Raíz !== incoming.Raíz ||
                    JSON.stringify(existingEntry.Léxema.sort()) !== JSON.stringify(incoming.Léxema.sort());

                 if (hasConflict) {
                     conflicts.push({ existing: existingEntry, incoming });
                 } else {
                     // It's a true duplicate, we can probably ignore it
                 }
            } else {
                nonConflicts.push(incoming);
            }
        });

        if (conflicts.length > 0) {
            setImportState(prev => ({
                ...prev,
                step: 'resolve_conflicts',
                processedData: nonConflicts,
                conflicts,
            }));
        } else {
            addBatchWords(nonConflicts);
            showNotification(`${nonConflicts.length} entradas importadas correctamente.`, 'success');
            setImportState({ step: 'idle' });
        }
    }, [importState.rawData, activeLexicon, addBatchWords, showNotification]);
    
    const resolveConflict = useCallback((resolution: 'keep' | 'replace') => {
        if (!importState.conflicts || importState.conflicts.length === 0) return;
        
        const newProcessed = [...(importState.processedData || [])];
        const remainingConflicts = [...importState.conflicts];
        const conflictToResolve = remainingConflicts.shift();

        if (resolution === 'replace' && conflictToResolve) {
            // Find the original in the main lexicon and remove it before adding the new one
            deleteWord(conflictToResolve.existing.ID);
            newProcessed.push(conflictToResolve.incoming);
        } // 'keep' means do nothing, just discard the incoming conflict

        if (remainingConflicts.length > 0) {
            setImportState(prev => ({
                ...prev,
                processedData: newProcessed,
                conflicts: remainingConflicts
            }));
        } else {
            // All conflicts resolved, add the processed data
            addBatchWords(newProcessed);
            showNotification(`${newProcessed.length} entradas importadas correctamente.`, 'success');
            setImportState({ step: 'idle' });
        }

    }, [importState.conflicts, importState.processedData, addBatchWords, deleteWord, showNotification]);

    const aiCompleteCategories = useCallback(async (isBatchOperation: boolean = false) => {
        if (!activeLexicon || activeLexicon.length === 0) return { count: 0, newEntries: activeLexicon };
        
        const entriesToComplete = activeLexicon
            .filter(e => 
                e.Significado && e.Significado.length > 0 && typeof e.Significado[0] === 'string' && e.Significado[0].trim() !== '' &&
                (!e.Categoría || e.Categoría === 'desconocida' || e.Categoría === 'n/a')
            )
            .map(e => ({ id: e.ID, significado: e.Significado[0] }));

        if (entriesToComplete.length === 0) {
            return { count: 0, newEntries: activeLexicon };
        }

        const results = await batchDetermineCategory(entriesToComplete);
        
        const categoriesById = new Map<string, string>();
        results.forEach(res => {
            if (res.id && res.categoria) {
                categoriesById.set(res.id, res.categoria);
            }
        });
        
        const newEntries = activeLexicon.map(entry => {
            if (categoriesById.has(entry.ID)) {
                return { ...entry, Categoría: categoriesById.get(entry.ID)! };
            }
            return entry;
        });

        if (!isBatchOperation) {
            updateActiveLexiconEntries(sortAndReindex(newEntries));
        }
        return { count: results.length, newEntries: sortAndReindex(newEntries) };
    }, [activeLexicon, updateActiveLexiconEntries]);

    const aiFillMissingFields = useCallback(async () => {
        if (!activeProfile || !activeProfile.consonants?.length || !activeProfile.vowels?.length || !activeProfile.syllableStructures?.length) {
            showNotification("Por favor, completa el Perfil Generativo antes de usar esta función.", "error");
            return;
        }

        setIsLoading(true);
        let currentEntries = [...activeLexicon];
        let totalCats = 0, totalLex = 0, totalRoots = 0;

        try {
            // 1. Complete Categories
            setLoadingMessage("Paso 1/3: Analizando y completando categorías...");
            const entriesToCategorize = currentEntries.filter(e => e.Significado?.[0] && (!e.Categoría || e.Categoría === 'desconocida' || e.Categoría === 'n/a'));
            if (entriesToCategorize.length > 0) {
                const catResults = await batchDetermineCategory(entriesToCategorize.map(e => ({ id: e.ID, significado: e.Significado[0] })));
                const categoriesById = new Map(catResults.map(r => [r.id, r.categoria]));
                currentEntries = currentEntries.map(e => categoriesById.has(e.ID) ? { ...e, Categoría: categoriesById.get(e.ID)! } : e);
                totalCats = catResults.length;
            }

            // 2. Generate Lexemes (and by extension, Roots)
            setLoadingMessage(`Paso 2/3: Generando nuevos lexemas...\n${totalCats} categorías completadas.`);
            const entriesToGenerate = currentEntries.filter(e => e.Significado?.[0] && e.Categoría && e.Categoría !== 'desconocida' && (!e.Léxema || e.Léxema.length === 0 || !e.Léxema[0]));
            if (entriesToGenerate.length > 0) {
                const wordsToGenerate: MissingWord[] = entriesToGenerate.map(e => ({ Significado: e.Significado[0], Categoría: e.Categoría }));
                const sample = getLexiconSample(50);
                const generatedWords = await generateBatchWords(wordsToGenerate, sample, activeProfile);
                
                const generatedMap = new Map(generatedWords.map(w => [`${w.Significado[0]}-${w.Categoría}`, w]));

                currentEntries = currentEntries.map(e => {
                    const key = `${e.Significado[0]}-${e.Categoría}`;
                    if (generatedMap.has(key)) {
                        const generated = generatedMap.get(key)!;
                        return { ...e, Raíz: generated.Raíz, Léxema: generated.Léxema, extraData: { ...e.extraData, aiGenerated: true }};
                    }
                    return e;
                });
                totalLex = generatedWords.length;
            }

            // 3. Infer remaining Roots
            setLoadingMessage(`Paso 3/3: Infiriendo raíces desde lexemas...\n${totalLex} lexemas generados.`);
            currentEntries = currentEntries.map(e => {
                if (e.Léxema?.[0] && !e.Raíz) {
                    totalRoots++;
                    return { ...e, Raíz: inferRootFromLexeme(e.Léxema[0]) };
                }
                return e;
            });
            
            updateActiveLexiconEntries(sortAndReindex(currentEntries));
            showNotification(`¡Proceso finalizado! ${totalCats} categorías, ${totalLex} lexemas, y ${totalRoots} raíces completadas.`, 'success');

        } catch (e: any) {
            showNotification(e.message || "Ocurrió un error durante el proceso de completado.", 'error');
        } finally {
            setIsLoading(false);
        }
    }, [activeLexicon, activeProfile, getLexiconSample, showNotification, setIsLoading, setLoadingMessage, updateActiveLexiconEntries]);
    
    const manageCategories = useCallback((operations: CategoryOperation[]) => {
        let currentEntries = [...activeLexicon];
        operations.forEach(op => {
            if (op.type === 'merge') {
                const fromSet = new Set(op.from);
                currentEntries = currentEntries.map(entry => 
                    fromSet.has(entry.Categoría) ? { ...entry, Categoría: op.to } : entry
                );
            } else if (op.type === 'rename') {
                currentEntries = currentEntries.map(entry =>
                    entry.Categoría === op.from ? { ...entry, Categoría: op.to } : entry
                );
            } else if (op.type === 'delete') {
                 currentEntries = currentEntries.map(entry =>
                    entry.Categoría === op.category ? { ...entry, Categoría: 'desconocida' } : entry
                );
            }
        });
        updateActiveLexiconEntries(sortAndReindex(currentEntries));
    }, [activeLexicon, updateActiveLexiconEntries]);

    const manageHyphens = useCallback((op: HyphenOperation) => {
        const categorySet = new Set(op.categories);
        let changedCount = 0;

        const updatedEntries = activeLexicon.map(entry => {
            if (!categorySet.has(entry.Categoría.toLowerCase())) {
                return entry;
            }
            
            let hasChanged = false;
            const newLexemas = entry.Léxema.map(lex => {
                let newLex = lex;
                if (op.type === 'add') {
                    const cat = entry.Categoría.toLowerCase();
                    if (cat.includes('prefijo') && !newLex.endsWith('-')) newLex = `${newLex}-`;
                    if (cat.includes('sufijo') && !newLex.startsWith('-')) newLex = `-${newLex}`;
                    if (cat.includes('infijo')) {
                         if (!newLex.startsWith('-')) newLex = `-${newLex}`;
                         if (!newLex.endsWith('-')) newLex = `${newLex}-`;
                    }
                    if (cat.includes('verbo') && !newLex.endsWith('-')) newLex = `${newLex}-`;
                } else { // remove
                    newLex = newLex.replace(/^-+/, '').replace(/-+$/, '');
                }
                
                if (newLex !== lex) {
                    hasChanged = true;
                }
                return newLex;
            });
            
            if (hasChanged) {
                changedCount++;
                return { ...entry, Léxema: newLexemas };
            }
            return entry;
        });

        if (changedCount > 0) {
            updateActiveLexiconEntries(sortAndReindex(updatedEntries));
            showNotification(`${changedCount} entradas fueron actualizadas.`, 'success');
        } else {
            showNotification('Ninguna entrada necesitó cambios.', 'success');
        }
    }, [activeLexicon, updateActiveLexiconEntries, showNotification]);

    // --- UNDO & SAVE LOGIC ---
    const undoChange = useCallback(() => {
        if (previousState) {
            setState(previousState);
            setPreviousState(null); // This makes it a single-level undo
        }
    }, [previousState]);
    
    const saveChanges = useCallback(() => {
        if (!state.activeLexiconName) return;
        try {
            const lexiconToSave = { 
                ...state.lexicons[state.activeLexiconName],
                wordsAddedSinceSave: 0,
            };
            localStorage.setItem(`${LEXICON_STORAGE_KEY_PREFIX}${state.activeLexiconName}`, JSON.stringify(lexiconToSave));
            localStorage.setItem(`${LEXICON_STORAGE_KEY_PREFIX}list`, JSON.stringify(Object.keys(state.lexicons)));
            localStorage.setItem(`${LEXICON_STORAGE_KEY_PREFIX}active`, state.activeLexiconName);
            
            setState(prev => {
                const newActiveLexiconData = { ...prev.lexicons[state.activeLexiconName!], wordsAddedSinceSave: 0 };
                return {
                    ...prev,
                    lexicons: { ...prev.lexicons, [state.activeLexiconName!]: newActiveLexiconData },
                    isDirty: false,
                };
            });
            setPreviousState(null); // Clear undo history on save
        } catch (error) {
            console.error("Failed to save lexicons to localStorage", error);
        }
    }, [state]);

    return {
        activeLexicon,
        activeLexiconName: state.activeLexiconName,
        activeProfile,
        activeNeographyProfile,
        activeGrammar,
        activeMetadata,
        lexiconNames,
        isDirty: state.isDirty,
        canUndo: previousState !== null,
        importState,
        wordsAddedSinceSave,
        setActiveLexicon,
        createNewLexicon,
        renameLexicon,
        deleteLexicon,
        addWord,
        addBatchWords,
        editWord,
        deleteWord,
        getLexiconSample,
        updateGenerativeProfile,
        updateNeographyProfile,
        updateGrammar,
        aiCompleteCategories,
        aiFillMissingFields,
        manageCategories,
        manageHyphens,
        saveChanges,
        undoChange,
        startImportProcess,
        setImportMapping,
        resolveConflict,
        cancelImport,
        proceedWithValidEntries,
        resanitizeAndContinue,
    };
};