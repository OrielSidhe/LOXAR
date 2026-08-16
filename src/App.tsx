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
import ArrowLeftIcon from './components/icons/ArrowLeftIcon';
import HomeIcon from './components/icons/HomeIcon';

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
import AppAmbientLightsLayer from './components/AppAmbientLightsLayer';
import AppProjectBootstrapLayer from './components/AppProjectBootstrapLayer';
import { ErrorBoundary } from './components/ErrorBoundary';

import AppSettingsModalLayer from './components/AppSettingsModalLayer';
import ToolsDashboard from './components/ToolsDashboard';
import VerticalSidebar from './components/VerticalSidebar';
import ModulePanel from './components/ModulePanel';
import LanguageTreeCanvas from './components/LanguageTreeCanvas';
import LanguageHomeCanvas from './components/LanguageHomeCanvas';
import AppWelcomeSection from './components/AppWelcomeSection';
import AppToastLayer from './components/AppToastLayer';

// Data & Helpers
import { WORD_LISTS } from './data/wordLists';
import { MAIN_TOUR_STEPS, COLLECTIONS_TOUR_STEPS, WRITING_TOUR_STEPS, TOOLS_TOUR_STEPS } from './data/tourSteps';
import { audioService } from './services/audioService';
import { generateLanguageSample } from './services/geminiService';
import { isAiAvailable } from './services/geminiService';
import { validateGrammarEngine } from './validation/runtimeValidation';
import { open, save } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile, exists } from '@tauri-apps/plugin-fs';
import { createEmptyProject, projectToJson, projectFromJson, LOXAR_PROJECT_VERSION, type LoxarProject } from './services/projectFile';
import { listLexiconNames, loadLexicon } from './services/sqlStorage';
import { scanForLoxarProjects } from './services/projectDiscovery';

const ModalManager = lazy(() => import('./components/ModalManager'));
const AiSettingsModal = lazy(() => import('./components/AiSettingsModal'));

