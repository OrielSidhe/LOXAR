import React from 'react';

export interface EntryEditorAiBannerProps {
  aiBanner: {
    success: boolean;
    message?: string;
  } | null;
  onRegenerateAi: () => void;
  onDismissAiBanner: () => void;
}

const EntryEditorAiBanner = ({ aiBanner, onRegenerateAi, onDismissAiBanner }: EntryEditorAiBannerProps) => {
  if (!aiBanner) return null;

  return (
    <div className={`mb-4 p-3 rounded-md border text-sm flex items-center justify-between gap-3 ${aiBanner.success ? 'bg-accent/10 border-accent/40 text-accent' : 'bg-danger/10 border-danger/40 text-danger'}`}>
      <div className="flex items-center gap-2 min-w-0">
        <span className="shrink-0">{aiBanner.success ? '✦' : '⚠'}</span>
        <span className="truncate">{aiBanner.success ? 'Resultado de IA aplicado a los campos. Revisa y guarda, o regenera.' : (aiBanner.message || 'Error de la IA')}</span>
      </div>
      {aiBanner.success && (
        <div className="flex items-center gap-2 shrink-0">
          <button type="button" onClick={onRegenerateAi} className="px-2.5 py-1 rounded bg-accent/20 hover:bg-accent/30 text-accent font-bold text-xs transition-colors">Regenerar</button>
          <button type="button" onClick={onDismissAiBanner} className="px-2.5 py-1 rounded bg-surface hover:bg-subtle text-text-secondary text-xs transition-colors">Quitar</button>
        </div>
      )}
    </div>
  );
};

EntryEditorAiBanner.displayName = 'EntryEditorAiBanner';

export default EntryEditorAiBanner;
