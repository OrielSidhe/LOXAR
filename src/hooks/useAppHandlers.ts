import { useCallback } from 'react';
import { useLexicon } from './useLexicon';
import { LexiconEntry, MissingWord, FunctionOperation, HyphenOperation, GenerationMode, GrammarManifest, LexiconMetadata } from '../types';
import type { AppTabId } from '../utils/appTabs';
import type { AppModalId } from '../utils/wizardActionsModel';
import { LoxarProject } from '../services/projectFile';
import { listLexiconNames, loadLexicon } from '../services/sqlStorage';
import { loadSessionCache, saveSessionCache } from '../services/sessionCache';
import { createEmptyProject } from '../services/projectFile';
import { audioService } from '../services/audioService';
import { open, save } from '@tauri-apps/plugin-dialog';
import type { TourStep } from '../data/tourSteps';
import { resolveTourSteps } from '../utils/tourStepsModel';
import { normalizeText } from '../services/geminiService';
import type { SoundChangeBatchResult } from '../services/soundChanger';
import { filterParadigmsForFunction, generateInflectedForms } from '../services/inflectionService';
import type { InflectedParadigmResult } from '../services/inflectionService';

export interface UseAppHandlersOptions {
  lexiconHook: ReturnType<typeof useLexicon>;

  restoreProjectFromPath: (path: string) => Promise<void>;
  writeProjectToPath: (path: string, project: LoxarProject) => Promise<void>;
  handleNewProject: () => void;
  handleOpenProject: () => void;

  setShowProjectBootstrap: React.Dispatch<React.SetStateAction<boolean>>;
  setBootstrapDismissed: React.Dispatch<React.SetStateAction<boolean>>;
  setProjectPath: React.Dispatch<React.SetStateAction<string | null>>;
  setIsProjectDirty: React.Dispatch<React.SetStateAction<boolean>>;
  setActiveTab: React.Dispatch<React.SetStateAction<AppTabId>>;
  setShowWelcome: React.Dispatch<React.SetStateAction<boolean>>;
  setIsTourActive: React.Dispatch<React.SetStateAction<boolean>>;
  openModal: (modal: AppModalId) => void;
  setCurrentTourSteps: React.Dispatch<React.SetStateAction<TourStep[]>>;
  setActiveToolView: React.Dispatch<React.SetStateAction<'dashboard' | 'interlinear-gloss' | 'sound-change'>>;
  setIncompleteIndex: React.Dispatch<React.SetStateAction<number>>;
  setEditorMode: React.Dispatch<React.SetStateAction<'add' | 'complete'>>;
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setLoadingMessage: React.Dispatch<React.SetStateAction<string>>;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setEntryToEditInModal: React.Dispatch<React.SetStateAction<LexiconEntry | null>>;
  setEntryToInflect: React.Dispatch<React.SetStateAction<LexiconEntry | null>>;
  setAiStatus: React.Dispatch<React.SetStateAction<'idle' | 'working' | 'complete' | 'error'>>;
  setAiProgress: React.Dispatch<React.SetStateAction<{ processed: number; total: number } | null>>;

  activeTab: AppTabId;
  exportPath: string | null;
  isDirty: boolean;
  activeLexiconName: string | null;
  sessionCacheData: { tourCompleted?: boolean } | null;
  generationModes: GenerationMode[];
  activeLexicon: LexiconEntry[];
  activeGrammar: GrammarManifest;
  activeMetadata: LexiconMetadata | null;
  activeCustomFunctions: string[];
  incompleteEntries: LexiconEntry[];
  selectedIds: Set<string>;

  showNotification: (message: string, type?: 'success' | 'error') => void;
}

