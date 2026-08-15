import React from 'react';
import OfflineBanner from './OfflineBanner';

type AppOfflineBannerLayerProps = {
  showOfflineBanner: boolean;
};

const AppOfflineBannerLayer: React.FC<AppOfflineBannerLayerProps> = ({ showOfflineBanner }) => {
  if (!showOfflineBanner) return null;
  return <OfflineBanner />;
};

AppOfflineBannerLayer.displayName = 'AppOfflineBannerLayer';

export default AppOfflineBannerLayer;
