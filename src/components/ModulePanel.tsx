import React from 'react';
import XCircleIcon from './icons/XCircleIcon';

interface ModulePanelProps {
  title: string;
  active: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

const ModulePanel: React.FC<ModulePanelProps> = ({ title, active, onClose, children, className = '' }) => {
  if (!active) return null;

  return (
    <div className={`fixed inset-0 z-[70] flex items-center justify-center pointer-events-none ${className}`}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm pointer-events-none" />
      <div className="pointer-events-auto w-full max-w-6xl max-h-[90vh] overflow-hidden bg-surface-dark/95 backdrop-blur-xl rounded-2xl border border-border-dark shadow-2xl flex flex-col animate-scale-in">
        <div className="flex items-center justify-between p-4 border-b border-border-dark bg-surface-dark/80">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-full text-text-secondary hover:text-white hover:bg-white/5 transition-colors">
            <XCircleIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

export default ModulePanel;
