import { useState } from 'react';
import type { LexiconEntry, GrammarException } from '../types';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';

interface Props {
  lexicon: LexiconEntry[];
  grammarExceptions: GrammarException[];
  onGrammarExceptionsChange: (e: GrammarException[]) => void;
}

const ExceptionEditor = ({ lexicon, grammarExceptions, onGrammarExceptionsChange }: Props) => {
  const [expId, setExpId] = useState('');
  const [featureKey, setFeatureKey] = useState('');
  const [surfaceForm, setSurfaceForm] = useState('');

  const addEntryException = (entryId: string) => {
    if (!featureKey || !surfaceForm) return;
    // mutate the lexicon entry's exceptions via a custom event the parent handles
    window.dispatchEvent(new CustomEvent('loxar:addLexicalException', { detail: { entryId, featureKey, surfaceForm } }));
  };

  const addGrammarException = () => {
    if (!expId) return;
    onGrammarExceptionsChange([...grammarExceptions, {
      id: `ge_${Date.now()}`, ruleDescription: expId, exceptionPattern: featureKey,
      context: surfaceForm, example: '', createdAt: new Date().toISOString(),
    }]);
    setExpId(''); setFeatureKey(''); setSurfaceForm('');
  };

  return (
    <div className="space-y-4">
      <div className="bg-background rounded-lg p-6 border border-border-dark">
        <h3 className="text-lg font-bold text-white mb-2">Excepciones léxicas (irregulares tipo ser/estar)</h3>
        <p className="text-xs text-text-secondary mb-3">Elige una entrada y define una forma supletiva por rasgo (p.ej. rasgo <code>tense=past</code> → <code>fui</code>). El motor la usa antes que las reglas.</p>
        <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end">
          <select className="bg-surface border border-border-dark rounded px-2 py-1 text-white text-sm" defaultValue=""
            onChange={e => setExpId(e.target.value)}>
            <option value="">Entrada...</option>
            {lexicon.map(l => <option key={l.ID} value={l.ID}>{l.Léxema?.[0] || l.Raíz}</option>)}
          </select>
          <input className="bg-surface border border-border-dark rounded px-2 py-1 text-white text-sm" placeholder="rasgo (tense=past)"
            value={featureKey} onChange={e => setFeatureKey(e.target.value)} />
          <input className="bg-surface border border-border-dark rounded px-2 py-1 text-white text-sm" placeholder="forma (fui)"
            value={surfaceForm} onChange={e => setSurfaceForm(e.target.value)} />
          <button onClick={() => expId && addEntryException(expId)}
            className="px-3 py-1 bg-primary text-white rounded text-sm">+ Irregular</button>
        </div>
      </div>

      <div className="bg-background rounded-lg p-6 border border-border-dark">
        <h3 className="text-lg font-bold text-white mb-2">Registro de excepciones documentadas</h3>
        {grammarExceptions.map(ge => (
          <div key={ge.id} className="flex items-center gap-2 text-sm text-text-primary py-1">
            <span className="font-bold">{ge.ruleDescription}</span>
            <span className="text-text-secondary">→ {ge.context}</span>
            <button onClick={() => onGrammarExceptionsChange(grammarExceptions.filter(x => x.id !== ge.id))}
              className="ml-auto text-text-secondary hover:text-red-400"><TrashIcon className="w-4 h-4" /></button>
          </div>
        ))}
        <div className="flex gap-2 mt-2">
          <input className="flex-1 bg-surface border border-border-dark rounded px-2 py-1 text-white text-sm" placeholder="Nueva excepción documentada"
            value={expId} onChange={e => setExpId(e.target.value)} />
          <button onClick={addGrammarException} className="px-3 py-1 bg-primary/10 text-primary rounded text-sm">+ Añadir</button>
        </div>
      </div>
    </div>
  );
};
export default ExceptionEditor;
