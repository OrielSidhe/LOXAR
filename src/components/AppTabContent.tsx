/**
 * AppTabContent.tsx
 * ─────────────────
 * Switch de tabs del área principal, extraído de `App.tsx` (P1 God Component).
 *
 * `App.tsx` tenía ~180 líneas de JSX con ocho ramas de tab (`dashboard`, `table`,
 * `workbench`, `collections`, `writing`, `grammar`, `translator`, `tools`) y ~30
 * props por rama, todas inline en el `return`. Este componente concentra ese
 * árbol de decisión con props tipadas estrictamente y el mismo orden de
 * render que el original, para que `App.tsx` quede como orquestador.
 *
 * Contratos preservados del `App.tsx` original:
 *  - `table` y `workbench` permanecen SIEMPRE montados (FASE NAV del gauntlet
 *    v3.14): se ocultan con `hidden` + `aria-hidden` para conservar el borrador
 *    del editor y la página/filtros de la tabla; reciben `active` para que
 *    `LexiconTable` enfoque la búsqueda al volver.
 *  - el resto de tabs se montan solo cuando `activeTab` coincide;
 *  - `DashboardTab` recibe el `stats` ya calculado (`buildDashboardStats`) y los
 *    callbacks de navegación (`onOpenTab` / `onOpenGrammarModule`);
 *  - `onSearch` solo existe cuando hay léxico activo (antes: `activeLexiconName
 *    ? async ... : undefined`), lo que desactiva el FTS5 y usa el filtro local.
 */

import React from 'react';
import type {
  CorpusEntry,
  GenerationMode,
  GenerativeProfile,
  GrammarManifest,
  InflectionProfile,
  LexiconData,
  LexiconEntry,
  LexiconFilter,
  LexiconMetadata,
  MissingWord,
  NeographyProfile,
  NewLexiconEntry,
  WorkQueueItem,
} from '../types';
import type { EntryEditorFormPayload, EntryEditorInitialData } from '../utils/entryEditorModel';
import type { AppTabId } from '../utils/appTabs';
import type { GrammarModule } from '../utils/grammarTabModel';
import type { DashboardStats } from '../utils/dashboardStats';
import type { PragmaticEngineState } from '../types/pragmaticTypes';
import type { SoundChangeBatchResult } from '../services/soundChanger';
import DashboardTab from './DashboardTab';
import LexiconTable from './LexiconTable';
import WorkbenchTab from './WorkbenchTab';
import CollectionsManager from './CollectionsManager';
import WritingAndNeographyTab from './WritingAndNeographyTab';
import GrammarTab from './GrammarTab';
import TranslationPlayground from './TranslationPlayground';
import ToolsTab from './ToolsTab';

/** `stats` del dashboard: se deriva de `LanguageHomeCanvas` (fuente única del shape). */
type CanvasStats = NonNullable<React.ComponentProps<typeof DashboardTab>['stats']>;
type PragmaticSummary = NonNullable<React.ComponentProps<typeof DashboardTab>['pragmaticEngine']>;
type CompletionStats = { total: number; needsFunction: number; totalIncomplete: number };

/** Vista interna del tab de herramientas. */
export type ToolView = 'dashboard' | 'interlinear-gloss' | 'sound-change';

/** `LexiconData` vacío para el tab de herramientas cuando no hay léxico activo. */
const EMPTY_TOOLS_LEXICON: LexiconData = {
  entries: [],
  profile: {
    consonants: [],
    vowels: [],
    syllableStructures: [],
    consonantClusters: [],
    vowelClusters: [],
    sampleText: '',
    grammarNotes: '',
    derivationalAffixes: [],
  },
  neography: { glyphs: [], characterMap: {}, ligatures: {} },
  inflection: { paradigms: [] },
  grammar: undefined as unknown as GrammarManifest,
  corpus: [],
  metadata: { conlangName: '', mainLanguage: '' },
  wordsAddedSinceSave: 0,
  customFunctions: [],
  schemaVersion: 1,
};

export interface AppTabContentProps {
  activeTab: AppTabId;

  // ── Léxico activo ──────────────────────────────────────────────
  lexicon: LexiconEntry[];
  lexiconName: string | null;
  /** `LexiconData` crudo del tab de herramientas; `undefined` sin léxico activo. */
  lexiconData?: LexiconData;
  lexiconNames: string[];
  metadata: LexiconMetadata | null;
  profile: GenerativeProfile;
  grammar: GrammarManifest;
  corpus: CorpusEntry[];
  neographyProfile: NeographyProfile;
  inflectionProfile: InflectionProfile;
  customFunctions: string[];
  stats: CanvasStats;
  pragmaticEngine?: PragmaticSummary;
  completionStats: CompletionStats;

