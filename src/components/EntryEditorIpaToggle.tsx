import React from 'react';
import IPAKeyboard from './IPAKeyboard';

export interface EntryEditorIpaToggleProps {
  showIPA: boolean;
  onToggle: () => void;
}

const EntryEditorIpaToggle = ({ showIPA, onToggle }: EntryEditorIpaToggleProps) => {
  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={onToggle}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-surface border border-subtle hover:bg-accent hover:text-white transition-colors"
        title="Toggle IPA keyboard"
        aria-label={showIPA ? 'Ocultar teclado IPA' : 'Mostrar teclado IPA'}
      >
        <span className="font-mono">/ɑ/</span>
        {showIPA ? 'Hide IPA' : 'IPA'}
      </button>
      {showIPA && <IPAKeyboard targetId="Léxema" />}
    </div>
  );
};

EntryEditorIpaToggle.displayName = 'EntryEditorIpaToggle';

export default EntryEditorIpaToggle;
