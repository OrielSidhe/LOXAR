import { useCallback, useState, useEffect, useMemo } from 'react';
import { useLexicon } from './hooks/useLexicon';
import { useWidgetBridge } from './hooks/useWidgetBridge';
import { useWorkQueue } from './hooks/useWorkQueue';
import { useAiHandlers } from './hooks/useAiHandlers';
import { useProjectOperations } from './hooks/useProjectOperations';
import { useAppHandlers } from './hooks/useAppHandlers';
import { searchLexicon } from './services/ftsSearch';
import { getStoredTheme, applyTheme, saveTheme, themes, type ThemeId } from './services/themeService';
import { LexiconEntry, MissingWord, GenerationMode, LexiconFilter } from './types';
import { morphologyToTypologyProfile } from './types/pragmaticTypes';
import { useFirstRunWizard } from './hooks/useFirstRunWizard';
import { useFirstRunWizardActions } from './hooks/useFirstRunWizardActions';
import { useModalCoordination } from './hooks/useModalCoordination';
import { useAppSessionHydration } from './hooks/useAppSessionHydration';
import { useTabNavigation } from './hooks/useTabNavigation';
import { useLexiconMerge } from './hooks/useLexiconMerge';
import { useOfflineBannerStatus } from './hooks/useOfflineBannerStatus';
// Components
import { ErrorBoundary } from './components/ErrorBoundary';
import AppWelcomeLayer from './components/AppWelcomeLayer';
import AppBodyLayer from './components/AppBodyLayer';
import AppHeaderLayer from './components/AppHeaderLayer';
import AppOverlayLayers from './components/AppOverlayLayers';
import AppFloatingLayers from './components/AppFloatingLayers';

// Data & Helpers
import { MAIN_TOUR_STEPS } from './data/tourSteps';
import { audioService } from './services/audioService';
import { generateLanguageSample } from './services/geminiService';
import { initPragmaticDb } from './services/grammarDb';
import { getGrammarMetrics } from './utils/grammarMetrics';
import { buildDashboardStats } from './utils/dashboardStats';
import { buildLexiconCompletionStats, clampIncompleteIndex, filterPendingCompletion } from './utils/lexiconCompletion';

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
  const { showWizard, step, dataFolder, nextStep, prevStep, skipWizard, completeWizard, updateDataFolder } = useFirstRunWizard();

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
  const [functionFilter, setFunctionFilter] = useState('all');
  const [viewFilter, setViewFilter] = useState<LexiconFilter>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
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

  const incompleteEntries = useMemo(() => filterPendingCompletion(activeLexicon), [activeLexicon]);

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
    handleQuit,
    handleResetApp,
    handleRestoreBackup,
    handleStartTour,
    onTourEnd,
    handleOpenInterlinearGloss,
    handleOpenSoundChangeWorkbench,
    handleApplySoundChangeBatch,
    handleBackToToolDashboard,
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
    setIncompleteIndex(prev => clampIncompleteIndex(prev, incompleteEntries.length));
  }, [incompleteEntries.length]);

  const completionStats = useMemo(
    () => buildLexiconCompletionStats(activeLexicon, incompleteEntries),
    [activeLexicon, incompleteEntries],
  );

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
        <AppWelcomeLayer
          splashFinished={splashFinished}
          onSplashFinish={() => setSplashFinished(true)}
          showWelcome={showWelcome}
          showWizard={showWizard}
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
          step={step}
          dataFolder={dataFolder}
          onWizardNext={nextStep}
          onWizardPrev={prevStep}
          onWizardSkip={handleWizardSkip}
          onWizardComplete={handleWizardComplete}
          onConfigureAi={handleWizardConfigureAi}
          onChooseDataFolder={handleChooseDataFolder}
          onDataFolderChange={updateDataFolder}
        />

        <div className={`flex flex-col h-full transition-opacity duration-1000 ${splashFinished && !showWelcome ? 'opacity-100' : 'opacity-0'}`}>
          <AppOverlayLayers
            isLoading={isLoading}
            loadingMessage={loadingMessage}
            showOfflineBanner={showOfflineBanner}
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
            showSettings={showSettings}
            onCloseSettings={closeSettings}
            onOpenAiSettings={openAiSettingsFromSettings}
            exportFormats={exportFormats}
            onExportFormatsChange={setExportFormats}
          />

          <AppHeaderLayer
            wordsAddedCount={lexiconHook.wordsAddedSinceSave}
            onOpenWidget={() => window.loxarBridge.openWidget()}
            onShowTour={handleStartTour}
            onOpenSettings={openSettings}
            themeId={themeId}
            onThemeChange={id => setThemeId(id)}
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

          <AppBodyLayer
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
            onSidebarTabChange={setActiveTab}
            onOpenWidget={() => window.loxarBridge.openWidget()}
            onOpenSettings={openSettings}
            onGoHome={goHome}
            onNavBack={goBack}
            onQuickNav={handleQuickNav}
          />

          <AppFloatingLayers
            activeTab={activeTab}
            selectedIds={selectedIds}
            customFunctions={activeCustomFunctions}
            onClearSelection={() => setSelectedIds(new Set())}
            onBatchDelete={handleBatchDelete}
            onBatchChangeFunction={handleBatchChangeFunction}
            notifications={notifications}
            onDismissNotification={id => setNotifications(prev => prev.filter(n => n.id !== id))}
            onWidgetAddWord={handleWidgetAddWord}
            onWidgetSearch={handleWidgetSearch}
            onWidgetToggleCapture={() => window.loxarBridge.openWidget()}
            showWelcome={showWelcome}
            showWizard={showWizard}
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
