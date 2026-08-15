import React from 'react';
import type { ReactNode } from 'react';
import { audioService } from '../services/audioService';

export interface TabButtonProps {
  icon: ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

const TabButton = React.memo(({ icon, label, isActive, onClick }: TabButtonProps) => (
  <button
    onClick={() => {
      audioService.playClick();
      onClick();
    }}
    onMouseEnter={() => audioService.playHover()}
    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all relative overflow-hidden group rounded-t-md ${isActive ? 'text-primary border-b-2 border-primary bg-primary/5 shadow-[0_-2px_10px_rgba(13,185,242,0.1)]' : 'text-text-secondary hover:text-text-primary hover:bg-white/5'}`}
    role="tab"
    aria-selected={isActive}
  >
    <span className={`transition-transform duration-300 ${isActive ? 'scale-110 drop-shadow-md' : 'group-hover:scale-110'}`}>{icon}</span>
    <span className={isActive ? 'animate-pulse-slow font-bold tracking-wide' : ''}>{label}</span>
    {isActive && <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent animate-pulse-slow pointer-events-none" />}
  </button>
));

TabButton.displayName = 'TabButton';

export default TabButton;
