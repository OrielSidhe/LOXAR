import React from 'react';
import ArrowLeftIcon from './icons/ArrowLeftIcon';
import ArrowRightIcon from './icons/ArrowRightIcon';

export interface EntryEditorCompleteModeNavProps {
  lookupTerm: string;
  onLookupTermChange: (term: string) => void;
  onLookup: (term: string) => void;
  onNavigateIncomplete: (direction: 'next' | 'prev') => void;
  incompleteCount: number;
  incompleteIndex: number;
}

const EntryEditorCompleteModeNav = ({
  lookupTerm,
  onLookupTermChange,
  onLookup,
  onNavigateIncomplete,
  incompleteCount,
  incompleteIndex,
}: EntryEditorCompleteModeNavProps) => {
  const handleLookupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (lookupTerm.trim()) onLookup(lookupTerm.trim());
  };

  return (
    <div className="mb-6 p-3 bg-background/50 rounded-md border border-subtle flex flex-col sm:flex-row items-center gap-4">
      <form onSubmit={handleLookupSubmit} className="flex-grow flex gap-2 w-full">
        <input
          type="text"
          value={lookupTerm}
          onChange={(e) => onLookupTermChange(e.target.value)}
          placeholder="Buscar significado para completar..."
          className="flex-grow bg-surface border border-subtle rounded px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
        />
        <button type="submit" className="px-3 py-1.5 bg-subtle text-text-primary text-sm font-semibold rounded hover:bg-gray-600 transition-colors">IR</button>
      </form>
      <div className="flex items-center gap-3 bg-surface p-1 rounded border border-subtle">
        <button onClick={() => onNavigateIncomplete('prev')} disabled={incompleteCount === 0} className="p-1 rounded hover:bg-subtle disabled:opacity-30"><ArrowLeftIcon className="h-4 w-4"/></button>
        <span className="text-xs text-text-secondary font-mono font-bold min-w-[40px] text-center">{incompleteCount > 0 ? `${incompleteIndex + 1}/${incompleteCount}` : '0/0'}</span>
        <button onClick={() => onNavigateIncomplete('next')} disabled={incompleteCount === 0} className="p-1 rounded hover:bg-subtle disabled:opacity-30"><ArrowRightIcon className="h-4 w-4"/></button>
      </div>
    </div>
  );
};

EntryEditorCompleteModeNav.displayName = 'EntryEditorCompleteModeNav';

export default EntryEditorCompleteModeNav;
