import React from 'react';
import ToastContainer from './ToastContainer';

type AppToastLayerProps = {
  notifications: { id: number; message: string; type: 'success' | 'error' }[];
  onDismissNotification: (id: number) => void;
};

const AppToastLayer: React.FC<AppToastLayerProps> = ({ notifications, onDismissNotification }) => {
  return (
    <ToastContainer
      notifications={notifications}
      onDismiss={onDismissNotification}
    />
  );
};

export default AppToastLayer;
