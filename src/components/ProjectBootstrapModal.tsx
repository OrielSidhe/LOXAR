/**
 * ProjectBootstrapModal.tsx
 * ----------------------------------------------------------------------------
 * Modal que se muestra al arrancar cuando la app NO tiene un proyecto `.loxar`
 * configurado. En lugar de guardar en silencio en appdata (que se pierde si se
 * limpia la carpeta de la app), le pregunta al usuario dónde quiere guardar su
 * proyecto y le ofrece reabrir proyectos `.loxar` que ya existan en el equipo.
 * ----------------------------------------------------------------------------
 */
import React from 'react';
import PlusIcon from './icons/PlusIcon';
import FolderIcon from './icons/FolderIcon';
import AlertTriangleIcon from './icons/AlertTriangleIcon';
import XCircleIcon from './icons/XCircleIcon';

interface ProjectBootstrapModalProps {
  availableProjects: string[];
  hasLocalData: boolean;
  onCreate: () => void;
  onOpenOther: () => void;
  onOpenFound: (path: string) => void;
  onImportLocal: () => void;
  onDismiss: () => void;
}

const basename = (p: string): string => p.split(/[\\/]/).pop() || p;

const ProjectBootstrapModal: React.FC<ProjectBootstrapModalProps> = ({
  availableProjects,
  hasLocalData,
  onCreate,
  onOpenOther,
  onOpenFound,
  onImportLocal,
  onDismiss,
}) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border border-subtle bg-surface-dark shadow-glow p-6 space-y-5">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-accent/15 text-accent">
            <AlertTriangleIcon className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">¿Dónde querés guardar tu proyecto LOXAR?</h2>
            <p className="text-sm text-text-secondary mt-1 leading-relaxed">
              Aún no hay un archivo de proyecto configurado. Si guardamos solo en la carpeta de la
              app (<span className="font-mono text-xs">appdata</span>), tus léxicos y gramática se
              pierden si se limpia esa carpeta. Elegí una ubicación (por ejemplo, en Documentos) y
              LOXAR hará un respaldo <span className="font-semibold">.loxar</span> automático allí.
            </p>
          </div>
        </div>

        {availableProjects.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-text-secondary">Proyectos encontrados en este equipo</p>
            <div className="max-h-40 overflow-y-auto space-y-1 custom-scrollbar">
              {availableProjects.map((p) => (
                <button
                  key={p}
                  onClick={() => onOpenFound(p)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-md bg-background border border-subtle hover:border-accent hover:bg-subtle text-left transition-colors"
                >
                  <FolderIcon className="h-4 w-4 text-accent flex-shrink-0" />
                  <span className="truncate text-sm text-text-primary" title={p}>{basename(p)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <button
            onClick={onCreate}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-md bg-accent text-white font-semibold hover:bg-accent-hover transition-colors"
          >
            <PlusIcon className="h-5 w-5" /> Crear proyecto nuevo…
          </button>
          <button
            onClick={onOpenOther}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-background text-text-primary font-medium border border-subtle hover:bg-subtle transition-colors"
          >
            <FolderIcon className="h-5 w-5" /> Abrir otro archivo .loxar…
          </button>

          {hasLocalData && (
            <button
              onClick={onImportLocal}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-background text-text-primary font-medium border border-accent/50 hover:bg-subtle transition-colors"
            >
              <AlertTriangleIcon className="h-5 w-5 text-accent" /> Importar mis datos locales existentes a un proyecto nuevo
            </button>
          )}
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-text-secondary max-w-[70%]">
            Sin archivo, tus datos solo viven en este equipo y pueden perderse.
          </span>
          <button
            onClick={onDismiss}
            className="flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary transition-colors"
          >
            <XCircleIcon className="h-4 w-4" /> Más tarde
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProjectBootstrapModal;