export interface UseAppHandlersResult {
  handleOpenModal: (modal: AppModalId) => void;
  handleCloseModal: () => void;
  handleCreateNewLexicon: () => void;
  handleContinueToDashboard: () => void;
  handleConfirmCreateLexicon: (name: string, language: string) => void;
  handleRenameLexicon: (oldName: string, newName: string) => void;
  handleDeleteLexicon: (name: string) => void;
  confirmDiscardUnsaved: (message?: string) => boolean;
  handleQuit: () => void;
  handleResetApp: () => void;
  handleRestoreBackup: (fileName: string) => Promise<void>;
  handleStartTour: () => void;
  onTourEnd: () => void;
  handleOpenInterlinearGloss: () => void;
  handleOpenSoundChangeWorkbench: () => void;
  handleApplySoundChangeBatch: (entries: LexiconEntry[], result: SoundChangeBatchResult) => void;
  handleBackToToolDashboard: () => void;
  handleBootstrapOpenFound: (p: string) => Promise<void>;
  handleBootstrapCreate: () => void;
  handleBootstrapOpenOther: () => void;
  handleBootstrapDismiss: () => void;
  handleBootstrapImportLocal: () => Promise<void>;
  handleWidgetAddWord: (word: string) => void;
  handleWidgetAddInflection: (payload: { word: string; originalMeaning: string; formName: string }) => void;
  handleWidgetSearch: (term: string) => LexiconEntry | null;
  handleInflectRequest: (entry: LexiconEntry) => InflectedParadigmResult[];
  handleLookupForCompletion: (term: string) => void;
  handleManageFunctions: (ops: FunctionOperation[]) => void;
  handleManageHyphens: (op: HyphenOperation) => void;
  handleToggleSelectAll: (ids: string[]) => void;
  handleAddLexicalException: (entryId: string, featureKey: string, surfaceForm: string) => void;
  handleToggleSelection: (id: string) => void;
  handleBatchDelete: () => void;
  handleBatchChangeFunction: (newFunction: string) => void;
  handleNavigateIncomplete: (dir: 'prev' | 'next') => void;
  handleExportGrammar: () => void;
  handleAiCompleteFunctions: (listName: string, successMessage?: string) => Promise<void>;
  handleAiFillMissing: (listName: string, successMessage?: string) => Promise<void>;
}

