import React from 'react';

export interface EntryEditorCompleteWarningProps {
  isCompleteWarning: boolean;
}

const EntryEditorCompleteWarning = ({ isCompleteWarning }: EntryEditorCompleteWarningProps) => {
  if (!isCompleteWarning) return null;

  return (
    <div className="mb-4 p-2 bg-success/10 border border-success/30 text-success text-xs rounded-md text-center italic">
      Esta entrada ya está completa. Editando modo revisión.
    </div>
  );
};

EntryEditorCompleteWarning.displayName = 'EntryEditorCompleteWarning';

export default EntryEditorCompleteWarning;
