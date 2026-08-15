import { useCallback } from 'react';
import { generateRootAndLexeme, completeEntry, correctSignificado } from '../services/geminiService';
import { normalizeText } from '../services/geminiService';
import { WORD_LISTS } from '../data/wordLists';
import type { MissingWord, GenerationMode, LexiconEntry, LexiconMetadata } from '../types';

export interface UseAiHandlersOptions {
    activeLexicon: LexiconEntry[];
    showNotification: (message: string, type: 'success' | 'error') => void;
    getLexiconSample: (count: number) => LexiconEntry[];
    generativeProfile: any;
    setAiStatus: (status: 'idle' | 'working' | 'complete' | 'error') => void;
    setSuggestionListName: (name: string) => void;
    setActiveTab: (tab: any) => void;
    setSuggestions: (suggestions: MissingWord[] | ((prev: MissingWord[]) => MissingWord[])) => void;
    setInitialDataForAdd: (data: any) => void;
    setEditorMode: (mode: 'add' | 'complete') => void;
}

export function useAiHandlers(options: UseAiHandlersOptions) {
    const {
        activeLexicon,
        showNotification,
        getLexiconSample,
        generativeProfile,
        setAiStatus,
        setSuggestionListName,
        setActiveTab,
        setSuggestions,
        setInitialDataForAdd,
        setEditorMode,
    } = options;

    const handleAnalyzeForSuggestions = useCallback((listName: string) => {
        setAiStatus('working');
        setSuggestionListName(listName);
        setActiveTab('tools');

        try {
            const list = WORD_LISTS[listName];
            if (!list) throw new Error("Lista no encontrada");
            const lexiconMeanings = new Set(activeLexicon.map(e => normalizeText(e.Significado[0])));
            const missing = list.filter(item => !lexiconMeanings.has(normalizeText(item.palabra)));

            const suggestions: MissingWord[] = missing.map(item => ({
                Significado: item.palabra,
                Categoría: item.categoría?.trim() || 'sustantivo',
            }));

            setSuggestions(suggestions);
            setAiStatus('complete');
            showNotification(`Análisis completado: ${suggestions.length} sugerencias encontradas.`, 'success');
        } catch (e) {
            setAiStatus('error');
            showNotification(e instanceof Error ? e.message : "Ocurrió un error al analizar para sugerencias.", 'error');
        }
    }, [activeLexicon, showNotification, setAiStatus, setSuggestionListName, setActiveTab, setSuggestions]);

    const handleAiGenerate = useCallback(async (significado: string, categoría: string, modes: GenerationMode[]) => {
        setAiStatus('working');
        try {
            const sample = getLexiconSample(30);
            const res = await generateRootAndLexeme(significado, categoría, sample, generativeProfile, modes, activeLexicon);
            setAiStatus('complete');
            return res;
        } catch (e) {
            setAiStatus('error');
            return null;
        }
    }, [getLexiconSample, generativeProfile, activeLexicon, setAiStatus]);

    const handleAiCompleteEntry = useCallback(async (partialEntry: any) => {
        setAiStatus('working');
        try {
            const sample = getLexiconSample(30);
            const res = await completeEntry(partialEntry, sample, generativeProfile);
            setAiStatus('complete');
            return res;
        } catch (e) {
            setAiStatus('error');
            return null;
        }
    }, [getLexiconSample, generativeProfile, setAiStatus]);

    const handleCorrectSignificado = useCallback(async (significado: string) => {
        try {
            return await correctSignificado(significado);
        } catch (e) {
            return significado;
        }
    }, []);

    const handleGenerateAIFromSuggestion = useCallback(async (word: MissingWord) => {
        const category = word.Categoría || (word as any).Función || 'desconocida';
        const result = await handleAiGenerate(word.Significado, category, ['generative', 'etymological']);
        if (result) {
            setInitialDataForAdd({
                Significado: [word.Significado],
                Categoría: category,
                Raíz: result.raiz,
                Léxema: [result.lexema],
                extraData: { aiGenerated: true }
            });
            setEditorMode('add');
            setActiveTab('workbench');
            setSuggestions((prev: MissingWord[]) => prev.filter((s: MissingWord) => s.Significado !== word.Significado));
        }
    }, [handleAiGenerate, setInitialDataForAdd, setEditorMode, setActiveTab, setSuggestions]);

    const handleAddManuallyFromSuggestion = useCallback((word: MissingWord) => {
        const category = word.Categoría || (word as any).Función || 'desconocida';
        setInitialDataForAdd({ Significado: [word.Significado], Categoría: category });
        setEditorMode('add');
        setActiveTab('workbench');
        setSuggestions((prev: MissingWord[]) => prev.filter((s: MissingWord) => s.Significado !== word.Significado));
    }, [setInitialDataForAdd, setEditorMode, setActiveTab, setSuggestions]);

    return {
        handleAnalyzeForSuggestions,
        handleAiGenerate,
        handleAiCompleteEntry,
        handleCorrectSignificado,
        handleGenerateAIFromSuggestion,
        handleAddManuallyFromSuggestion,
    };
}