export const useAppHandlers = (options: UseAppHandlersOptions): UseAppHandlersResult => {
  const {
    lexiconHook,
    restoreProjectFromPath,
    writeProjectToPath,
    handleNewProject,
    handleOpenProject,
    setShowProjectBootstrap,
    setBootstrapDismissed,
    setProjectPath,
    setIsProjectDirty,
    setActiveTab,
    setShowWelcome,
    setIsTourActive,
    openModal,
    setCurrentTourSteps,
    setActiveToolView,
    setIncompleteIndex,
    setEditorMode,
    setSearchTerm,
    setSelectedIds,
    setLoadingMessage,
    setIsLoading,
    setEntryToEditInModal,
    setEntryToInflect,
    activeTab,
    exportPath,
    isDirty,
    activeLexiconName,
    sessionCacheData,
    generationModes,
    activeLexicon,
    activeGrammar,
    activeMetadata,
    activeCustomFunctions,
    incompleteEntries,
    selectedIds,
    showNotification,
    setAiStatus,
    setAiProgress,
  } = options;

  const handleOpenModal = useCallback((modal: AppModalId) => openModal(modal), [openModal]);
  const handleCloseModal = useCallback(() => openModal('none'), [openModal]);

  const handleCreateNewLexicon = useCallback(() => {
    setShowWelcome(false);
    openModal('create_lexicon');
  }, [openModal, setShowWelcome]);

  const handleContinueToDashboard = useCallback(() => {
    // La bienvenida es un overlay `fixed inset-0 z-50`: debe desmontarse antes de
    // ofrecer el dashboard, si no queda apilada sobre modales del mismo nivel.
    setShowWelcome(false);
    audioService.playStartup();
  }, [setShowWelcome]);

  const handleConfirmCreateLexicon = useCallback((name: string, language: string) => {
    try {
      lexiconHook.createNewLexicon(name, language);
      audioService.playStartup();
      showNotification(`Léxico "${name}" creado exitosamente.`, 'success');
      openModal('none');
      setShowWelcome(false);

      const tourCompleted = sessionCacheData?.tourCompleted;
      const isFirstLexicon = lexiconHook.lexiconNames.length <= 1;
      if (isFirstLexicon && !tourCompleted) {
        setTimeout(() => setIsTourActive(true), 500);
      }
    } catch (e) {
      showNotification(e instanceof Error ? e.message : "Ocurrió un error al crear el léxico.", 'error');
    }
  }, [lexiconHook, showNotification, sessionCacheData, openModal, setShowWelcome, setIsTourActive]);

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

  const confirmDiscardUnsaved = useCallback((message = "Tienes cambios sin guardar. ¿Quieres continuar de todos modos?") => {
    return !isDirty || window.confirm(message);
  }, [isDirty]);

  const handleQuit = useCallback(() => {
    if (confirmDiscardUnsaved("Tienes cambios sin guardar. ¿Seguro que quieres salir?")) {
      window.loxarBridge.quitApp();
    }
  }, [confirmDiscardUnsaved]);

  const handleResetApp = useCallback(() => {
    if (
      confirmDiscardUnsaved("Tienes cambios sin guardar. Reiniciar borrará TODOS los léxicos locales. ¿Continuar?")
      && window.confirm("¿Seguro? Se borrarán TODOS los léxicos.")
    ) {
      localStorage.clear();
      saveSessionCache({ activeTab: 'dashboard', activeProfile: null, exportPath: null, tourCompleted: false }).catch(console.error);
      window.location.reload();
    }
  }, [confirmDiscardUnsaved, activeTab, exportPath]);

  const handleRestoreBackup = useCallback(async (fileName: string) => {
    if (!exportPath || !window.confirm("Restaurar esta copia cargará el backup como léxico activo. ¿Continuar?")) return;
    setIsLoading(true); setLoadingMessage("Restaurando copia...");
    try {
      const normalizedPath = exportPath.replace(/\\/g, '/');
      const content = await window.loxarBridge.readBackupFile(`${normalizedPath}/${fileName}`);
      await lexiconHook.startImportProcess(content);
      openModal('none');
    } catch (e) {
      showNotification(e instanceof Error ? e.message : "Ocurrió un error al restaurar la copia de seguridad.", 'error');
    }
    finally { setIsLoading(false); }
  }, [exportPath, showNotification, lexiconHook, setIsLoading, setLoadingMessage, openModal]);

  const handleStartTour = useCallback(() => {
    setCurrentTourSteps(resolveTourSteps(activeTab));
    setIsTourActive(true);
  }, [activeTab, setCurrentTourSteps]);

  const onTourEnd = useCallback(() => {
    setIsTourActive(false);
    saveSessionCache({ tourCompleted: true, activeTab }).catch(console.error);
  }, [activeTab]);

  const handleOpenInterlinearGloss = useCallback(() => {
    setActiveToolView('interlinear-gloss');
  }, [setActiveToolView]);

  const handleOpenSoundChangeWorkbench = useCallback(() => {
    setActiveToolView('sound-change');
  }, [setActiveToolView]);

  /**
   * Persiste el resultado del lote de sound change en el lexicón activo.
   * Antes el workbench descartaba el lote (onApplyBatch no se cableaba).
   */
  const handleApplySoundChangeBatch = useCallback((entries: LexiconEntry[], result: SoundChangeBatchResult) => {
    if (!entries.length) {
      showNotification('No hay entradas en el léxico para aplicar cambios de sonido.', 'error');
      return;
    }
    lexiconHook.updateActiveLexicon({ entries });
    const changed = result.changedEntryIds.length;
    showNotification(
      changed > 0
        ? `Cambios de sonido aplicados a ${changed} ${changed === 1 ? 'entrada' : 'entradas'}.`
        : 'Las reglas no produjeron cambios en el léxico.',
      changed > 0 ? 'success' : 'error',
    );
  }, [lexiconHook, showNotification]);

  const handleBackToToolDashboard = useCallback(() => {
    setActiveToolView('dashboard');
  }, [setActiveToolView]);

  const handleBootstrapOpenFound = useCallback(async (p: string) => {
    try {
      setProjectPath(p);
      await restoreProjectFromPath(p);
      setIsProjectDirty(false);
      saveSessionCache({ projectPath: p, activeTab }).catch(console.error);
      showNotification('Proyecto abierto.', 'success');
    } catch (e) {
      showNotification(e instanceof Error ? e.message : 'No se pudo abrir el proyecto.', 'error');
    } finally {
      setShowProjectBootstrap(false);
    }
  }, [restoreProjectFromPath, activeTab, showNotification, setProjectPath, setIsProjectDirty, setShowProjectBootstrap]);

  const handleBootstrapCreate = useCallback(() => {
    setShowProjectBootstrap(false);
    handleNewProject();
  }, [setShowProjectBootstrap, handleNewProject]);

  const handleBootstrapOpenOther = useCallback(() => {
    setShowProjectBootstrap(false);
    handleOpenProject();
  }, [setShowProjectBootstrap, handleOpenProject]);

  const handleBootstrapDismiss = useCallback(() => {
    setShowProjectBootstrap(false);
    setBootstrapDismissed(true);
    // Persist the dismissal: without it the bootstrap modal would reappear on
    // every startup for users who chose "Más tarde".
    loadSessionCache()
      .then(cache => saveSessionCache({ ...cache, bootstrapDismissed: true }))
      .catch(console.error);
    showNotification('Tus datos se guardan solo en este equipo. Usá "Nuevo"/"Abrir Proyecto" para fijar una ubicación segura.', 'error');
  }, [setShowProjectBootstrap, setBootstrapDismissed, showNotification]);

  const handleBootstrapImportLocal = useCallback(async () => {
    setShowProjectBootstrap(false);
    const selected = await save({
      filters: [{ name: 'LOXAR Project', extensions: ['loxar'] }],
      defaultPath: 'proyecto-importado.loxar',
    });
    if (typeof selected !== 'string' || !selected) return;
    try {
      const names = await listLexiconNames();
      const project = createEmptyProject('Proyecto importado', 'Español');
      for (const name of names) {
        const data = await loadLexicon(name);
        if (data) project.lexicons[name] = data;
      }
      await writeProjectToPath(selected, project);
      setProjectPath(selected);
      await restoreProjectFromPath(selected);
      setIsProjectDirty(false);
      saveSessionCache({ projectPath: selected, activeTab }).catch(console.error);
      showNotification(`Proyecto creado con ${names.length} léxico(s) importado(s).`, 'success');
    } catch (e) {
      showNotification(e instanceof Error ? e.message : 'No se pudo importar.', 'error');
    }
  }, [writeProjectToPath, restoreProjectFromPath, setProjectPath, setIsProjectDirty, showNotification, setShowProjectBootstrap, activeTab]);

  const handleWidgetAddWord = useCallback((word: string) => {
    lexiconHook.addWord({ Raíz: word, Léxema: [word], Categoría: 'sustantivo', Significado: ['[Pendiente]'], extraData: {} });
    // F4: Guardar inmediatamente para que funcione con app minimizada
    lexiconHook.saveChanges();
    showNotification(`Palabra "${word}" añadida desde el Widget.`, 'success');
  }, [lexiconHook, showNotification]);

  const handleWidgetAddInflection = useCallback((payload: { word: string; originalMeaning: string; formName: string }) => {
    lexiconHook.addWord({ Raíz: payload.word, Léxema: [payload.word], Categoría: 'desconocida', Significado: [`${payload.formName} de ${payload.originalMeaning}`], extraData: {} });
    // F4: Guardar inmediatamente para que funcione con app minimizada
    lexiconHook.saveChanges();
    showNotification(`Flexión "${payload.word}" añadida.`, 'success');
  }, [lexiconHook, showNotification]);

  const handleWidgetSearch = useCallback((term: string) => {
    if (!activeLexicon || !term || typeof term !== 'string') {
      return null;
    }
    const normalizedTerm = normalizeText(term.trim());
    if (!normalizedTerm) {
      return null;
    }
    return activeLexicon.find(entry =>
      entry.Significado.some(s => normalizeText(s).includes(normalizedTerm)) ||
      entry.Léxema.some(l => normalizeText(l).includes(normalizedTerm)) ||
      (entry.Raíz && normalizeText(entry.Raíz).includes(normalizedTerm))
    ) || null;
  }, [activeLexicon]);

  const handleInflectRequest = useCallback((entry: LexiconEntry) => {
    if (!entry || !lexiconHook.activeInflectionProfile) {
      return [];
    }
    const applicableParadigms = filterParadigmsForFunction(lexiconHook.activeInflectionProfile.paradigms || [], entry.Categoría);
    return applicableParadigms.map(paradigm => ({
      paradigmName: paradigm.name,
      forms: generateInflectedForms(entry, paradigm, lexiconHook.activeInflectionProfile)
    }));
  }, [lexiconHook.activeInflectionProfile]);

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
      setEditorMode('complete');
      setIncompleteIndex(idx);
      setActiveTab('workbench');
    } else {
      showNotification(`"${term}" ya está completa. Mostrándola en el léxico.`, 'success');
      setSearchTerm(term);
      setActiveTab('table');
    }
  }, [activeLexicon, incompleteEntries, showNotification, setEditorMode, setIncompleteIndex, setActiveTab, setSearchTerm]);

  const handleManageFunctions = useCallback((ops: FunctionOperation[]) => {
    lexiconHook.manageFunctions(ops);
    handleCloseModal();
  }, [lexiconHook, handleCloseModal]);

  const handleManageHyphens = useCallback((op: HyphenOperation) => {
    lexiconHook.manageHyphens(op);
    handleCloseModal();
  }, [lexiconHook, handleCloseModal]);

  const handleToggleSelectAll = useCallback((ids: string[]) => {
    setSelectedIds(prev => {
      const currentOnPage = new Set(ids);
      const onPageSelected = new Set(Array.from(prev).filter(id => currentOnPage.has(id)));
      if (onPageSelected.size === ids.length) return new Set(Array.from(prev).filter(id => !currentOnPage.has(id)));
      else return new Set([...Array.from(prev), ...ids]);
    });
  }, [setSelectedIds]);

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
  }, [setSelectedIds]);

  const handleBatchDelete = useCallback(() => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar ${selectedIds.size} entradas?`)) {
      lexiconHook.deleteBatchWords(selectedIds);
      setSelectedIds(new Set());
    }
  }, [selectedIds, lexiconHook, setSelectedIds]);

  const handleBatchChangeFunction = useCallback((newFunction: string) => {
    lexiconHook.batchUpdateFunction(selectedIds, newFunction);
    setSelectedIds(new Set());
  }, [selectedIds, lexiconHook, setSelectedIds]);

  const handleNavigateIncomplete = useCallback((dir: 'prev' | 'next') => {
    if (dir === 'prev') setIncompleteIndex(prev => Math.max(0, prev - 1));
    else setIncompleteIndex(prev => Math.min(incompleteEntries.length - 1, prev + 1));
  }, [incompleteEntries.length]);

  const handleExportGrammar = useCallback(() => {
    const manifest = activeGrammar;
    const safeName = (activeMetadata?.conlangName || 'gramatica').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const date = new Date().toISOString().split('T')[0];
    const fileName = `${safeName}_${date}.loxar-grammar.json`;
    const content = JSON.stringify(manifest, null, 2);
    window.loxarBridge.exportFile({ filePath: `${exportPath}/${fileName}`, content })
      .then(({ success, error }) => {
        if (success) showNotification(`Gramática exportada a ${fileName}`, 'success');
        else showNotification(`Error de exportación: ${error}`, 'error');
      })
      .catch(e => showNotification(`Error: ${e instanceof Error ? e.message : 'desconocido'}`, 'error'));
  }, [activeGrammar, activeMetadata, exportPath, showNotification]);

  const handleAiCompleteFunctions = useCallback(async (listName: string, successMessage = 'Funciones completadas') => {
    try {
      setAiStatus('working');
      setAiProgress(null);
      await lexiconHook.aiCompleteFunctions(activeCustomFunctions, (p, t) => setAiProgress({ processed: p, total: t }));
      setAiStatus('complete');
      showNotification(successMessage, 'success');
    } catch (e) {
      setAiStatus('error');
      setAiProgress(null);
    }
  }, [lexiconHook, activeCustomFunctions, showNotification, setAiStatus, setAiProgress]);

  const handleAiFillMissing = useCallback(async (listName: string, successMessage = 'Campos completados') => {
    try {
      setAiStatus('working');
      setAiProgress(null);
      await lexiconHook.aiFillMissingFields((p, t) => setAiProgress({ processed: p, total: t }));
      setAiStatus('complete');
      showNotification(successMessage, 'success');
    } catch (e) {
      setAiStatus('error');
      setAiProgress(null);
    }
  }, [lexiconHook, showNotification, setAiStatus, setAiProgress]);

  return {
    handleOpenModal,
    handleCloseModal,
    handleCreateNewLexicon,
    handleContinueToDashboard,
    handleConfirmCreateLexicon,
    handleRenameLexicon,
    handleDeleteLexicon,
    confirmDiscardUnsaved,
    handleQuit,
    handleResetApp,
    handleRestoreBackup,
    handleStartTour,
    onTourEnd,
    handleOpenInterlinearGloss,
    handleOpenSoundChangeWorkbench,
    handleApplySoundChangeBatch,
    handleBackToToolDashboard,
    handleBootstrapOpenFound,
    handleBootstrapCreate,
    handleBootstrapOpenOther,
    handleBootstrapDismiss,
    handleBootstrapImportLocal,
    handleWidgetAddWord,
    handleWidgetAddInflection,
    handleWidgetSearch,
    handleInflectRequest,
    handleLookupForCompletion,
    handleManageFunctions,
    handleManageHyphens,
    handleToggleSelectAll,
    handleAddLexicalException,
    handleToggleSelection,
    handleBatchDelete,
    handleBatchChangeFunction,
    handleNavigateIncomplete,
    handleExportGrammar,
    handleAiCompleteFunctions,
    handleAiFillMissing,
  };
};
