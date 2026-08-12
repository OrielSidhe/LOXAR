import { useState, useMemo, memo, FC, JSX } from 'react';
import { InflectionProfile, InflectionParadigm, InflectionRule } from '../types';
import GitMergeIcon from './icons/GitMergeIcon';
import XCircleIcon from './icons/XCircleIcon';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';
import Tooltip from './Tooltip';
import { RenderTemplate } from './RenderTemplate';
import EditIcon from './icons/EditIcon';
import SaveIcon from './icons/SaveIcon';
import CancelIcon from './icons/CancelIcon';
import ChevronRightIcon from './icons/ChevronRightIcon';
import InfoIcon from './icons/InfoIcon'; 

interface InflectionViewProps {
    profile: InflectionProfile;
    onSave: (profile: InflectionProfile) => void;
}

type EditingState = { type: 'group'; id: string; currentName: string; } | null;

const SimpleRuleEditor: FC<{ value: string; onChange: (newValue: string) => void }> = memo(({ value, onChange }) => {
    const [prefix, suffix] = useMemo(() => {
        const normalized = (value || '').replace('{RAÍZ}', '[RAÍZ]');
        if (normalized.includes('[RAÍZ]')) return normalized.split('[RAÍZ]');
        return ['', normalized];
    }, [value]);

    const handleChange = (newPrefix: string, newSuffix: string) => {
        onChange(`${newPrefix}[RAÍZ]${newSuffix}`);
    };

    return (
        <div className="w-full bg-surface border border-subtle rounded py-1 px-2 text-sm flex items-center gap-1">
            <input type="text" placeholder="Prefijo..." value={prefix} onChange={e => handleChange(e.target.value, suffix)} className="bg-transparent focus:outline-none text-right flex-grow min-w-0" />
            <span className="font-mono text-accent bg-background px-2 py-0.5 rounded-md flex-shrink-0">[RAÍZ]</span>
            <input type="text" placeholder="Sufijo..." value={suffix} onChange={e => handleChange(prefix, e.target.value)} className="bg-transparent focus:outline-none flex-grow min-w-0" />
        </div>
    );
});
SimpleRuleEditor.displayName = 'SimpleRuleEditor';

const findGroup = (paradigms: InflectionParadigm[], groupId: string): InflectionParadigm | null => {
    for (const p of paradigms) {
        if (p.id === groupId) return p;
        if (p.paradigms) {
            const found = findGroup(p.paradigms, groupId);
            if (found) return found;
        }
    }
    return null;
};

const mapParadigmsRecursively = (paradigms: InflectionParadigm[], callback: (p: InflectionParadigm) => InflectionParadigm): InflectionParadigm[] => {
    return paradigms.map(p => {
        const newP = callback(p);
        if (newP.paradigms) newP.paradigms = mapParadigmsRecursively(newP.paradigms, callback);
        return newP;
    });
};

const deleteGroupRecursively = (paradigms: InflectionParadigm[], groupId: string): InflectionParadigm[] => {
    return paradigms
        .filter(p => p.id !== groupId)
        .map(p => ({ ...p, paradigms: p.paradigms ? deleteGroupRecursively(p.paradigms, groupId) : undefined }));
};

