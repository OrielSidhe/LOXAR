/**
 * ModulePalette.tsx
 * ════════════════
 * Paleta flotante vertical de módulos arrastrables para el GraphCanvas.
 *
 * El usuario arrastra un módulo (Gramática, Sintaxis, Léxico, Fonología...)
 * y lo suelta sobre el canvas para instanciar un nuevo nodo.
 *
 * Usa la HTML5 Drag API (onDragStart → dataTransfer) para comunicar
 * el tipo de nodo al drop handler del canvas.
 */

import React from 'react';

export type ModuleNodeType = 'grammar' | 'syntax' | 'lexicon' | 'phonology' | 'morphology' | 'semantics' | 'neography' | 'translator';

interface PaletteItem {
  type: ModuleNodeType;
  label: string;
  shortLabel: string;
  icon: string;
  description: string;
  color: string; // tailwind border color class
}

const PALETTE_ITEMS: PaletteItem[] = [
  { type: 'grammar',    label: 'Gramática',  shortLabel: 'G', icon: '📐', description: 'Motor gramatical y reglas', color: 'border-cyan-400/60' },
  { type: 'syntax',     label: 'Sintaxis',   shortLabel: 'S', icon: '🧩', description: 'Estructura oracional',       color: 'border-cyan-400/60' },
  { type: 'lexicon',    label: 'Léxico',     shortLabel: 'L', icon: '📚', description: 'Diccionario y raíces',       color: 'border-purple-400/60' },
  { type: 'phonology',  label: 'Fonología',  shortLabel: 'P', icon: '🔊', description: 'Inventario fonético',       color: 'border-violet-400/60' },
  { type: 'morphology', label: 'Morfología', shortLabel: 'M', icon: '🔧', description: 'Afijos y reglas de formación', color: 'border-violet-400/60' },
  { type: 'semantics',  label: 'Semántica',  shortLabel: 'M', icon: '💡', description: 'Campos semánticos',          color: 'border-cyan-400/60' },
  { type: 'neography',  label: 'Neografía',  shortLabel: 'O', icon: '✍️', description: 'Sistema de escritura',       color: 'border-cyan-400/60' },
  { type: 'translator', label: 'Traductor',  shortLabel: 'T', icon: '🔁', description: 'Traducción y corpus',        color: 'border-purple-400/60' },
];

interface ModulePaletteProps {
  /** Callback cuando se inicia un drag (para feedback visual opcional) */
  onDragStart?: (type: ModuleNodeType) => void;
  /** Callback cuando termina el drag */
  onDragEnd?: () => void;
}

const ModulePalette: React.FC<ModulePaletteProps> = ({ onDragStart, onDragEnd }) => {
  const handleDragStart = (e: React.DragEvent, item: PaletteItem) => {
    // Pasar el tipo de nodo vía dataTransfer
    e.dataTransfer.setData('application/loxar-module', item.type);
    e.dataTransfer.effectAllowed = 'copy';
    onDragStart?.(item.type);
  };

  return (
    <div className="absolute left-4 top-16 z-20 flex flex-col items-center pointer-events-auto">
      <div className="bg-surface-dark/90 backdrop-blur-md border border-white/10 rounded-xl p-2 shadow-2xl flex flex-col items-center gap-2 w-16">
        <div className="text-[8px] font-mono uppercase tracking-widest text-white/40 text-center font-bold px-1 border-b border-white/10 pb-1.5 w-full">
          Módulos
        </div>

        {PALETTE_ITEMS.map((item) => (
          <div key={item.type} className="group relative flex items-center justify-center">
            <button
              draggable
              onDragStart={(e) => handleDragStart(e, item)}
              onDragEnd={() => onDragEnd?.()}
              className={`w-11 h-11 rounded-lg bg-white/5 border-2 ${item.color} hover:bg-white/10 text-white font-mono font-black text-lg flex items-center justify-center hover:scale-105 transition-all cursor-grab active:cursor-grabbing select-none`}
              title={item.label}
            >
              {item.shortLabel}
            </button>
            {/* Tooltip on hover */}
            <div className="absolute left-14 ml-2 hidden group-hover:flex flex-col bg-surface border border-cyan-400/40 text-[10px] font-mono px-2.5 py-1.5 rounded-lg shadow-xl whitespace-nowrap z-30 pointer-events-none">
              <span className="text-white font-bold">[{item.shortLabel}] {item.label}</span>
              <span className="text-white/40 text-[9px]">{item.description}</span>
            </div>
          </div>
        ))}

        {/* Add custom module */}
        <div className="pt-1 w-full border-t border-white/10 flex justify-center">
          <button
            className="w-9 h-7 rounded border border-dashed border-white/20 hover:border-cyan-400/60 text-white/40 hover:text-white flex items-center justify-center text-xs transition-colors"
            title="Nuevo módulo personalizado"
          >
            +
          </button>
        </div>
      </div>

      {/* Instructional callout */}
      <div className="mt-2 bg-surface-dark/80 border border-cyan-400/30 px-2 py-1 rounded-lg shadow-lg max-w-[140px] text-center pointer-events-none">
        <p className="text-[9px] font-mono text-cyan-300/80 leading-tight">
          Arrastrá un módulo al canvas para agregarlo
        </p>
      </div>
    </div>
  );
};

export default ModulePalette;
