import React from 'react';
import EntryEditor from './EntryEditor';
import WorkQueueBar from './WorkQueueBar';
import WorkbenchRightPanel from './WorkbenchRightPanel';
import {
  GenerationMode,
  GenerativeProfile,
  GrammarManifest,
  LexiconEntry,
  LexiconMetadata,
  MissingWord,
  NewLexiconEntry,
  WorkQueueItem,
} from '../types';
import type { EntryEditorFormPayload, EntryEditorInitialData } from '../utils/entryEditorModel';

export interface WorkbenchTabProps {
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
  entryToEdit?: LexiconEntry | null;
  incompleteCount: number;
  incompleteIndex: number;
  onNavigateIncomplete: (direction: 'next' | 'prev') => void;
  onLookup: (significado: string) => void;
  onAddWord: (entry: LexiconEntry | NewLexiconEntry) => void;
  onUpdateWord: (id: string, entry: LexiconEntry) => void;
  onAiCompleteEntry: (entry: EntryEditorFormPayload) => Promise<Record<string, unknown> | null>;
  onAiGenerateRootAndLexeme: (significado: string, categoria: string, modes: GenerationMode[]) => Promise<{ raiz: string; lexema: string } | null>;
  onCorrectSignificado: (significado: string) => Promise<string>;
  showNotification: (message: string, type: 'success' | 'error') => void;
  disabled: boolean;
  initialDataForAdd?: EntryEditorInitialData | null;
  setIsLoading: (loading: boolean) => void;
  setLoadingMessage: (message: string) => void;
  customCategories: string[];
  onAddCustomCategory: (category: string) => void;
  activeMetadata: LexiconMetadata | null;
  activeLexicon: LexiconEntry[];
  generationModes: GenerationMode[];
  onGenerationModesChange: (modes: GenerationMode[]) => void;
  onQueueAdvance?: () => void;
  suggestions: MissingWord[];
  suggestionListName: string;
  onCloseSuggestions: () => void;
  onAddManually: (suggestion: MissingWord) => void;
  onGenerateAI: (suggestion: MissingWord) => void;
  isLoadingAI: boolean;
  onSelectList: (name: string) => void;
  onAnalyzeList: (name: string) => void;
  generativeProfile: GenerativeProfile;
  generativeLexicon: LexiconEntry[];
  onSaveGenerativeProfile: (profile: GenerativeProfile) => void;
  onEnqueue: (items: MissingWord[]) => void;
  onGenerateBatch: (items: MissingWord[], modes: GenerationMode[]) => void;
  manifest: GrammarManifest;
  onSyncPhonology: (phonology: Partial<GenerativeProfile>) => void;
}

const WorkbenchTab = (props: WorkbenchTabProps) => {
  return (
    <div className="flex gap-4 h-full min-h-[600px]">
      <div className="flex-1 min-w-0 flex flex-col gap-3">
        {props.queueActive && (
          <WorkQueueBar
            items={props.workQueue}
            cursor={props.queueCursor}
            onPrev={props.queuePrev}
            onNext={props.queueNext}
            onTogglePending={props.queueTogglePending}
            onRemove={props.queueRemoveCurrent}
            onClear={props.queueClear}
          />
        )}
        <div className="flex-1 min-h-0">
          <EntryEditor
            mode={props.editorMode}
            onModeChange={props.onEditorModeChange}
            entryToEdit={props.entryToEdit ?? undefined}
            incompleteCount={props.incompleteCount}
            incompleteIndex={props.incompleteIndex}
            onNavigateIncomplete={props.onNavigateIncomplete}
            onLookup={props.onLookup}
            onAddWord={props.onAddWord}
            onUpdateWord={props.onUpdateWord}
            onAiCompleteEntry={props.onAiCompleteEntry}
            onAiGenerateRootAndLexeme={props.onAiGenerateRootAndLexeme}
            onCorrectSignificado={props.onCorrectSignificado}
            showNotification={props.showNotification}
            disabled={props.disabled}
            initialDataForAdd={props.initialDataForAdd}
            setIsLoading={props.setIsLoading}
            setLoadingMessage={props.setLoadingMessage}
            customCategories={props.customCategories}
            onAddCustomCategory={props.onAddCustomCategory}
            activeMetadata={props.activeMetadata}
            activeLexicon={props.activeLexicon}
            generationModes={props.generationModes}
            onGenerationModesChange={props.onGenerationModesChange}
            onQueueAdvance={props.onQueueAdvance}
          />
        </div>
      </div>
      <div className="w-72 shrink-0">
        <WorkbenchRightPanel
          suggestions={props.suggestions}
          listName={props.suggestionListName}
          onClose={props.onCloseSuggestions}
          onAddManually={props.onAddManually}
          onGenerateAI={props.onGenerateAI}
          isLoading={props.isLoadingAI}
          activeMetadata={props.activeMetadata}
          onSelectList={props.onSelectList}
          onAnalyzeList={props.onAnalyzeList}
          generativeProfile={props.generativeProfile}
          generativeLexicon={props.generativeLexicon}
          onSaveGenerativeProfile={props.onSaveGenerativeProfile}
          showNotification={props.showNotification}
          onEnqueue={props.onEnqueue}
          onGenerateBatch={props.onGenerateBatch}
          generationModes={props.generationModes}
          manifest={props.manifest}
          onSyncPhonology={props.onSyncPhonology}
        />
      </div>
    </div>
  );
};

WorkbenchTab.displayName = 'WorkbenchTab';

export default WorkbenchTab;
