import React from 'react';
import LoadingOverlay from './LoadingOverlay';

type AppLoadingLayerProps = {
  isLoading: boolean;
  loadingMessage: string;
};

const AppLoadingLayer: React.FC<AppLoadingLayerProps> = ({ isLoading, loadingMessage }) => {
  if (!isLoading) return null;
  return <LoadingOverlay message={loadingMessage} />;
};

AppLoadingLayer.displayName = 'AppLoadingLayer';

export default AppLoadingLayer;
