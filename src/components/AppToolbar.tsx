import React from 'react';
import LexiconSelector from './LexiconSelector';
import FileControls from './FileControls';
import InfoIcon from './icons/InfoIcon';

export interface AppToolbarProps {
  lexiconNames: string[];
  activeLexiconName: string | null;
  onSelectLexicon: (name: string) => void;
  onCreateLexicon: (name: string) => void;
  onDeleteLexicon: (name: string) => void;
  onRenameLexicon: (oldName: string, newName: string) => void;
  onImport: (content: string) => void;
  onExport: (format: 'csv' | 'json') => void;
  onSave: () => void;
  onSetExportPath: () => void;
  onRestore: () => void;
  onOpenAbout: () => void;
  onStartTour: () => void;
  onOpenAiSettings: () => void;
  onQuit: () => void;
  onResetApp: () => void;
  onError: (msg: string) => void;
  disabled: boolean;
  isDirty: boolean;
  onNewProject: () => void;
  onOpenProject: () => void;
  onSaveProject: () => void;
  onSaveProjectAs: () => void;
  projectPath: string | null;
}

const AppToolbar: React.FC<AppToolbarProps> = ({
  lexiconNames,
  activeLexiconName,
  onSelectLexicon,
  onCreateLexicon,
  onDeleteLexicon,
  onRenameLexicon,
  onImport,
  onExport,
  onSave,
  onSetExportPath,
  onRestore,
  onOpenAbout,
  onStartTour,
  onOpenAiSettings,
  onQuit,
  onResetApp,
  onError,
  disabled,
  isDirty,
  onNewProject,
  onOpenProject,
  onSaveProject,
  onSaveProjectAs,
  projectPath,
}) => (
  <div className="flex items-center justify-between px-6 py-4 bg-surface-dark/90 backdrop-blur-md border-b border-border-dark flex-wrap gap-4 z-30 relative">
    <LexiconSelector
      lexiconNames={lexiconNames}
      activeLexiconName={activeLexiconName}
      onSelect={onSelectLexicon}
      onCreate={onCreateLexicon}
      onDelete={onDeleteLexicon}
      onRename={onRenameLexicon}
    />
    <div className="flex items-center gap-4">
      <FileControls
        onImport={onImport}
        onExport={onExport}
        onSave={onSave}
        onSetExportPath={onSetExportPath}
        onRestore={onRestore}
        onOpenAbout={onOpenAbout}
        onStartTour={onStartTour}
        onOpenAiSettings={onOpenAiSettings}
        onQuit={onQuit}
        onResetApp={onResetApp}
        onError={onError}
        disabled={disabled}
        isDirty={isDirty}
        onNewProject={onNewProject}
        onOpenProject={onOpenProject}
        onSaveProject={onSaveProject}
        onSaveProjectAs={onSaveProjectAs}
        projectPath={projectPath}
      />
      <button onClick={onStartTour} className="p-2 text-text-secondary hover:text-primary transition-colors hover:bg-white/5 rounded-full">
        <InfoIcon className="w-6 h-6" />
      </button>
    </div>
  </div>
);

AppToolbar.displayName = 'AppToolbar';

export default AppToolbar;
