import React, { useCallback, useState, useEffect, useMemo, ReactNode } from 'react';
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
import { getStoredTheme, applyTheme, saveTheme, themes, type ThemeId } from './services/themeService';
import { LexiconEntry, MissingWord, FunctionOperation, HyphenOperation, WorkQueueItem, GenerationMode, LexiconFilter } from './types';
import { morphologyToTypologyProfile, type TypologyProfile } from './types/pragmaticTypes';
import { FloatingWidget } from './components/FloatingWidget';
import FirstRunWizard from './components/FirstRunWizard';
import { useFirstRunWizard, checkIsFirstRun } from './hooks/useFirstRunWizard';
import { useFirstRunWizardActions } from './hooks/useFirstRunWizardActions';
import { useModalCoordination } from './hooks/useModalCoordination';
import { useAppSessionHydration } from './hooks/useAppSessionHydration';
import { useTabNavigation } from './hooks/useTabNavigation';
import { useLexiconMerge } from './hooks/useLexiconMerge';
import { useOfflineBannerStatus } from './hooks/useOfflineBannerStatus';
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
import AppModalLayer from './components/AppModalLayer';
import ToolsDashboard from './components/ToolsDashboard';
import VerticalSidebar from './components/VerticalSidebar';
import ModulePanel from './components/ModulePanel';
import DashboardTab from './components/DashboardTab';
import AppWelcomeSection from './components/AppWelcomeSection';
import AppToastLayer from './components/AppToastLayer';
import AppNavigationBar from './components/AppNavigationBar';
import AppTabContent from './components/AppTabContent';

// Data & Helpers
import { WORD_LISTS } from './data/wordLists';
import { MAIN_TOUR_STEPS, COLLECTIONS_TOUR_STEPS, WRITING_TOUR_STEPS, TOOLS_TOUR_STEPS } from './data/tourSteps';
import { audioService } from './services/audioService';
import { generateLanguageSample } from './services/geminiService';
import { readTextFile, writeTextFile, exists } from '@tauri-apps/plugin-fs';
import { createEmptyProject, projectToJson, projectFromJson, LOXAR_PROJECT_VERSION, type LoxarProject } from './services/projectFile';
import { initPragmaticDb } from './services/grammarDb';
import { getGrammarMetrics } from './utils/grammarMetrics';
import { buildDashboardStats } from './utils/dashboardStats';

