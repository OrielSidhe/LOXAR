import React from 'react';
import type { GrammarManifest } from '../types';

export interface GrammarNotesPanelProps {
  manifest: GrammarManifest;
  onChange: (updates: Partial<GrammarManifest>) => void;
  title: string;
  description?: string;
  placeholder: string;
  textAreaClassName?: string;
}

const GrammarNotesPanel = ({ manifest, onChange, title, description, placeholder, textAreaClassName }: GrammarNotesPanelProps) => {
  const value = manifest.notes?.join('\n') || '';

  const handleChange = (text: string) => {
    onChange({ notes: text.split('\n').filter(Boolean) });
  };

  return (
    <div className="space-y-4">
      <div className="bg-background rounded-lg p-6 border border-border-dark space-y-4">
        <h3 className="text-lg font-bold text-white">{title}</h3>
        {description && <p className="text-sm text-text-secondary">{description}</p>}
        <textarea
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          className={textAreaClassName || 'w-full bg-surface border border-border-dark rounded-lg px-4 py-3 text-white focus:border-primary focus:outline-none resize-none h-64'}
          placeholder={placeholder}
        />
      </div>
    </div>
  );
};

GrammarNotesPanel.displayName = 'GrammarNotesPanel';

export default GrammarNotesPanel;
