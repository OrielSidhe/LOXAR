import React from 'react';
import WidgetIcon from './icons/WidgetIcon';
import InfoIcon from './icons/InfoIcon';

interface HeaderProps {
  wordsAddedCount: number;
  onOpenWidget: () => void;
  onShowTour?: () => void;
}

const Header = ({ wordsAddedCount, onOpenWidget, onShowTour }: HeaderProps) => {
  return (
    <header className="bg-surface p-4 shadow-md border-b border-subtle">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="hidden sm:block">
            <h1 className="text-2xl font-bold text-text-primary">Conlang Lexicon Manager</h1>
            <p className="text-sm text-text-secondary">Tu diccionario personal para la creación de idiomas</p>
          </div>
          <div className="sm:hidden">
            <h1 className="text-xl font-bold text-text-primary">CLM</h1>
          </div>
        </div>

        <div className="flex items-center gap-6">
            <button
                id="btn-open-widget"
                onClick={onOpenWidget}
                className="flex items-center gap-2 px-3 py-2 bg-accent/10 text-accent rounded-md hover:bg-accent/20 transition-all font-bold text-sm border border-accent/20"
                title="Abrir Widget Flotante"
            >
                <WidgetIcon className="h-5 w-5" />
                <span className="hidden md:inline">Widget</span>
            </button>

            <div className="text-right flex items-center gap-4">
                <div className="animate-fade-in" key={wordsAddedCount}>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-text-secondary">Pendientes</p>
                    <p className="text-xl font-bold text-accent">{wordsAddedCount}</p>
                </div>
                <button
                    onClick={onShowTour}
                    className="p-1.5 text-text-secondary hover:text-accent transition-colors"
                    title="Tour Guiado"
                >
                    <InfoIcon className="h-5 w-5" />
                </button>
            </div>
        </div>
      </div>
    </header>
  );
};

export default Header;