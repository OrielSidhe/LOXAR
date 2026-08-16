import React from 'react';
import ProjectBootstrapModal from './ProjectBootstrapModal';
import ProjectBootstrapBanner from './ProjectBootstrapBanner';

export interface AppProjectBootstrapLayerProps {
  isAppLoaded: boolean;
  showProjectBootstrap: boolean;
  bootstrapDismissed: boolean;
  projectPath: string | null;
  availableProjects: string[];
  hasLocalData: boolean;
  onCreate: () => void;
  onOpenOther: () => void;
  onOpenFound: (path: string) => void;
  onImportLocal: () => void;
  onDismiss: () => void;
  onChooseLocation: () => void;
}

const AppProjectBootstrapLayer: React.FC<AppProjectBootstrapLayerProps> = ({
  isAppLoaded,
  showProjectBootstrap,
  bootstrapDismissed,
  projectPath,
  availableProjects,
  hasLocalData,
  onCreate,
  onOpenOther,
  onOpenFound,
  onImportLocal,
  onDismiss,
  onChooseLocation,
}) => {
  if (!isAppLoaded) return null;

  if (showProjectBootstrap) {
    return (
      <ProjectBootstrapModal
        availableProjects={availableProjects}
        hasLocalData={hasLocalData}
        onCreate={onCreate}
        onOpenOther={onOpenOther}
        onOpenFound={onOpenFound}
        onImportLocal={onImportLocal}
        onDismiss={onDismiss}
      />
    );
  }

  if (!projectPath && bootstrapDismissed) {
    return <ProjectBootstrapBanner onChooseLocation={onChooseLocation} />;
  }

  return null;
};

AppProjectBootstrapLayer.displayName = 'AppProjectBootstrapLayer';

export default AppProjectBootstrapLayer;
