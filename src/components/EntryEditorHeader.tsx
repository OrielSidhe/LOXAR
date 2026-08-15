import React from 'react';
import WrenchIcon from './icons/WrenchIcon';

export interface EntryEditorHeaderProps {
  mode: 'add' | 'complete';
  onModeChange: (mode: 'add' | 'complete') => void;
  incompleteCount: number;
}

const EntryEditorHeader = ({ mode, onModeChange, incompleteCount }: EntryEditorHeaderProps) => {
  return (
    <header className="p-4 border-b border-subtle flex items-center justify-between bg-background/30">
      <div className="flex items-center gap-3">
        <WrenchIcon className="h-6 w-6 text-accent" />
        <h2 id="entry-editor-heading" className="text-lg font-bold text-text-primary uppercase tracking-tight">Workbench</h2>
      </div>
      <div className="flex items-center gap-1 p-1 bg-background rounded-md border border-subtle">
        <button onClick={() => onModeChange('add')} className={`px-4 py-1.5 text-xs font-bold rounded transition-all ${mode === 'add' ? 'bg-accent text-white shadow-[0_0_15px_-3px_rgba(225,29,72,0.4)]' : 'text-text-secondary hover:text-text-primary'}`}>NUEVA</button>
        <button onClick={() => onModeChange('complete')} className={`px-4 py-1.5 text-xs font-bold rounded transition-all ${mode === 'complete' ? 'bg-accent text-white shadow-[0_0_15px_-3px_rgba(225,29,72,0.4)]' : 'text-text-secondary hover:text-text-primary'}`}>COMPLETAR ({incompleteCount})</button>
      </div>
    </header>
  );
};

EntryEditorHeader.displayName = 'EntryEditorHeader';

export default EntryEditorHeader;
