

import DnaIcon from './DnaIcon';

interface HeaderProps {
  wordsAddedCount: number;
}

const Header = ({ wordsAddedCount }: HeaderProps) => {
  return (
    <header className="bg-surface p-4 shadow-md border-b border-subtle">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <DnaIcon className="h-8 w-8 text-accent" />
          <div>
            <h1 className="text-2xl font-bold text-gradient-lexxeia font-display">LEXXEIA</h1>
            <p className="text-sm text-text-secondary">Tu diccionario personal para la creación de idiomas</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-text-primary">Palabras añadidas sin guardar</p>
          <p className="text-2xl font-bold text-accent">{wordsAddedCount}</p>
        </div>
      </div>
    </header>
  );
};

export default Header;