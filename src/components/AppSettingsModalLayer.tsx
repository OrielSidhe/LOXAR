import React from 'react';
import SettingsModal from './SettingsModal';
import type { ExportFormat } from '../utils/lexiconExport';

type AppSettingsModalLayerProps = {
  showSettings: boolean;
  onCloseSettings: () => void;
  onOpenAiSettings?: () => void;
  exportFormats: ExportFormat[];
  onExportFormatsChange: (formats: ExportFormat[]) => void;
};

const AppSettingsModalLayer: React.FC<AppSettingsModalLayerProps> = ({
  showSettings,
  onCloseSettings,
  onOpenAiSettings,
  exportFormats,
  onExportFormatsChange,
}) => {
  if (!showSettings) return null;
  return (
    <SettingsModal
      open={showSettings}
      onClose={onCloseSettings}
      onOpenAiSettings={onOpenAiSettings}
      exportFormats={exportFormats}
      onExportFormatsChange={onExportFormatsChange}
    />
  );
};

AppSettingsModalLayer.displayName = 'AppSettingsModalLayer';

export default AppSettingsModalLayer;
