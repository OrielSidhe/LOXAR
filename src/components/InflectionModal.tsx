import { useState, useMemo, useEffect, memo, FC, JSX } from 'react';
import { InflectionProfile, InflectionParadigm, InflectionRule, PhonologicalRule } from '../types';
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

interface InflectionModalProps {
    profile: InflectionProfile;
    onSave: (profile: InflectionProfile) => void;
    onClose: () => void;
}

type EditingState = { type: 'group'; id: string; currentName: string; } | null;

const PRESETS = [
    { name: 'Nasales (np->mp)', match: 'np', replace: 'mp', isRegex: false, description: 'Cambia np por mp' },
    { name: 'Debasalamiento (s->h)', match: 's', replace: 'h', isRegex: false, description: 'Cambia s por h' },
    { name: 'Vocal Final', match: '[aeiou]$', replace: '', isRegex: true, description: 'Elimina la vocal final' },
    { name: 'Dobles a Simples', match: '(.)\\1', replace: '$1', isRegex: true, description: 'Simplifica letras dobles' },
];

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

const InflectionModal = ({ profile, onSave, onClose }: InflectionModalProps) => {
    const [localProfile, setLocalProfile] = useState<InflectionProfile>(profile);
    const [activeTab, setActiveTab] = useState<'paradigms' | 'phonology'>('paradigms');
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
    const [editingState, setEditingState] = useState<EditingState>(null);
    const [editingRule, setEditingRule] = useState<InflectionRule | null>(null);
    const [newRuleData, setNewRuleData] = useState({ name: '', type: 'simple', template: '[RAÍZ]', conditionType: 'endsWith', conditionValue: '', actionType: 'replaceEnding', actionValue: '' });
    const [newGroupName, setNewGroupName] = useState('');

    // Phonology state
    const [newPhonoRule, setNewPhonoRule] = useState<Omit<PhonologicalRule, 'id'>>({ name: '', matchPattern: '', replacement: '', isRegex: false });
    const [showRegexHelp, setShowRegexHelp] = useState(false);
    const [testString, setTestString] = useState('entrada');

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
        if(selectedGroupId === groupId) setSelectedGroupId(null);
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
    const handleConfirmEditGroup = () => {
        if (!editingState || !editingState.currentName.trim()) return;
        handleUpdateGroup(editingState.id, { name: editingState.currentName.trim() });
        setEditingState(null);
    };

    const handleStartRuleEdit = (rule: InflectionRule) => { setEditingState(null); setEditingRule({ ...rule }); };
    const handleCancelRuleEdit = () => setEditingRule(null);
    const handleUpdateEditingRule = (updates: Partial<InflectionRule>) => setEditingRule(prev => prev ? { ...prev, ...updates } as InflectionRule : null);
    const handleConfirmRuleEdit = () => {
        if (!editingRule || !selectedGroup) return;
        handleUpdateGroup(selectedGroup.id, { rules: selectedGroup.rules.map(r => r.id === editingRule.id ? editingRule : r) });
        setEditingRule(null);
    };

    // Phonology handlers
    const handleAddPhonoRule = () => {
        if (!newPhonoRule.name || !newPhonoRule.matchPattern) return;
        const rule: PhonologicalRule = { ...newPhonoRule, id: `phono_${Date.now()}` };
        setLocalProfile(prev => ({
            ...prev,
            phonologicalRules: [...(prev.phonologicalRules || []), rule]
        }));
        setNewPhonoRule({ name: '', matchPattern: '', replacement: '', isRegex: false });
    };

    const handleDeletePhonoRule = (id: string) => {
        setLocalProfile(prev => ({
            ...prev,
            phonologicalRules: (prev.phonologicalRules || []).filter(r => r.id !== id)
        }));
    };

    const previewResult = useMemo(() => {
        let res = testString;
        const rules = [...(localProfile.phonologicalRules || [])];
        // Also simulate the new rule being added if pattern exists
        if (newPhonoRule.matchPattern) {
            rules.push({ ...newPhonoRule, id: 'temp' });
        }

        for (const rule of rules) {
            try {
                if (rule.isRegex) {
                    const regex = new RegExp(rule.matchPattern, 'g');
                    res = res.replace(regex, rule.replacement);
                } else {
                    res = res.split(rule.matchPattern).join(rule.replacement);
                }
            } catch (e) { /* ignore invalid regex */ }
        }
        return res;
    }, [testString, localProfile.phonologicalRules, newPhonoRule]);

    const getRuleDescription = (rule: InflectionRule) => {
        if (rule.type === 'simple') {
            return <RenderTemplate template={rule.template} />;
        }
        if (rule.type === 'conditional') {
            const condMap = { endsWith: 'termina con', startsWith: 'empieza con', contains: 'contiene' };
            const actMap = { replaceEnding: 'reemplazar final por', addSuffix: 'añadir sufijo', addPrefix: 'añadir prefijo' };
            return <span className="text-text-primary">Si {condMap[rule.conditionType]} <code className="font-mono bg-subtle px-1 rounded">{rule.conditionValue}</code>, {actMap[rule.actionType]} <code className="font-mono bg-subtle px-1 rounded">{rule.actionValue}</code></span>;
        }
        return '';
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4 animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="inflection-title">
            <div className="bg-surface rounded-lg shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col border border-subtle">
                <header className="p-4 flex justify-between items-center border-b border-subtle flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <GitMergeIcon className="h-7 w-7 text-accent" />
                        <div>
                            <h2 id="inflection-title" className="text-2xl font-bold text-text-primary font-display">Taller de Lingüística</h2>
                            <p className="text-sm text-text-secondary">Gestiona la gramática y fonología de tu lenguaje.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-full text-text-secondary hover:bg-subtle" aria-label="Cerrar"><XCircleIcon className="h-7 w-7" /></button>
                </header>

                <div className="flex bg-background border-b border-subtle">
                    <button onClick={() => setActiveTab('paradigms')} className={`px-6 py-3 text-sm font-bold transition-all border-b-2 ${activeTab === 'paradigms' ? 'border-accent text-accent' : 'border-transparent text-text-secondary hover:text-text-primary'}`}>Paradigmas de Flexión</button>
                    <button onClick={() => setActiveTab('phonology')} className={`px-6 py-3 text-sm font-bold transition-all border-b-2 ${activeTab === 'phonology' ? 'border-accent text-accent' : 'border-transparent text-text-secondary hover:text-text-primary'}`}>Fonología (Sandhi)</button>
                </div>

                <main className="flex-grow overflow-hidden">
                    {activeTab === 'paradigms' ? (
                        <div className="grid grid-cols-12 gap-6 p-6 h-full overflow-hidden">
                            <div className="col-span-4 flex flex-col h-full overflow-hidden">
                                <h3 className="text-lg font-semibold text-text-primary mb-2 flex-shrink-0">Paradigmas</h3>
                                <div className="flex-grow overflow-y-auto bg-background p-2 rounded-md border border-subtle space-y-1 custom-scrollbar">
                                    {localProfile.paradigms.map(group => (
                                        editingState?.type === 'group' && editingState.id === group.id ? (
                                            <div key={group.id} className="flex items-center gap-2 p-1">
                                                <input type="text" value={editingState.currentName} onChange={e => setEditingState(s => s ? {...s, currentName: e.target.value} : null)} autoFocus className="flex-grow bg-surface border-accent rounded-md py-1 px-2 text-sm"/>
                                                <button onClick={handleConfirmEditGroup} className="p-1 text-success rounded hover:bg-success/20"><SaveIcon className="h-4 w-4"/></button>
                                                <button onClick={() => setEditingState(null)} className="p-1 text-danger rounded hover:bg-danger/20"><CancelIcon className="h-4 w-4"/></button>
                                            </div>
                                        ) : <ParadigmGroup key={group.id} group={group} level={0} selectedGroupId={selectedGroupId} setSelectedGroupId={setSelectedGroupId} handleDeleteGroup={handleDeleteGroup} handleStartEditingGroup={handleStartEditingGroup} />
                                    ))}
                                </div>
                                <div className="flex-shrink-0 mt-2 flex items-center gap-2">
                                    <input type="text" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddGroup(null)} placeholder="Nuevo paradigma..." className="flex-grow bg-background border border-subtle rounded-md py-1 px-2 text-sm"/>
                                    <button onClick={() => handleAddGroup(null)} className="p-2 bg-accent text-white rounded-md hover:bg-accent-hover"><PlusIcon className="h-4 w-4"/></button>
                                </div>
                            </div>
                            
                            <div className="col-span-8 flex flex-col h-full bg-background/50 p-4 rounded-md border border-subtle overflow-hidden">
                                {selectedGroup ? <>
                                    <h3 className="text-xl font-bold text-accent mb-2 flex-shrink-0">{selectedGroup.name}</h3>
                                    <div className="mb-4 flex-shrink-0">
                                        <label className="flex items-center text-sm font-medium text-text-secondary mb-1">Aplicar a Categorías <Tooltip text="Categorías a las que aplica este paradigma." /></label>
                                        <input type="text" key={selectedGroup.id} defaultValue={(selectedGroup.appliesTo || []).join(', ')} onBlur={e => handleUpdateGroup(selectedGroup.id, { appliesTo: e.target.value.split(',').map(f => f.trim()).filter(Boolean) })} placeholder="Ej: verbo, sustantivo" className="w-full bg-surface border-subtle rounded py-1 px-2 text-sm"/>
                                    </div>
                                    <div className="flex-grow overflow-y-auto mb-2 pr-2 custom-scrollbar">
                                        <table className="w-full text-sm">
                                            <thead className="sticky top-0 bg-background/80 backdrop-blur-sm"><tr>
                                                <th className="text-left font-semibold text-text-secondary p-2 w-1/3">Forma / Caso</th><th className="text-left font-semibold text-text-secondary p-2 w-2/3">Regla Aplicada</th><th className="w-20"></th>
                                            </tr></thead>
                                            <tbody>{selectedGroup.rules.map(rule => editingRule?.id === rule.id ? <RuleEditor key={rule.id} rule={editingRule} onUpdate={handleUpdateEditingRule} onCancel={handleCancelRuleEdit} onSave={handleConfirmRuleEdit}/> : <RuleDisplay key={rule.id} rule={rule} getRuleDescription={getRuleDescription} onEdit={handleStartRuleEdit} onDelete={handleDeleteRule}/>)}</tbody>
                                        </table>
                                    </div>
                                    <div className="flex-shrink-0 flex-col space-y-3 border-t border-subtle pt-3">
                                        <RuleCreator data={newRuleData} setData={setNewRuleData} onAdd={handleAddRule} />
                                        <div className="flex items-center gap-2">
                                            <input type="text" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddGroup(selectedGroupId)} placeholder="Nuevo subgrupo..." className="flex-grow bg-background border border-subtle rounded-md py-1 px-2 text-sm"/>
                                            <button onClick={() => handleAddGroup(selectedGroupId)} className="p-2 bg-accent text-white rounded-md hover:bg-accent-hover"><PlusIcon className="h-4 w-4"/></button>
                                        </div>
                                    </div>
                                </> : <div className="flex h-full items-center justify-center text-text-secondary"><p>Selecciona un paradigma para editar sus reglas.</p></div>}
                            </div>
                        </div>
                    ) : (
                        <div className="p-8 h-full overflow-y-auto custom-scrollbar space-y-8 animate-fade-in">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="text-xl font-bold text-text-primary mb-1">Reglas de Cambio Fonológico</h3>
                                    <p className="text-sm text-text-secondary">Define cómo interactúan los sonidos (Asimilaciones, Sandhi, etc.)</p>
                                </div>
                                <button onClick={() => setShowRegexHelp(!showRegexHelp)} className="flex items-center gap-2 text-accent hover:text-accent-hover transition-colors text-sm font-bold">
                                    <InfoIcon className="w-4 h-4" /> Guía Regex
                                </button>
                            </div>

                            {showRegexHelp && (
                                <div className="bg-surface border border-accent/20 p-4 rounded-lg relative animate-fade-in">
                                    <h4 className="font-bold mb-2 text-accent">Sintaxis Regex Rápida</h4>
                                    <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                                        <div><span className="text-accent">^</span>: Inicio | <span className="text-accent">$</span>: Final</div>
                                        <div><span className="text-accent">[aeiou]</span>: Vocales</div>
                                        <div><span className="text-accent">(a|e)</span>: Alternativa</div>
                                        <div><span className="text-accent">(.)\1</span>: Duplicados</div>
                                    </div>
                                    <button onClick={() => setShowRegexHelp(false)} className="absolute top-2 right-2 text-text-secondary"><XCircleIcon className="w-4 h-4" /></button>
                                </div>
                            )}

                            <div className="bg-background-dark border border-subtle rounded-lg p-6 shadow-sm">
                                <div className="flex flex-wrap gap-2 mb-6">
                                    <span className="text-xs font-bold text-text-secondary uppercase self-center mr-2">Presets:</span>
                                    {PRESETS.map((p, idx) => (
                                        <button key={idx} onClick={() => setNewPhonoRule({ name: p.name, matchPattern: p.match, replacement: p.replace, isRegex: p.isRegex })} className="px-3 py-1 text-xs bg-surface border border-subtle rounded-md hover:border-accent transition-colors" title={p.description}>{p.name}</button>
                                    ))}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                                    <div className="md:col-span-3">
                                        <label className="text-[10px] font-bold text-text-secondary uppercase mb-1 block tracking-wider">Nombre</label>
                                        <input type="text" value={newPhonoRule.name} onChange={e => setNewPhonoRule({ ...newPhonoRule, name: e.target.value })} className="w-full bg-surface border border-subtle rounded px-3 py-2 text-sm focus:border-accent outline-none" placeholder="Asimilación..."/>
                                    </div>
                                    <div className="md:col-span-3">
                                        <label className="text-[10px] font-bold text-text-secondary uppercase mb-1 block tracking-wider">Buscar</label>
                                        <input type="text" value={newPhonoRule.matchPattern} onChange={e => setNewPhonoRule({ ...newPhonoRule, matchPattern: e.target.value })} className="w-full bg-surface border border-subtle rounded px-3 py-2 text-sm font-mono focus:border-accent outline-none" placeholder="np"/>
                                    </div>
                                    <div className="md:col-span-1 flex justify-center pb-2 text-text-secondary font-bold">→</div>
                                    <div className="md:col-span-3">
                                        <label className="text-[10px] font-bold text-text-secondary uppercase mb-1 block tracking-wider">Resultado</label>
                                        <input type="text" value={newPhonoRule.replacement} onChange={e => setNewPhonoRule({ ...newPhonoRule, replacement: e.target.value })} className="w-full bg-surface border border-subtle rounded px-3 py-2 text-sm font-mono focus:border-accent outline-none" placeholder="mp"/>
                                    </div>
                                    <div className="md:col-span-2">
                                        <button onClick={handleAddPhonoRule} className="w-full py-2 bg-accent text-white rounded font-bold hover:bg-accent-hover transition-colors">Añadir</button>
                                    </div>
                                </div>
                                <div className="mt-4 flex items-center gap-2">
                                    <input type="checkbox" id="isRegex" checked={newPhonoRule.isRegex} onChange={e => setNewPhonoRule({ ...newPhonoRule, isRegex: e.target.checked })} />
                                    <label htmlFor="isRegex" className="text-xs text-text-secondary font-bold">Modo Expresión Regular (Expertos)</label>
                                </div>

                                <div className="mt-6 p-4 bg-background border border-subtle rounded-lg flex items-center gap-4">
                                    <div className="flex-1">
                                        <label className="text-[10px] font-bold text-text-secondary uppercase mb-1 block">Prueba en vivo:</label>
                                        <input type="text" value={testString} onChange={e => setTestString(e.target.value)} className="w-full bg-transparent border-none outline-none font-mono text-white" />
                                    </div>
                                    <div className="text-accent font-bold">→</div>
                                    <div className="flex-1">
                                        <label className="text-[10px] font-bold text-text-secondary uppercase mb-1 block">Resultado:</label>
                                        <div className="font-mono text-accent">{previewResult}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {(localProfile.phonologicalRules || []).map((rule, idx) => (
                                    <div key={rule.id} className="flex items-center justify-between p-4 bg-surface border border-subtle rounded-lg group">
                                        <div className="flex items-center gap-4">
                                            <div className="text-accent text-sm font-bold">#{idx + 1}</div>
                                            <div>
                                                <div className="font-bold text-text-primary text-sm">{rule.name}</div>
                                                <div className="text-xs font-mono text-text-secondary mt-1">
                                                    <span className="text-white">{rule.matchPattern}</span> → <span className="text-accent">{rule.replacement}</span>
                                                    {rule.isRegex && <span className="ml-2 text-[8px] bg-accent/20 text-accent px-1 rounded">REGEX</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <button onClick={() => handleDeletePhonoRule(rule.id)} className="p-2 text-text-secondary hover:text-danger hover:bg-danger/10 rounded-full transition-colors"><TrashIcon className="w-4 h-4" /></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </main>
                <footer className="p-4 flex justify-end gap-4 border-t border-subtle flex-shrink-0">
                    <button onClick={onClose} className="px-4 py-2 bg-subtle text-text-primary font-semibold rounded-md hover:bg-gray-600 transition-colors">Cancelar</button>
                    <button onClick={() => onSave(localProfile)} className="px-6 py-2 bg-accent text-white font-semibold rounded-md shadow-lg hover:bg-accent-hover transition-colors">Guardar Cambios</button>
                </footer>
            </div>
        </div>
    );
};

const ParadigmGroup: FC<{ group: InflectionParadigm; level: number; selectedGroupId: string | null; setSelectedGroupId: (id: string) => void; handleDeleteGroup: (id: string) => void; handleStartEditingGroup: (g: InflectionParadigm) => void; }> = memo(({ group, level, selectedGroupId, setSelectedGroupId, handleDeleteGroup, handleStartEditingGroup }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const isSelected = selectedGroupId === group.id;
    return (
        <div style={{ marginLeft: `${level * 16}px` }}>
            <div className={`w-full text-left p-1 rounded-md flex items-center justify-between text-sm group ${isSelected ? 'bg-accent text-white font-semibold' : 'text-text-primary hover:bg-subtle/50'}`}>
                <button onClick={() => setIsExpanded(!isExpanded)} className="p-1"><ChevronRightIcon className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} /></button>
                <button onClick={() => setSelectedGroupId(group.id)} className="flex-grow text-left truncate mx-1">{group.name}</button>
                <div className={`flex items-center gap-1 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                    <button onClick={() => handleStartEditingGroup(group)} className="p-1 rounded-full hover:bg-white/20"><EditIcon className="h-4 w-4"/></button>
                    <button onClick={() => handleDeleteGroup(group.id)} className="p-1 rounded-full hover:bg-white/20"><TrashIcon className="h-4 w-4"/></button>
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
        <td className="p-2 text-right"><div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => onEdit(rule)} className="p-1 text-blue-400 hover:text-accent rounded" title="Editar"><EditIcon className="h-4 w-4"/></button>
            <button onClick={() => onDelete(rule.id)} className="p-1 text-danger/70 hover:text-danger rounded-full hover:bg-danger/20" title="Eliminar"><XCircleIcon className="h-4 w-4"/></button>
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
                <button onClick={onSave} className="px-3 py-1 text-sm bg-success text-white rounded hover:bg-green-400 flex items-center gap-1"><SaveIcon className="h-4 w-4"/> Guardar</button>
            </div>
        </div></td>
    </tr>
));
RuleEditor.displayName = 'RuleEditor';

const RuleCreator: FC<{ data: any; setData: (d: any) => void; onAdd: () => void; }> = memo(({ data, setData, onAdd }) => (
    <div className="p-2 bg-background rounded-md">
        <h4 className="text-md font-semibold text-text-secondary mb-2">Añadir Nueva Regla</h4>
        <div className="flex items-center gap-2 mb-2">
            <input type="text" placeholder="Nombre (ej: Plural)" value={data.name} onChange={e => setData({...data, name: e.target.value})} className="flex-grow bg-surface border-subtle rounded py-1 px-2 text-sm" />
            <select value={data.type} onChange={e => setData({...data, type: e.target.value})} className="bg-surface border-subtle rounded py-1 px-2 text-sm"><option value="simple">Simple</option><option value="conditional">Condicional</option></select>
        </div>
        {data.type === 'simple' ? <SimpleRuleEditor value={data.template} onChange={template => setData({...data, template})} />
        : <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
                <select value={data.conditionType} onChange={e => setData({...data, conditionType: e.target.value})} className="w-full bg-surface border-subtle rounded py-1 px-2 mb-1"><option value="endsWith">Si termina con</option><option value="startsWith">Si empieza con</option><option value="contains">Si contiene</option></select>
                <input type="text" placeholder="Valor..." value={data.conditionValue} onChange={e => setData({...data, conditionValue: e.target.value})} className="w-full bg-surface border-subtle rounded py-1 px-2" />
            </div>
            <div>
                <select value={data.actionType} onChange={e => setData({...data, actionType: e.target.value})} className="w-full bg-surface border-subtle rounded py-1 px-2 mb-1"><option value="replaceEnding">Reemplazar final</option><option value="addSuffix">Añadir sufijo</option><option value="addPrefix">Añadir prefijo</option></select>
                <input type="text" placeholder="Valor..." value={data.actionValue} onChange={e => setData({...data, actionValue: e.target.value})} className="w-full bg-surface border-subtle rounded py-1 px-2" />
            </div>
        </div>}
        <button onClick={onAdd} className="w-full mt-2 text-sm p-2 bg-accent text-white rounded hover:bg-accent-hover font-semibold">+ Añadir Regla</button>
    </div>
));
RuleCreator.displayName = 'RuleCreator';

export default memo(InflectionModal);