import React, { useCallback, useState, useEffect, useMemo, ReactNode, Suspense, lazy } from 'react';
import Header from './components/Header';
import LexiconTable from './components/LexiconTable';
import FileControls from './components/FileControls';
import LexiconSelector from './components/LexiconSelector';
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
import AlertTriangleIcon from './components/icons/AlertTriangleIcon';
import InfoIcon from './components/icons/InfoIcon';

// Components
import LoadingOverlay from './components/LoadingOverlay';
import WelcomeScreen from './components/WelcomeScreen';
import CompletionDashboard from './components/CompletionDashboard';
import EntryEditor from './components/EntryEditor';
import CollectionsManager from './components/CollectionsManager';
import WritingAndNeographyTab from './components/WritingAndNeographyTab';
import GrammarTab from './components/GrammarTab';
import TranslationPlayground from './components/TranslationPlayground';
import SuggestionsWorkbench from './components/SuggestionsWorkbench';
import WorkbenchRightPanel from './components/WorkbenchRightPanel';
import WorkQueueBar from './components/WorkQueueBar';
import BatchActionToolbar from './components/BatchActionToolbar';
import SplashScreen from './components/SplashScreen';
import ToastContainer from './components/ToastContainer';
import OfflineBanner from './components/OfflineBanner';
import AiStatusIndicator from './components/AiStatusIndicator';
import GuidedTour from './components/GuidedTour';
import { ErrorBoundary } from './components/ErrorBoundary';

