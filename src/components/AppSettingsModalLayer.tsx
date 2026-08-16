import React from 'react';
import SettingsModal from './SettingsModal';

type AppSettingsModalLayerProps = {
  showSettings: boolean;
  onCloseSettings: () => void;
};

const AppSettingsModalLayer: React.FC<AppSettingsModalLayerProps> = ({ showSettings, onCloseSettings }) => {
  if (!showSettings) return null;
  return <SettingsModal open={showSettings} onClose={onCloseSettings} />;
};

AppSettingsModalLayer.displayName = 'AppSettingsModalLayer';

export default AppSettingsModalLayer;
