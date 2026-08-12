import React, { useState } from 'react';
import InfoIcon from './icons/InfoIcon';

interface TooltipProps {
  text: string;
  children?: React.ReactNode;
  className?: string;
}

const Tooltip = ({ text, children, className }: TooltipProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const trigger = children || (
    <span className="cursor-pointer text-text-secondary hover:text-accent focus:outline-none ml-1 p-1" aria-label="Más información">
      <InfoIcon className="h-4 w-4" />
    </span>
  );

  return (
    <div
      className={`relative inline-flex items-center ${className || ''}`}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      onFocus={() => setIsOpen(true)}
      onBlur={() => setIsOpen(false)}
    >
      {trigger}
      {isOpen && (
        <div
          role="tooltip"
          className="absolute z-30 max-w-xs p-3 text-sm font-normal text-text-primary bg-surface/90 backdrop-blur-sm rounded-lg shadow-xl border border-subtle/50 bottom-full left-1/2 -translate-x-1/2 mb-2 animate-fade-in"
        >
          {text}
        </div>
      )}
    </div>
  );
};

export default Tooltip;