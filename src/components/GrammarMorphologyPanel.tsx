import React from 'react';
import type { GrammarManifest, LexiconEntry, GrammarAffix } from '../types';
import InfoHint from './InfoHint';
import ExceptionEditor from './ExceptionEditor';
import RuleEditor from './RuleEditor';
import TrashIcon from './icons/TrashIcon';

export interface GrammarMorphologyPanelProps {
  manifest: GrammarManifest;
  lexicon: LexiconEntry[];
  lexiconAffixes: GrammarAffix[];
  onAddAffix: () => void;
  onRemoveAffix: (id: string) => void;
  onUpdateAffix: (id: string, updates: Partial<GrammarAffix>) => void;
  onUpdatePreview: (updates: { useLexiconAffixes?: boolean }) => void;
  onChange: (updates: Partial<GrammarManifest>) => void;
}

const GrammarMorphologyPanel = ({
  manifest,
  lexicon,
  lexiconAffixes,
  onAddAffix,
  onRemoveAffix,
  onUpdateAffix,
  onUpdatePreview,
  onChange,
}: GrammarMorphologyPanelProps) => {
  return (
    <div className="space-y-4">
      <div className="bg-background rounded-lg p-6 border border-border-dark space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">
            Morfología (Paradigmas y Afijos)
            <InfoHint text="Un paradigma de inflexión es la tabla de todas las formas de una palabra según tiempo, número y persona. Aquí defines cómo se construyen esas formas: con afijos (prefijos/sufijos), mutaciones o reglas de tono. Empieza por los paradigmas y deja los afijos sueltos para detalles." />
          </h3>
          <button onClick={onAddAffix} className="text-sm font-bold text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-lg border border-primary/30 transition-colors">
            + Añadir Afijo
          </button>
        </div>

        {manifest.ui?.showTone ? (
          <p className="text-xs text-accent/80 mb-3">
            Tu idioma usa tonos: puedes añadir reglas de mutación/tono para marcar el contraste de significado por entonación.
          </p>
        ) : (
          <p className="text-xs text-text-secondary mb-3">
            Tu perfil de lengua no usa tonos — puedes ignorar la parte de mutación/tono.
          </p>
        )}

        <label className="flex items-center gap-3 bg-surface rounded-lg p-3 border border-border-dark text-sm text-text-primary">
          <input
            type="checkbox"
            checked={manifest.preview?.useLexiconAffixes || false}
            onChange={(e) => onUpdatePreview({ useLexiconAffixes: e.target.checked })}
            className="accent-primary"
          />
          Usar también prefijos/sufijos/afijos encontrados en el léxico para el preview
          <span className="ml-auto text-xs text-text-secondary">{lexiconAffixes.length} detectados</span>
        </label>

        <div className="space-y-3">
          {(manifest.affixInventory || []).map((affix) => (
            <div key={affix.id} className="grid grid-cols-[auto_1fr_1fr_1fr_1fr_auto] gap-3 items-center bg-surface rounded-lg p-3 border border-border-dark">
              <input
                type="checkbox"
                checked={affix.enabled}
                onChange={(e) => onUpdateAffix(affix.id, { enabled: e.target.checked })}
                className="accent-primary"
                aria-label="Activar afijo"
              />
              <input
                value={affix.form}
                onChange={(e) => onUpdateAffix(affix.id, { form: e.target.value })}
                className="bg-background border border-border-dark rounded px-3 py-2 text-white text-sm focus:border-primary focus:outline-none"
                placeholder="-ka"
              />
              <select
                value={affix.type}
                onChange={(e) => onUpdateAffix(affix.id, { type: e.target.value as GrammarAffix['type'] })}
                className="bg-background border border-border-dark rounded px-3 py-2 text-white text-sm focus:border-primary focus:outline-none"
              >
                <option value="prefix">Prefijo</option>
                <option value="suffix">Sufijo</option>
                <option value="infix">Infijo</option>
              </select>
              <input
                value={affix.meaning}
                onChange={(e) => onUpdateAffix(affix.id, { meaning: e.target.value })}
                className="bg-background border border-border-dark rounded px-3 py-2 text-white text-sm focus:border-primary focus:outline-none"
                placeholder="plural, pasado..."
              />
              <input
                value={affix.appliesTo.join(', ')}
                onChange={(e) => onUpdateAffix(affix.id, { appliesTo: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                className="bg-background border border-border-dark rounded px-3 py-2 text-white text-sm focus:border-primary focus:outline-none"
                placeholder="sustantivo, verbo"
              />
              <button onClick={() => onRemoveAffix(affix.id)} className="p-2 text-text-secondary hover:text-red-400 transition-colors" aria-label="Eliminar afijo">
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          ))}
          {(manifest.affixInventory || []).length === 0 && (
            <div className="text-center text-text-secondary py-8 border border-dashed border-border-dark rounded-lg">
              No hay afijos manuales. Puedes añadirlos aquí o activar los detectados desde el léxico.
            </div>
          )}
        </div>

        {manifest.preview?.useLexiconAffixes && lexiconAffixes.length > 0 && (
          <div className="bg-surface rounded-lg p-4 border border-border-dark">
            <h4 className="text-sm font-bold text-text-secondary uppercase mb-3">Afijos detectados del léxico</h4>
            <div className="flex flex-wrap gap-2">
              {lexiconAffixes.map((affix) => (
                <span key={affix.id} className="px-2 py-1 rounded bg-background border border-border-dark text-xs text-text-primary">
                  {affix.form} - {affix.meaning}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 mt-2">
        <h3 className="text-lg font-bold text-white">Excepciones</h3>
        <InfoHint text="Las excepciones son formas irregulares que no siguen la regla general (como el verbo 'ir' en español, o 'ser/estar'). Aquí registras las formas supletivas que el motor aplica antes que las reglas normales." />
      </div>

      <ExceptionEditor
        lexicon={lexicon}
        grammarExceptions={manifest.exceptions}
        onGrammarExceptionsChange={(e) => onChange({ exceptions: e })}
      />

      <RuleEditor manifest={manifest} onChange={onChange} />
    </div>
  );
};

GrammarMorphologyPanel.displayName = 'GrammarMorphologyPanel';

export default GrammarMorphologyPanel;