const App = () => {
  const appVersion = '2.4.0-pro';

  const [splashFinished, setSplashFinished] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [notifications, setNotifications] = useState<{ id: number; message: string; type: 'success' | 'error' }[]>([]);
  // Estado y acciones de modales/settings (P1: `useModalCoordination`).
  const {
    activeModal,
    showSettings,
    openModal,
    openSettings,
    closeSettings,
    openAiSettings,
    openAiSettingsFromSettings,
    openFunctions,
    openHyphens,
    openProfile,
    openCompare,
    openRestore,
    openAbout,
  } = useModalCoordination();

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
    openModal,
  });

  // Hidratacion de sesion (P1: `useAppSessionHydration`). Sustituye a los dos
  // `useEffect` que decidian la bienvenida y el bootstrap de proyecto.
  const {
    showWelcome,
    sessionCacheData,
    projectPath,
    exportPath,
    exportFormats,
    bootstrapDismissed,
    hasLocalData,
    showProjectBootstrap,
    availableProjects,
    isAppLoaded,
    setProjectPath,
    setExportPath,
    setExportFormats,
    setBootstrapDismissed,
    setShowProjectBootstrap,
    setShowWelcome,
  } = useAppSessionHydration();

  // Navegacion por tabs (P1: `useTabNavigation`). Sustituye al `tabHistory`,
  // al `activeTab` derivado y a las flechas inline de navegacion.
  const {
    activeTab,
    setActiveTab,
    goBack,
    goHome,
    activeGrammarModule,
    setActiveGrammarModule,
    handleOpenGrammarModule,
    handleQuickNav,
    openDashboard,
    openWriting,
    openGrammar,
    openTranslator,
  } = useTabNavigation();

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
  const [aiProgress, setAiProgress] = useState<{ processed: number; total: number } | null>(null);
  const [lastAiResult, setLastAiResult] = useState<any>(null);
  const [suggestions, setSuggestions] = useState<MissingWord[]>([]);
  const [suggestionListName, setSuggestionListName] = useState('');

  const [backups, setBackups] = useState<string[]>([]);
  const [projectLastSaved, setProjectLastSaved] = useState<Date | null>(null);
  const [isProjectDirty, setIsProjectDirty] = useState(false);
  const [canvasState, setCanvasState] = useState<{ nodes: any[]; edges: any[] }>({ nodes: [], edges: [] });
  const [isTourActive, setIsTourActive] = useState(false);
  const [activeToolView, setActiveToolView] = useState<'dashboard' | 'interlinear-gloss' | 'sound-change'>('dashboard');

  const [currentTourSteps, setCurrentTourSteps] = useState(MAIN_TOUR_STEPS);

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
    openModal,
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

  const { loadLexiconEntries, mergeLexiconEntries } = useLexiconMerge({
    activeLexicon,
    activeLexiconName,
    updateActiveLexiconEntries: lexiconHook.updateActiveLexiconEntries,
    showNotification,
  });

  const { showOfflineBanner } = useOfflineBannerStatus();

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

  // ── Initialize pragmatic grammar database on mount ──
  useEffect(() => {
    initPragmaticDb().catch(e => console.error('[App] Failed to init pragmatic DB:', e));
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

          <AppModalLayer
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
            onOpenFunctions={openFunctions}
            onOpenHyphens={openHyphens}
            onOpenProfile={openProfile}
            onOpenNeography={openWriting}
            onOpenInflection={openGrammar}
            onOpenCompare={openCompare}
            onLoadLexiconEntries={loadLexiconEntries}
            onMergeLexiconEntries={mergeLexiconEntries}
            importHandlers={{
              cancelImport: lexiconHook.cancelImport,
              setImportMapping: lexiconHook.setImportMapping,
              resolveConflict: lexiconHook.resolveConflict,
              proceedWithValidEntries: lexiconHook.proceedWithValidEntries,
              resanitizeAndContinue: lexiconHook.resanitizeAndContinue,
              applyCharacterRepair: lexiconHook.applyCharacterRepair,
            }}
            showNotification={showNotification}
            onAiSettingsClose={handleAiSettingsModalClose}
          />
          <AppSettingsModalLayer
            showSettings={showSettings}
            onCloseSettings={closeSettings}
            onOpenAiSettings={openAiSettingsFromSettings}
            exportFormats={exportFormats}
            onExportFormatsChange={setExportFormats}
          />

          <Header
            wordsAddedCount={lexiconHook.wordsAddedSinceSave}
            onOpenWidget={() => window.loxarBridge.openWidget()}
            onShowTour={handleStartTour}
            onOpenSettings={openSettings}
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
            onRestore={openRestore}
            onOpenAbout={openAbout}
            onStartTour={handleStartTour}
            onOpenAiSettings={openAiSettings}
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
              onOpenSettings={openSettings}
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
              <AppTabContent
                activeTab={activeTab}
                lexicon={activeLexicon}
                lexiconName={activeLexiconName}
                lexiconData={lexicons[activeLexiconName ?? '']}
                lexiconNames={lexiconHook.lexiconNames}
                metadata={activeMetadata}
                profile={activeProfile}
                grammar={activeGrammar}
                corpus={lexiconHook.activeCorpus}
                neographyProfile={lexiconHook.activeNeographyProfile}
                inflectionProfile={lexiconHook.activeInflectionProfile}
                customFunctions={activeCustomFunctions}
                stats={buildDashboardStats({
                  grammar: activeGrammar,
                  lexicon: activeLexicon,
                  incompleteCount: incompleteEntries.length,
                })}
                pragmaticEngine={pragmaticEngine}
                completionStats={completionStats}
                searchTerm={searchTerm}
                onSearchTermChange={setSearchTerm}
                functionFilter={functionFilter}
                onFunctionFilterChange={setFunctionFilter}
                viewFilter={viewFilter}
                onViewFilterChange={setViewFilter}
                showAffixFormatting={showAffixFormatting}
                onShowAffixFormattingChange={setShowAffixFormatting}
                selectedIds={selectedIds}
                onToggleSelection={handleToggleSelection}
                onToggleSelectAll={handleToggleSelectAll}
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
                entryBeingEdited={entryBeingEdited}
                incompleteCount={incompleteEntries.length}
                incompleteIndex={incompleteIndex}
                onNavigateIncomplete={handleNavigateIncomplete}
                onLookup={handleLookupForCompletion}
                generationModes={generationModes}
                onGenerationModesChange={setGenerationModes}
                initialDataForAdd={effectiveInitialDataForAdd}
                suggestions={suggestions}
                suggestionListName={suggestionListName}
                onCloseSuggestions={() => setSuggestions([])}
                onAddManually={handleAddManuallyFromSuggestion}
                onGenerateAI={handleGenerateAIFromSuggestion}
                isLoadingAI={aiStatus === 'working'}
                onSelectList={(name) => setSuggestionListName(name)}
                onAnalyzeList={handleAnalyzeForSuggestions}
                activeToolView={activeToolView}
                onBackToToolDashboard={handleBackToToolDashboard}
                onOpenInterlinearGloss={handleOpenInterlinearGloss}
                onOpenSoundChangeWorkbench={handleOpenSoundChangeWorkbench}
                activeGrammarModule={activeGrammarModule}
                onModuleChange={setActiveGrammarModule}
                onOpenTab={setActiveTab}
                onOpenGrammarModule={handleOpenGrammarModule}
                onOpenDashboard={openDashboard}
                onOpenAiSettings={openAiSettings}
                onStartTour={handleStartTour}
                onSelectConlang={lexiconHook.setActiveLexicon}
                onEditWord={lexiconHook.editWord}
                onDeleteWord={lexiconHook.deleteWord}
                onAddWord={lexiconHook.addWord}
                onAddBatchWords={lexiconHook.addBatchWords}
                onAddCustomFunction={lexiconHook.addCustomFunction}
                onAddCustomCategory={lexiconHook.addCustomFunction}
                onUpdateCorpus={lexiconHook.updateCorpus}
                onUpdateNeographyProfile={lexiconHook.updateNeographyProfile}
                onUpdateGenerativeProfile={lexiconHook.updateGenerativeProfile}
                onSaveGrammar={manifest => lexiconHook.updateGrammarManifest(manifest)}
                onExportGrammar={handleExportGrammar}
                onAddLexicalException={handleAddLexicalException}
                onGenerateInflections={entry => {
                  setEntryToInflect(entry);
                  handleOpenModal('inflection_generator');
                }}
                onSearchLexicon={activeLexiconName ? async (term: string) => (await searchLexicon(lexicons[activeLexiconName], term, activeLexiconName)).map(r => r.entry) : undefined}
                onAiCompleteEntry={handleAiCompleteEntry}
                onAiGenerateRootAndLexeme={handleAiGenerate}
                onCorrectSignificado={handleCorrectSignificado}
                onCompleteFunctions={handleAiCompleteFunctions}
                onFillMissing={handleAiFillMissing}
                onAnalyzeForSuggestions={handleAnalyzeForSuggestions}
                onManageFunctions={openFunctions}
                onManageHyphens={openHyphens}
                onOpenProfile={openProfile}
                onOpenNeography={openWriting}
                onOpenInflection={openGrammar}
                onOpenTranslator={openTranslator}
                onEnqueue={handleEnqueue}
                onGenerateBatch={handleGenerateBatch}
                onSyncPhonology={p => lexiconHook.updateGenerativeProfile({ ...activeProfile, ...p })}
                onApplySoundChangeBatch={handleApplySoundChangeBatch}
                showNotification={showNotification}
                setIsLoading={setIsLoading}
                setLoadingMessage={setLoadingMessage}
              />            </main>
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