  // ── Tabla de léxico ─────────────────────────────────────────────
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  functionFilter: string;
  onFunctionFilterChange: (filter: string) => void;
  viewFilter: LexiconFilter;
  onViewFilterChange: (filter: LexiconFilter) => void;
  showAffixFormatting: boolean;
  onShowAffixFormattingChange: (show: boolean) => void;
  selectedIds: Set<string>;
  onToggleSelection: (id: string) => void;
  onToggleSelectAll: (ids: string[]) => void;

  // ── Workbench ───────────────────────────────────────────────────
  queueActive: boolean;
  workQueue: WorkQueueItem[];
  queueCursor: number;
  queuePrev: () => void;
  queueNext: () => void;
  queueTogglePending: (key: string) => void;
  queueRemoveCurrent: () => void;
  queueClear: () => void;
  editorMode: 'add' | 'complete';
  onEditorModeChange: (mode: 'add' | 'complete') => void;
  entryBeingEdited: LexiconEntry | null;
  incompleteCount: number;
  incompleteIndex: number;
  onNavigateIncomplete: (direction: 'next' | 'prev') => void;
  onLookup: (significado: string) => void;
  generationModes: GenerationMode[];
  onGenerationModesChange: (modes: GenerationMode[]) => void;
  initialDataForAdd: EntryEditorInitialData | null;

  // ── Sugerencias / IA ────────────────────────────────────────────
  suggestions: MissingWord[];
  suggestionListName: string;
  onCloseSuggestions: () => void;
  onAddManually: (suggestion: MissingWord) => void;
  onGenerateAI: (suggestion: MissingWord) => void;
  isLoadingAI: boolean;
  onSelectList: (name: string) => void;
  onAnalyzeList: (name: string) => void;

  // ── Herramientas ────────────────────────────────────────────────
  activeToolView: ToolView;
  onBackToToolDashboard: () => void;
  onOpenInterlinearGloss: () => void;
  onOpenSoundChangeWorkbench: () => void;

  // ── Navegación y modales ────────────────────────────────────────
  activeGrammarModule: GrammarModule;
  onModuleChange: (module: GrammarModule) => void;
  onOpenTab: (tab: AppTabId) => void;
  onOpenGrammarModule: (moduleId: GrammarModule) => void;
  onOpenDashboard: () => void;
  onOpenAiSettings: () => void;
  onStartTour: () => void;

  // ── Callbacks de dominio ────────────────────────────────────────
  onSelectConlang: (name: string) => void;
  onEditWord: (id: string, entry: LexiconEntry) => void;
  onDeleteWord: (id: string) => void;
  onAddWord: (entry: LexiconEntry | NewLexiconEntry) => void;
  onAddBatchWords: (entries: LexiconEntry[] | NewLexiconEntry[]) => void;
  onAddCustomFunction: (category: string) => void;
  onAddCustomCategory: (category: string) => void;
  onUpdateCorpus: (corpus: CorpusEntry[]) => void;
  onUpdateNeographyProfile: (profile: NeographyProfile) => void;
  onUpdateGenerativeProfile: (profile: GenerativeProfile) => void;
  onSaveGrammar: (manifest: GrammarManifest) => void;
  onExportGrammar: () => void;
  onAddLexicalException: (entryId: string, featureKey: string, surfaceForm: string) => void;
  onGenerateInflections: (entry: LexiconEntry) => void;
  onSearchLexicon: ((term: string) => Promise<LexiconEntry[]>) | undefined;
  onAiCompleteEntry: (entry: EntryEditorFormPayload) => Promise<Record<string, unknown> | null>;
  onAiGenerateRootAndLexeme: (
    significado: string,
    categoria: string,
    modes: GenerationMode[],
  ) => Promise<{ raiz: string; lexema: string } | null>;
  onCorrectSignificado: (significado: string) => Promise<string>;
  onCompleteFunctions: (listName: string) => Promise<void>;
  onFillMissing: (listName: string) => Promise<void>;
  onAnalyzeForSuggestions: (listName: string) => void;
  onManageFunctions: () => void;
  onManageHyphens: () => void;
  onOpenProfile: () => void;
  onOpenNeography: () => void;
  onOpenInflection: () => void;
  /** Abre el editor de morfología (paradigmas) como modal de pantalla completa. */
  onOpenInflectionModule: () => void;
  onOpenTranslator: () => void;
  onEnqueue: (items: MissingWord[]) => void;
  onGenerateBatch: (items: MissingWord[], modes: GenerationMode[]) => void;
  onSyncPhonology: (phonology: Partial<GenerativeProfile>) => void;
  onApplySoundChangeBatch: (entries: LexiconEntry[], result: SoundChangeBatchResult) => void;
  showNotification: (message: string, type?: 'success' | 'error') => void;
  setIsLoading: (loading: boolean) => void;
  setLoadingMessage: (message: string) => void;
}

