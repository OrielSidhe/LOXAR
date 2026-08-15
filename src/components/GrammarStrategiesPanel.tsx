import React from 'react';
import type { LexiconEntry, SyntacticRole, MorphosyntacticStrategy, StrategyType } from '../types';
import InfoHint from './InfoHint';
import MultiSelectDropdown from './MultiSelectDropdown';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';
import { STRATEGY_TYPE_HELP } from '../data/markingStrategies';
import { displayOfStrategyType, displayOfAffixPosition, STRATEGY_TYPE_LABELS as TAX_STRATEGY_LABELS } from '../data/taxonomy';

export interface GrammarStrategiesPanelProps {
  strategies: MorphosyntacticStrategy[];
  roles: SyntacticRole[];
  lexicon: LexiconEntry[];
  onAddStrategy: () => void;
  onRemoveStrategy: (id: string) => void;
  onUpdateStrategy: (id: string, updates: Partial<MorphosyntacticStrategy>) => void;
}

const GrammarStrategiesPanel = ({
  strategies,
  roles,
  lexicon,
  onAddStrategy,
  onRemoveStrategy,
  onUpdateStrategy,
}: GrammarStrategiesPanelProps) => {
  const categoryOptions = Array.from(new Set(lexicon.map((e) => e.Categoría).filter(Boolean)));

  return (
    <div className="space-y-4">
      <div className="bg-background rounded-lg p-6 border border-border-dark">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">
            Estrategias Morfosintácticas
            <InfoHint text="Una estrategia es CÓMO tu idioma marca la relación entre palabras: ¿usa sufijos (posición), preposiciones sueltas, cambia el tono, o no marca nada? Aquí describes cada mecanismo. En el Árbol AST los nodos se colorean por rol y en el Canvas Sintáctico cada nodo muestra su rol; estas estrategias documentan el mecanismo asociado." />
          </h3>
          <button onClick={onAddStrategy} className="text-sm font-bold text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-lg border border-primary/30 transition-colors">
            + Añadir Estrategia
          </button>
        </div>
        <div className="space-y-4">
          {strategies.map((strategy) => (
            <div key={strategy.id} className="bg-surface rounded-lg p-4 space-y-3">
              <div className="flex gap-4 items-start">
                <input
                  type="text"
                  value={strategy.name}
                  onChange={(e) => onUpdateStrategy(strategy.id, { name: e.target.value })}
                  className="flex-1 bg-transparent border-b border-border-dark focus:border-primary outline-none text-white font-semibold"
                  placeholder="Nombre de la estrategia..."
                />
                <button onClick={() => onRemoveStrategy(strategy.id)} className="p-1 text-text-secondary hover:text-red-400 transition-colors">
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1 flex items-center">
                    Tipo
                    <InfoHint text={STRATEGY_TYPE_HELP[strategy.type] || 'Selecciona cómo se marca la relación gramatical.'} />
                  </label>
                  <select
                    value={strategy.type}
                    onChange={(e) => onUpdateStrategy(strategy.id, { type: e.target.value as StrategyType })}
                    className="w-full bg-background border border-border-dark rounded px-3 py-2 text-white text-sm focus:border-primary focus:outline-none"
                  >
                    {['position', 'affix', 'clitic', 'tone', 'mutation', 'particle', 'auxiliary'].map((t) => (
                      <option key={t} value={t}>
                        {displayOfStrategyType(t as StrategyType)}
                      </option>
                    ))}
                  </select>
                </div>
                <MultiSelectDropdown
                  label="Aplica a Roles"
                  options={roles.map((r) => ({ value: r.id, label: r.name }))}
                  selected={strategy.appliesTo}
                  onChange={(ids) => onUpdateStrategy(strategy.id, { appliesTo: ids })}
                  placeholder="Elige roles..."
                  emptyHint="Aún no hay roles definidos."
                />
              </div>
              <div className="md:col-span-2">
                <MultiSelectDropdown
                  label="Aplica a Categorías (del léxico)"
                  options={categoryOptions}
                  selected={strategy.appliesToCategories || []}
                  onChange={(cats) => onUpdateStrategy(strategy.id, { appliesToCategories: cats })}
                  placeholder="Elige categorías del léxico..."
                  emptyHint="Aún no hay categorías en el léxico."
                />
              </div>
              {strategy.type === 'affix' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">Posición</label>
                    <select
                      value={strategy.affixRule?.position || 'prefix'}
                      onChange={(e) =>
                        onUpdateStrategy(strategy.id, {
                          affixRule: {
                            ...strategy.affixRule,
                            position: e.target.value as any,
                            form: strategy.affixRule?.form || '',
                          },
                        })
                      }
                      className="w-full bg-background border border-border-dark rounded px-3 py-2 text-white text-sm focus:border-primary focus:outline-none"
                    >
                      {['prefix', 'suffix', 'infix', 'circumfix'].map((t) => (
                        <option key={t} value={t}>
                          {displayOfAffixPosition(t)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">Forma</label>
                    <input
                      type="text"
                      value={strategy.affixRule?.form || ''}
                      onChange={(e) =>
                        onUpdateStrategy(strategy.id, {
                          affixRule: {
                            ...strategy.affixRule,
                            position: strategy.affixRule?.position || 'prefix',
                            form: e.target.value,
                          },
                        })
                      }
                      className="w-full bg-background border border-border-dark rounded px-3 py-2 text-white text-sm focus:border-primary focus:outline-none"
                      placeholder="Ej: -s, un-..."
                    />
                  </div>
                </div>
              )}
              {strategy.notes && (
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">Notas</label>
                  <textarea
                    value={strategy.notes}
                    onChange={(e) => onUpdateStrategy(strategy.id, { notes: e.target.value })}
                    className="w-full bg-background border border-border-dark rounded px-3 py-2 text-white text-sm focus:border-primary focus:outline-none resize-none h-20"
                    placeholder="Notas adicionales..."
                  />
                </div>
              )}
            </div>
          ))}
          {strategies.length === 0 && (
            <div className="text-center text-text-secondary py-8 italic">
              No hay estrategias definidas. Añade estrategias para empezar.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

GrammarStrategiesPanel.displayName = 'GrammarStrategiesPanel';

export default GrammarStrategiesPanel;
