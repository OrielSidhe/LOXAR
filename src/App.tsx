import React, { useCallback, useState, useEffect, useMemo, ReactNode, Suspense, lazy } from 'react';
import Header from './components/Header';
import LexiconTable from './components/LexiconTable';
import AppToolbar from './components/AppToolbar';
import { useLexicon } from './hooks/useLexicon';
import { useWidgetBridge } from './hooks/useWidgetBridge';
import { useWorkQueue } from './hooks/useWorkQueue';
import { useAiHandlers } from './hooks/useAiHandlers';
import { useProjectOperations } from './hooks/useProjectOperations';
import { useAppHandlers } from './hooks/useAppHandlers';
import { generateRootAndLexeme, normalizeText, completeEntry, correctSignificado } from './services/geminiService';
import { filterParadigmsForFunction, generateInflectedForms } from './services/inflectionService';
import { searchLexicon } from './services/ftsSearch';
import { loadSessionCache, saveSessionCache } from './services/sessionCache';
import { getStoredTheme, applyTheme, saveTheme, themes, type ThemeId } from './services/themeService';
import { LexiconEntry, MissingWord, FunctionOperation, HyphenOperation, WorkQueueItem, GenerationMode, LexiconFilter } from './types';
import type { AppTabId } from './utils/appTabs';
import { DEFAULT_GRAMMAR_MODULE, type GrammarModule } from './utils/grammarTabModel';
import { morphologyToTypologyProfile, type TypologyProfile } from './types/pragmaticTypes';
import { FloatingWidget } from './components/FloatingWidget';
import FirstRunWizard from './components/FirstRunWizard';
import { useFirstRunWizard, checkIsFirstRun } from './hooks/useFirstRunWizard';
import { useFirstRunWizardActions } from './hooks/useFirstRunWizardActions';
import type { AppModalId } from './utils/wizardActionsModel';
import InterlinearGlossViewer from './components/InterlinearGlossViewer';
import SoundChangeWorkbench from './components/SoundChangeWorkbench';
import { phonologyFromManifest } from './services/grammar/phonologySync';
import { normalizeExportFormats, DEFAULT_EXPORT_FORMATS, type ExportFormat } from './utils/lexiconExport';
import Papa from 'papaparse';

// Icons
import BookOpenIcon from './components/icons/BookOpenIcon';
import WandIcon from './components/icons/WandIcon';
import BarChartIcon from './components/icons/BarChartIcon';
import TableIcon from './components/icons/TableIcon';
import PenToolIcon from './components/icons/PenToolIcon';
import SettingsIcon from './components/icons/SettingsIcon';
import SparkleIcon from './components/icons/SparkleIcon';

// Components
import AppLoadingLayer from './components/AppLoadingLayer';
import EntryEditor from './components/EntryEditor';
import CollectionsManager from './components/CollectionsManager';
import WritingAndNeographyTab from './components/WritingAndNeographyTab';
import GrammarTab from './components/GrammarTab';
import TranslationPlayground from './components/TranslationPlayground';
import SuggestionsWorkbench from './components/SuggestionsWorkbench';
import WorkbenchRightPanel from './components/WorkbenchRightPanel';
import WorkQueueBar from './components/WorkQueueBar';
import WorkbenchTab from './components/WorkbenchTab';
import ToolsTab from './components/ToolsTab';
import AppBatchToolbar from './components/AppBatchToolbar';
import AppOfflineBannerLayer from './components/AppOfflineBannerLayer';
import ImportJobBanner from './components/ImportJobBanner';
import AppAmbientLightsLayer from './components/AppAmbientLightsLayer';
import AppProjectBootstrapLayer from './components/AppProjectBootstrapLayer';
import { ErrorBoundary } from './components/ErrorBoundary';

import AppSettingsModalLayer from './components/AppSettingsModalLayer';
import ToolsDashboard from './components/ToolsDashboard';
import VerticalSidebar from './components/VerticalSidebar';
import ModulePanel from './components/ModulePanel';
import DashboardTab from './components/DashboardTab';
import AppWelcomeSection from './components/AppWelcomeSection';
import AppToastLayer from './components/AppToastLayer';
import AppNavigationBar from './components/AppNavigationBar';

