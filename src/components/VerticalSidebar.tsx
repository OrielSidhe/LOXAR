import React, { useState } from 'react';
import BarChartIcon from './icons/BarChartIcon';
import BookOpenIcon from './icons/BookOpenIcon';
import WandIcon from './icons/WandIcon';
import TableIcon from './icons/TableIcon';
import PenToolIcon from './icons/PenToolIcon';
import SettingsIcon from './icons/SettingsIcon';
import SparkleIcon from './icons/SparkleIcon';
import InfoIcon from './icons/InfoIcon';
import WidgetIcon from './icons/WidgetIcon';
import HomeIcon from './icons/HomeIcon';

type SidebarItem = {
  id: string;
  label: string;
  icon: React.FC<{ className?: string }>;
};

const items: SidebarItem[] = [
  { id: 'dashboard', label: 'Panel', icon: BarChartIcon },
  { id: 'table', label: 'Léxico', icon: BookOpenIcon },
  { id: 'workbench', label: 'Workbench', icon: WandIcon },
  { id: 'collections', label: 'Colecciones', icon: TableIcon },
  { id: 'writing', label: 'Escritura', icon: PenToolIcon },
  { id: 'grammar', label: 'Gramática', icon: SettingsIcon },
  { id: 'translator', label: 'Traductor', icon: SparkleIcon },
  { id: 'tools', label: 'Herramientas', icon: InfoIcon },
];

interface VerticalSidebarProps {
  active: string;
  onChange: (id: string) => void;
  onOpenWidget: () => void;
  onOpenSettings: () => void;
  onShowTour?: () => void;
  onGoHome?: () => void;
}

const VerticalSidebar: React.FC<VerticalSidebarProps> = ({ active, onChange, onOpenWidget, onOpenSettings, onShowTour, onGoHome }) => {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <aside className="fixed left-0 top-0 h-screen w-16 bg-surface-dark/70 backdrop-blur-md border-r border-border-dark/60 z-40 flex flex-col items-center py-3 gap-1">
      <div className="mb-3">
        <span className="text-[10px] font-black tracking-widest text-accent">LOX</span>
      </div>

      {onGoHome && (
        <button
          onClick={onGoHome}
          className="w-12 h-12 rounded-xl flex items-center justify-center text-text-secondary hover:text-accent hover:bg-accent/10 transition-colors mb-1"
          title="Volver al panel"
        >
          <HomeIcon className="w-5 h-5" />
        </button>
      )}

      {items.map((item) => {
        const Icon = item.icon;
        const isActive = active === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            onMouseEnter={() => setHovered(item.id)}
            onMouseLeave={() => setHovered(null)}
            className={`relative w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
              isActive ? 'bg-accent/15 text-accent shadow-[0_0_15px_rgba(13,185,242,0.15)]' : 'text-text-secondary hover:text-white hover:bg-white/5'
            }`}
            title={item.label}
          >
            <Icon className="w-5 h-5" />
            {hovered === item.id && (
              <span className="absolute left-full ml-2 px-2 py-1 bg-background border border-border-dark rounded-md text-xs text-white whitespace-nowrap shadow-lg">
                {item.label}
              </span>
            )}
            {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 -ml-1.5 w-1 h-6 rounded-r bg-accent" />}
          </button>
        );
      })}

      <div className="mt-auto flex flex-col gap-1">
        <button
          onClick={onOpenWidget}
          className="w-12 h-12 rounded-xl flex items-center justify-center text-text-secondary hover:text-accent hover:bg-accent/10 transition-colors"
          title="Widget"
        >
          <WidgetIcon className="w-5 h-5" />
        </button>
        <button
          onClick={onOpenSettings}
          className="w-12 h-12 rounded-xl flex items-center justify-center text-text-secondary hover:text-white hover:bg-white/5 transition-colors"
          title="Configuración"
        >
          <SettingsIcon className="w-5 h-5" />
        </button>
        {onShowTour && (
          <button
            onClick={onShowTour}
            className="w-12 h-12 rounded-xl flex items-center justify-center text-text-secondary hover:text-accent hover:bg-accent/10 transition-colors"
            title="Tour guiado"
          >
            <InfoIcon className="w-5 h-5" />
          </button>
        )}
      </div>
    </aside>
  );
};

export default VerticalSidebar;
