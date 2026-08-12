
import { useState, useEffect } from 'react';
import { GrammarManifest, SyntacticRole, MorphosyntacticStrategy, StrategyType, LexiconEntry } from '../types';
import XCircleIcon from './icons/XCircleIcon';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';
import SaveIcon from './icons/SaveIcon';
import MultiSelectDropdown from './MultiSelectDropdown';
import InfoHint from './InfoHint';
import { STRATEGY_TYPE_HELP } from '../data/markingStrategies';
import { displayOfStrategyType, displayOfAffixPosition, TIPOLOGY_VALUES } from '../data/taxonomy';

interface GrammarManagerModalProps {
    manifest: GrammarManifest;
    onSave: (newManifest: GrammarManifest) => void;
    onClose: () => void;
    lexicon?: LexiconEntry[];
}

const GrammarManagerModal = ({ manifest, onSave, onClose, lexicon = [] }: GrammarManagerModalProps) => {
    const [activeTab, setActiveTab] = useState<'phonology' | 'typology' | 'strategies' | 'roles' | 'notes'>('typology');
    const [editedManifest, setEditedManifest] = useState<GrammarManifest>(JSON.parse(JSON.stringify(manifest)));

    useEffect(() => {
        setEditedManifest(JSON.parse(JSON.stringify(manifest)));
    }, [manifest]);

    const handleSave = () => {
        onSave({
            ...editedManifest,
            meta: {
                ...editedManifest.meta,
                lastUpdated: new Date().toISOString()
            }
        });
        onClose();
    };

    const updateTypology = (field: keyof GrammarManifest['typology'], value: string) => {
        setEditedManifest(prev => ({
            ...prev,
            typology: { ...prev.typology, [field]: value }
        }));
    };

    const addRole = () => {
        const newRole: SyntacticRole = { id: `role_${Date.now()}`, name: 'Nuevo Rol' };
        setEditedManifest(prev => ({ ...prev, roles: [...prev.roles, newRole] }));
    };

    const removeRole = (id: string) => {
        setEditedManifest(prev => ({ ...prev, roles: prev.roles.filter(r => r.id !== id) }));
    };

    const updateRole = (id: string, field: keyof SyntacticRole, value: string) => {
        setEditedManifest(prev => ({
            ...prev,
            roles: prev.roles.map(r => r.id === id ? { ...r, [field]: value } : r)
        }));
    };

    const addStrategy = () => {
        const newStrat: MorphosyntacticStrategy = {
            id: `strat_${Date.now()}`,
            name: 'Nueva Estrategia',
            type: 'position',
            appliesTo: []
        };
        setEditedManifest(prev => ({ ...prev, strategies: [...prev.strategies, newStrat] }));
    };

    const removeStrategy = (id: string) => {
        setEditedManifest(prev => ({ ...prev, strategies: prev.strategies.filter(s => s.id !== id) }));
    };

    const updateStrategy = (id: string, updates: Partial<MorphosyntacticStrategy>) => {
        setEditedManifest(prev => ({
            ...prev,
            strategies: prev.strategies.map(s => s.id === id ? { ...s, ...updates } : s)
        }));
    };

    return (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-surface rounded-lg shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col border border-subtle">
                <header className="p-4 flex justify-between items-center border-b border-subtle flex-shrink-0">
                    <div>
                        <h2 className="text-2xl font-bold text-text-primary">Editor de Gramática</h2>
                        <p className="text-sm text-text-secondary">Define las reglas morfosintácticas de tu idioma.</p>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-full text-text-secondary hover:bg-subtle transition-colors">
                        <XCircleIcon className="h-7 w-7" />
                    </button>
                </header>

                <div className="flex border-b border-subtle bg-background/50 overflow-x-auto no-scrollbar">
                    {[
                        { id: 'phonology', label: 'Fonología' },
                        { id: 'typology', label: 'Tipología' },
                        { id: 'strategies', label: 'Estrategias' },
                        { id: 'roles', label: 'Roles' },
                        { id: 'notes', label: 'Notas' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`px-6 py-3 font-bold text-[10px] uppercase tracking-widest whitespace-nowrap transition-all ${activeTab === tab.id ? 'border-b-2 border-accent text-accent bg-surface shadow-inner' : 'text-text-secondary hover:text-text-primary hover:bg-subtle/20'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <main className="p-6 flex-grow overflow-y-auto custom-scrollbar bg-background/20">
                    {activeTab === 'phonology' && (
                        <div className="space-y-8 animate-fade-in">
                            <section>
                                <h3 className="text-sm font-black text-accent uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                    <div className="w-1.5 h-4 bg-accent rounded-full"></div>
                                    Inventario Fonético
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-bold text-text-secondary uppercase">Consonantes (IPA/Fónico)</label>
                                        <textarea
                                            value={editedManifest.phonology?.inventory.consonants.join(' ') || ''}
                                            onChange={e => setEditedManifest(prev => ({
                                                ...prev,
                                                phonology: {
                                                    inventory: { ...(prev.phonology?.inventory || { vowels: [] }), consonants: e.target.value.split(/\s+/) },
                                                    phonotactics: prev.phonology?.phonotactics || { syllableStructures: ['CV'], maxConsonantClusters: 2 }
                                                }
                                            }))}
                                            placeholder="p b t d k g m n..."
                                            className="w-full bg-surface border border-subtle rounded p-3 text-text-primary font-mono text-sm min-h-[100px] focus:ring-1 focus:ring-accent outline-none shadow-inner"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-bold text-text-secondary uppercase">Vocales</label>
                                        <textarea
                                            value={editedManifest.phonology?.inventory.vowels.join(' ') || ''}
                                            onChange={e => setEditedManifest(prev => ({
                                                ...prev,
                                                phonology: {
                                                    inventory: { ...(prev.phonology?.inventory || { consonants: [] }), vowels: e.target.value.split(/\s+/) },
                                                    phonotactics: prev.phonology?.phonotactics || { syllableStructures: ['CV'], maxConsonantClusters: 2 }
                                                }
                                            }))}
                                            placeholder="a e i o u..."
                                            className="w-full bg-surface border border-subtle rounded p-3 text-text-primary font-mono text-sm min-h-[100px] focus:ring-1 focus:ring-accent outline-none shadow-inner"
                                        />
                                    </div>
                                </div>
                            </section>

                            <section>
                                <h3 className="text-sm font-black text-accent uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                    <div className="w-1.5 h-4 bg-accent rounded-full"></div>
                                    Fonotáctica
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-bold text-text-secondary uppercase">Estructura Silábica</label>
                                        <input
                                            value={editedManifest.phonology?.phonotactics.syllableStructures?.join(', ') || ''}
                                            onChange={e => setEditedManifest(prev => ({
                                                ...prev,
                                                phonology: {
                                                    inventory: prev.phonology?.inventory || { consonants: [], vowels: [] },
                                                    phonotactics: { ...(prev.phonology?.phonotactics || { maxConsonantClusters: 2 }), syllableStructures: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }
                                                }
                                            }))}
                                            placeholder="CV, CVC, (C)V(C)"
                                            className="w-full bg-surface border border-subtle rounded px-3 py-2 text-text-primary font-bold focus:ring-1 focus:ring-accent outline-none"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-bold text-text-secondary uppercase">Máx. Clusters Consonánticos</label>
                                        <input
                                            type="number"
                                            value={editedManifest.phonology?.phonotactics.maxConsonantClusters || 0}
                                            onChange={e => setEditedManifest(prev => ({
                                                ...prev,
                                                phonology: {
                                                    inventory: prev.phonology?.inventory || { consonants: [], vowels: [] },
                                                    phonotactics: { ...(prev.phonology?.phonotactics || { syllableStructures: ['CV'] }), maxConsonantClusters: parseInt(e.target.value) || 0 }
                                                }
                                            }))}
                                            className="w-full bg-surface border border-subtle rounded px-3 py-2 text-text-primary font-bold focus:ring-1 focus:ring-accent outline-none"
                                        />
                                    </div>
                                </div>
                            </section>
                        </div>
                    )}
                    {activeTab === 'typology' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-text-secondary uppercase tracking-widest">Orden de Palabras</label>
                                <select
                                    value={editedManifest.typology.wordOrder}
                                    onChange={e => updateTypology('wordOrder', e.target.value)}
                                    className="w-full bg-surface border border-subtle rounded px-3 py-2 text-text-primary font-bold focus:ring-1 focus:ring-accent outline-none cursor-pointer"
                                >
                                    {TIPOLOGY_VALUES.wordOrder.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-text-secondary uppercase tracking-widest">Alineamiento Morfosintáctico</label>
                                <select
                                    value={editedManifest.typology.alignment}
                                    onChange={e => updateTypology('alignment', e.target.value)}
                                    className="w-full bg-surface border border-subtle rounded px-3 py-2 text-text-primary font-bold focus:ring-1 focus:ring-accent outline-none cursor-pointer"
                                >
                                    {TIPOLOGY_VALUES.alignment.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-text-secondary uppercase tracking-widest">Grado de Morfología</label>
                                <select
                                    value={editedManifest.typology.morphology}
                                    onChange={e => updateTypology('morphology', e.target.value)}
                                    className="w-full bg-surface border border-subtle rounded px-3 py-2 text-text-primary font-bold focus:ring-1 focus:ring-accent outline-none cursor-pointer"
                                >
                                    {TIPOLOGY_VALUES.morphology.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-text-secondary uppercase tracking-widest">Direccionalidad (Núcleo)</label>
                                <select
                                    value={editedManifest.typology.headDirection}
                                    onChange={e => updateTypology('headDirection', e.target.value)}
                                    className="w-full bg-surface border border-subtle rounded px-3 py-2 text-text-primary font-bold focus:ring-1 focus:ring-accent outline-none cursor-pointer"
                                >
                                    {TIPOLOGY_VALUES.headDirection.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
                                </select>
                            </div>
                        </div>
                    )}

                    {activeTab === 'roles' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-accent">Roles Sintácticos</h3>
                                <button onClick={addRole} className="flex items-center gap-2 px-3 py-1.5 bg-accent/20 text-accent rounded hover:bg-accent/30 transition-colors text-sm font-bold">
                                    <PlusIcon className="h-4 w-4" /> Añadir Rol
                                </button>
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                                {editedManifest.roles.map(role => (
                                    <div key={role.id} className="p-4 border border-subtle rounded-lg bg-surface flex flex-col gap-3 group relative">
                                        <button
                                            onClick={() => removeRole(role.id)}
                                            className="absolute top-2 right-2 p-1 text-danger opacity-0 group-hover:opacity-100 transition-opacity hover:bg-danger/10 rounded"
                                        >
                                            <TrashIcon className="h-4 w-4" />
                                        </button>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">ID (Interno)</label>
                                                <input
                                                    value={role.id}
                                                    onChange={e => updateRole(role.id, 'id', e.target.value)}
                                                    className="w-full bg-background border border-subtle rounded px-2 py-1 text-sm font-mono"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Nombre</label>
                                                <input
                                                    value={role.name}
                                                    onChange={e => updateRole(role.id, 'name', e.target.value)}
                                                    className="w-full bg-background border border-subtle rounded px-2 py-1 text-sm"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Descripción / Marcación</label>
                                            <textarea
                                                value={role.description || ''}
                                                onChange={e => updateRole(role.id, 'description', e.target.value)}
                                                className="w-full bg-background border border-subtle rounded px-2 py-1 text-sm resize-none focus:ring-1 focus:ring-accent outline-none"
                                                rows={2}
                                                placeholder="Ej: Marcado con sufijo -wa..."
                                            />
                                        </div>
                                    </div>
                                ))}
                                {editedManifest.roles.length === 0 && <p className="text-text-secondary italic text-center py-8 bg-background/30 rounded-lg">No hay roles definidos.</p>}
                            </div>
                        </div>
                    )}

                    {activeTab === 'strategies' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-accent">Estrategias Morfosintácticas</h3>
                                <button onClick={addStrategy} className="flex items-center gap-2 px-3 py-1.5 bg-accent/20 text-accent rounded hover:bg-accent/30 transition-colors text-sm font-bold">
                                    <PlusIcon className="h-4 w-4" /> Añadir Estrategia
                                </button>
                            </div>
                            <div className="space-y-4">
                                {editedManifest.strategies.map(strat => (
                                    <div key={strat.id} className="p-4 border border-subtle rounded-lg bg-surface flex flex-col gap-4 group relative">
                                        <button
                                            onClick={() => removeStrategy(strat.id)}
                                            className="absolute top-2 right-2 p-1 text-danger opacity-0 group-hover:opacity-100 transition-opacity hover:bg-danger/10 rounded"
                                        >
                                            <TrashIcon className="h-4 w-4" />
                                        </button>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Nombre</label>
                                                <input
                                                    value={strat.name}
                                                    onChange={e => updateStrategy(strat.id, { name: e.target.value })}
                                                    className="w-full bg-background border border-subtle rounded px-2 py-1 text-sm font-bold"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest flex items-center gap-1">
                                                    Tipo
                                                    <InfoHint text={STRATEGY_TYPE_HELP[strat.type] || 'Selecciona cómo se marca la relación gramatical.'} />
                                                </label>
<select
  value={strat.type}
  onChange={e => updateStrategy(strat.id, { type: e.target.value as StrategyType })}
  className="w-full bg-background border border-subtle rounded px-2 py-1 text-sm"
>
  {['position', 'affix', 'clitic', 'tone', 'mutation', 'particle', 'auxiliary'].map(t => {
    return <option key={t} value={t}>{displayOfStrategyType(t as StrategyType)}</option>;
  })}
</select>
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest flex items-center gap-1">
                                                Roles a los que aplica
                                                <InfoHint text="Elige qué roles afecta esta estrategia. Vacío = ninguno (no 'todos'). Pulsa cada rol para activarlo/desactivarlo, igual que las categorías del léxico." />
                                            </label>
                                            <div className="flex flex-wrap gap-2 p-2 bg-background/50 border border-subtle rounded min-h-[40px]">
                                                {editedManifest.roles.map(role => (
                                                    <button
                                                        key={role.id}
                                                        type="button"
                                                        onClick={() => {
                                                            const roles = (strat.appliesTo || []).includes(role.id)
                                                                ? strat.appliesTo.filter(id => id !== role.id)
                                                                : [...(strat.appliesTo || []), role.id];
                                                            updateStrategy(strat.id, { appliesTo: roles });
                                                        }}
                                                        className={`px-2 py-1 rounded text-xs transition-colors border ${(strat.appliesTo || []).includes(role.id) ? 'bg-accent border-accent text-white' : 'bg-surface border-subtle text-text-secondary hover:border-accent'}`}
                                                    >
                                                        {role.name}
                                                    </button>
                                                ))}
                                                {editedManifest.roles.length === 0 && <span className="text-xs text-text-secondary italic">Define roles primero para seleccionarlos.</span>}
                                            </div>
                                        </div>

                                        <div className="mt-3">
                                            <MultiSelectDropdown
                                                label="Aplica a Categorías (del léxico)"
                                                options={Array.from(new Set(lexicon.map(e => e.Categoría).filter(Boolean)))}
                                                selected={strat.appliesToCategories || []}
                                                onChange={cats => updateStrategy(strat.id, { appliesToCategories: cats })}
                                                placeholder="Elige categorías del léxico..."
                                                emptyHint="Aún no hay categorías en el léxico."
                                            />
                                        </div>

                                        {strat.type === 'affix' && (
                                            <div className="p-3 bg-background/40 rounded border border-subtle/50 grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Posición</label>
                                                <select
                                                    value={strat.affixRule?.position || 'suffix'}
                                                    onChange={e => updateStrategy(strat.id, { affixRule: { ...(strat.affixRule || { form: '' }), position: e.target.value as any } })}
                                                    className="w-full bg-background border border-subtle rounded px-2 py-1 text-sm"
                                                >
                                                    {['prefix', 'suffix', 'infix', 'circumfix'].map(t => {
                                                        return <option key={t} value={t}>{displayOfAffixPosition(t)}</option>;
                                                    })}
                                                </select>
                                            </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Forma (ej: -o, na-)</label>
                                                    <input
                                                        value={strat.affixRule?.form || ''}
                                                        onChange={e => updateStrategy(strat.id, { affixRule: { ...(strat.affixRule || { position: 'suffix' }), form: e.target.value } })}
                                                        className="w-full bg-background border border-subtle rounded px-2 py-1 text-sm font-mono"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {strat.type === 'particle' && (
                                            <div className="p-3 bg-background/40 rounded border border-subtle/50 grid grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Partícula (forma)</label>
                                                    <input
                                                        value={strat.particleRule?.marker || ''}
                                                        onChange={e => updateStrategy(strat.id, { particleRule: { ...(strat.particleRule || { relativePosition: 'before' }), marker: e.target.value } })}
                                                        placeholder="Ej: ka, la, no..."
                                                        className="w-full bg-background border border-subtle rounded px-2 py-1 text-sm font-mono"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Posición relativa</label>
                                                    <select
                                                        value={strat.particleRule?.relativePosition || 'before'}
                                                        onChange={e => updateStrategy(strat.id, { particleRule: { ...(strat.particleRule || { marker: '' }), relativePosition: e.target.value as 'before' | 'after' } })}
                                                        className="w-full bg-background border border-subtle rounded px-2 py-1 text-sm"
                                                    >
                                                        <option value="before">Antes del verbo</option>
                                                        <option value="after">Después del verbo</option>
                                                    </select>
                                                </div>
                                            </div>
                                        )}

                                        {strat.type === 'clitic' && (
                                            <div className="p-3 bg-background/40 rounded border border-subtle/50 grid grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Forma del clítico</label>
                                                    <input
                                                        value={strat.cliticRule?.form || ''}
                                                        onChange={e => updateStrategy(strat.id, { cliticRule: { ...(strat.cliticRule || { hostPosition: 'enclitic' }), form: e.target.value } })}
                                                        placeholder="Ej: -ra, =ya..."
                                                        className="w-full bg-background border border-subtle rounded px-2 py-1 text-sm font-mono"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Posición en el anfitrión</label>
                                                    <select
                                                        value={strat.cliticRule?.hostPosition || 'enclitic'}
                                                        onChange={e => updateStrategy(strat.id, { cliticRule: { ...(strat.cliticRule || { form: '' }), hostPosition: e.target.value as 'proclitic' | 'enclitic' | 'mesoclitic' } })}
                                                        className="w-full bg-background border border-subtle rounded px-2 py-1 text-sm"
                                                    >
                                                        <option value="proclitic">Próclitico (antes: "ya-wal")</option>
                                                        <option value="enclitic">Enclítico (después: "wal=ra")</option>
                                                        <option value="mesoclitic">Mesoclítico (dentro: "wal=ra=n")</option>
                                                    </select>
                                                </div>
                                            </div>
                                        )}

                                        {strat.type === 'auxiliary' && (
                                            <div className="p-3 bg-background/40 rounded border border-subtle/50 grid grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Forma del auxiliar</label>
                                                    <input
                                                        value={strat.auxiliaryRule?.auxiliaryForm || ''}
                                                        onChange={e => updateStrategy(strat.id, { auxiliaryRule: { ...(strat.auxiliaryRule || { order: 'aux_before', mainVerbForm: '' }), auxiliaryForm: e.target.value } })}
                                                        placeholder="Ej:菩, ha-, bi-..."
                                                        className="w-full bg-background border border-subtle rounded px-2 py-1 text-sm font-mono"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Orden + forma del verbo principal</label>
                                                    <select
                                                        value={strat.auxiliaryRule?.order || 'aux_before'}
                                                        onChange={e => updateStrategy(strat.id, { auxiliaryRule: { ...(strat.auxiliaryRule || { auxiliaryForm: '', mainVerbForm: '' }), order: e.target.value as 'aux_before' | 'aux_after' } })}
                                                        className="w-full bg-background border border-subtle rounded px-2 py-1 text-sm"
                                                    >
                                                        <option value="aux_before">Auxiliar + Verbo (inglesa)</option>
                                                        <option value="aux_after">Verbo + Auxiliar (francesa)</option>
                                                    </select>
                                                    <input
                                                        value={strat.auxiliaryRule?.mainVerbForm || ''}
                                                        onChange={e => updateStrategy(strat.id, { auxiliaryRule: { ...(strat.auxiliaryRule || { auxiliaryForm: '', order: 'aux_before' }), mainVerbForm: e.target.value } })}
                                                        placeholder="Forma del verbo principal (ej: -ndo, -to...)"
                                                        className="w-full bg-background border border-subtle rounded px-2 py-1 text-sm font-mono mt-2"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {strat.type === 'tone' && (
                                            <div className="p-3 bg-background/40 rounded border border-subtle/50 grid grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Patrón de tono</label>
                                                    <input
                                                        value={strat.toneRule?.pattern || ''}
                                                        onChange={e => updateStrategy(strat.id, { toneRule: { ...(strat.toneRule || { description: '' }), pattern: e.target.value } })}
                                                        placeholder="Ej: H-H, L-H, LH(LH)..."
                                                        className="w-full bg-background border border-subtle rounded px-2 py-1 text-sm font-mono"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Descripción</label>
                                                    <input
                                                        value={strat.toneRule?.description || ''}
                                                        onChange={e => updateStrategy(strat.id, { toneRule: { ...(strat.toneRule || { pattern: '' }), description: e.target.value } })}
                                                        placeholder="Ej: tono alto en primera sílaba = pasado"
                                                        className="w-full bg-background border border-subtle rounded px-2 py-1 text-sm"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {strat.type === 'mutation' && (
                                            <div className="p-3 bg-background/40 rounded border border-subtle/50">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Descripción de la mutación</label>
                                                    <input
                                                        value={strat.transformationRule?.pattern || ''}
                                                        onChange={e => updateStrategy(strat.id, { transformationRule: { ...(strat.transformationRule || { replacement: '' }), pattern: e.target.value } })}
                                                        placeholder="Patrón (ej: a → e en raíz)"
                                                        className="w-full bg-background border border-subtle rounded px-2 py-1 text-sm font-mono mb-2"
                                                    />
                                                    <input
                                                        value={strat.transformationRule?.replacement || ''}
                                                        onChange={e => updateStrategy(strat.id, { transformationRule: { ...(strat.transformationRule || { pattern: '' }), replacement: e.target.value } })}
                                                        placeholder="Resultado (ej: e cuando hay pasado)"
                                                        className="w-full bg-background border border-subtle rounded px-2 py-1 text-sm font-mono"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {editedManifest.strategies.length === 0 && <p className="text-text-secondary italic text-center py-8 bg-background/30 rounded-lg">No hay estrategias definidas.</p>}
                            </div>
                        </div>
                    )}

                    {activeTab === 'notes' && (
                        <div className="h-full flex flex-col gap-2">
                            <label className="text-sm font-bold text-text-secondary uppercase tracking-wider">Notas Adicionales</label>
                            <textarea
                                value={editedManifest.notes.join('\n')}
                                onChange={e => setEditedManifest(prev => ({ ...prev, notes: e.target.value.split('\n') }))}
                                className="flex-grow w-full bg-background border border-subtle rounded-md p-4 font-mono text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                                placeholder="Escribe aquí cualquier nota adicional sobre la gramática de tu idioma..."
                            />
                        </div>
                    )}
                </main>

                <footer className="p-4 flex justify-between items-center border-t border-subtle flex-shrink-0 bg-surface/95 backdrop-blur">
                    <div className="text-xs text-text-secondary">
                        Última actualización: {new Date(editedManifest.meta.lastUpdated).toLocaleString()}
                    </div>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-4 py-2 bg-subtle text-text-primary font-semibold rounded-md hover:bg-gray-600 transition-colors">
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-6 py-2 bg-accent text-white font-semibold rounded-md shadow-lg hover:bg-accent-hover transition-colors flex items-center gap-2"
                        >
                            <SaveIcon className="h-4 w-4" />
                            Guardar Cambios
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default GrammarManagerModal;
