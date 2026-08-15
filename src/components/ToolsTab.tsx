import React from 'react';
import ModulePanel from './ModulePanel';
import SuggestionsWorkbench from './SuggestionsWorkbench';
import ToolsDashboard from './ToolsDashboard';
import InterlinearGlossViewer from './InterlinearGlossViewer';
import SoundChangeWorkbench from './SoundChangeWorkbench';
import { LexiconData } from '../types';

export interface ToolsTabProps {
  activeTab: string;
  suggestions: any[];
  suggestionListName: string;
  onCloseSuggestions: () => void;
  onAddManually: (suggestion: any) => void;
  onGenerateAI: (suggestion: any) => void;
  isLoadingAI: boolean;
  activeMetadata: any;
  activeToolView: string;
  onBackToToolDashboard: () => void;
  onOpenInterlinearGloss: () => void;
  onOpenSoundChangeWorkbench: () => void;
  onCompleteFunctions: (listName: string) => Promise<void>;
  onFillMissing: (listName: string) => Promise<void>;
  onAnalyzeForSuggestions: (listName: string) => void;
  onManageFunctions: () => void;
  onManageHyphens: () => void;
  onOpenProfile: () => void;
  onOpenNeography: () => void;
  onOpenInflectionWorkshop: () => void;
  onOpenGrammar: () => void;
  onOpenTranslator: () => void;
  onStartTour: () => void;
  lexicon: LexiconData;
  stats: any;
  disabled: boolean;
}

const ToolsTab = (props: ToolsTabProps) => {
  return (
    <ModulePanel title="Herramientas" active={props.activeTab === 'tools'} onClose={() => props.onCloseSuggestions()}>
      {props.suggestions.length > 0 ? (
        <SuggestionsWorkbench
          suggestions={props.suggestions}
          listName={props.suggestionListName}
          onClose={props.onCloseSuggestions}
          onAddManually={props.onAddManually}
          onGenerateAI={props.onGenerateAI}
          isLoading={props.isLoadingAI}
          activeMetadata={props.activeMetadata}
        />
      ) : (
        <>
          {props.activeToolView === 'dashboard' && (
            <ToolsDashboard
              listName={props.suggestionListName}
              onStartTour={props.onStartTour}
              onOpenProfile={props.onOpenProfile}
              onOpenNeography={props.onOpenNeography}
              onOpenInflectionWorkshop={props.onOpenInflectionWorkshop}
              onOpenGrammar={props.onOpenGrammar}
              onOpenTranslator={props.onOpenTranslator}
              onOpenInterlinearGloss={props.onOpenInterlinearGloss}
              onOpenSoundChangeWorkbench={props.onOpenSoundChangeWorkbench}
              onManageFunctions={props.onManageFunctions}
              onManageHyphens={props.onManageHyphens}
              onCompleteFunctions={props.onCompleteFunctions}
              onFillMissing={props.onFillMissing}
              onAnalyzeForSuggestions={props.onAnalyzeForSuggestions}
              stats={props.stats}
              disabled={props.disabled}
            />
          )}
          {props.activeToolView === 'interlinear-gloss' && (
            <div className="space-y-3">
              <button type="button" onClick={props.onBackToToolDashboard} className="text-sm text-text-secondary hover:text-white">&larr; Volver a Herramientas</button>
              <InterlinearGlossViewer lexicon={props.lexicon} />
            </div>
          )}
          {props.activeToolView === 'sound-change' && (
            <div className="space-y-3">
              <button type="button" onClick={props.onBackToToolDashboard} className="text-sm text-text-secondary hover:text-white">&larr; Volver a Herramientas</button>
              <SoundChangeWorkbench lexicon={props.lexicon} />
            </div>
          )}
        </>
      )}
    </ModulePanel>
  );
};

ToolsTab.displayName = 'ToolsTab';

export default ToolsTab;