const InflectionView = ({ profile, onSave }: InflectionViewProps) => {
    const [localProfile, setLocalProfile] = useState<InflectionProfile>(profile);
    const [activeTab, setActiveTab] = useState<'paradigms' | 'phonology'>('paradigms');

    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
    const [editingState, setEditingState] = useState<EditingState>(null);
    const [editingRule, setEditingRule] = useState<InflectionRule | null>(null);
    const [newRuleData, setNewRuleData] = useState({ name: '', type: 'simple', template: '[RAÍZ]', conditionType: 'endsWith', conditionValue: '', actionType: 'replaceEnding', actionValue: '' });
    const [newGroupName, setNewGroupName] = useState('');

    const [newPhonoRule, setNewPhonoRule] = useState({ name: '', matchPattern: '', replacement: '', isRegex: false });
    const [testString, setTestString] = useState('banana');
    const [showRegexHelp, setShowRegexHelp] = useState(false);

    const PRESETS = [
        { name: "Reducir Dobles", match: "([aeiou])\\1", replace: "$1", isRegex: true, description: "aa -> a" },
        { name: "Nasalización", match: "n(?=[bp])", replace: "m", isRegex: true, description: "nb -> mb" },
        { name: "Eliminar Final", match: "$", replace: "os", isRegex: true, description: "Final -> os" },
        { name: "Inicio Pal", match: "^", replace: "h", isRegex: true, description: "Inicio -> h..." }
    ];

    const previewResult = useMemo(() => {
        if (!newPhonoRule.matchPattern) return testString;
        try {
            if (newPhonoRule.isRegex) {
                const regex = new RegExp(newPhonoRule.matchPattern, 'g');
                return testString.replace(regex, newPhonoRule.replacement);
            } else {
                return testString.split(newPhonoRule.matchPattern).join(newPhonoRule.replacement);
            }
        } catch (e) { return "Error en Regex"; }
    }, [testString, newPhonoRule]);

    const selectedGroup = useMemo(() => selectedGroupId ? findGroup(localProfile.paradigms, selectedGroupId) : null, [localProfile.paradigms, selectedGroupId]);

    const handleUpdateGroup = (groupId: string, updates: Partial<InflectionParadigm>) => {
        setLocalProfile(prev => ({ ...prev, paradigms: mapParadigmsRecursively(prev.paradigms, p => p.id === groupId ? { ...p, ...updates } : p) }));
    };

    const handleAddGroup = (parentId: string | null) => {
        if (!newGroupName.trim()) return;
        const newGroup: InflectionParadigm = { id: `group_${Date.now()}`, name: newGroupName.trim(), rules: [], paradigms: [], appliesTo: [] };
        if (parentId === null) {
            setLocalProfile(p => ({ ...p, paradigms: [...p.paradigms, newGroup] }));
        } else {
            const parentGroup = findGroup(localProfile.paradigms, parentId);
            if (parentGroup) handleUpdateGroup(parentId, { paradigms: [...(parentGroup.paradigms || []), newGroup] });
        }
        setNewGroupName('');
    };

    const handleDeleteGroup = (groupId: string) => {
        if (!window.confirm("¿Seguro que quieres eliminar este grupo y todo su contenido?")) return;
        setLocalProfile(prev => ({ ...prev, paradigms: deleteGroupRecursively(prev.paradigms, groupId) }));
        if (selectedGroupId === groupId) setSelectedGroupId(null);
    };

    const handleAddRule = () => {
        if (!selectedGroupId || !newRuleData.name.trim()) return;
        let newRule: InflectionRule | null = null;
        if (newRuleData.type === 'simple' && newRuleData.template.trim()) {
            newRule = { id: `rule_${Date.now()}`, name: newRuleData.name.trim(), type: 'simple', template: newRuleData.template.trim() };
        } else if (newRuleData.type === 'conditional' && newRuleData.conditionValue.trim()) {
            newRule = { id: `rule_${Date.now()}`, name: newRuleData.name.trim(), type: 'conditional', conditionType: newRuleData.conditionType as any, conditionValue: newRuleData.conditionValue.trim(), actionType: newRuleData.actionType as any, actionValue: newRuleData.actionValue.trim() };
        }
        if (newRule && selectedGroup) {
            handleUpdateGroup(selectedGroupId, { rules: [...selectedGroup.rules, newRule] });
            setNewRuleData({ name: '', type: 'simple', template: '[RAÍZ]', conditionType: 'endsWith', conditionValue: '', actionType: 'replaceEnding', actionValue: '' });
        }
    };

    const handleDeleteRule = (ruleId: string) => {
        if (selectedGroup) handleUpdateGroup(selectedGroup.id, { rules: selectedGroup.rules.filter(r => r.id !== ruleId) });
    };

    const handleStartEditingGroup = (item: InflectionParadigm) => { setEditingRule(null); setEditingState({ type: 'group', id: item.id, currentName: item.name }); };

    const handleAddPhonoRule = () => {
        if (!newPhonoRule.name.trim() || !newPhonoRule.matchPattern.trim()) return;
        const rule: any = {
            id: `phono_${Date.now()}`,
            name: newPhonoRule.name.trim(),
            matchPattern: newPhonoRule.matchPattern,
            replacement: newPhonoRule.replacement,
            isRegex: newPhonoRule.isRegex
        };
        setLocalProfile(prev => ({ ...prev, phonologicalRules: [...(prev.phonologicalRules || []), rule] }));
        setNewPhonoRule({ name: '', matchPattern: '', replacement: '', isRegex: false });
    };

    const handleDeletePhonoRule = (id: string) => {
        setLocalProfile(prev => ({ ...prev, phonologicalRules: (prev.phonologicalRules || []).filter(r => r.id !== id) }));
    };

    const getRuleDescription = (rule: InflectionRule) => {
        if (rule.type === 'simple') {
            return <RenderTemplate template={rule.template} />;
        }
        if (rule.type === 'conditional') {
            const condMap: any = { endsWith: 'termina con', startsWith: 'empieza con', contains: 'contiene' };
            const actMap: any = { replaceEnding: 'reemplazar final por', addSuffix: 'añadir sufijo', addPrefix: 'añadir prefijo' };
            return <span className="text-text-primary">Si {condMap[rule.conditionType]} <code className="font-mono bg-subtle px-1 rounded">{rule.conditionValue}</code>, {actMap[rule.actionType]} <code className="font-mono bg-subtle px-1 rounded">{rule.actionValue}</code></span>;
        }
        return '';
    };

    return (
        <div className="h-full flex flex-col bg-deep-background animate-fade-in text-text-primary">
            <header className="flex items-center justify-between p-4 border-b border-subtle bg-surface shadow-sm z-10 flex-shrink-0">
                <div className="flex items-center gap-4">
                    <div className="flex bg-subtle/30 rounded-lg p-1">
                        <button
                            onClick={() => setActiveTab('paradigms')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'paradigms' ? 'bg-accent text-white shadow-md' : 'text-text-secondary hover:text-text-primary hover:bg-white/5'}`}
                        >
                            <span className="flex items-center gap-2"><GitMergeIcon className="w-5 h-5" /> Paradigmas</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('phonology')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'phonology' ? 'bg-accent text-white shadow-md' : 'text-text-secondary hover:text-text-primary hover:bg-white/5'}`}
                        >
                            <span className="flex items-center gap-2"><span className="material-symbols-outlined text-lg">graphic_eq</span> Fonología</span>
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onSave(localProfile)}
                        className="px-6 py-2 bg-accent text-white rounded-md font-semibold hover:bg-accent-hover shadow-lg transition-all flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined text-lg">save</span> Guardar
                    </button>
                </div>
            </header>

            <main className="flex-1 overflow-hidden relative flex">
                {activeTab === 'paradigms' && (
                    <div className="flex w-full h-full">
                        <aside className="w-80 border-r border-subtle bg-surface-dark/50 flex flex-col h-full">
                            <div className="p-4 border-b border-subtle flex gap-2">
                                <input
                                    type="text"
                                    value={newGroupName}
                                    onChange={e => setNewGroupName(e.target.value)}
                                    placeholder="Nueva Categoría..."
                                    className="flex-1 bg-background border border-subtle rounded px-3 py-1.5 text-sm focus:outline-none focus:border-accent transition-colors"
                                    onKeyDown={e => e.key === 'Enter' && handleAddGroup(null)}
                                />
                                <button onClick={() => handleAddGroup(null)} disabled={!newGroupName.trim()} className="p-1.5 bg-accent text-white rounded hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                    <PlusIcon className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                {localProfile.paradigms.map(p => (
                                    <ParadigmGroup key={p.id} group={p} level={0} selectedGroupId={selectedGroupId} setSelectedGroupId={setSelectedGroupId} handleDeleteGroup={handleDeleteGroup} handleStartEditingGroup={handleStartEditingGroup} />
                                ))}
                            </div>
                        </aside>

                        <section className="flex-1 h-full overflow-hidden flex flex-col bg-background/30">
                            {selectedGroup ? (
                                <div className="p-6 h-full overflow-y-auto space-y-6">
                                    <div className="flex items-center justify-between border-b border-subtle pb-4">
                                        <div>
                                            {editingState?.type === 'group' && editingState.id === selectedGroup.id ? (
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        autoFocus
                                                        type="text"
                                                        value={editingState.currentName}
                                                        onChange={e => setEditingState({ ...editingState, currentName: e.target.value })}
                                                        className="text-2xl font-bold bg-background border border-accent rounded px-2 py-1 text-text-primary focus:outline-none"
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter') {
                                                                handleUpdateGroup(selectedGroup.id, { name: editingState.currentName });
                                                                setEditingState(null);
                                                            }
                                                        }}
                                                    />
                                                    <button onClick={() => { handleUpdateGroup(selectedGroup.id, { name: editingState.currentName }); setEditingState(null); }} className="text-success hover:text-success-hover"><SaveIcon className="w-6 h-6" /></button>
                                                    <button onClick={() => setEditingState(null)} className="text-danger hover:text-danger-hover"><CancelIcon className="w-6 h-6" /></button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-3 group">
                                                    <h2 className="text-2xl font-bold text-text-primary flex items-center gap-2">
                                                        <GitMergeIcon className="w-6 h-6 text-accent" />
                                                        {selectedGroup.name}
                                                    </h2>
                                                    <button onClick={() => setEditingState({ type: 'group', id: selectedGroup.id, currentName: selectedGroup.name })} className="opacity-0 group-hover:opacity-100 transition-opacity text-text-secondary hover:text-accent">
                                                        <EditIcon className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        <button onClick={() => handleDeleteGroup(selectedGroup.id)} className="text-danger hover:text-red-400 bg-danger/10 p-2 rounded-md transition-colors flex items-center gap-2"><TrashIcon className="w-5 h-5" /> Eliminar Grupo</button>
                                    </div>

                                    <div className="bg-surface p-4 rounded-lg border border-subtle space-y-4 shadow-sm">
                                        <h4 className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-2">Reglas de Inflexión</h4>
                                        <RuleCreator data={newRuleData} setData={setNewRuleData} onAdd={handleAddRule} />

                                        <div className="space-y-2 mt-4">
                                            {selectedGroup.rules.length === 0 ? (
                                                <p className="text-text-secondary italic text-center py-4 bg-background/30 rounded border border-dashed border-subtle">No hay reglas definidas en este grupo.</p>
                                            ) : (
                                                <table className="w-full text-sm text-left border-collapse">
                                                    <thead>
                                                        <tr className="border-b border-subtle text-text-secondary">
                                                            <th className="p-2">Nombre</th>
                                                            <th className="p-2">Descripción</th>
                                                            <th className="p-2 w-20">Acciones</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {selectedGroup.rules.map(rule => (
                                                            editingRule?.id === rule.id ? (
                                                                <RuleEditor
                                                                    key={rule.id}
                                                                    rule={editingRule}
                                                                    onUpdate={updates => setEditingRule(prev => prev ? ({ ...prev, ...updates } as InflectionRule) : null)}
                                                                    onSave={() => {
                                                                        if (editingRule && selectedGroup) {
                                                                            handleUpdateGroup(selectedGroup.id, { rules: selectedGroup.rules.map(r => r.id === editingRule.id ? editingRule : r) });
                                                                            setEditingRule(null);
                                                                        }
                                                                    }}
                                                                    onCancel={() => setEditingRule(null)}
                                                                />
                                                            ) : (
                                                                <RuleDisplay key={rule.id} rule={rule} getRuleDescription={getRuleDescription} onEdit={r => setEditingRule({ ...r })} onDelete={handleDeleteRule} />
                                                            )
                                                        ))}
                                                    </tbody>
                                                </table>
                                            )}
                                        </div>
                                    </div>

                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-text-secondary opacity-50 p-8 text-center">
                                    <GitMergeIcon className="w-16 h-16 mb-4" />
                                    <p className="text-lg font-medium">Selecciona una categoría o grupo de la izquierda para editar sus reglas.</p>
                                </div>
                            )}
                        </section>
                    </div>
                )}

                {activeTab === 'phonology' && (
                    <div className="p-8 w-full max-w-4xl mx-auto space-y-8 overflow-y-auto">
                        <div className="flex items-start justify-between mb-6">
                            <div className="flex items-center gap-4">
                                <span className="material-symbols-outlined text-4xl text-accent">graphic_eq</span>
                                <div>
                                    <h2 className="text-2xl font-bold text-text-primary">Reglas Fonológicas (Sandhi)</h2>
                                    <p className="text-text-secondary">Define cambios automáticos.</p>
                                </div>
                            </div>
                            <button onClick={() => setShowRegexHelp(!showRegexHelp)} className="flex items-center gap-2 text-accent hover:text-accent-hover transition-colors">
                                <InfoIcon className="w-5 h-5" /> <span className="font-semibold cursor-pointer">Guía Regex</span>
                            </button>
                        </div>

                        {showRegexHelp && (
                            <div className="bg-surface border border-accent/20 p-4 rounded-lg relative animate-fade-in mb-6">
                                <h4 className="font-bold text-lg mb-2 text-accent">Guía Rápida de Expresiones Regulares (Regex)</h4>
                                <p className="text-sm text-text-secondary mb-4">Las expresiones regulares permiten buscar patrones complejos. Aquí tienes algunos ejemplos útiles:</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm font-mono">
                                    <div className="bg-background/50 p-2 rounded border border-subtle">
                                        <span className="text-accent">^</span> : Inicio de la palabra (ej: <code>^a</code> encuentra 'a' al inicio)
                                    </div>
                                    <div className="bg-background/50 p-2 rounded border border-subtle">
                                        <span className="text-accent">$</span> : Final de la palabra (ej: <code>o$</code> encuentra 'o' al final)
                                    </div>
                                    <div className="bg-background/50 p-2 rounded border border-subtle">
                                        <span className="text-accent">[aeiou]</span> : Cualquier vocal
                                    </div>
                                    <div className="bg-background/50 p-2 rounded border border-subtle">
                                        <span className="text-accent">.</span> : Cualquier caracter
                                    </div>
                                    <div className="bg-background/50 p-2 rounded border border-subtle">
                                        <span className="text-accent">(a|e)</span> : 'a' o 'e'
                                    </div>
                                    <div className="bg-background/50 p-2 rounded border border-subtle">
                                        <span className="text-accent text-xs">Grupos:</span> <code>([aeiou])\1</code> encuentra vocales dobles
                                    </div>
                                </div>
                                <button onClick={() => setShowRegexHelp(false)} className="absolute top-2 right-2 text-text-secondary hover:text-text-primary"><XCircleIcon className="w-5 h-5" /></button>
                            </div>
                        )}

                        <div className="bg-surface border border-subtle rounded-lg p-6 shadow-sm">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-lg text-text-primary">Nueva Regla de Cambio</h3>
                                {newPhonoRule.isRegex && <span className="text-xs font-mono bg-accent/10 text-accent px-2 py-1 rounded">Modo Regex Activo</span>}
                            </div>

                            <div className="flex flex-wrap gap-2 mb-6">
                                <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider py-1">Presets:</span>
                                {PRESETS.map((preset, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setNewPhonoRule({ name: preset.name, matchPattern: preset.match, replacement: preset.replace, isRegex: preset.isRegex })}
                                        className="px-2 py-1 text-xs bg-background border border-subtle rounded-md hover:border-accent hover:text-accent transition-colors flex items-center gap-1"
                                        title={preset.description}
                                    >
                                        {preset.name}
                                    </button>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                                <div className="md:col-span-3">
                                    <label className="text-xs font-semibold text-text-secondary mb-1 block">Nombre</label>
                                    <input type="text" placeholder="Asimilación..." value={newPhonoRule.name} onChange={e => setNewPhonoRule({ ...newPhonoRule, name: e.target.value })} className="w-full bg-background border border-subtle rounded px-3 py-2 text-sm focus:outline-none focus:border-accent" />
                                </div>
                                <div className="md:col-span-3">
                                    <label className="text-xs font-semibold text-text-secondary mb-1 block">Buscar (Pattern)</label>
                                    <input type="text" placeholder={newPhonoRule.isRegex ? "^[aeiou]" : "np"} value={newPhonoRule.matchPattern} onChange={e => setNewPhonoRule({ ...newPhonoRule, matchPattern: e.target.value })} className="w-full bg-background border border-subtle rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-accent" />
                                </div>
                                <div className="md:col-span-1 flex justify-center pb-2">
                                    <span className="material-symbols-outlined text-text-secondary">arrow_forward</span>
                                </div>
                                <div className="md:col-span-3">
                                    <label className="text-xs font-semibold text-text-secondary mb-1 block">Reemplazar por</label>
                                    <input type="text" placeholder="mp" value={newPhonoRule.replacement} onChange={e => setNewPhonoRule({ ...newPhonoRule, replacement: e.target.value })} className="w-full bg-background border border-subtle rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-accent" />
                                </div>
                                <div className="md:col-span-2">
                                    <button onClick={handleAddPhonoRule} disabled={!newPhonoRule.name || !newPhonoRule.matchPattern} className="w-full py-2 bg-accent text-white rounded font-semibold hover:bg-accent-hover disabled:opacity-50 transition-colors">
                                        Añadir
                                    </button>
                                </div>
                            </div>

                            <div className="mt-4 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <input type="checkbox" id="isRegex" checked={newPhonoRule.isRegex} onChange={e => setNewPhonoRule({ ...newPhonoRule, isRegex: e.target.checked })} className="rounded border-subtle bg-background text-accent focus:ring-accent" />
                                    <label htmlFor="isRegex" className="text-sm text-text-secondary cursor-pointer select-none font-medium">Usar Expresiones Regulares (Regex)</label>
                                </div>
                            </div>

                            <div className="mt-6 bg-background/50 rounded-lg p-3 border border-subtle">
                                <h5 className="text-xs font-bold text-text-secondary uppercase mb-2">Prueba en vivo</h5>
                                <div className="flex items-center gap-4 text-sm">
                                    <div className="flex-1 flex items-center gap-2">
                                        <span className="text-text-secondary">Entrada:</span>
                                        <input
                                            type="text"
                                            value={testString}
                                            onChange={(e) => setTestString(e.target.value)}
                                            className="bg-background border border-subtle rounded px-2 py-1 text-text-primary w-full focus:outline-none focus:border-accent font-mono"
                                        />
                                    </div>
                                    <span className="material-symbols-outlined text-text-secondary">arrow_forward</span>
                                    <div className="flex-1 flex items-center gap-2">
                                        <span className="text-text-secondary">Resultado:</span>
                                        <div className="bg-background border border-subtle rounded px-2 py-1 text-accent w-full font-mono min-h-[28px]">
                                            {previewResult}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {(localProfile.phonologicalRules || []).map((rule, idx) => (
                                <div key={rule.id || idx} className="flex items-center justify-between p-4 bg-surface border border-subtle rounded-lg shadow-sm group hover:border-accent/50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold text-xs">{idx + 1}</div>
                                        <div>
                                            <div className="font-bold text-text-primary">{rule.name}</div>
                                            <div className="text-sm font-mono text-text-secondary mt-1">
                                                <span className="bg-background px-1.5 py-0.5 rounded border border-subtle">{rule.matchPattern}</span>
                                                <span className="mx-2 text-accent">→</span>
                                                <span className="bg-background px-1.5 py-0.5 rounded border border-subtle">{rule.replacement}</span>
                                                {rule.isRegex && <span className="ml-2 text-[10px] uppercase tracking-wider text-accent border border-accent/20 px-1 rounded">Regex</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <button onClick={() => handleDeletePhonoRule(rule.id)} className="p-2 text-subtle hover:text-danger hover:bg-danger/10 rounded-full transition-colors"><TrashIcon className="w-5 h-5" /></button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

const ParadigmGroup: FC<{ group: InflectionParadigm; level: number; selectedGroupId: string | null; setSelectedGroupId: (id: string) => void; handleDeleteGroup: (id: string) => void; handleStartEditingGroup: (g: InflectionParadigm) => void; }> = memo(({ group, level, selectedGroupId, setSelectedGroupId, handleDeleteGroup, handleStartEditingGroup }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const isSelected = selectedGroupId === group.id;
    return (
        <div style={{ marginLeft: `${level * 16}px` }}>
            <div className={`w-full text-left p-1 rounded-md flex items-center justify-between text-sm group ${isSelected ? 'bg-accent text-white font-semibold' : 'text-text-secondary hover:text-text-primary hover:bg-white/5'}`}>
                <button onClick={() => setIsExpanded(!isExpanded)} className="p-1"><ChevronRightIcon className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} /></button>
                <button onClick={() => setSelectedGroupId(group.id)} className="flex-grow text-left truncate mx-1">{group.name}</button>
                <div className={`flex items-center gap-1 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                    <Tooltip text="Editar nombre"><button onClick={() => handleStartEditingGroup(group)} className="p-1 rounded-full hover:bg-white/20"><EditIcon className="h-4 w-4" /></button></Tooltip>
                    <Tooltip text="Eliminar grupo"><button onClick={() => handleDeleteGroup(group.id)} className="p-1 rounded-full hover:bg-white/20"><TrashIcon className="h-4 w-4" /></button></Tooltip>
                </div>
            </div>
            {isExpanded && group.paradigms?.map(subGroup => <ParadigmGroup key={subGroup.id} group={subGroup} level={level + 1} {...{ selectedGroupId, setSelectedGroupId, handleDeleteGroup, handleStartEditingGroup }} />)}
        </div>
    );
});
ParadigmGroup.displayName = 'ParadigmGroup';

const RuleDisplay: FC<{ rule: InflectionRule; getRuleDescription: (r: InflectionRule) => JSX.Element | string; onEdit: (r: InflectionRule) => void; onDelete: (id: string) => void; }> = memo(({ rule, getRuleDescription, onEdit, onDelete }) => (
    <tr className="border-t border-subtle group">
        <td className="p-2 text-text-primary">{rule.name}</td>
        <td className="p-2">{getRuleDescription(rule)}</td>
        <td className="p-2"><div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => onEdit(rule)} className="p-1 text-blue-400 hover:text-accent rounded" title="Editar"><EditIcon className="h-4 w-4" /></button>
            <button onClick={() => onDelete(rule.id)} className="p-1 text-danger/70 hover:text-danger rounded-full hover:bg-danger/20" title="Eliminar"><XCircleIcon className="h-4 w-4" /></button>
        </div></td>
    </tr>
));
RuleDisplay.displayName = 'RuleDisplay';

const RuleEditor: FC<{ rule: InflectionRule; onUpdate: (u: Partial<InflectionRule>) => void; onSave: () => void; onCancel: () => void; }> = memo(({ rule, onUpdate, onSave, onCancel }) => (
    <tr className="border-t border-subtle bg-surface animate-fade-in-fast">
        <td colSpan={3} className="p-2"><div className="p-2 bg-background rounded-md border border-accent/50 space-y-2">
            <div className="flex items-center gap-2">
                <input type="text" value={rule.name} onChange={e => onUpdate({ name: e.target.value })} className="flex-grow bg-surface border-subtle rounded py-1 px-2 text-sm" />
                <select value={rule.type} disabled className="bg-surface border-subtle rounded py-1 px-2 text-sm disabled:opacity-70"><option value="simple">Simple</option><option value="conditional">Condicional</option></select>
            </div>
            {rule.type === 'simple' ? <SimpleRuleEditor value={rule.template} onChange={template => onUpdate({ template })} />
                : <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                        <select value={rule.conditionType} onChange={e => onUpdate({ conditionType: e.target.value as any })} className="w-full bg-surface border-subtle rounded py-1 px-2 mb-1"><option value="endsWith">Si termina con</option><option value="startsWith">Si empieza con</option><option value="contains">Si contiene</option></select>
                        <input type="text" placeholder="Valor..." value={rule.conditionValue} onChange={e => onUpdate({ conditionValue: e.target.value })} className="w-full bg-surface border-subtle rounded py-1 px-2" />
                    </div>
                    <div>
                        <select value={rule.actionType} onChange={e => onUpdate({ actionType: e.target.value as any })} className="w-full bg-surface border-subtle rounded py-1 px-2 mb-1"><option value="replaceEnding">Reemplazar final</option><option value="addSuffix">Añadir sufijo</option><option value="addPrefix">Añadir prefijo</option></select>
                        <input type="text" placeholder="Valor..." value={rule.actionValue} onChange={e => onUpdate({ actionValue: e.target.value })} className="w-full bg-surface border-subtle rounded py-1 px-2" />
                    </div>
                </div>}
            <div className="flex justify-end gap-2 pt-1">
                <button onClick={onCancel} className="px-3 py-1 text-sm bg-subtle text-text-primary rounded hover:bg-gray-600">Cancelar</button>
                <button onClick={onSave} className="px-3 py-1 text-sm bg-success text-white rounded hover:bg-green-400 flex items-center gap-1"><SaveIcon className="h-4 w-4" /> Guardar</button>
            </div>
        </div></td>
    </tr>
));
RuleEditor.displayName = 'RuleEditor';

const RuleCreator: FC<{ data: any; setData: (d: any) => void; onAdd: () => void; }> = memo(({ data, setData, onAdd }) => (
    <div className="p-2 bg-background rounded-md">
        <h4 className="text-md font-semibold text-text-secondary mb-2">Añadir Nueva Regla</h4>
        <div className="flex items-center gap-2 mb-2">
            <input type="text" placeholder="Nombre (ej: Plural)" value={data.name} onChange={e => setData({ ...data, name: e.target.value })} className="flex-grow bg-surface border-subtle rounded py-1 px-2 text-sm" />
            <select value={data.type} onChange={e => setData({ ...data, type: e.target.value })} className="bg-surface border-subtle rounded py-1 px-2 text-sm"><option value="simple">Simple</option><option value="conditional">Condicional</option></select>
        </div>
        {data.type === 'simple' ? <SimpleRuleEditor value={data.template} onChange={template => setData({ ...data, template })} />
            : <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                    <select value={data.conditionType} onChange={e => setData({ ...data, conditionType: e.target.value })} className="w-full bg-surface border-subtle rounded py-1 px-2 mb-1"><option value="endsWith">Si termina con</option><option value="startsWith">Si empieza con</option><option value="contains">Si contiene</option></select>
                    <input type="text" placeholder="Valor..." value={data.conditionValue} onChange={e => setData({ ...data, conditionValue: e.target.value })} className="w-full bg-surface border-subtle rounded py-1 px-2" />
                </div>
                <div>
                    <select value={data.actionType} onChange={e => setData({ ...data, actionType: e.target.value })} className="w-full bg-surface border-subtle rounded py-1 px-2 mb-1"><option value="replaceEnding">Reemplazar final</option><option value="addSuffix">Añadir sufijo</option><option value="addPrefix">Añadir prefijo</option></select>
                    <input type="text" placeholder="Valor..." value={data.actionValue} onChange={e => setData({ ...data, actionValue: e.target.value })} className="w-full bg-surface border-subtle rounded py-1 px-2" />
                </div>
            </div>}
        <button onClick={onAdd} className="w-full mt-2 text-sm p-2 bg-accent text-white rounded hover:bg-accent-hover font-semibold">+ Añadir Regla</button>
    </div>
));
RuleCreator.displayName = 'RuleCreator';

export default memo(InflectionView);