/**
 * Render del tab activo. `table` y `workbench` quedan siempre montados para
 * conservar su estado (FASE NAV); el resto se monta solo cuando corresponde.
 */
const AppTabContent: React.FC<AppTabContentProps> = ({
  activeTab,
  lexicon,
  lexiconName,
  lexiconData,
  lexiconNames,
  metadata,
  profile,
  grammar,
  corpus,
  neographyProfile,
  inflectionProfile,
  customFunctions,
  stats,
  pragmaticEngine,
  completionStats,
  searchTerm,
  onSearchTermChange,
  functionFilter,
  onFunctionFilterChange,
  viewFilter,
  onViewFilterChange,
  showAffixFormatting,
  onShowAffixFormattingChange,
  selectedIds,
  onToggleSelection,
  onToggleSelectAll,
  queueActive,
  workQueue,
  queueCursor,
  queuePrev,
  queueNext,
  queueTogglePending,
  queueRemoveCurrent,
  queueClear,
  editorMode,
  onEditorModeChange,
  entryBeingEdited,
  incompleteCount,
  incompleteIndex,
  onNavigateIncomplete,
  onLookup,
  generationModes,
  onGenerationModesChange,
  initialDataForAdd,
  suggestions,
  suggestionListName,
  onCloseSuggestions,
  onAddManually,
  onGenerateAI,
  isLoadingAI,
  onSelectList,
  onAnalyzeList,
  activeToolView,
  onBackToToolDashboard,
  onOpenInterlinearGloss,
  onOpenSoundChangeWorkbench,
  activeGrammarModule,
  onModuleChange,
  onOpenTab,
  onOpenGrammarModule,
  onOpenDashboard,
  onOpenAiSettings,
  onStartTour,
  onSelectConlang,
  onEditWord,
  onDeleteWord,
  onAddWord,
  onAddBatchWords,
  onAddCustomFunction,
  onAddCustomCategory,
  onUpdateCorpus,
  onUpdateNeographyProfile,
  onUpdateGenerativeProfile,
  onSaveGrammar,
  onExportGrammar,
  onAddLexicalException,
  onGenerateInflections,
  onSearchLexicon,
  onAiCompleteEntry,
  onAiGenerateRootAndLexeme,
  onCorrectSignificado,
  onCompleteFunctions,
  onFillMissing,
  onAnalyzeForSuggestions,
  onManageFunctions,
  onManageHyphens,
  onOpenProfile,
  onOpenNeography,
  onOpenInflection,
  onOpenInflectionModule,
  onOpenTranslator,
  onEnqueue,
  onGenerateBatch,
  onSyncPhonology,
  onApplySoundChangeBatch,
  showNotification,
  setIsLoading,
  setLoadingMessage,
}) => {
  const hasActiveLexicon = Boolean(lexiconName);

  return (
    <>
      {activeTab === 'dashboard' && (
        <DashboardTab
          conlangName={metadata?.conlangName}
          conlangNames={lexiconNames}
          onSelectConlang={onSelectConlang}
          lexicon={lexicon}
          grammar={grammar}
          stats={stats}
          pragmaticEngine={pragmaticEngine}
          onOpenTab={onOpenTab}
          onOpenGrammarModule={onOpenGrammarModule}
        />
      )}
      <div
        aria-hidden={activeTab === 'table' ? undefined : true}
        className={`flex-grow h-full flex flex-col ${activeTab === 'table' ? '' : 'hidden'}`}
      >
        <LexiconTable
          active={activeTab === 'table'}
          data={lexicon}
          lexiconName={lexiconName}
          conlangName={metadata?.conlangName}
          mainLanguage={metadata?.mainLanguage}
          onEditWord={onEditWord}
          onDeleteWord={onDeleteWord}
          showNotification={showNotification}
          searchTerm={searchTerm}
          onSearchTermChange={onSearchTermChange}
          categoryFilter={functionFilter}
          onCategoryFilterChange={onFunctionFilterChange}
          viewFilter={viewFilter}
          onViewFilterChange={onViewFilterChange}
          showAffixFormatting={showAffixFormatting}
          onShowAffixFormattingChange={onShowAffixFormattingChange}
          selectedIds={selectedIds}
          onToggleSelection={onToggleSelection}
          onToggleSelectAll={onToggleSelectAll}
          onGenerateInflections={onGenerateInflections}
          onSearch={onSearchLexicon}
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
          queueNext={queueNext}
          queueTogglePending={queueTogglePending}
          queueRemoveCurrent={queueRemoveCurrent}
          queueClear={queueClear}
          editorMode={editorMode}
          onEditorModeChange={onEditorModeChange}
          entryToEdit={entryBeingEdited}
          incompleteCount={incompleteCount}
          incompleteIndex={incompleteIndex}
          onNavigateIncomplete={onNavigateIncomplete}
          onLookup={onLookup}
          onAddWord={onAddWord}
          onUpdateWord={onEditWord}
          onAiCompleteEntry={onAiCompleteEntry}
          onAiGenerateRootAndLexeme={onAiGenerateRootAndLexeme}
          onCorrectSignificado={onCorrectSignificado}
          showNotification={showNotification}
          disabled={!hasActiveLexicon}
          initialDataForAdd={initialDataForAdd}
          setIsLoading={setIsLoading}
          setLoadingMessage={setLoadingMessage}
          customCategories={customFunctions}
          onAddCustomCategory={onAddCustomCategory}
          activeMetadata={metadata}
          activeLexicon={lexicon}
          generationModes={generationModes}
          onGenerationModesChange={onGenerationModesChange}
          onQueueAdvance={queueActive ? queueNext : undefined}
          suggestions={suggestions}
          suggestionListName={suggestionListName}
          onCloseSuggestions={onCloseSuggestions}
          onAddManually={onAddManually}
          onGenerateAI={onGenerateAI}
          isLoadingAI={isLoadingAI}
          onSelectList={onSelectList}
          onAnalyzeList={onAnalyzeList}
          generativeProfile={profile}
          generativeLexicon={lexicon}
          onSaveGenerativeProfile={onUpdateGenerativeProfile}
          onEnqueue={onEnqueue}
          onGenerateBatch={onGenerateBatch}
          manifest={grammar}
          onSyncPhonology={onSyncPhonology}
        />
      </div>
      {activeTab === 'collections' && (
        <CollectionsManager
          lexicon={lexicon}
          inflection={inflectionProfile}
          onUpdateEntry={onEditWord}
          onAddEntry={onAddWord}
          onAddBatchEntries={onAddBatchWords}
          onDeleteEntry={onDeleteWord}
          customCategories={customFunctions}
          onStartTour={onStartTour}
        />
      )}
      {activeTab === 'writing' && (
        <WritingAndNeographyTab
          corpus={corpus}
          onUpdateCorpus={onUpdateCorpus}
          neographyProfile={neographyProfile}
          generativeProfile={profile}
          onUpdateNeographyProfile={onUpdateNeographyProfile}
          onStartTour={onStartTour}
        />
      )}
      {activeTab === 'grammar' && (
        <GrammarTab
          manifest={grammar}
          onSave={onSaveGrammar}
          lexicon={lexicon}
          conlangName={metadata?.conlangName}
          onAddLexicalException={onAddLexicalException}
          onExportGrammar={onExportGrammar}
          activeModule={activeGrammarModule}
          onModuleChange={onModuleChange}
          onBack={onOpenDashboard}
          onOpenAiSettings={onOpenAiSettings}
          showNotification={showNotification}
        />
      )}
      {activeTab === 'translator' && (
        <TranslationPlayground
          lexicon={lexicon}
          grammar={grammar}
          corpus={corpus}
          onUpdateCorpus={onUpdateCorpus}
          onClose={() => {}}
        />
      )}
      {activeTab === 'tools' && (
        <ToolsTab
          activeTab={activeTab}
          suggestions={suggestions}
          suggestionListName={suggestionListName}
          onCloseSuggestions={onCloseSuggestions}
          onAddManually={onAddManually}
          onGenerateAI={onGenerateAI}
          isLoadingAI={isLoadingAI}
          activeMetadata={metadata}
          activeToolView={activeToolView}
          onBackToToolDashboard={onBackToToolDashboard}
          onOpenInterlinearGloss={onOpenInterlinearGloss}
          onOpenSoundChangeWorkbench={onOpenSoundChangeWorkbench}
          onApplySoundChangeBatch={onApplySoundChangeBatch}
          onCompleteFunctions={onCompleteFunctions}
          onFillMissing={onFillMissing}
          onAnalyzeForSuggestions={onAnalyzeForSuggestions}
          onManageFunctions={onManageFunctions}
          onManageHyphens={onManageHyphens}
          onOpenProfile={onOpenProfile}
          onOpenNeography={onOpenNeography}
          onOpenInflectionModule={onOpenInflectionModule}
          onOpenGrammar={onOpenInflection}
          onOpenTranslator={onOpenTranslator}
          onStartTour={onStartTour}
          lexicon={lexiconData ?? EMPTY_TOOLS_LEXICON}
          stats={completionStats}
          disabled={!hasActiveLexicon}
        />
      )}
    </>
  );
};

AppTabContent.displayName = 'AppTabContent';

export default AppTabContent;
