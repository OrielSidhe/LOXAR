import React from 'react';
import SettingsModal from './SettingsModal';

type AppSettingsModalLayerProps = {
  showSettings: boolean;
  onCloseSettings: () => void;
  onOpenAiSettings?: () => void;
};

const AppSettingsModalLayer: React.FC<AppSettingsModalLayerProps> = ({ showSettings, onCloseSettings, onOpenAiSettings }) => {
  if (!showSettings) return null;
  return <SettingsModal open={showSettings} onClose={onCloseSettings} onOpenAiSettings={onOpenAiSettings} />;
};

AppSettingsModalLayer.displayName = 'AppSettingsModalLayer';

export default AppSettingsModalLayer;
