import React, { useCallback, useState, useEffect, useMemo, ReactNode } from 'react';
import Header from './components/Header';
import LexiconTable from './components/LexiconTable';
import FileControls from './components/FileControls';
import LexiconSelector from './components/LexiconSelector';
import { useLexicon } from './hooks/useLexicon';
import { generateRootAndLexeme, normalizeText, completeEntry, correctSignificado } from './services/geminiService';
import { filterParadigmsForFunction, generateInflectedForms } from './services/inflectionService';
import { searchLexicon } from './services/ftsSearch';
import { LexiconEntry, MissingWord, FunctionOperation, HyphenOperation, WorkQueueItem, GenerationMode } from './types';
import InterlinearGlossViewer from './components/InterlinearGlossViewer';
import SoundChangeWorkbench from './components/SoundChangeWorkbench';
import { phonologyFromManifest } from './services/grammar/phonologySync';
import Papa from 'papaparse';

// Icons
import BookOpenIcon from './components/icons/BookOpenIcon';
import WandIcon from './components/icons/WandIcon';
import BarChartIcon from './components/icons/BarChartIcon';
import TableIcon from './components/icons/TableIcon';
import PenToolIcon from './components/icons/PenToolIcon';
import SettingsIcon from './components/icons/SettingsIcon';
import SparkleIcon from './components/icons/SparkleIcon';
import CheckCircleIcon from './components/icons/CheckCircleIcon';
import AlertTriangleIcon from './components/icons/AlertTriangleIcon';
import XCircleIcon from './components/icons/XCircleIcon';
import InfoIcon from './components/icons/InfoIcon';

// Components
import LoadingOverlay from './components/LoadingOverlay';
import WelcomeScreen from './components/WelcomeScreen';
import ModalManager from './components/ModalManager';
import CompletionDashboard from './components/CompletionDashboard';
import EntryEditor from './components/EntryEditor';
import CollectionsManager from './components/CollectionsManager';
import WritingAndNeographyTab from './components/WritingAndNeographyTab';
import GrammarTab from './components/GrammarTab';
import TranslationPlayground from './components/TranslationPlayground';
import ToolsDashboard from './components/ToolsDashboard';
import SuggestionsWorkbench from './components/SuggestionsWorkbench';
import WorkbenchRightPanel from './components/WorkbenchRightPanel';
import WorkQueueBar from './components/WorkQueueBar';
import BatchActionToolbar from './components/BatchActionToolbar';
import SplashScreen from './components/SplashScreen';
import AiStatusIndicator from './components/AiStatusIndicator';
import GuidedTour from './components/GuidedTour';
import AiSettingsModal from './components/AiSettingsModal';

// Data & Helpers
import { WORD_LISTS } from './data/wordLists';
import { MAIN_TOUR_STEPS, COLLECTIONS_TOUR_STEPS, WRITING_TOUR_STEPS, TOOLS_TOUR_STEPS } from './data/tourSteps';
import { audioService } from './services/audioService';
import { generateLanguageSample } from './services/geminiService';
import { isAiAvailable } from './services/geminiService';
import { validateGrammarEngine } from './validation/runtimeValidation';
import { listen } from '@tauri-apps/api/event';

