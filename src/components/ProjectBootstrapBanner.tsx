import React from 'react';
import AlertTriangleIcon from './icons/AlertTriangleIcon';

export interface ProjectBootstrapBannerProps {
  onChooseLocation: () => void;
}

const ProjectBootstrapBanner: React.FC<ProjectBootstrapBannerProps> = ({ onChooseLocation }) => (
  <div className="fixed top-0 left-0 right-0 z-[90] flex items-center gap-3 px-4 py-2 bg-danger/15 border-b border-danger/40 text-sm text-white">
    <AlertTriangleIcon className="h-4 w-4 text-danger flex-shrink-0" />
    <span className="flex-1">No hay un archivo de proyecto configurado. Si se limpia la carpeta de la app, tus datos se perderán.</span>
    <button
      onClick={onChooseLocation}
      className="px-3 py-1 rounded-md bg-accent text-white font-semibold hover:bg-accent-hover transition-colors"
    >
      Elegir ubicación
    </button>
  </div>
);

ProjectBootstrapBanner.displayName = 'ProjectBootstrapBanner';

export default ProjectBootstrapBanner;
