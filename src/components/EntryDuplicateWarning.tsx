import React from 'react';
import AlertTriangleIcon from './icons/AlertTriangleIcon';
import { LexiconEntry } from '../types';

export interface EntryDuplicateWarningProps {
  duplicateLexemas: LexiconEntry[];
  duplicateRaices: LexiconEntry[];
  duplicateSignificados: LexiconEntry[];
}

const EntryDuplicateWarning: React.FC<EntryDuplicateWarningProps> = ({
  duplicateLexemas,
  duplicateRaices,
  duplicateSignificados,
}) => {
  if (!duplicateLexemas.length && !duplicateRaices.length && !duplicateSignificados.length) {
    return null;
  }

  return (
    <div className="p-2.5 bg-warning/10 border border-warning/35 text-amber-200 rounded-md text-xs flex flex-col gap-1 shadow-[0_2px_8px_rgba(245,158,11,0.05)] animate-fade-in">
      <div className="flex items-center gap-1.5 font-bold text-warning text-[11px] uppercase tracking-wider">
        <AlertTriangleIcon className="h-3.5 w-3.5" />
        <span>Precaución: Coincidencias detectadas</span>
      </div>
      <div className="space-y-1.5 pl-5 mt-0.5">
        {duplicateLexemas.length > 0 && (
          <div>
            <span className="opacity-75">El léxema ya existe en: </span>
            <span className="font-semibold text-text-primary">
              {duplicateLexemas.map(e => `${e.Léxema.join(', ')} (${e.Categoría})`).join('; ')}
            </span>
          </div>
        )}
        {duplicateRaices.length > 0 && (
          <div>
            <span className="opacity-75">La raíz ya existe en: </span>
            <span className="font-semibold text-text-primary">
              {duplicateRaices.map(e => `${e.Léxema.join(', ')} (Raíz: ${e.Raíz})`).join('; ')}
            </span>
          </div>
        )}
        {duplicateSignificados.length > 0 && (
          <div>
            <span className="opacity-75">El significado ya existe en: </span>
            <span className="font-semibold text-text-primary">
              {duplicateSignificados.map(e => `${e.Léxema.join(', ')}: "${e.Significado.join(', ')}"`).join('; ')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

EntryDuplicateWarning.displayName = 'EntryDuplicateWarning';

export default EntryDuplicateWarning;
