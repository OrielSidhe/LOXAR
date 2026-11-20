import React from 'react';
import ArrowLeftIcon from './icons/ArrowLeftIcon';
import HomeIcon from './icons/HomeIcon';
import BookOpenIcon from './icons/BookOpenIcon';
import WandIcon from './icons/WandIcon';

export interface AppNavigationBarProps {
  onBack: () => void;
  onHome: () => void;
  /** Tab activa; habilita el salto rapido Workbench <-> Léxico. */
  activeTab?: string;
  /** Navegacion rapida entre el workbench y el modulo de léxico. */
  onQuickNav?: (target: 'table' | 'workbench') => void;
}

type QuickNavTarget = 'table' | 'workbench';

interface QuickNavDef {
  target: QuickNavTarget;
  label: string;
  icon: React.FC<{ className?: string }>;
}

/**
 * Salto rapido del gauntlet v3.14 (FASE NAV): desde el Workbench se va al
 * modulo de léxico y viceversa. Ambos tabs permanecen montados (solo ocultos)
 * en `App.tsx`, asi que el borrador del editor y la pagina/filtros de la tabla
 * sobreviven al salto.
 */
const QUICK_NAV: Record<string, QuickNavDef> = {
  workbench: { target: 'table', label: 'Ir al Léxico', icon: BookOpenIcon },
  table: { target: 'workbench', label: 'Ir al Workbench', icon: WandIcon },
};

/**
 * Barra de navegacion superior del area principal: "Volver" (retrocede en el
 * historial de tabs) y "Panel" (vuelve directo al dashboard).
 */
const AppNavigationBar: React.FC<AppNavigationBarProps> = ({ onBack, onHome, activeTab, onQuickNav }) => {
  const quickNav = activeTab ? QUICK_NAV[activeTab] : undefined;
  const QuickIcon = quickNav?.icon;

  return (
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
      {quickNav && QuickIcon && onQuickNav && (
        <button
          type="button"
          onClick={() => onQuickNav(quickNav.target)}
          className="flex items-center gap-1 text-xs text-text-secondary hover:text-accent bg-white/5 hover:bg-accent/10 rounded-lg px-2 py-1 transition-colors"
          title={quickNav.label}
        >
          <QuickIcon className="w-3.5 h-3.5" />
          {quickNav.label}
        </button>
      )}
    </div>
  );
};

AppNavigationBar.displayName = 'AppNavigationBar';

export default AppNavigationBar;
