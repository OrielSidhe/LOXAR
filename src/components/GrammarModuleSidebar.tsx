import React from 'react';

export interface GrammarModuleSidebarProps {
  activeModule: 'overview' | 'phonology' | 'typology' | 'morphology' | 'syntax' | 'semantics' | 'roles' | 'strategies' | 'pragmatic' | 'notes';
  onSelectModule: (module: 'overview' | 'phonology' | 'typology' | 'morphology' | 'syntax' | 'semantics' | 'roles' | 'strategies' | 'pragmatic' | 'notes') => void;
}

const GrammarModuleSidebar = ({ activeModule, onSelectModule }: GrammarModuleSidebarProps) => {
    const modules = [
        { id: 'syntax' as const, label: 'Sintaxis', icon: '🔗' },
        { id: 'overview' as const, label: 'Resumen', icon: '📊' },
        { id: 'phonology' as const, label: 'Fonología', icon: '🔊' },
        { id: 'typology' as const, label: 'Tipología', icon: '🏛️' },
        { id: 'morphology' as const, label: 'Morfología', icon: '🧩' },
        { id: 'semantics' as const, label: 'Semántica', icon: '💭' },
        { id: 'roles' as const, label: 'Roles', icon: '👥' },
        { id: 'strategies' as const, label: 'Estrategias', icon: '⚡' },
        { id: 'pragmatic' as const, label: 'Pragmática', icon: '🧭' },
        { id: 'notes' as const, label: 'Notas', icon: '📝' }
    ];

    return (
        <div className="w-64 bg-[#0a0a0c] border-r border-border-dark flex flex-col p-4 shrink-0">
            <h2 className="text-lg font-bold text-white mb-4 font-display">Gramática</h2>
            <nav className="space-y-1">
                {modules.map(module => (
                    <button
                        key={module.id}
                        onClick={() => onSelectModule(module.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${activeModule === module.id ? 'bg-primary/20 text-white border border-primary/30' : 'text-text-secondary hover:bg-white/5'}`}
                    >
                        <span className="text-lg">{module.icon}</span>
                        {module.label}
                    </button>
                ))}
            </nav>
        </div>
    );
};

GrammarModuleSidebar.displayName = 'GrammarModuleSidebar';

export default GrammarModuleSidebar;