const ToolsDashboard = lazy(() => import('./components/ToolsDashboard'));
import SettingsModal from './components/SettingsModal';
import VerticalSidebar from './components/VerticalSidebar';
import ModulePanel from './components/ModulePanel';
import LanguageTreeCanvas from './components/LanguageTreeCanvas';
import ProjectBootstrapModal from './components/ProjectBootstrapModal';

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

  const [activeTab, setActiveTab] = useState<'dashboard' | 'table' | 'workbench' | 'collections' | 'writing' | 'grammar' | 'translator' | 'tools'>('table');
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
    incompleteEntries,
    selectedIds,
    showNotification,
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
        {!splashFinished && <SplashScreen onFinish={() => setSplashFinished(true)} />}

        <div className={`flex flex-col h-full transition-opacity duration-1000 ${splashFinished ? 'opacity-100' : 'opacity-0'}`}>
          <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[120px] animate-move-lights opacity-60"></div>
          <div className="absolute top-[40%] right-[0%] w-[40%] h-[40%] bg-purple-500/5 rounded-full blur-[100px] animate-move-lights animation-delay-2000 opacity-50"></div>
          <div className="absolute -bottom-[20%] left-[20%] w-[60%] h-[60%] bg-emerald-500/5 rounded-full blur-[130px] animate-move-lights animation-delay-4000 opacity-40"></div>

          {isLoading && <LoadingOverlay message={loadingMessage} />}
          {showOfflineBanner && <OfflineBanner />}
          {showWelcome && (
            <WelcomeScreen
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
            />
          )}
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
              } catch (e) {
                setAiStatus('error');
                setAiProgress(null);
              }
            }}
            onAiFillMissing={async () => {
              try {
                setAiStatus('working');
                setAiProgress(null);
                const result = await lexiconHook.aiFillMissingFields((p, t) => setAiProgress({ processed: p, total: t }));
                setLastAiResult(result);
                setAiStatus('complete');
                showNotification('Generación masiva completada', 'success');
              } catch (e) {
                setAiStatus('error');
                setAiProgress(null);
              }
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
          {showSettings && <SettingsModal open={showSettings} onClose={() => setShowSettings(false)} />}

          <Header
            wordsAddedCount={lexiconHook.wordsAddedSinceSave}
            onOpenWidget={() => window.loxarBridge.openWidget()}
            onShowTour={handleStartTour}
            onOpenSettings={() => setShowSettings(true)}
            themeId={themeId}
            onThemeChange={id => setThemeId(id as any)}
          />

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
                onNewProject={handleNewProject}
                onOpenProject={handleOpenProject}
                onSaveProject={handleSaveProject}
                onSaveProjectAs={handleSaveProjectAs}
                projectPath={projectPath}
              />
              <button onClick={handleStartTour} className="p-2 text-text-secondary hover:text-primary transition-colors hover:bg-white/5 rounded-full">
                <InfoIcon className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="flex flex-1 min-h-0 relative">
            <LanguageTreeCanvas
              activeModule={activeTab}
              grammar={activeGrammar}
              lexicon={activeLexicon}
              profile={activeProfile}
              canvasNodes={canvasState.nodes}
              canvasEdges={canvasState.edges}
              onCanvasChange={handleCanvasChange}
              onNodeClick={nodeId => setActiveTab(nodeId as any)}
            />

            <VerticalSidebar
              active={activeTab}
              onChange={id => setActiveTab(id as any)}
              onOpenWidget={() => window.loxarBridge.openWidget()}
              onOpenSettings={() => setShowSettings(true)}
              onShowTour={handleStartTour}
            />

            <main className="flex-1 overflow-y-auto p-4 sm:p-6 relative z-0 custom-scrollbar scroll-smooth bg-surface-dark/40 backdrop-blur-sm">
              <div className="flex-grow h-full flex flex-col">
                {activeTab === 'dashboard' && (
                  <ModulePanel title="Panel" active={activeTab === 'dashboard'} onClose={() => setActiveTab('table')}>
                    <CompletionDashboard
                      stats={{ ...completionStats, wordsAddedCount: lexiconHook.wordsAddedSinceSave }}
                      onOpenReport={() => handleOpenModal('report')}
                      onOpenAiAssistant={() => handleOpenModal('ai_assistant')}
                      onNavigateComplete={() => { setViewFilter('incomplete'); setActiveTab('table'); }}
                      onNavigateFunctions={() => { setViewFilter('incomplete'); setActiveTab('table'); }}
                      onGenerateWords={() => handleOpenModal('ai_assistant')}
                      onBackup={handleSaveChanges}
                      onClose={() => setActiveTab('table')}
                    />
                  </ModulePanel>
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
                  <div className="flex gap-4 h-full min-h-[600px]">
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
                          mode={editorMode}
                          onModeChange={setEditorMode}
                          entryToEdit={entryBeingEdited || undefined}
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
                        />
                      </div>
                    </div>
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
                        onSyncPhonology={p => lexiconHook.updateGenerativeProfile({ ...activeProfile, ...p })}
                      />
                    </div>
                  </div>
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
                    onExportGrammar={() => {
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
                  <ModulePanel title="Herramientas" active={activeTab === 'tools'} onClose={() => setActiveTab('tools')}>
                    {suggestions.length > 0 ? (
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
                                setAiStatus('complete');
                                showNotification('Funciones completadas', 'success');
                              } catch (e) {
                                setAiStatus('error');
                                setAiProgress(null);
                              }
                            }}
                            onFillMissing={async () => {
                              setAiStatus('working');
                              setAiProgress(null);
                              try {
                                const result = await lexiconHook.aiFillMissingFields((p, t) => setAiProgress({ processed: p, total: t }));
                                setLastAiResult(result);
                                setAiStatus('complete');
                                showNotification('Campos completados', 'success');
                              } catch (e) {
                                setAiStatus('error');
                                setAiProgress(null);
                              }
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
                    )}
                  </ModulePanel>
                )}
              </div>
            </main>
          </div>

          {activeTab === 'table' && selectedIds.size > 0 && (
            <BatchActionToolbar
              selectedCount={selectedIds.size}
              customFunctions={activeCustomFunctions}
              onClearSelection={() => setSelectedIds(new Set())}
              onBatchDelete={handleBatchDelete}
              onBatchChangeFunction={handleBatchChangeFunction}
            />
          )}

          <ToastContainer
            notifications={notifications}
            onDismiss={id => setNotifications(prev => prev.filter(n => n.id !== id))}
          />
        </div>

        {isAppLoaded && showProjectBootstrap && (
          <ProjectBootstrapModal
            availableProjects={availableProjects}
            hasLocalData={hasLocalData}
            onCreate={handleBootstrapCreate}
            onOpenOther={handleBootstrapOpenOther}
            onOpenFound={handleBootstrapOpenFound}
            onImportLocal={handleBootstrapImportLocal}
            onDismiss={handleBootstrapDismiss}
          />
        )}
        {!projectPath && !showProjectBootstrap && bootstrapDismissed && (
          <div className="fixed top-0 left-0 right-0 z-[90] flex items-center gap-3 px-4 py-2 bg-danger/15 border-b border-danger/40 text-sm text-white">
            <AlertTriangleIcon className="h-4 w-4 text-danger flex-shrink-0" />
            <span className="flex-1">No hay un archivo de proyecto configurado. Si se limpia la carpeta de la app, tus datos se perderán.</span>
            <button
              onClick={() => setShowProjectBootstrap(true)}
              className="px-3 py-1 rounded-md bg-accent text-white font-semibold hover:bg-accent-hover transition-colors"
            >
              Elegir ubicación
            </button>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

const TabButton = React.memo(({ icon, label, isActive, onClick }: { icon: ReactNode; label: string; isActive: boolean; onClick: () => void }) => (
  <button
    onClick={() => {
      audioService.playClick();
      onClick();
    }}
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
