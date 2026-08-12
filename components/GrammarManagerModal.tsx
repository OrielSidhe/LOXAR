
import { useState, useEffect } from 'react';
import { GrammarManifest, SyntacticRole, MorphosyntacticStrategy, StrategyType } from '../types';
import XCircleIcon from './icons/XCircleIcon';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';
import SaveIcon from './icons/SaveIcon';

interface GrammarManagerModalProps {
    manifest: GrammarManifest;
    onSave: (newManifest: GrammarManifest) => void;
    onClose: () => void;
}

const GrammarManagerModal = ({ manifest, onSave, onClose }: GrammarManagerModalProps) => {
    const [activeTab, setActiveTab] = useState<'typology' | 'strategies' | 'roles' | 'notes'>('typology');
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

                <div className="flex border-b border-subtle bg-background/50">
                    {[
                        { id: 'typology', label: 'Tipología' },
                        { id: 'strategies', label: 'Estrategias' },
                        { id: 'roles', label: 'Roles Sintácticos' },
                        { id: 'notes', label: 'Notas' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`px-6 py-3 font-semibold text-sm transition-colors ${activeTab === tab.id ? 'border-b-2 border-accent text-accent bg-surface' : 'text-text-secondary hover:text-text-primary'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <main className="p-6 flex-grow overflow-y-auto custom-scrollbar bg-background/20">
                    {activeTab === 'typology' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-text-secondary uppercase tracking-wider">Orden de Palabras</label>
                                <select
                                    value={editedManifest.typology.wordOrder}
                                    onChange={e => updateTypology('wordOrder', e.target.value)}
                                    className="w-full bg-surface border border-subtle rounded px-3 py-2 text-text-primary focus:ring-2 focus:ring-accent outline-none"
                                >
                                    {['SVO', 'SOV', 'VSO', 'VOS', 'OSV', 'OVS', 'Free'].map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-text-secondary uppercase tracking-wider">Alineamiento</label>
                                <select
                                    value={editedManifest.typology.alignment}
                                    onChange={e => updateTypology('alignment', e.target.value)}
                                    className="w-full bg-surface border border-subtle rounded px-3 py-2 text-text-primary focus:ring-2 focus:ring-accent outline-none"
                                >
                                    {['Nominative-Accusative', 'Ergative-Absolutive', 'Split', 'Austronesian', 'Other'].map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-text-secondary uppercase tracking-wider">Morfología</label>
                                <select
                                    value={editedManifest.typology.morphology}
                                    onChange={e => updateTypology('morphology', e.target.value)}
                                    className="w-full bg-surface border border-subtle rounded px-3 py-2 text-text-primary focus:ring-2 focus:ring-accent outline-none"
                                >
                                    {['Isolating', 'Agglutinative', 'Fusional', 'Polysynthetic', 'Templatic'].map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="block text-sm font-bold text-text-secondary uppercase tracking-wider">Direccionalidad (Núcleo)</label>
                                <select
                                    value={editedManifest.typology.headDirection}
                                    onChange={e => updateTypology('headDirection', e.target.value)}
                                    className="w-full bg-surface border border-subtle rounded px-3 py-2 text-text-primary focus:ring-2 focus:ring-accent outline-none"
                                >
                                    {['Head-Initial', 'Head-Final'].map(o => <option key={o} value={o}>{o}</option>)}
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
                                            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Descripción</label>
                                            <textarea
                                                value={role.description || ''}
                                                onChange={e => updateRole(role.id, 'description', e.target.value)}
                                                className="w-full bg-background border border-subtle rounded px-2 py-1 text-sm resize-none"
                                                rows={2}
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
                                                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Tipo</label>
                                                <select
                                                    value={strat.type}
                                                    onChange={e => updateStrategy(strat.id, { type: e.target.value as StrategyType })}
                                                    className="w-full bg-background border border-subtle rounded px-2 py-1 text-sm"
                                                >
                                                    {['position', 'affix', 'clitic', 'tone', 'mutation', 'particle', 'auxiliary'].map(t => <option key={t} value={t}>{t}</option>)}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Roles a los que aplica</label>
                                            <div className="flex flex-wrap gap-2 p-2 bg-background/50 border border-subtle rounded min-h-[40px]">
                                                {editedManifest.roles.map(role => (
                                                    <button
                                                        key={role.id}
                                                        onClick={() => {
                                                            const roles = strat.appliesTo.includes(role.id)
                                                                ? strat.appliesTo.filter(id => id !== role.id)
                                                                : [...strat.appliesTo, role.id];
                                                            updateStrategy(strat.id, { appliesTo: roles });
                                                        }}
                                                        className={`px-2 py-1 rounded text-xs transition-colors border ${strat.appliesTo.includes(role.id) ? 'bg-accent border-accent text-white' : 'bg-surface border-subtle text-text-secondary hover:border-accent'}`}
                                                    >
                                                        {role.name}
                                                    </button>
                                                ))}
                                                {editedManifest.roles.length === 0 && <span className="text-xs text-text-secondary italic">Define roles primero para seleccionarlos.</span>}
                                            </div>
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
                                                        {['prefix', 'suffix', 'infix', 'circumfix'].map(p => <option key={p} value={p}>{p}</option>)}
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
