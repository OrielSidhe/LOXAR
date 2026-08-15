import React from 'react';
import CheckCircleIcon from './icons/CheckCircleIcon';
import AlertTriangleIcon from './icons/AlertTriangleIcon';
import XCircleIcon from './icons/XCircleIcon';

export interface ToastNotification {
  id: number;
  message: string;
  type: 'success' | 'error';
}

export interface ToastContainerProps {
  notifications: ToastNotification[];
  onDismiss: (id: number) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ notifications, onDismiss }) => (
  <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none">
    {notifications.map(notification => (
      <div
        key={notification.id}
        className={`glass-toast pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-r-lg shadow-glow animate-fade-in ${notification.type === 'error' ? '!border-danger !bg-danger/10' : ''}`}
      >
        {notification.type === 'success' ? (
          <CheckCircleIcon className="h-5 w-5 text-accent" />
        ) : (
          <AlertTriangleIcon className="h-5 w-5 text-danger" />
        )}
        <span className="font-medium text-sm text-white">{notification.message}</span>
        <button
          onClick={() => onDismiss(notification.id)}
          className="ml-2 hover:bg-white/10 rounded-full p-1 transition-colors text-text-secondary hover:text-white"
        >
          <XCircleIcon className="h-4 w-4" />
        </button>
      </div>
    ))}
  </div>
);

ToastContainer.displayName = 'ToastContainer';

export default ToastContainer;