// Data & Helpers
import { WORD_LISTS } from './data/wordLists';
import { MAIN_TOUR_STEPS, COLLECTIONS_TOUR_STEPS, WRITING_TOUR_STEPS, TOOLS_TOUR_STEPS } from './data/tourSteps';
import { audioService } from './services/audioService';
import { generateLanguageSample } from './services/geminiService';
import { isAiAvailable } from './services/geminiService';
import { validateGrammarEngine } from './validation/runtimeValidation';
import { readTextFile, writeTextFile, exists } from '@tauri-apps/plugin-fs';
import { createEmptyProject, projectToJson, projectFromJson, LOXAR_PROJECT_VERSION, type LoxarProject } from './services/projectFile';
import { listLexiconNames, loadLexicon } from './services/sqlStorage';
import { initPragmaticDb } from './services/grammarDb';
import { scanForLoxarProjects } from './services/projectDiscovery';
import { getGrammarMetrics } from './utils/grammarMetrics';
import { buildDashboardStats } from './utils/dashboardStats';

const ModalManager = lazy(() => import('./components/ModalManager'));
const AiSettingsModal = lazy(() => import('./components/AiSettingsModal'));

const App = () => {
  const appVersion = '2.4.0-pro';

  const [splashFinished, setSplashFinished] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [hasSeenWelcome, setHasSeenWelcome] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [notifications, setNotifications] = useState<{ id: number; message: string; type: 'success' | 'error' }[]>([]);
  const [isAppLoaded, setIsAppLoaded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeModal, setActiveModal] = useState<AppModalId>('none');

  // I1: First-run wizard state
  const { showWizard, step, dataFolder, goToStep, nextStep, prevStep, skipWizard, completeWizard, updateDataFolder } = useFirstRunWizard();

  // Handlers del wizard de primer arranque (logica pura en `wizardActionsModel`).
  const {
    handleWizardConfigureAi,
    handleAiSettingsModalClose,
    handleWizardSkip,
    handleWizardComplete,
    handleChooseDataFolder,
  } = useFirstRunWizardActions({
    showWizard,
    step,
    completeWizard,
    skipWizard,
    updateDataFolder,
    setActiveModal,
  });

  const [tabHistory, setTabHistory] = useState<AppTabId[]>(['dashboard']);
  const activeTab: AppTabId = tabHistory[tabHistory.length - 1] ?? 'dashboard';
  const [activeGrammarModule, setActiveGrammarModule] = useState<GrammarModule>(DEFAULT_GRAMMAR_MODULE);

  const setActiveTab = useCallback((tab: AppTabId | ((prev: AppTabId) => AppTabId)) => {
    setTabHistory(prev => {
      const next = typeof tab === 'function' ? tab(prev[prev.length - 1] ?? 'dashboard') : tab;
      if (prev[prev.length - 1] === next) return prev;
      return [...prev, next];
    });
  }, []);

  const goBack = useCallback(() => {
    setTabHistory(prev => {
      if (prev.length <= 1) return prev;
      return prev.slice(0, -1);
    });
  }, []);

  const goHome = useCallback(() => {
    setTabHistory(['dashboard']);
  }, []);

  /** Abre el tab de gramática en un sub-módulo concreto (consume `DashboardTab`). */
  const handleOpenGrammarModule = useCallback((moduleId: GrammarModule) => {
    setActiveTab('grammar');
    setActiveGrammarModule(moduleId);
  }, [setActiveTab]);

  /**
   * Salto rapido Workbench <-> Léxico (FASE NAV del gauntlet v3.14). Ambos tabs
   * permanecen montados en el arbol (solo se ocultan), asi que el borrador del
   * editor y los filtros/pagina de la tabla sobreviven al salto.
   */
  const handleQuickNav = useCallback((target: 'table' | 'workbench') => {
    setActiveTab(target);
  }, [setActiveTab]);

  const [themeId, setThemeId] = useState<ThemeId>(getStoredTheme());
  useEffect(() => {
    applyTheme(themes[themeId]);
    saveTheme(themeId);
  }, [themeId]);

  const [editorMode, setEditorMode] = useState<'add' | 'complete'>('add');
  const [incompleteIndex, setIncompleteIndex] = useState(0);
  const [initialDataForAdd, setInitialDataForAdd] = useState<any>(null);
  const [generationModes, setGenerationModes] = useState<GenerationMode[]>(['generative']);

  const [entryToComplete, setEntryToComplete] = useState<LexiconEntry | null>(null);
  const [entryToEditInModal, setEntryToEditInModal] = useState<LexiconEntry | null>(null);
  const [entryToInflect, setEntryToInflect] = useState<LexiconEntry | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [searchColumn, setSearchColumn] = useState('all');
  const [functionFilter, setFunctionFilter] = useState('all');
  const [viewFilter, setViewFilter] = useState<LexiconFilter>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [visibleColumns, setVisibleColumns] = useState<string[]>(['Léxema', 'Significado', 'Función', 'Raíz']);
  const [showAffixFormatting, setShowAffixFormatting] = useState(true);

  const [aiStatus, setAiStatus] = useState<'idle' | 'working' | 'complete' | 'error'>('idle');
  const [grammarOk, setGrammarOk] = useState<boolean | null>(null);
  const [showOfflineBanner, setShowOfflineBanner] = useState(false);
  const [aiProgress, setAiProgress] = useState<{ processed: number; total: number } | null>(null);
  const [lastAiResult, setLastAiResult] = useState<any>(null);
  const [suggestions, setSuggestions] = useState<MissingWord[]>([]);
  const [suggestionListName, setSuggestionListName] = useState('');

  const [backups, setBackups] = useState<string[]>([]);
  const [exportPath, setExportPath] = useState<string | null>(null);
  const [exportFormats, setExportFormats] = useState<ExportFormat[]>([...DEFAULT_EXPORT_FORMATS]);
  const [projectPath, setProjectPath] = useState<string | null>(null);
  const [projectLastSaved, setProjectLastSaved] = useState<Date | null>(null);
  const [isProjectDirty, setIsProjectDirty] = useState(false);
  const [canvasState, setCanvasState] = useState<{ nodes: any[]; edges: any[] }>({ nodes: [], edges: [] });
  const [isTourActive, setIsTourActive] = useState(false);
  const [activeToolView, setActiveToolView] = useState<'dashboard' | 'interlinear-gloss' | 'sound-change'>('dashboard');

  const [sessionCacheData, setSessionCacheData] = useState<{ tourCompleted?: boolean } | null>(null);
  const [currentTourSteps, setCurrentTourSteps] = useState(MAIN_TOUR_STEPS);

  const [showProjectBootstrap, setShowProjectBootstrap] = useState(false);
  const [availableProjects, setAvailableProjects] = useState<string[]>([]);
  const [hasLocalData, setHasLocalData] = useState(false);
  const [bootstrapDismissed, setBootstrapDismissed] = useState(false);

  const showNotification = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 5000);
  }, []);

  const lexiconHook = useLexicon(showNotification, setIsLoading, setLoadingMessage);
  const { activeLexicon, activeLexiconName, activeProfile, activeMetadata, activeCustomFunctions, lexicons, isDirty, activeGrammar } = lexiconHook;

  const projectOps = useProjectOperations({
    activeLexicon,
    activeLexiconName,
    activeMetadata,
    activeGrammar,
    activeProfile,
    activeCustomFunctions,
    themeId,
    exportPath,
    projectPath,
    isProjectDirty,
    isDirty,
    canvasState,
    sessionCacheData,
    activeTab,
    showNotification,
    setIsLoading,
    setLoadingMessage,
    setProjectPath,
    setCanvasState,
    setIsProjectDirty,
    setProjectLastSaved,
    setActiveTab,
    setExportPath,
    setBackups,
    lexicons,
    lexiconHook,
  });

  const {
    buildProjectPayload,
    writeProjectToPath,
    handleNewProject,
    handleOpenProject,
    handleSaveProject,
    handleSaveProjectAs,
    restoreProjectFromPath,
    handleFileExport,
    handleSetExportPath,
    handleSaveChanges,
    markProjectDirty,
  } = projectOps;

  const incompleteEntries = useMemo(() => activeLexicon.filter(entry => {
    const category = entry.Categoría?.trim().toLowerCase();
    return !entry.Significado?.[0]?.trim()
      || !category
      || category === 'desconocida'
      || category === 'n/a'
      || !entry.Raíz?.trim()
      || !entry.Léxema?.[0]?.trim();
  }), [activeLexicon]);

  const appHandlers = useAppHandlers({
    lexiconHook,
    restoreProjectFromPath,
    writeProjectToPath,
    handleNewProject,
    handleOpenProject,
    markProjectDirty,
    setShowProjectBootstrap,
    setBootstrapDismissed,
    setProjectPath,
    setIsProjectDirty,
    setActiveTab,
    setShowWelcome,
    setIsTourActive,
    setActiveModal,
    setCanvasState,
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
    setLastAiResult,
  });

  const {
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
    handleCanvasChange,
    handleBootstrapCreate,
    handleBootstrapOpenOther,
    handleBootstrapOpenFound,
    handleBootstrapImportLocal,
    handleBootstrapDismiss,
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
  } = appHandlers;

  const handleLoadLexiconEntries = useCallback(async (name: string): Promise<LexiconEntry[] | null> => {
    try {
      const data = await loadLexicon(name);
      return data?.entries ?? null;
    } catch (e) {
      console.error(`No se pudo cargar el léxico "${name}" para comparar.`, e);
      return null;
    }
  }, []);

  const handleMergeLexiconEntries = useCallback((entries: LexiconEntry[]) => {
    if (!lexiconHook.activeLexiconName) {
      showNotification('No hay un léxico activo que fusionar.', 'error');
      return;
    }
    lexiconHook.updateActiveLexiconEntries(
      [...lexiconHook.activeLexicon, ...entries],
      true,
      entries.length,
    );
  }, [lexiconHook, showNotification]);

  const aiHandlers = useAiHandlers({
    activeLexicon,
    showNotification,
    getLexiconSample: lexiconHook.getLexiconSample,
    generativeProfile: activeProfile,
    setAiStatus,
    setSuggestionListName,
    setActiveTab,
    setSuggestions,
    setInitialDataForAdd,
    setEditorMode,
  });

  const {
    handleAnalyzeForSuggestions,
    handleAiGenerate,
    handleAiCompleteEntry,
    handleCorrectSignificado,
    handleGenerateAIFromSuggestion,
    handleAddManuallyFromSuggestion,
  } = aiHandlers;

  const workQueueState = useWorkQueue({
    getLexiconSample: lexiconHook.getLexiconSample,
    activeInflectionProfile: lexiconHook.activeInflectionProfile,
    activeLexicon,
    generativeProfile: activeProfile,
    showNotification,
    setActiveTab,
    setAiStatus,
  });

  const {
    workQueue,
    queueCursor,
    queueActive,
    currentQueueItem,
    enqueueItems,
    queueAdvance,
    queuePrev,
    queueTogglePending,
    queueRemoveCurrent,
    queueClear,
    handleEnqueue,
    handleGenerateBatch,
    queueInitialData,
  } = workQueueState;

  const effectiveInitialDataForAdd = queueActive ? queueInitialData : initialDataForAdd;

  useEffect(() => {
    if (editorMode === 'complete') {
      setEntryToComplete(incompleteEntries[incompleteIndex] ?? null);
    } else {
      setEntryToComplete(null);
    }
  }, [editorMode, incompleteIndex, incompleteEntries]);

  useEffect(() => {
    setIncompleteIndex(prev => Math.max(0, Math.min(prev, incompleteEntries.length - 1)));
  }, [incompleteEntries.length]);

  const completionStats = useMemo(() => ({
    total: activeLexicon.length,
    needsFunction: incompleteEntries.filter(e => !e.Categoría || e.Categoría === 'desconocida').length,
    totalIncomplete: incompleteEntries.length,
  }), [activeLexicon.length, incompleteEntries]);

  /** Live grammar metrics derived from the canonical manifest shape. */
  const grammarMetrics = useMemo(() => getGrammarMetrics(activeGrammar), [activeGrammar]);

  /**
   * B2: Derive the live PragmaticEngine summary from activeGrammar.
   * typologyLabel comes from morphologyToTypologyProfile (single source of
   * truth — never hardcoded). rulesCount reuses the shared grammar metrics.
   * activeClauseType propagates from the saved manifest.
   */
  const pragmaticEngine = useMemo(() => {
    if (!activeGrammar?.typology) return undefined;
    const label = morphologyToTypologyProfile(activeGrammar.typology.morphology);
    return {
      typologyLabel: label,
      rulesCount: grammarMetrics.rules,
      alignment: activeGrammar.typology.alignment || 'nominative',
      wordOrder: activeGrammar.typology.wordOrder || '',
      headDirection: activeGrammar.typology.headDirection || '',
      activeClauseType: activeGrammar.pragmaticEngine?.activeClauseType ?? null,
    };
  }, [activeGrammar, grammarMetrics]);

  const entryBeingEdited = useMemo(() => (editorMode === 'complete' ? entryToComplete : null), [editorMode, entryToComplete]);

  const widgetBridge = useWidgetBridge({
    onAddWord: handleWidgetAddWord,
    onAddInflection: handleWidgetAddInflection,
    onSearch: handleWidgetSearch,
    onInflectRequest: handleInflectRequest,
    openWidget: () => window.loxarBridge.openWidget(),
  });

  useEffect(() => {
    if (activeLexicon && lexiconHook.activeInflectionProfile && activeMetadata) {
      widgetBridge.sendLexiconData({
        entries: activeLexicon,
        inflectionProfile: lexiconHook.activeInflectionProfile,
        metadata: activeMetadata,
      });
    }
  }, [activeLexicon, lexiconHook.activeInflectionProfile, activeMetadata, widgetBridge.sendLexiconData]);

  // ── Welcome screen: respetar setting "showWelcomeOnStart" ──
  useEffect(() => {
    if (hasSeenWelcome) return;
    loadSessionCache().then((cache) => {
      // showWelcomeOnStart por defecto = true (mostrar bienvenida)
      // Si el usuario lo desactivó en settings, ir directo al dashboard
      const shouldShowWelcome = cache.showWelcomeOnStart !== false;
      setShowWelcome(shouldShowWelcome);
      setHasSeenWelcome(true);
    }).catch(() => {
      setShowWelcome(true);
      setHasSeenWelcome(true);
    });
  }, [hasSeenWelcome]);

  // ── Initialize pragmatic grammar database on mount ──
  useEffect(() => {
    initPragmaticDb().catch(e => console.error('[App] Failed to init pragmatic DB:', e));
  }, []);

  // ── B0: Bootstrap de proyecto — hidratar la sesión y activar la capa de bootstrap ──
  // `isAppLoaded` solo se elevaba aquí; antes ningún setter se invocaba, así que
  // `AppProjectBootstrapLayer` retornaba null siempre y el flujo de proyecto
  // (elegir ubicación del `.loxar`) estaba muerto en runtime.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cache = await loadSessionCache();
        if (cancelled) return;
        setSessionCacheData(cache);
        setProjectPath(cache.projectPath ?? null);
        setExportPath(cache.exportPath ?? null);
        setExportFormats(normalizeExportFormats(cache.exportFormats));
        setBootstrapDismissed(cache.bootstrapDismissed === true);
        try {
          const names = await listLexiconNames();
          if (!cancelled) setHasLocalData(names.length > 0);
        } catch (e) {
          // En modo no-Tauri (tests) no hay backend SQL: no es un error de usuario.
          console.error('[App] No se pudo consultar los léxicos locales:', e);
        }
        if (cancelled) return;
        setIsAppLoaded(true);
        // Sin proyecto configurado y sin descarte previo: ofrecer ubicación segura.
        if (!cache.projectPath && cache.bootstrapDismissed !== true) {
          setShowProjectBootstrap(true);
        }
      } catch (e) {
        console.error('[App] No se pudo cargar la sesión:', e);
        if (!cancelled) setIsAppLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <ErrorBoundary>
      <div className="flex flex-col h-screen bg-background-dark text-text-primary bg-grid-pattern overflow-hidden relative selection:bg-primary/30 selection:text-white">
        <AppWelcomeSection
          splashFinished={splashFinished}
          onSplashFinish={() => setSplashFinished(true)}
          showWelcome={showWelcome}
          onCreateLexicon={handleCreateNewLexicon}
          onContinue={handleContinueToDashboard}
          onImport={content => {
            audioService.playStartup();
            setShowWelcome(false);
            lexiconHook.startImportProcess(content);
          }}
          onStartTour={() => {
            audioService.playStartup();
            setShowWelcome(false);
            handleStartTour();
          }}
          isTourActive={isTourActive}
          tourSteps={currentTourSteps}
          onTourEnd={onTourEnd}
          />

        {/* I1-I5: First-run wizard */}
        {showWizard && (
          <FirstRunWizard
            step={step}
            dataFolder={dataFolder}
            onNext={nextStep}
            onPrev={prevStep}
            onSkip={handleWizardSkip}
            onComplete={step === 'data-folder' ? handleWizardComplete : nextStep}
            onConfigureAi={handleWizardConfigureAi}
            onChooseDataFolder={handleChooseDataFolder}
            onDataFolderChange={updateDataFolder}
          />
        )}

        <div className={`flex flex-col h-full transition-opacity duration-1000 ${splashFinished && !showWelcome ? 'opacity-100' : 'opacity-0'}`}>
          <AppAmbientLightsLayer />

          <AppLoadingLayer isLoading={isLoading} loadingMessage={loadingMessage} />
          <AppOfflineBannerLayer showOfflineBanner={showOfflineBanner} />

          <ImportJobBanner />

          <Suspense fallback={<div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 text-text-secondary text-sm">Cargando…</div>}>
            <ModalManager
            activeModal={activeModal}
            entryToEditInModal={entryToEditInModal}
            entryToInflect={entryToInflect}
            importState={lexiconHook.importState}
            activeLexicon={activeLexicon}
            activeLexiconName={activeLexiconName}
            lexiconNames={lexiconHook.lexiconNames}
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
              await handleAiCompleteFunctions(suggestionListName, 'Completado de funciones finalizado');
            }}
            onAiFillMissing={async () => {
              await handleAiFillMissing(suggestionListName, 'Generación masiva completada');
            }}
            onAnalyzeForSuggestions={handleAnalyzeForSuggestions}
            onManageFunctions={handleManageFunctions}
            onManageHyphens={handleManageHyphens}
            onUpdateGenerativeProfile={lexiconHook.updateGenerativeProfile}
            onGenerateLanguageSample={async (profile, _sampleList) => generateLanguageSample(profile, lexiconHook.activeLexicon)}
            onAddWord={lexiconHook.addWord}
            onEditWord={lexiconHook.editWord}
            onConfirmCreateLexicon={handleConfirmCreateLexicon}
            onAddCustomFunction={lexiconHook.addCustomFunction}
            onOpenFunctions={() => setActiveModal('functions')}
            onOpenHyphens={() => setActiveModal('hyphens')}
            onOpenProfile={() => setActiveModal('profile')}
            onOpenNeography={() => setActiveTab('writing')}
            onOpenInflection={() => setActiveTab('grammar')}
            onOpenCompare={() => setActiveModal('lexicon_compare')}
            onLoadLexiconEntries={handleLoadLexiconEntries}
            onMergeLexiconEntries={handleMergeLexiconEntries}
            importHandlers={{
              cancelImport: lexiconHook.cancelImport,
              setImportMapping: lexiconHook.setImportMapping,
              resolveConflict: lexiconHook.resolveConflict,
              proceedWithValidEntries: lexiconHook.proceedWithValidEntries,
              resanitizeAndContinue: lexiconHook.resanitizeAndContinue,
              applyCharacterRepair: lexiconHook.applyCharacterRepair,
            }}
            showNotification={showNotification}
          />
          {activeModal === 'ai_settings' && <AiSettingsModal onClose={handleAiSettingsModalClose} />}
          </Suspense>
          <AppSettingsModalLayer
            showSettings={showSettings}
            onCloseSettings={() => setShowSettings(false)}
            onOpenAiSettings={() => { setShowSettings(false); handleOpenModal('ai_settings'); }}
            exportFormats={exportFormats}
            onExportFormatsChange={setExportFormats}
          />

          <Header
            wordsAddedCount={lexiconHook.wordsAddedSinceSave}
            onOpenWidget={() => window.loxarBridge.openWidget()}
            onShowTour={handleStartTour}
            onOpenSettings={() => setShowSettings(true)}
            themeId={themeId}
            onThemeChange={id => setThemeId(id)}
          />

          <AppToolbar
            lexiconNames={lexiconHook.lexiconNames}
            activeLexiconName={activeLexiconName}
            onSelectLexicon={lexiconHook.setActiveLexicon}
            onCreateLexicon={handleCreateNewLexicon}
            onDeleteLexicon={handleDeleteLexicon}
            onRenameLexicon={handleRenameLexicon}
            onImport={lexiconHook.startImportProcess}
            onExport={handleFileExport}
            exportFormats={exportFormats}
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
            onNewProject={handleNewProject}
            onOpenProject={handleOpenProject}
            onSaveProject={handleSaveProject}
            onSaveProjectAs={handleSaveProjectAs}
            projectPath={projectPath}
          />

          <div className="flex flex-1 min-h-0 relative">
            <VerticalSidebar
              active={activeTab}
              onChange={setActiveTab}
              onOpenWidget={() => window.loxarBridge.openWidget()}
              onOpenSettings={() => setShowSettings(true)}
              onShowTour={handleStartTour}
              onGoHome={goHome}
            />

            <main className="flex-1 overflow-y-auto p-4 sm:p-6 relative z-0 custom-scrollbar scroll-smooth bg-surface-dark/40 backdrop-blur-sm">
              {activeTab !== 'dashboard' && (
                <AppNavigationBar
                  onBack={goBack}
                  onHome={goHome}
                  activeTab={activeTab}
                  onQuickNav={handleQuickNav}
                />
              )}
              <div className="flex-grow h-full flex flex-col">
                {activeTab === 'dashboard' && (
                  <DashboardTab
                    conlangName={activeMetadata?.conlangName}
                    conlangNames={lexiconHook.lexiconNames}
                    onSelectConlang={lexiconHook.setActiveLexicon}
                    lexicon={activeLexicon}
                    grammar={activeGrammar}
                    stats={buildDashboardStats({
                      grammar: activeGrammar,
                      lexicon: activeLexicon,
                      incompleteCount: incompleteEntries.length,
                    })}
                    pragmaticEngine={pragmaticEngine}
                    onOpenTab={setActiveTab}
                    onOpenGrammarModule={handleOpenGrammarModule}
                  />
                )}
                <div
                  aria-hidden={activeTab === 'table' ? undefined : true}
                  className={`flex-grow h-full flex flex-col ${activeTab === 'table' ? '' : 'hidden'}`}
                >
                  <LexiconTable
                    active={activeTab === 'table'}
                    data={activeLexicon}
                    lexiconName={activeLexiconName}
                    conlangName={activeMetadata?.conlangName}
                    mainLanguage={activeMetadata?.mainLanguage}
                    onEditWord={lexiconHook.editWord}
                    onDeleteWord={lexiconHook.deleteWord}
                    showNotification={showNotification}
                    searchTerm={searchTerm}
                    onSearchTermChange={setSearchTerm}
                    categoryFilter={functionFilter}
                    onCategoryFilterChange={setFunctionFilter}
                    viewFilter={viewFilter}
                    onViewFilterChange={setViewFilter}
                    showAffixFormatting={showAffixFormatting}
                    onShowAffixFormattingChange={setShowAffixFormatting}
                    selectedIds={selectedIds}
                    onToggleSelection={handleToggleSelection}
                    onToggleSelectAll={handleToggleSelectAll}
                    onGenerateInflections={entry => {
                      setEntryToInflect(entry);
                      handleOpenModal('inflection_generator');
                    }}
                    onSearch={activeLexiconName ? async (term: string) => (await searchLexicon(lexicons[activeLexiconName], term, activeLexiconName)).map(r => r.entry) : undefined}
                  />
                </div>
                <div
                  aria-hidden={activeTab === 'workbench' ? undefined : true}
                  className={`flex-grow h-full flex flex-col ${activeTab === 'workbench' ? '' : 'hidden'}`}
                >
                  <WorkbenchTab
                    queueActive={queueActive}
                    workQueue={workQueue}
                    queueCursor={queueCursor}
                    queuePrev={queuePrev}
                    queueNext={queueAdvance}
                    queueTogglePending={queueTogglePending}
                    queueRemoveCurrent={queueRemoveCurrent}
                    queueClear={queueClear}
                    editorMode={editorMode}
                    onEditorModeChange={setEditorMode}
                    entryToEdit={entryBeingEdited}
                    incompleteCount={incompleteEntries.length}
                    incompleteIndex={incompleteIndex}
                    onNavigateIncomplete={handleNavigateIncomplete}
                    onLookup={handleLookupForCompletion}
                    onAddWord={lexiconHook.addWord}
                    onUpdateWord={lexiconHook.editWord}
                    onAiCompleteEntry={handleAiCompleteEntry}
                    onAiGenerateRootAndLexeme={handleAiGenerate}
                    onCorrectSignificado={handleCorrectSignificado}
                    showNotification={showNotification}
                    disabled={!activeLexiconName}
                    initialDataForAdd={effectiveInitialDataForAdd}
                    setIsLoading={setIsLoading}
                    setLoadingMessage={setLoadingMessage}
                    customCategories={activeCustomFunctions}
                    onAddCustomCategory={lexiconHook.addCustomFunction}
                    activeMetadata={activeMetadata}
                    activeLexicon={activeLexicon}
                    generationModes={generationModes}
                    onGenerationModesChange={setGenerationModes}
                    onQueueAdvance={queueActive ? queueAdvance : undefined}
                    suggestions={suggestions}
                    suggestionListName={suggestionListName}
                    onCloseSuggestions={() => setSuggestions([])}
                    onAddManually={handleAddManuallyFromSuggestion}
                    onGenerateAI={handleGenerateAIFromSuggestion}
                    isLoadingAI={aiStatus === 'working'}
                    onSelectList={(name) => setSuggestionListName(name)}
                    onAnalyzeList={handleAnalyzeForSuggestions}
                    generativeProfile={activeProfile}
                    generativeLexicon={activeLexicon}
                    onSaveGenerativeProfile={lexiconHook.updateGenerativeProfile}
                    onEnqueue={handleEnqueue}
                    onGenerateBatch={handleGenerateBatch}
                    manifest={activeGrammar}
                    onSyncPhonology={p => lexiconHook.updateGenerativeProfile({ ...activeProfile, ...p })}
                  />
                </div>
                {activeTab === 'collections' && (
                  <CollectionsManager
                    lexicon={activeLexicon}
                    inflection={lexiconHook.activeInflectionProfile}
                    onUpdateEntry={lexiconHook.editWord}
                    onAddEntry={lexiconHook.addWord}
                    onAddBatchEntries={lexiconHook.addBatchWords}
                    onDeleteEntry={lexiconHook.deleteWord}
                    customCategories={activeCustomFunctions}
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
                    onSave={manifest => lexiconHook.updateGrammarManifest(manifest)}
                    lexicon={activeLexicon}
                    conlangName={activeMetadata?.conlangName}
                    onAddLexicalException={handleAddLexicalException}
                    onExportGrammar={handleExportGrammar}
                    activeModule={activeGrammarModule}
                    onModuleChange={setActiveGrammarModule}
                    onBack={() => setActiveTab('dashboard')}
                    onOpenAiSettings={() => handleOpenModal('ai_settings')}
                    showNotification={showNotification}
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
                  <ToolsTab
                    activeTab={activeTab}
                    suggestions={suggestions}
                    suggestionListName={suggestionListName}
                    onCloseSuggestions={() => setSuggestions([])}
                    onAddManually={handleAddManuallyFromSuggestion}
                    onGenerateAI={handleGenerateAIFromSuggestion}
                    isLoadingAI={aiStatus === 'working'}
                    activeMetadata={activeMetadata}
                    activeToolView={activeToolView}
                    onBackToToolDashboard={handleBackToToolDashboard}
                    onOpenInterlinearGloss={handleOpenInterlinearGloss}
                    onOpenSoundChangeWorkbench={handleOpenSoundChangeWorkbench}
                    onApplySoundChangeBatch={handleApplySoundChangeBatch}
                    onCompleteFunctions={handleAiCompleteFunctions}
                    onFillMissing={handleAiFillMissing}
                    onAnalyzeForSuggestions={handleAnalyzeForSuggestions}
                    onManageFunctions={() => setActiveModal('functions')}
                    onManageHyphens={() => setActiveModal('hyphens')}
                    onOpenProfile={() => setActiveModal('profile')}
                    onOpenNeography={() => setActiveTab('writing')}
                    onOpenInflectionWorkshop={() => setActiveTab('grammar')}
                    onOpenGrammar={() => setActiveTab('grammar')}
                    onOpenTranslator={() => setActiveTab('translator')}
                    onStartTour={handleStartTour}
                    lexicon={lexicons[activeLexiconName ?? '']}
                    stats={completionStats}
                    disabled={!activeLexiconName}
                  />
                )}
              </div>
            </main>
          </div>

          {activeTab === 'table' && selectedIds.size > 0 && (
            <AppBatchToolbar
              selectedCount={selectedIds.size}
              customFunctions={activeCustomFunctions}
              onClearSelection={() => setSelectedIds(new Set())}
              onBatchDelete={handleBatchDelete}
              onBatchChangeFunction={handleBatchChangeFunction}
            />
          )}

          <AppToastLayer
            notifications={notifications}
            onDismissNotification={id => setNotifications(prev => prev.filter(n => n.id !== id))}
          />

          {/* F1: Floating widget — persists position/dock state in localStorage */}
          <FloatingWidget
            isCapturing={false}
            missingWords={[]}
            onAddWord={handleWidgetAddWord}
            onSearch={handleWidgetSearch}
            onToggleCapture={() => window.loxarBridge.openWidget()}
            lastResult={null}
          />

          {!showWelcome && !showWizard && (
            <AppProjectBootstrapLayer
              isAppLoaded={isAppLoaded}
              showProjectBootstrap={showProjectBootstrap}
              bootstrapDismissed={bootstrapDismissed}
              projectPath={projectPath}
              availableProjects={availableProjects}
              hasLocalData={hasLocalData}
              onCreate={handleBootstrapCreate}
              onOpenOther={handleBootstrapOpenOther}
              onOpenFound={handleBootstrapOpenFound}
              onImportLocal={handleBootstrapImportLocal}
              onDismiss={handleBootstrapDismiss}
              onChooseLocation={() => setShowProjectBootstrap(true)}
            />
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default App;
