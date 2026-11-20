import React from 'react';
import { lazy, Suspense } from 'react';
import GrammarWizard from './GrammarWizard';

const GrammarImporterModal = lazy(() => import('./GrammarImporterModal'));

export interface GrammarTabModalsProps {
  isImporterOpen: boolean;
  isWizardOpen: boolean;
  conlangName?: string;
  existingNotes?: string;
  onSaveFlexibleGrammar: (grammar: any) => void;
  onCloseImporter: () => void;
  /** Notificaciones reales: antes el importador recibía un no-op y tragaba los toasts. */
  showNotification: (message: string, type: 'success' | 'error') => void;
  onApplyWizard: (newManifest: any) => void;
  onCloseWizard: () => void;
  /** J1: abre Ajustes de IA desde el importador sin cerrarlo. */
  onOpenAiSettings?: () => void;
}

const GrammarTabModals = ({
  isImporterOpen,
  isWizardOpen,
  conlangName,
  existingNotes,
  onSaveFlexibleGrammar,
  onCloseImporter,
  showNotification,
  onApplyWizard,
  onCloseWizard,
  onOpenAiSettings,
}: GrammarTabModalsProps) => {
  return (
    <>
      {isImporterOpen && (
        <Suspense fallback={<div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"><div className="text-white text-sm">Cargando importador...</div></div>}>
            <GrammarImporterModal
                onSaveFlexibleGrammar={onSaveFlexibleGrammar}
                onClose={onCloseImporter}
                showNotification={showNotification}
                existingNotes={existingNotes || ''}
                onOpenAiSettings={onOpenAiSettings}
            />
        </Suspense>
      )}
      <GrammarWizard
        open={isWizardOpen}
        initialName={conlangName}
        onApply={onApplyWizard}
        onClose={onCloseWizard}
      />
    </>
  );
};

GrammarTabModals.displayName = 'GrammarTabModals';

export default GrammarTabModals;
