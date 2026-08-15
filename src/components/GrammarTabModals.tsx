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
  onApplyWizard: (newManifest: any) => void;
  onCloseWizard: () => void;
}

const GrammarTabModals = ({
  isImporterOpen,
  isWizardOpen,
  conlangName,
  existingNotes,
  onSaveFlexibleGrammar,
  onCloseImporter,
  onApplyWizard,
  onCloseWizard,
}: GrammarTabModalsProps) => {
  return (
    <>
      {isImporterOpen && (
        <Suspense fallback={<div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"><div className="text-white text-sm">Cargando importador...</div></div>}>
            <GrammarImporterModal
                onSaveFlexibleGrammar={onSaveFlexibleGrammar}
                onClose={onCloseImporter}
                showNotification={() => {}}
                existingNotes={existingNotes || ''}
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