const App = () => {
    const appVersion = "2.4.0-pro";
    const [splashFinished, setSplashFinished] = useState(false);
    const [showWelcome, setShowWelcome] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState("");
    const [notifications, setNotifications] = useState<{ id: number; message: string; type: 'success' | 'error' }[]>([]);
    const [isAppLoaded, setIsAppLoaded] = useState(false);

    // Navigation & View State
    const getInitialTab = () => {
    try {
        const saved = localStorage.getItem('conlang_session_cache');
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.activeTab) return parsed.activeTab;
        }
    } catch {}
    return 'dashboard';
};
const [activeTab, setActiveTab] = useState<'dashboard' | 'table' | 'workbench' | 'collections' | 'writing' | 'grammar' | 'translator' | 'tools'>(getInitialTab);
    const [activeModal, setActiveModal] = useState<'none' | 'about' | 'restore' | 'ai_assistant' | 'lexicon_tools' | 'profile' | 'report' | 'functions' | 'hyphens' | 'inflection_generator' | 'create_lexicon' | 'ai_settings'>('none');
    
    // Workbench / Editor State
    const [editorMode, setEditorMode] = useState<'add' | 'complete'>('add');
    const [incompleteIndex, setIncompleteIndex] = useState(0);
    const [initialDataForAdd, setInitialDataForAdd] = useState<any>(null);

    // Modos de generación (elevados para que el lote los reutilice)
    const [generationModes, setGenerationModes] = useState<GenerationMode[]>(['generative']);

    // Cola de trabajo (Fase 2-G): selecciones que avanzan en el workbench
    const [workQueue, setWorkQueue] = useState<WorkQueueItem[]>([]);
    const [queueCursor, setQueueCursor] = useState(0);
    const [entryToComplete, setEntryToComplete] = useState<LexiconEntry | null>(null);
    const [entryToEditInModal, setEntryToEditInModal] = useState<LexiconEntry | null>(null);
    const [entryToInflect, setEntryToInflect] = useState<LexiconEntry | null>(null);

    // Table / Search State
    const [searchTerm, setSearchTerm] = useState("");
    const [searchColumn, setSearchColumn] = useState("all");
    const [functionFilter, setFunctionFilter] = useState("all");
    const [viewFilter, setViewFilter] = useState("all");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [visibleColumns, setVisibleColumns] = useState<string[]>(['Léxema', 'Significado', 'Función', 'Raíz']);
    const [showAffixFormatting, setShowAffixFormatting] = useState(true);

    // IA & Suggestions State
    const [aiStatus, setAiStatus] = useState<'idle' | 'working' | 'complete' | 'error'>('idle');
    const [grammarOk, setGrammarOk] = useState<boolean | null>(null);
    const [showOfflineBanner, setShowOfflineBanner] = useState<boolean>(false);
    const [aiProgress, setAiProgress] = useState<{ processed: number; total: number } | null>(null);
    const [lastAiResult, setLastAiResult] = useState<any>(null);
    const [suggestions, setSuggestions] = useState<MissingWord[]>([]);
    const [suggestionListName, setSuggestionListName] = useState("");

    // Backups & Config
    const [backups, setBackups] = useState<string[]>([]);
    const [exportPath, setExportPath] = useState<string | null>(localStorage.getItem('conlang_lexicon_manager_export_path'));
    const [isTourActive, setIsTourActive] = useState(false);
    const [currentTourSteps, setCurrentTourSteps] = useState(MAIN_TOUR_STEPS);

    // Tools sub-views
    const [activeToolView, setActiveToolView] = useState<'dashboard' | 'interlinear-gloss' | 'sound-change'>('dashboard');

    const showNotification = useCallback((message: string, type: 'success' | 'error' = 'success') => {
        const id = Date.now();
        setNotifications(prev => [...prev, { id, message, type }]);
        setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 5000);
    }, []);

    const lexiconHook = useLexicon(showNotification, setIsLoading, setLoadingMessage);
    const { 
        activeLexicon, activeLexiconName, activeProfile, activeMetadata, 
        activeCustomFunctions, lexicons, isDirty, activeGrammar
    } = lexiconHook;

    // Canonical phonology source of truth: when a grammar manifest defines
    // phonology, generation should prefer it over the stored generative profile.
    const generativeProfile = useMemo(() => {
        if (activeGrammar?.phonology) {
            return { ...activeProfile, ...phonologyFromManifest(activeGrammar) };
        }
        return activeProfile;
    }, [activeProfile, activeGrammar]);

    const incompleteEntries = useMemo(() => activeLexicon.filter(entry => {
        const category = entry.Categoría?.trim().toLowerCase();
        return !entry.Significado?.[0]?.trim()
            || !category
            || category === 'desconocida'
            || category === 'n/a'
            || !entry.Raíz?.trim()
            || !entry.Léxema?.[0]?.trim();
    }), [activeLexicon]);

    useEffect(() => {
        // Initialize App
        const timer = setTimeout(() => setIsAppLoaded(true), 1500);
        if (exportPath) {
            window.electronAPI.listBackups(exportPath).then(setBackups).catch(console.error);
        }
        return () => clearTimeout(timer);
    }, [exportPath, activeLexiconName]);

    // Runtime grammar engine validation + AI availability check
    useEffect(() => {
        const validateEngine = async () => {
            const ok = validateGrammarEngine();
            setGrammarOk(ok);
            const aiAvailable = await isAiAvailable();
            setShowOfflineBanner(!aiAvailable && !ok);
        };
        validateEngine();
    }, []);

    // Widget inflection listener
    useEffect(() => {
        const removeListener = window.electronAPI?.on?.('main:inflect-request', (entry: LexiconEntry) => {
            if (!entry || !lexiconHook.activeInflectionProfile) {
                window.electronAPI.send('main:inflect-result', []);
                return;
            }

            const applicableParadigms = filterParadigmsForFunction(lexiconHook.activeInflectionProfile.paradigms || [], entry.Categoría);
            const results = applicableParadigms.map(paradigm => ({
                paradigmName: paradigm.name,
                forms: generateInflectedForms(entry, paradigm, lexiconHook.activeInflectionProfile)
            }));

            window.electronAPI.send('main:inflect-result', results);
        });

        return () => {
            removeListener?.();
        };
    }, [lexiconHook.activeInflectionProfile]);

    // Widget search listener
    useEffect(() => {
        const removeListener = window.electronAPI?.on?.('widget:search', (term: string) => {
            if (!activeLexicon || !term || typeof term !== 'string') {
                window.electronAPI.send('widget:search-result', null);
                return;
            }
            const normalizedTerm = normalizeText(term.trim());
            if (!normalizedTerm) {
                window.electronAPI.send('widget:search-result', null);
                return;
            }
            const results = activeLexicon.filter(entry =>
                entry.Significado.some(s => normalizeText(s).includes(normalizedTerm)) ||
                entry.Léxema.some(l => normalizeText(l).includes(normalizedTerm)) ||
                (entry.Raíz && normalizeText(entry.Raíz).includes(normalizedTerm))
            );
            window.electronAPI.send('widget:search-result', results.length > 0 ? results[0] : null);
        });

        return () => {
            removeListener?.();
        };
    }, [activeLexicon]);

    // Widget Data emitter
    useEffect(() => {
        if (activeLexicon && lexiconHook.activeInflectionProfile && activeMetadata) {
            window.electronAPI?.send?.('widget:lexicon-data', {
                entries: activeLexicon,
                inflectionProfile: lexiconHook.activeInflectionProfile,
                metadata: activeMetadata
            });
        }
    }, [activeLexicon, lexiconHook.activeInflectionProfile, activeMetadata]);

    useEffect(() => {
        if (activeLexiconName) {
            setShowWelcome(false);
        }
    }, [activeLexiconName]);

    // Handlers
    const handleOpenModal = (modal: any) => setActiveModal(modal);
    const handleCloseModal = () => setActiveModal('none');

    const handleCreateNewLexicon = useCallback(() => setActiveModal('create_lexicon'), []);
    
    const handleConfirmCreateLexicon = useCallback((name: string, language: string) => {
        try {
            lexiconHook.createNewLexicon(name, language);
            audioService.playStartup();
            showNotification(`Léxico "${name}" creado exitosamente.`, 'success');
            setActiveModal('none');
            setShowWelcome(false);
            
            // Auto tour for newcomers
            const tourCompleted = localStorage.getItem('conlang_lexicon_manager_tour_completed');
            const isFirstLexicon = lexiconHook.lexiconNames.length <= 1;
            if (isFirstLexicon && !tourCompleted) {
                setTimeout(() => setIsTourActive(true), 500);
            }
        } catch (e) {
            showNotification(e instanceof Error ? e.message : "Ocurrió un error al crear el léxico.", 'error');
        }
    }, [lexiconHook, showNotification]);

    const handleRenameLexicon = useCallback((oldName: string, newName: string) => {
        try {
            lexiconHook.renameLexicon(oldName, newName);
            showNotification(`Léxico renombrado a "${newName}".`, 'success');
        } catch (e) {
            showNotification(e instanceof Error ? e.message : "Ocurrió un error al renombrar el léxico.", 'error');
        }
    }, [lexiconHook, showNotification]);

    const handleDeleteLexicon = useCallback((name: string) => {
        if (window.confirm(`¿Estás seguro de que quieres eliminar permanentemente el léxico "${name}"?`)) {
            lexiconHook.deleteLexicon(name);
            showNotification(`Léxico "${name}" eliminado.`, 'success');
        }
    }, [lexiconHook, showNotification]);

    const handleFileExport = useCallback(async (format: 'csv' | 'json' | 'txt') => {
        if (!exportPath || !activeLexiconName) {
            showNotification("Establece una carpeta de exportación primero.", "error"); return;
        }
        setIsLoading(true); setLoadingMessage(`Exportando a ${format.toUpperCase()}...`);
        try {
            let content = '';
            const safeName = activeLexiconName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const fileName = `${safeName}_${new Date().toISOString().split('T')[0]}.${format}`;

            if (format === 'json') content = JSON.stringify(activeLexicon, null, 2);
            else if (format === 'csv') {
                const rows = activeLexicon.map(e => ({
                    ID: e.ID,
                    Raíz: e.Raíz,
                    Léxema: e.Léxema.join(';'),
                    Categoría: e.Categoría,
                    Significado: e.Significado.join(';'),
                    externalID: e.externalID || '',
                }));
                // BOM para que Excel detecte UTF-8 y muestre acentos/ñ correctamente
                content = '\uFEFF' + Papa.unparse(rows);
            }
            else content = activeLexicon.map(e => `${e.Léxema.join(', ')} (${e.Categoría}): ${e.Significado.join(', ')}`).join('\n');

            const { success, error } = await window.electronAPI.exportFile({ filePath: `${exportPath}/${fileName}`, content });
            if (success) showNotification(`¡Éxito! Léxico exportado a ${fileName}`, 'success');
            else showNotification(`Error de exportación: ${error}`, 'error');
        } catch (e) {
            showNotification(`Error: ${e instanceof Error ? e.message : "Ocurrió un error desconocido."}`, 'error');
        }
        finally { setIsLoading(false); }
    }, [activeLexicon, activeLexiconName, exportPath, showNotification]);

    const handleSetExportPath = async () => {
        const path = await window.electronAPI.getDirectoryPath();
        if (path) {
            setExportPath(path);
            localStorage.setItem('conlang_lexicon_manager_export_path', path);
            showNotification('Carpeta de exportación establecida.', 'success');
        }
    };

    const handleSaveChanges = useCallback(() => {
        lexiconHook.saveChanges();
        showNotification("Cambios guardados.", 'success');
        if (exportPath && activeLexiconName && lexicons[activeLexiconName]) {
            const date = new Date().toISOString().replace(/:/g, '-');
            const safeName = activeLexiconName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const backupPath = `${exportPath}/backup_${safeName}_${date}.json`;
            const content = JSON.stringify(lexicons[activeLexiconName]);
            window.electronAPI.saveBackup({ backupPath, content })
                .then(({ success }) => {
                    if (success) {
                        showNotification(`Copia de seguridad de ${safeName} creada.`, "success");
                        window.electronAPI.listBackups(exportPath).then(setBackups);
                    }
                }).catch(e => console.error("Auto-backup failed", e));
        }
    }, [lexiconHook, showNotification, exportPath, activeLexiconName, lexicons]);

    useEffect(() => {
        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            if (!isDirty) return;
            event.preventDefault();
            event.returnValue = '';
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isDirty]);

    const confirmDiscardUnsaved = useCallback((message = "Tienes cambios sin guardar. ¿Quieres continuar de todos modos?") => {
        return !isDirty || window.confirm(message);
    }, [isDirty]);

    const handleQuit = useCallback(() => {
        if (confirmDiscardUnsaved("Tienes cambios sin guardar. ¿Seguro que quieres salir?")) {
            window.electronAPI.quitApp();
        }
    }, [confirmDiscardUnsaved]);

    const handleResetApp = useCallback(() => {
        if (
            confirmDiscardUnsaved("Tienes cambios sin guardar. Reiniciar borrará TODOS los léxicos locales. ¿Continuar?")
            && window.confirm("¿Seguro? Se borrarán TODOS los léxicos.")
        ) {
            localStorage.clear();
            window.location.reload();
        }
    }, [confirmDiscardUnsaved]);

    const handleRestoreBackup = useCallback(async (fileName: string) => {
        if (!exportPath || !window.confirm("Restaurar esta copia cargará el backup como léxico activo. ¿Continuar?")) return;
        setIsLoading(true); setLoadingMessage("Restaurando copia...");
        try {
            // Fix path separators for Windows (exportPath uses backslashes on Windows)
            const normalizedPath = exportPath.replace(/\\/g, '/');
            const content = await window.electronAPI.readBackupFile(`${normalizedPath}/${fileName}`);
            await lexiconHook.startImportProcess(content);
            setActiveModal('none');
        } catch (e) {
            showNotification(e instanceof Error ? e.message : "Ocurrió un error al restaurar la copia de seguridad.", 'error');
        }
        finally { setIsLoading(false); }
    }, [exportPath, showNotification, lexiconHook]);

    const handleAnalyzeForSuggestions = useCallback((listName: string) => {
        setAiStatus('working');
        setSuggestionListName(listName);
        setActiveTab('tools');

        try {
            const list = WORD_LISTS[listName];
            if (!list) throw new Error("Lista no encontrada");
            const lexiconMeanings = new Set(activeLexicon.map(e => normalizeText(e.Significado[0])));
            const missing = list.filter(item => !lexiconMeanings.has(normalizeText(item.palabra)));

            // Las listas ya traen su categoría gramatical por defecto precargada;
            // usamos esa categoría directamente en lugar de pedirsela a la IA
            // (que antes fallaba y dejaba "desconocido" como fallback).
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
    }, [activeLexicon, showNotification]);

    const handleAiGenerate = useCallback(async (significado: string, categoría: string, modes: any[]) => {
        setAiStatus('working');
        try {
            const sample = lexiconHook.getLexiconSample(30);
            const res = await generateRootAndLexeme(significado, categoría, sample, generativeProfile, modes, activeLexicon);
            setAiStatus('complete');
            return res;
        } catch (e) {
            setAiStatus('error');
            return null;
        }
    }, [lexiconHook, generativeProfile, activeLexicon]);

    const handleAiCompleteEntry = useCallback(async (partialEntry: any) => {
        setAiStatus('working');
        try {
            const sample = lexiconHook.getLexiconSample(30);
            const res = await completeEntry(partialEntry, sample, generativeProfile);
            setAiStatus('complete');
            return res;
        } catch (e) {
            setAiStatus('error');
            return null;
        }
    }, [lexiconHook, generativeProfile]);

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
            setSuggestions(prev => prev.filter(s => s.Significado !== word.Significado));
        }
    }, [handleAiGenerate]);

    const handleAddManuallyFromSuggestion = useCallback((word: MissingWord) => {
        const category = word.Categoría || (word as any).Función || 'desconocida';
        setInitialDataForAdd({ Significado: [word.Significado], Categoría: category });
        setEditorMode('add');
        setActiveTab('workbench');
        setSuggestions(prev => prev.filter(s => s.Significado !== word.Significado));
    }, []);

    const handleToggleSelectAll = useCallback((ids: string[]) => {
        setSelectedIds(prev => {
            const currentOnPage = new Set(ids);
            const onPageSelected = new Set(Array.from(prev).filter(id => currentOnPage.has(id)));
            if (onPageSelected.size === ids.length) return new Set(Array.from(prev).filter(id => !currentOnPage.has(id)));
            else return new Set([...Array.from(prev), ...ids]);
        });
    }, []);

    const handleAddLexicalException = useCallback((entryId: string, featureKey: string, surfaceForm: string) => {
        const entry = lexiconHook.activeLexicon.find(e => e.ID === entryId);
        if (!entry) return;
        const updatedEntry: LexiconEntry = {
            ...entry,
            exceptions: [
                ...(entry.exceptions || []),
                { id: `lex_${Date.now()}`, featureKey, surfaceForm },
            ],
        };
        lexiconHook.editWord(entryId, updatedEntry);
    }, [lexiconHook]);

    const handleToggleSelection = useCallback((id: string) => {
        setSelectedIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
    }, []);

    const handleBatchDelete = useCallback(() => {
        if (window.confirm(`¿Estás seguro de que quieres eliminar ${selectedIds.size} entradas?`)) {
            lexiconHook.deleteBatchWords(selectedIds);
            setSelectedIds(new Set());
        }
    }, [selectedIds, lexiconHook]);

    const handleBatchChangeFunction = useCallback((newFunction: string) => {
        lexiconHook.batchUpdateFunction(selectedIds, newFunction);
        setSelectedIds(new Set());
    }, [selectedIds, lexiconHook]);

    const handleNavigateIncomplete = useCallback((dir: 'prev' | 'next') => {
        if (dir === 'prev') setIncompleteIndex(prev => Math.max(0, prev - 1));
        else setIncompleteIndex(prev => Math.min(incompleteEntries.length - 1, prev + 1));
    }, [incompleteEntries.length]);

    // --- Cola de trabajo (Fase 2-G) ---
    const queueActive = workQueue.length > 0;
    const currentQueueItem = queueActive ? workQueue[Math.min(queueCursor, workQueue.length - 1)] : null;

    const enqueueItems = useCallback((items: { Significado: string; Categoría: string; Raíz?: string; Léxema?: string[] }[]) => {
        if (items.length === 0) return;
        setWorkQueue(prev => {
            const wasEmpty = prev.length === 0;
            const newItems: WorkQueueItem[] = items.map(it => ({
                key: `wq-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                ...it,
            }));
            if (wasEmpty) setQueueCursor(0);
            return [...prev, ...newItems];
        });
    }, []);

    const queueAdvance = useCallback(() => {
        setQueueCursor(prev => Math.min(prev + 1, Math.max(0, workQueue.length - 1)));
    }, [workQueue.length]);

    const queuePrev = useCallback(() => setQueueCursor(prev => Math.max(0, prev - 1)), []);

    const queueTogglePending = useCallback((key: string) => {
        setWorkQueue(prev => prev.map(it => it.key === key ? { ...it, pending: !it.pending } : it));
    }, []);

    const queueRemoveCurrent = useCallback(() => {
        setWorkQueue(prev => {
            const idx = Math.min(queueCursor, prev.length - 1);
            const next = prev.filter((_, i) => i !== idx);
            setQueueCursor(c => Math.min(c, Math.max(0, next.length - 1)));
            return next;
        });
    }, [queueCursor]);

    const queueClear = useCallback(() => {
        setWorkQueue([]);
        setQueueCursor(0);
    }, []);

    const handleEnqueue = useCallback((items: MissingWord[]) => {
        enqueueItems(items.map(it => ({ Significado: it.Significado, Categoría: it.Categoría || 'desconocida' })));
        setActiveTab('workbench');
    }, [enqueueItems]);

    // Fase 2-E: generación por lotes (tandas de 10) aplicando el modo activo
    const handleGenerateBatch = useCallback(async (items: MissingWord[], modes: GenerationMode[]) => {
        if (items.length === 0) return;
        setAiStatus('working');
        try {
            const sample = lexiconHook.getLexiconSample(30);
            const CHUNK = 10;
            const results: { Significado: string; Categoría: string; Raíz?: string; Léxema?: string[] }[] = [];
            for (let i = 0; i < items.length; i += CHUNK) {
                const chunk = items.slice(i, i + CHUNK);
                const chunkRes = await Promise.all(chunk.map(async (w) => {
                    const cat = w.Categoría || 'desconocida';
                    try {
                        const r = await generateRootAndLexeme(w.Significado, cat, sample, generativeProfile, modes, activeLexicon);
                        return { Significado: w.Significado, Categoría: cat, Raíz: r?.raiz || '', Léxema: r?.lexema ? [r.lexema] : [] };
                    } catch {
                        return { Significado: w.Significado, Categoría: cat, Raíz: '', Léxema: [] as string[] };
                    }
                }));
                results.push(...chunkRes);
            }
            setAiStatus('complete');
            enqueueItems(results);
            showNotification(`Lote generado: ${results.length} palabra(s) en la cola de trabajo.`, 'success');
            setActiveTab('workbench');
        } catch (e) {
            setAiStatus('error');
            showNotification('Error generando el lote.', 'error');
        }
    }, [generativeProfile, activeLexicon, lexiconHook, enqueueItems, showNotification]);

    // initialDataForAdd derivado de la cola cuando está activa
    const queueInitialData = useMemo(() => {
        if (!currentQueueItem) return null;
        return {
            Significado: [currentQueueItem.Significado],
            Categoría: currentQueueItem.Categoría,
            Raíz: currentQueueItem.Raíz || '',
            Léxema: currentQueueItem.Léxema && currentQueueItem.Léxema.length ? currentQueueItem.Léxema : [],
        };
    }, [currentQueueItem]);

    const effectiveInitialDataForAdd = queueActive ? queueInitialData : initialDataForAdd;

    // Keep the entry being completed in sync with the navigation index.
    useEffect(() => {
        if (editorMode === 'complete') {
            setEntryToComplete(incompleteEntries[incompleteIndex] ?? null);
        } else {
            setEntryToComplete(null);
        }
    }, [editorMode, incompleteIndex, incompleteEntries]);

    // Clamp the index when the list of incomplete entries shrinks/changes.
    useEffect(() => {
        setIncompleteIndex(prev => Math.max(0, Math.min(prev, incompleteEntries.length - 1)));
    }, [incompleteEntries.length]);

    const handleLookupForCompletion = useCallback((term: string) => {
        if (!term.trim()) return;
        const normalizedTerm = normalizeText(term);
        const found = activeLexicon.find(e =>
            e.Significado.some(s => normalizeText(s).includes(normalizedTerm)) ||
            (e.Raíz && normalizeText(e.Raíz).includes(normalizedTerm)) ||
            (e.Léxema && e.Léxema.some(l => normalizeText(l).includes(normalizedTerm)))
        );
        if (!found) {
            showNotification(`No se encontró ninguna entrada para "${term}".`, 'error');
            return;
        }
        const idx = incompleteEntries.findIndex(e => e.ID === found.ID);
        if (idx >= 0) {
            // Entrada incompleta: cárgala en el workbench para completarla.
            setEditorMode('complete');
            setIncompleteIndex(idx);
            setActiveTab('workbench');
        } else {
            showNotification(`"${term}" ya está completa. Mostrándola en el léxico.`, 'success');
            setSearchTerm(term);
            setActiveTab('table');
        }
    }, [activeLexicon, incompleteEntries, showNotification]);

    const handleManageFunctions = useCallback((ops: FunctionOperation[]) => {
        lexiconHook.manageFunctions(ops);
        handleCloseModal();
    }, [lexiconHook, handleCloseModal]);

    const handleManageHyphens = useCallback((op: HyphenOperation) => {
        lexiconHook.manageHyphens(op);
        handleCloseModal();
    }, [lexiconHook, handleCloseModal]);

    const handleStartTour = useCallback(() => {
        let steps = MAIN_TOUR_STEPS;
        if (activeTab === 'collections') steps = COLLECTIONS_TOUR_STEPS;
        else if (activeTab === 'writing') steps = WRITING_TOUR_STEPS;
        else if (activeTab === 'tools') steps = TOOLS_TOUR_STEPS;
        setCurrentTourSteps(steps);
        setIsTourActive(true);
    }, [activeTab]);

    const onTourEnd = () => {
        setIsTourActive(false);
        localStorage.setItem('conlang_lexicon_manager_tour_completed', 'true');
    };

    const handleOpenInterlinearGloss = useCallback(() => {
        setActiveToolView('interlinear-gloss');
    }, []);

    const handleOpenSoundChangeWorkbench = useCallback(() => {
        setActiveToolView('sound-change');
    }, []);

    const handleBackToToolDashboard = useCallback(() => {
        setActiveToolView('dashboard');
    }, []);

    useEffect(() => {
        let unlistenAddWord: (() => void) | undefined;
        let unlistenAddInflection: (() => void) | undefined;

        const setupListeners = async () => {
            unlistenAddWord = await listen('widget:request-add-word', (event: any) => {
                const word = event.payload;
                lexiconHook.addWord({ Raíz: word, Léxema: [word], Categoría: 'sustantivo', Significado: ['[Pendiente]'], extraData: {} });
                showNotification(`Palabra "${word}" añadida desde el Widget.`, 'success');
            });

            unlistenAddInflection = await listen('widget:request-add-inflection', (event: any) => {
                const { word, originalMeaning, formName } = event.payload;
                lexiconHook.addWord({ Raíz: word, Léxema: [word], Categoría: 'desconocida', Significado: [`${formName} de ${originalMeaning}`], extraData: {} });
                showNotification(`Flexión "${word}" añadida.`, 'success');
            });
        };

        setupListeners();
        return () => {
            if (unlistenAddWord) unlistenAddWord();
            if (unlistenAddInflection) unlistenAddInflection();
        };
    }, [lexiconHook.addWord]);

    const completionStats = useMemo(() => ({
        total: activeLexicon.length,
        needsFunction: incompleteEntries.filter(e => !e.Categoría || e.Categoría === 'desconocida').length,
        totalIncomplete: incompleteEntries.length
    }), [activeLexicon.length, incompleteEntries]);

    const entryBeingEdited = useMemo(() => editorMode === 'complete' ? entryToComplete : null, [editorMode, entryToComplete]);

    if (!isAppLoaded) return <LoadingOverlay message="Cargando léxicos..." />;

    return (
        <div className="flex flex-col h-screen bg-background-dark text-text-primary bg-grid-pattern overflow-hidden relative selection:bg-primary/30 selection:text-white">
            {!splashFinished && <SplashScreen onFinish={() => setSplashFinished(true)} />}

            <div className={`flex flex-col h-full transition-opacity duration-1000 ${splashFinished ? 'opacity-100' : 'opacity-0'}`}>
                {/* Ambient Lights */}
                <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[120px] animate-move-lights opacity-60"></div>
                <div className="absolute top-[40%] right-[0%] w-[40%] h-[40%] bg-purple-500/5 rounded-full blur-[100px] animate-move-lights animation-delay-2000 opacity-50"></div>
                <div className="absolute -bottom-[20%] left-[20%] w-[60%] h-[60%] bg-emerald-500/5 rounded-full blur-[130px] animate-move-lights animation-delay-4000 opacity-40"></div>

                {isLoading && <LoadingOverlay message={loadingMessage} />}
                {showOfflineBanner && (
                    <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-4 mb-4 mx-4 mt-4 rounded-md shadow-sm">
                        <div className="flex items-center">
                            <AlertTriangleIcon className="h-5 w-5 mr-2 flex-shrink-0" />
                            <div>
                                <p className="font-semibold">Grammar engine running offline</p>
                                <p className="text-sm">AI assistance is disabled. The local grammar engine is available for basic operations.</p>
                            </div>
                        </div>
                    </div>
                )}
                {showWelcome && <WelcomeScreen
                    onCreateLexicon={handleCreateNewLexicon}
                    onContinue={() => {
                        audioService.playStartup();
                        setShowWelcome(false);
                    }}
                    onImport={(content) => {
                        audioService.playStartup();
                        setShowWelcome(false);
                        lexiconHook.startImportProcess(content);
                    }}
                    onStartTour={() => {
                        audioService.playStartup();
                        setShowWelcome(false);
                        handleStartTour();
                    }}
                />}
                {isTourActive && <GuidedTour steps={currentTourSteps} onClose={onTourEnd} />}

                <ModalManager
                    activeModal={activeModal}
                    entryToEditInModal={entryToEditInModal}
                    entryToInflect={entryToInflect}
                    importState={lexiconHook.importState}
                    activeLexicon={activeLexicon}
                    activeLexiconName={activeLexiconName}
                    activeProfile={activeProfile}
                    activeMetadata={activeMetadata}
                    activeCustomFunctions={activeCustomFunctions}
                    activeInflectionProfile={lexiconHook.activeInflectionProfile}
                    backups={backups}
                    appVersion={appVersion}
                    completionStats={completionStats}
                    onClose={handleCloseModal}
                    onCloseEditModal={() => setEntryToEditInModal(null)}
                    onRestoreBackup={handleRestoreBackup}
                    onAiCompleteFunctions={async () => {
                        try {
                            setAiStatus('working');
                            setAiProgress(null);
                            const res = await lexiconHook.aiCompleteFunctions(activeCustomFunctions, (p, t) => setAiProgress({ processed: p, total: t }));
                            setLastAiResult(res.count);
                            setAiStatus('complete');
                            showNotification('Completado de funciones finalizado', 'success');
                        } catch (e) { setAiStatus('error'); setAiProgress(null); }
                    }}
                    onAiFillMissing={async () => {
                        try {
                            setAiStatus('working');
                            setAiProgress(null);
                            const result = await lexiconHook.aiFillMissingFields((p, t) => setAiProgress({ processed: p, total: t }));
                            setLastAiResult(result);
                            setAiStatus('complete');
                            showNotification('Generación masiva completada', 'success');
                        } catch (e) { setAiStatus('error'); setAiProgress(null); }
                    }}
                    onAnalyzeForSuggestions={handleAnalyzeForSuggestions}
                    onManageFunctions={handleManageFunctions}
                    onManageHyphens={handleManageHyphens}
                    onUpdateGenerativeProfile={lexiconHook.updateGenerativeProfile}
                    onGenerateLanguageSample={async (profile, _sampleList) => { 
                        return await generateLanguageSample(profile, lexiconHook.activeLexicon);
                    }}
                    onAddWord={lexiconHook.addWord}
                    onEditWord={lexiconHook.editWord}
                    onConfirmCreateLexicon={handleConfirmCreateLexicon}
                    onAddCustomFunction={lexiconHook.addCustomFunction}
                    onOpenFunctions={() => setActiveModal('functions')}
                    onOpenHyphens={() => setActiveModal('hyphens')}
                    onOpenProfile={() => setActiveModal('profile')}
                    onOpenNeography={() => setActiveTab('writing')}
                    onOpenInflection={() => setActiveTab('grammar')}
                    importHandlers={{
                        cancelImport: lexiconHook.cancelImport,
                        setImportMapping: lexiconHook.setImportMapping,
                        resolveConflict: lexiconHook.resolveConflict,
                        proceedWithValidEntries: lexiconHook.proceedWithValidEntries,
                        resanitizeAndContinue: lexiconHook.resanitizeAndContinue,
                        applyCharacterRepair: lexiconHook.applyCharacterRepair
                    }}
                    showNotification={showNotification}
                />
                
                {activeModal === 'ai_settings' && (
                    <AiSettingsModal onClose={handleCloseModal} />
                )}

                <Header wordsAddedCount={lexiconHook.wordsAddedSinceSave} onOpenWidget={() => window.electronAPI.openWidget()} onShowTour={handleStartTour} />

                <div className="flex items-center justify-between px-6 py-4 bg-surface-dark/90 backdrop-blur-md border-b border-border-dark flex-wrap gap-4 z-30 relative">
                    <LexiconSelector 
                        lexiconNames={lexiconHook.lexiconNames} 
                        activeLexiconName={activeLexiconName} 
                        onSelect={lexiconHook.setActiveLexicon} 
                        onCreate={handleCreateNewLexicon} 
                        onDelete={handleDeleteLexicon} 
                        onRename={handleRenameLexicon} 
                    />
                    <div className="flex items-center gap-4">
                        <FileControls 
                            onImport={lexiconHook.startImportProcess} 
                            onExport={handleFileExport} 
                            onSave={handleSaveChanges} 
                            onSetExportPath={handleSetExportPath} 
                            onRestore={() => handleOpenModal('restore')} 
                            onOpenAbout={() => handleOpenModal('about')} 
                            onStartTour={handleStartTour} 
                            onOpenAiSettings={() => handleOpenModal('ai_settings')}
                            onQuit={handleQuit}
                            onResetApp={handleResetApp}
                            onError={(msg) => showNotification(msg, 'error')} 
                            disabled={!activeLexiconName} 
                            isDirty={isDirty} 
                        />
                        <button onClick={handleStartTour} className="p-2 text-text-secondary hover:text-primary transition-colors hover:bg-white/5 rounded-full">
                            <InfoIcon className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-1 border-b border-border-dark bg-surface-dark/95 backdrop-blur-md px-6 pt-2 z-20 sticky top-0 shadow-lg">
                    <TabButton icon={<BarChartIcon />} label="Panel" isActive={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
                    <TabButton icon={<BookOpenIcon />} label="Léxico" isActive={activeTab === 'table'} onClick={() => setActiveTab('table')} />
                    <TabButton icon={<WandIcon />} label="Workbench" isActive={activeTab === 'workbench'} onClick={() => setActiveTab('workbench')} />
                    <TabButton icon={<TableIcon className="w-5 h-5" />} label="Colecciones" isActive={activeTab === 'collections'} onClick={() => setActiveTab('collections')} />
                    <TabButton icon={<PenToolIcon className="w-5 h-5" />} label="Escritura y Neografía" isActive={activeTab === 'writing'} onClick={() => setActiveTab('writing')} />
                    <TabButton icon={<BookOpenIcon className="w-5 h-5" />} label="Gramática" isActive={activeTab === 'grammar'} onClick={() => setActiveTab('grammar')} />
                    <TabButton icon={<SparkleIcon className="w-5 h-5" />} label="Traductor AI" isActive={activeTab === 'translator'} onClick={() => setActiveTab('translator')} />
                    <TabButton icon={<SettingsIcon className="w-5 h-5" />} label="Herramientas" isActive={activeTab === 'tools'} onClick={() => setActiveTab('tools')} />

                    <AiStatusIndicator
                        status={aiStatus}
                        progress={aiProgress}
                        onClick={() => {
                            if (aiStatus === 'complete') {
                                // "Ver Resultados": lleva directo a la lista de entradas incompletas.
                                setViewFilter('incomplete');
                                setActiveTab('table');
                                setAiStatus('idle'); setLastAiResult(null); setAiProgress(null);
                            } else if (aiStatus === 'error') { setAiStatus('idle'); setAiProgress(null); }
                        }}
                    />
                </div>

                <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 flex flex-col relative z-0 custom-scrollbar scroll-smooth">
                    <div className="flex-grow h-full flex flex-col">
                        {activeTab === 'dashboard' && (
                            <CompletionDashboard
                                stats={{ ...completionStats, wordsAddedCount: lexiconHook.wordsAddedSinceSave }}
                                onOpenReport={() => handleOpenModal('report')}
                                onOpenAiAssistant={() => handleOpenModal('ai_assistant')}
                                onNavigateComplete={() => { setViewFilter('incomplete'); setActiveTab('table'); }}
                                onNavigateFunctions={() => { setViewFilter('incomplete'); setActiveTab('table'); }}
                                onGenerateWords={() => handleOpenModal('ai_assistant')}
                                onBackup={handleSaveChanges}
                            />
                        )}
                        {activeTab === 'table' && (
                            <LexiconTable
                                data={activeLexicon} lexiconName={activeLexiconName}
                                conlangName={activeMetadata?.conlangName} mainLanguage={activeMetadata?.mainLanguage}
                                onEditWord={lexiconHook.editWord}
                                onDeleteWord={lexiconHook.deleteWord}
                                showNotification={showNotification}
                                searchTerm={searchTerm} onSearchTermChange={setSearchTerm}
                                categoryFilter={functionFilter} onCategoryFilterChange={setFunctionFilter}
                                viewFilter={viewFilter as any} onViewFilterChange={setViewFilter as any}
                                showAffixFormatting={showAffixFormatting}
                                onShowAffixFormattingChange={setShowAffixFormatting}
                                selectedIds={selectedIds}
                                onToggleSelection={handleToggleSelection}
                                onToggleSelectAll={handleToggleSelectAll}
                                onGenerateInflections={(entry) => {
                                    setEntryToInflect(entry);
                                    handleOpenModal('inflection_generator');
                                }}
                                onSearch={activeLexiconName ? async (term: string) => (await searchLexicon(lexicons[activeLexiconName], term)).map(r => r.entry) : undefined}
                            />
                        )}
                        {activeTab === 'workbench' && (
                            <div className="flex gap-4 h-full min-h-[600px]">
                                {/* LEFT: Entry Editor + cola de trabajo */}
                                <div className="flex-1 min-w-0 flex flex-col gap-3">
                                    {queueActive && (
                                        <WorkQueueBar
                                            items={workQueue}
                                            cursor={queueCursor}
                                            onPrev={queuePrev}
                                            onNext={queueAdvance}
                                            onTogglePending={queueTogglePending}
                                            onRemove={queueRemoveCurrent}
                                            onClear={queueClear}
                                        />
                                    )}
                                    <div className="flex-1 min-h-0">
                                        <EntryEditor
                                            mode={editorMode} onModeChange={setEditorMode}
                                            entryToEdit={entryBeingEdited || undefined}
                                            incompleteCount={incompleteEntries.length} incompleteIndex={incompleteIndex}
                                            onNavigateIncomplete={handleNavigateIncomplete} onLookup={handleLookupForCompletion}
                                            onAddWord={lexiconHook.addWord} onUpdateWord={lexiconHook.editWord}
                                            findDuplicateSignificados={(sig, excludeId) => lexiconHook.activeLexicon.filter(e => e.Significado.includes(sig) && e.ID !== excludeId)}
                                            onDuplicateFound={() => {}}
                                            onAiCompleteEntry={handleAiCompleteEntry}
                                            onAiGenerateRootAndLexeme={handleAiGenerate}
                                            onCorrectSignificado={handleCorrectSignificado}
                                            showNotification={showNotification} disabled={!activeLexiconName}
                                            initialDataForAdd={effectiveInitialDataForAdd}
                                            setIsLoading={setIsLoading} setLoadingMessage={setLoadingMessage}
                                            customCategories={activeCustomFunctions} onAddCustomCategory={lexiconHook.addCustomFunction}
                                            activeMetadata={activeMetadata}
                                            activeLexicon={activeLexicon}
                                            generationModes={generationModes}
                                            onGenerationModesChange={setGenerationModes}
                                            onQueueAdvance={queueActive ? queueAdvance : undefined}
                                        />
                                    </div>
                                </div>
                                {/* RIGHT: Suggestions & Word Lists */}
                                <div className="w-72 shrink-0">
                                    <WorkbenchRightPanel
                                        suggestions={suggestions}
                                        listName={suggestionListName}
                                        onClose={() => setSuggestions([])}
                                        onAddManually={handleAddManuallyFromSuggestion}
                                        onGenerateAI={handleGenerateAIFromSuggestion}
                                        isLoading={aiStatus === 'working'}
                                        activeMetadata={activeMetadata}
                                        onSelectList={setSuggestionListName}
                                        onAnalyzeList={handleAnalyzeForSuggestions}
                                        generativeProfile={activeProfile}
                                        generativeLexicon={activeLexicon}
                                        onSaveGenerativeProfile={lexiconHook.updateGenerativeProfile}
                                        showNotification={showNotification}
                                        onEnqueue={handleEnqueue}
                                        onGenerateBatch={handleGenerateBatch}
                                        generationModes={generationModes}
                                        manifest={activeGrammar}
                                        onSyncPhonology={(p) => lexiconHook.updateGenerativeProfile({ ...activeProfile, ...p })}
                                    />
                                </div>
                            </div>
                        )}
                        {activeTab === 'collections' && (
                            <CollectionsManager 
                                lexicon={activeLexicon} inflection={lexiconHook.activeInflectionProfile}
                                onUpdateEntry={lexiconHook.editWord} onAddEntry={lexiconHook.addWord}
                                onAddBatchEntries={lexiconHook.addBatchWords}
                                onDeleteEntry={lexiconHook.deleteWord} customCategories={activeCustomFunctions}
                                onStartTour={handleStartTour}
                            />
                        )}
                        {activeTab === 'writing' && (
                            <WritingAndNeographyTab 
                                corpus={lexiconHook.activeCorpus} 
                                onUpdateCorpus={lexiconHook.updateCorpus}
                                neographyProfile={lexiconHook.activeNeographyProfile}
                                generativeProfile={activeProfile}
                                onUpdateNeographyProfile={lexiconHook.updateNeographyProfile}
                                onStartTour={handleStartTour}
                            />
                        )}
                        {activeTab === 'grammar' && (
                            <GrammarTab
                                manifest={activeGrammar}
                                onSave={(manifest) => lexiconHook.updateGrammarManifest(manifest)}
                                lexicon={activeLexicon}
                                conlangName={activeMetadata?.conlangName}
                                onAddLexicalException={handleAddLexicalException}
                                onExportGrammar={() => {
                                    const manifest = activeGrammar;
                                    const safeName = (activeMetadata?.conlangName || 'gramatica').replace(/[^a-z0-9]/gi, '_').toLowerCase();
                                    const date = new Date().toISOString().split('T')[0];
                                    const fileName = `${safeName}_${date}.loxar-grammar.json`;
                                    const content = JSON.stringify(manifest, null, 2);
                                    window.electronAPI.exportFile({ filePath: `${exportPath}/${fileName}`, content })
                                        .then(({ success, error }) => {
                                            if (success) showNotification(`Gramática exportada a ${fileName}`, 'success');
                                            else showNotification(`Error de exportación: ${error}`, 'error');
                                        })
                                        .catch(e => showNotification(`Error: ${e instanceof Error ? e.message : 'desconocido'}`, 'error'));
                                }}
                            />
                        )}
                        {activeTab === 'translator' && (
                            <TranslationPlayground 
                                lexicon={activeLexicon} 
                                grammar={activeGrammar} 
                                corpus={lexiconHook.activeCorpus}
                                onUpdateCorpus={lexiconHook.updateCorpus}
                                onClose={() => {}}
                            />
                        )}
                        {activeTab === 'tools' && (
                            suggestions.length > 0 ? (
                                <SuggestionsWorkbench 
                                    suggestions={suggestions}
                                    listName={suggestionListName}
                                    onClose={() => setSuggestions([])}
                                    onAddManually={handleAddManuallyFromSuggestion}
                                    onGenerateAI={handleGenerateAIFromSuggestion}
                                    isLoading={aiStatus === 'working'}
                                    activeMetadata={activeMetadata}
                                />
                            ) : (
                                <>
                                    {activeToolView === 'dashboard' && (
                                        <ToolsDashboard
                                            onStartTour={handleStartTour}
                                            onOpenProfile={() => setActiveModal('profile')}
                                            onOpenNeography={() => setActiveTab('writing')}
                                            onOpenInflectionWorkshop={() => setActiveTab('grammar')}
                                            onOpenGrammar={() => setActiveTab('grammar')}
                                            onOpenTranslator={() => setActiveTab('translator')}
                                            onOpenInterlinearGloss={handleOpenInterlinearGloss}
                                            onOpenSoundChangeWorkbench={handleOpenSoundChangeWorkbench}
                                            onManageFunctions={() => setActiveModal('functions')}
                                            onManageHyphens={() => setActiveModal('hyphens')}
                                            onCompleteFunctions={async () => {
                                                setAiStatus('working');
                                                setAiProgress(null);
                                                try {
                                                    const res = await lexiconHook.aiCompleteFunctions(activeCustomFunctions, (p, t) => setAiProgress({ processed: p, total: t }));
                                                    setLastAiResult(res.count);
                                                    setAiStatus('complete'); showNotification('Funciones completadas', 'success');
                                                } catch (e) { setAiStatus('error'); setAiProgress(null); }
                                            }}
                                            onFillMissing={async () => {
                                                setAiStatus('working');
                                                setAiProgress(null);
                                                try {
                                                    const result = await lexiconHook.aiFillMissingFields((p, t) => setAiProgress({ processed: p, total: t }));
                                                    setLastAiResult(result);
                                                    setAiStatus('complete'); showNotification('Campos completados', 'success');
                                                } catch (e) { setAiStatus('error'); setAiProgress(null); }
                                            }}
                                            onAnalyzeForSuggestions={handleAnalyzeForSuggestions}
                                            stats={completionStats}
                                            disabled={!activeLexiconName}
                                        />
                                    )}
                                    {activeToolView === 'interlinear-gloss' && (
                                        <div className="space-y-3">
                                            <button type="button" onClick={handleBackToToolDashboard} className="text-sm text-text-secondary hover:text-white">&larr; Volver a Herramientas</button>
                                            <InterlinearGlossViewer lexicon={lexicons[activeLexiconName ?? '']} />
                                        </div>
                                    )}
                                    {activeToolView === 'sound-change' && (
                                        <div className="space-y-3">
                                            <button type="button" onClick={handleBackToToolDashboard} className="text-sm text-text-secondary hover:text-white">&larr; Volver a Herramientas</button>
                                            <SoundChangeWorkbench lexicon={lexicons[activeLexiconName ?? '']} />
                                        </div>
                                    )}
                                </>
                            )
                        )}
                    </div>
                </main>

                {activeTab === 'table' && selectedIds.size > 0 &&
                    <BatchActionToolbar
                        selectedCount={selectedIds.size} customFunctions={activeCustomFunctions}
                        onClearSelection={() => setSelectedIds(new Set())}
                        onBatchDelete={handleBatchDelete} onBatchChangeFunction={handleBatchChangeFunction}
                    />}

                <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none">
                    {notifications.map(notification => (
                        <div key={notification.id} className={`glass-toast pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-r-lg shadow-glow animate-fade-in ${notification.type === 'error' ? '!border-danger !bg-danger/10' : ''}`}>
                            {notification.type === 'success' ? <CheckCircleIcon className="h-5 w-5 text-accent" /> : <AlertTriangleIcon className="h-5 w-5 text-danger" />}
                            <span className="font-medium text-sm text-white">{notification.message}</span>
                            <button onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))} className="ml-2 hover:bg-white/10 rounded-full p-1 transition-colors text-text-secondary hover:text-white">
                                <XCircleIcon className="h-4 w-4" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const TabButton = React.memo(({ icon, label, isActive, onClick }: { icon: ReactNode, label: string, isActive: boolean, onClick: () => void }) => (
    <button
        onClick={() => { audioService.playClick(); onClick(); }}
        onMouseEnter={() => audioService.playHover()}
        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all relative overflow-hidden group rounded-t-md ${isActive ? 'text-primary border-b-2 border-primary bg-primary/5 shadow-[0_-2px_10px_rgba(13,185,242,0.1)]' : 'text-text-secondary hover:text-text-primary hover:bg-white/5'}`}
        role="tab"
        aria-selected={isActive}
    >
        <span className={`transition-transform duration-300 ${isActive ? 'scale-110 drop-shadow-md' : 'group-hover:scale-110'}`}>{icon}</span>
        <span className={isActive ? 'animate-pulse-slow font-bold tracking-wide' : ''}>{label}</span>
        {isActive && <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent animate-pulse-slow pointer-events-none" />}
    </button>
));
TabButton.displayName = 'TabButton';

export default App;