const App = () => {
  const appVersion = '2.4.0-pro';

  const [splashFinished, setSplashFinished] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [notifications, setNotifications] = useState<{ id: number; message: string; type: 'success' | 'error' }[]>([]);
  const [isAppLoaded, setIsAppLoaded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const [tabHistory, setTabHistory] = useState<Array<'dashboard' | 'table' | 'workbench' | 'collections' | 'writing' | 'grammar' | 'translator' | 'tools'>>(['dashboard']);
  const activeTab: 'dashboard' | 'table' | 'workbench' | 'collections' | 'writing' | 'grammar' | 'translator' | 'tools' = tabHistory[tabHistory.length - 1] ?? 'dashboard';

  const setActiveTab = useCallback((tab: 'dashboard' | 'table' | 'workbench' | 'collections' | 'writing' | 'grammar' | 'translator' | 'tools' | ((prev: 'dashboard' | 'table' | 'workbench' | 'collections' | 'writing' | 'grammar' | 'translator' | 'tools') => 'dashboard' | 'table' | 'workbench' | 'collections' | 'writing' | 'grammar' | 'translator' | 'tools')) => {
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
  const [activeModal, setActiveModal] = useState<'none' | 'about' | 'restore' | 'ai_assistant' | 'lexicon_tools' | 'profile' | 'report' | 'functions' | 'hyphens' | 'inflection_generator' | 'create_lexicon' | 'ai_settings'>('none');

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
  const [viewFilter, setViewFilter] = useState('all');
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
  const [showHomePanel, setShowHomePanel] = useState(false);

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

  return (
    <ErrorBoundary>
      <div className="flex flex-col h-screen bg-background-dark text-text-primary bg-grid-pattern overflow-hidden relative selection:bg-primary/30 selection:text-white">
        <AppWelcomeSection
          splashFinished={splashFinished}
          onSplashFinish={() => setSplashFinished(true)}
          showWelcome={showWelcome}
          onCreateLexicon={handleCreateNewLexicon}
          onContinue={() => {
            audioService.playStartup();
            setShowWelcome(false);
          }}
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

        <div className={`flex flex-col h-full transition-opacity duration-1000 ${splashFinished ? 'opacity-100' : 'opacity-0'}`}>
          <AppAmbientLightsLayer />

          <AppLoadingLayer isLoading={isLoading} loadingMessage={loadingMessage} />
          <AppOfflineBannerLayer showOfflineBanner={showOfflineBanner} />

          <Suspense fallback={<div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 text-text-secondary text-sm">Cargando…</div>}>
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
          {activeModal === 'ai_settings' && <AiSettingsModal onClose={handleCloseModal} />}
          </Suspense>
          <AppSettingsModalLayer showSettings={showSettings} onCloseSettings={() => setShowSettings(false)} />

          <Header
            wordsAddedCount={lexiconHook.wordsAddedSinceSave}
            onOpenWidget={() => window.loxarBridge.openWidget()}
            onShowTour={handleStartTour}
            onOpenSettings={() => setShowSettings(true)}
            themeId={themeId}
            onThemeChange={id => setThemeId(id as any)}
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
              onChange={id => setActiveTab(id as any)}
              onOpenWidget={() => window.loxarBridge.openWidget()}
              onOpenSettings={() => setShowSettings(true)}
              onShowTour={handleStartTour}
              onGoHome={goHome}
            />

            <main className="flex-1 overflow-y-auto p-4 sm:p-6 relative z-0 custom-scrollbar scroll-smooth bg-surface-dark/40 backdrop-blur-sm">
              {activeTab !== 'dashboard' && (
                <div className="flex items-center gap-2 mb-4">
                  <button
                    type="button"
                    onClick={goBack}
                    className="flex items-center gap-1 text-xs text-text-secondary hover:text-white bg-white/5 hover:bg-white/10 rounded-lg px-2 py-1 transition-colors"
                  >
                    <ArrowLeftIcon className="w-3.5 h-3.5" />
                    Volver
                  </button>
                  <button
                    type="button"
                    onClick={goHome}
                    className="flex items-center gap-1 text-xs text-text-secondary hover:text-accent bg-white/5 hover:bg-accent/10 rounded-lg px-2 py-1 transition-colors"
                  >
                    <HomeIcon className="w-3.5 h-3.5" />
                    Panel
                  </button>
                </div>
              )}
              <div className="flex-grow h-full flex flex-col">
                {activeTab === 'dashboard' && (
                  <div className="h-full w-full">
                    <LanguageHomeCanvas
                      conlangName={activeMetadata?.conlangName}
                      activeModule={activeTab}
                      stats={{
                        grammar: activeGrammar ? {
                          rules: (activeGrammar as any)?.morphology?.rules?.length + (activeGrammar as any)?.syntax?.rules?.length + (activeGrammar as any)?.phonology?.rules?.length,
                          categories: (activeGrammar as any)?.categories?.length,
                          strategies: (activeGrammar as any)?.strategies?.length,
                          roles: (activeGrammar as any)?.syntax?.roles?.length,
                        } : undefined,
                        phonology: activeGrammar ? {
                          sounds: (activeGrammar as any)?.phonology?.consonants?.length + (activeGrammar as any)?.phonology?.vowels?.length,
                          rules: (activeGrammar as any)?.phonology?.rules?.length,
                        } : undefined,
                        syntax: activeGrammar ? {
                          rules: (activeGrammar as any)?.syntax?.rules?.length,
                          trees: 0,
                        } : undefined,
                        lexicon: { entries: activeLexicon.length },
                        neography: undefined,
                        semantics: { fields: 0, relations: 0 },
                        translator: { translations: 0 },
                        workbench: { pending: incompleteEntries.length, completed: 0 },
                        collections: { collections: 0 },
                      }}
                      onModuleClick={(moduleId) => {
                        const tab = moduleId === 'lexicon' ? 'table' : moduleId;
                        setActiveTab(tab as any);
                      }}
                    />
                  </div>
                )}
                {activeTab === 'table' && (
                  <LexiconTable
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
                    viewFilter={viewFilter as any}
                    onViewFilterChange={setViewFilter as any}
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
                )}
                {activeTab === 'workbench' && (
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
                    findDuplicateSignificados={(sig, excludeId) => lexiconHook.activeLexicon.filter(e => e.Significado.includes(sig) && e.ID !== excludeId)}
                    onDuplicateFound={() => {}}
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
                )}
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
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default App;
