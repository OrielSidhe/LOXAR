import type { GrammarManifest, CategoryParadigm, MutationRule, InflectionSlot, SlotRealization } from '../types';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';

interface Props { manifest: GrammarManifest; onChange: (m: GrammarManifest) => void; }

const kindOptions: SlotRealization['kind'][] = ['affix', 'mutation', 'stem', 'particle', 'tone'];

const RuleEditor = ({ manifest, onChange }: Props) => {
  const update = (patch: Partial<GrammarManifest>) => onChange({ ...manifest, ...patch });
  const setParadigms = (paradigms: CategoryParadigm[]) => update({ paradigms });
  const setMutations = (mutationRules: MutationRule[]) => update({ mutationRules });

  const addSlot = (cat: string) => {
    const paras = manifest.paradigms.map(p => p.category === cat ? {
      ...p, slots: [...p.slots, { feature: 'nuevo', order: p.slots.length + 1,
        realization: { kind: 'affix' as const, position: 'suffix' as const, form: '-x' } }]
    } : p);
    setParadigms(paras);
  };

  return (
    <div className="space-y-4">
      <div className="bg-background rounded-lg p-6 border border-border-dark">
        <h3 className="text-lg font-bold text-white mb-3">Paradigmas de inflexión</h3>
        {manifest.paradigms.map(p => (
          <div key={p.category} className="mb-4">
            <div className="flex items-center justify-between">
              <span className="font-bold text-text-primary">{p.category}</span>
              <button onClick={() => addSlot(p.category)} className="text-xs text-primary">+ Ranura</button>
            </div>
            {p.slots.map((s, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 my-1">
                <input className="bg-surface border border-border-dark rounded px-2 py-1 text-white text-xs" value={s.feature}
                  onChange={e => { const slots = [...p.slots]; slots[i] = { ...s, feature: e.target.value }; setParadigms(manifest.paradigms.map(x => x.category === p.category ? { ...x, slots } : x)); }} />
                <select className="bg-surface border border-border-dark rounded px-2 py-1 text-white text-xs" value={s.realization.kind}
                  onChange={e => { const slots = [...p.slots]; slots[i] = { ...s, realization: { ...s.realization, kind: e.target.value as any } }; setParadigms(manifest.paradigms.map(x => x.category === p.category ? { ...x, slots } : x)); }}>
                  {kindOptions.map(k => <option key={k} value={k}>{k}</option>)}
                </select>
                <input className="bg-surface border border-border-dark rounded px-2 py-1 text-white text-xs" placeholder="forma (-t) / reglaId"
                  value={(s.realization as any).form ?? (s.realization as any).ruleId ?? (s.realization as any).replace ?? ''}
                  onChange={e => { const slots = [...p.slots]; const r = s.realization as any; if ('form' in r) r.form = e.target.value; if ('ruleId' in r) r.ruleId = e.target.value; if ('replace' in r) r.replace = e.target.value; slots[i] = { ...s, realization: r }; setParadigms(manifest.paradigms.map(x => x.category === p.category ? { ...x, slots } : x)); }} />
                <button onClick={() => { const slots = p.slots.filter((_, j) => j !== i); setParadigms(manifest.paradigms.map(x => x.category === p.category ? { ...x, slots } : x)); }} className="text-text-secondary hover:text-red-400"><TrashIcon className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        ))}
        <button onClick={() => setParadigms([...manifest.paradigms, { category: 'verbo', slots: [] }])}
          className="text-sm text-primary">+ Categoría</button>
      </div>

      <div className="bg-background rounded-lg p-6 border border-border-dark">
        <h3 className="text-lg font-bold text-white mb-3">Reglas de mutación / tono</h3>
        {manifest.mutationRules.map((m, i) => (
          <div key={m.id} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 my-1">
            <input className="bg-surface border border-border-dark rounded px-2 py-1 text-white text-xs" value={m.name} onChange={e => { const r = [...manifest.mutationRules]; r[i] = { ...m, name: e.target.value }; setMutations(r); }} />
            <input className="bg-surface border border-border-dark rounded px-2 py-1 text-white text-xs" placeholder="patrón (b)" value={m.pattern} onChange={e => { const r = [...manifest.mutationRules]; r[i] = { ...m, pattern: e.target.value }; setMutations(r); }} />
            <input className="bg-surface border border-border-dark rounded px-2 py-1 text-white text-xs" placeholder="reemplazo (v)" value={m.replacement} onChange={e => { const r = [...manifest.mutationRules]; r[i] = { ...m, replacement: e.target.value }; setMutations(r); }} />
            <button onClick={() => setMutations(manifest.mutationRules.filter((_, j) => j !== i))} className="text-text-secondary hover:text-red-400"><TrashIcon className="w-4 h-4" /></button>
          </div>
        ))}
        <button onClick={() => setMutations([...manifest.mutationRules, { id: `mr_${Date.now()}`, name: 'Nueva', pattern: '', replacement: '', scope: 'consonant' }])}
          className="text-sm text-primary">+ Regla</button>
      </div>
    </div>
  );
};
export default RuleEditor;
