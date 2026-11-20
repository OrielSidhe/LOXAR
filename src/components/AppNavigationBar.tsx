import React from 'react';
import ArrowLeftIcon from './icons/ArrowLeftIcon';
import HomeIcon from './icons/HomeIcon';

export interface AppNavigationBarProps {
  onBack: () => void;
  onHome: () => void;
}

/**
 * Barra de navegacion superior del area principal: "Volver" (retrocede en el
 * historial de tabs) y "Panel" (vuelve directo al dashboard).
 */
const AppNavigationBar: React.FC<AppNavigationBarProps> = ({ onBack, onHome }) => (
  <div className="flex items-center gap-2 mb-4">
    <button
      type="button"
      onClick={onBack}
      className="flex items-center gap-1 text-xs text-text-secondary hover:text-white bg-white/5 hover:bg-white/10 rounded-lg px-2 py-1 transition-colors"
    >
      <ArrowLeftIcon className="w-3.5 h-3.5" />
      Volver
    </button>
    <button
      type="button"
      onClick={onHome}
      className="flex items-center gap-1 text-xs text-text-secondary hover:text-accent bg-white/5 hover:bg-accent/10 rounded-lg px-2 py-1 transition-colors"
    >
      <HomeIcon className="w-3.5 h-3.5" />
      Panel
    </button>
  </div>
);

AppNavigationBar.displayName = 'AppNavigationBar';

export default AppNavigationBar;
