import { useState, useMemo, memo } from 'react';
import Papa from 'papaparse';
import { LexiconEntry, InflectionProfile, InflectionParadigm, InflectionRule } from '../types';
import GitMergeIcon from './icons/GitMergeIcon';
import XCircleIcon from './icons/XCircleIcon';
import DownloadIcon from './icons/DownloadIcon';

interface InflectionGeneratorModalProps {
    entry: LexiconEntry | null;
    profile: InflectionProfile;
    onClose: () => void;
}

const filterParadigmsForFunction = (paradigms: InflectionParadigm[], targetFunction: string): InflectionParadigm[] => {
    if (!paradigms) return [];
    const results: InflectionParadigm[] = [];
    for (const paradigm of paradigms) {
        const applies = !paradigm.appliesTo || paradigm.appliesTo.length === 0 || paradigm.appliesTo.includes(targetFunction);
        const filteredSubParadigms = paradigm.paradigms ? filterParadigmsForFunction(paradigm.paradigms, targetFunction) : [];
        if (applies || filteredSubParadigms.length > 0) {
            results.push({ ...paradigm, paradigms: filteredSubParadigms });
        }
    }
    return results;
};

const getParadigmOptions = (paradigms: InflectionParadigm[], prefix = ''): { label: string, value: string }[] => {
    let options: { label: string, value: string }[] = [];
    for (const paradigm of paradigms) {
        const label = prefix ? `${prefix} > ${paradigm.name}` : paradigm.name;
        options.push({ label, value: paradigm.id });
        if (paradigm.paradigms?.length) {
            options = options.concat(getParadigmOptions(paradigm.paradigms, label));
        }
    }
    return options;
};

const findParadigmById = (paradigms: InflectionParadigm[], id: string): InflectionParadigm | null => {
    for (const paradigm of paradigms) {
        if (paradigm.id === id) return paradigm;
        if (paradigm.paradigms) {
            const found = findParadigmById(paradigm.paradigms, id);
            if (found) return found;
        }
    }
    return null;
};

const InflectionGeneratorModal = ({ entry, profile, onClose }: InflectionGeneratorModalProps) => {
    const [selectedParadigmId, setSelectedParadigmId] = useState<string>('');

    const paradigmOptions = useMemo(() => {
        if (!entry) return [];
        return getParadigmOptions(filterParadigmsForFunction(profile.paradigms || [], entry.Categoría));
    }, [profile.paradigms, entry]);

    const selectedParadigm = useMemo(() => {
        return selectedParadigmId ? findParadigmById(profile.paradigms || [], selectedParadigmId) : null;
    }, [profile.paradigms, selectedParadigmId]);

    const inflectedForms = useMemo(() => {
        if (!entry || !selectedParadigm) return [];
        
        const baseLexeme = (entry.Léxema[0] || entry.Raíz).replace(/-$/, '');

        const applyRule = (rule: InflectionRule): { name: string, result: string } => {
            let result = baseLexeme;
            if (rule.type === 'simple') {
                result = rule.template.replace(/\{RAÍZ\}|\[RAÍZ\]/g, baseLexeme);
            } else if (rule.type === 'conditional') {
                const conditionMet = 
                    (rule.conditionType === 'endsWith' && baseLexeme.endsWith(rule.conditionValue)) ||
                    (rule.conditionType === 'startsWith' && baseLexeme.startsWith(rule.conditionValue)) ||
                    (rule.conditionType === 'contains' && baseLexeme.includes(rule.conditionValue));
                
                if (conditionMet) {
                    if (rule.actionType === 'replaceEnding' && baseLexeme.endsWith(rule.conditionValue)) {
                        result = baseLexeme.slice(0, -rule.conditionValue.length) + rule.actionValue;
                    } else if (rule.actionType === 'addSuffix') {
                        result = baseLexeme + rule.actionValue;
                    } else if (rule.actionType === 'addPrefix') {
                        result = rule.actionValue + baseLexeme;
                    }
                }
            }
            return { name: rule.name, result };
        };

        const getAllRules = (paradigm: InflectionParadigm): { name: string, result: string }[] => [
            ...paradigm.rules.map(applyRule),
            ...(paradigm.paradigms?.flatMap(getAllRules) || [])
        ];
        return getAllRules(selectedParadigm);
    }, [entry, selectedParadigm]);

    const handleExport = () => {
        if (!entry || inflectedForms.length === 0) return;
        const csv = Papa.unparse(inflectedForms.map(f => ({ "Forma / Caso": f.name, "Resultado": f.result })));
        const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        const safeFilename = (entry.Léxema[0] || 'palabra').replace(/[^a-z0-9]/gi, '_');
        link.download = `flexiones_${safeFilename}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (!entry) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4 animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="inflect-title">
            <div className="bg-surface rounded-lg shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col border border-subtle">
                <header className="p-4 flex justify-between items-center border-b border-subtle flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <GitMergeIcon className="h-7 w-7 text-accent" />
                        <div>
                            <h2 id="inflect-title" className="text-2xl font-bold text-text-primary">Flexiones para: <span className="text-accent">{entry.Léxema[0]}</span></h2>
                            <p className="text-sm text-text-secondary">Raíz: <code className="font-mono bg-background px-1 rounded">{entry.Raíz}</code> / Base: <code className="font-mono bg-background px-1 rounded">{(entry.Léxema[0] || entry.Raíz).replace(/-$/, '')}</code></p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-full text-text-secondary hover:bg-subtle" aria-label="Cerrar"><XCircleIcon className="h-7 w-7" /></button>
                </header>
                <main className="p-6 flex-grow overflow-y-auto space-y-4">
                    <div>
                        <label htmlFor="paradigm-select" className="block text-sm font-medium text-text-secondary mb-1">Seleccionar Paradigma (Filtrado por: {entry.Categoría})</label>
                        <select id="paradigm-select" value={selectedParadigmId} onChange={e => setSelectedParadigmId(e.target.value)} className="w-full bg-background border border-subtle rounded-md shadow-sm py-2 px-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent">
                            <option value="">-- Elige un grupo de reglas --</option>
                            {paradigmOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                    </div>
                    <div className="border border-subtle rounded-md max-h-96 overflow-y-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="sticky top-0 bg-surface/80 backdrop-blur-sm z-10"><tr className="border-b border-subtle">
                                <th className="p-3 font-semibold text-text-secondary w-1/2">Forma / Caso</th>
                                <th className="p-3 font-semibold text-text-secondary w-1/2">Resultado</th>
                            </tr></thead>
                            <tbody>
                                {selectedParadigm ? inflectedForms.length > 0 ? inflectedForms.map((form, index) => (
                                    <tr key={`${form.name}-${index}`} className="border-t border-subtle hover:bg-subtle/30">
                                        <td className="p-3 text-text-primary font-medium">{form.name}</td>
                                        <td className="p-3 text-accent font-mono text-base">{form.result}</td>
                                    </tr>
                                )) : <tr><td colSpan={2} className="p-8 text-center text-text-secondary">Este paradigma no tiene reglas.</td></tr>
                                : <tr><td colSpan={2} className="p-8 text-center text-text-secondary">Selecciona un paradigma para ver los resultados.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </main>
                <footer className="p-4 flex justify-between items-center gap-4 border-t border-subtle flex-shrink-0">
                    <button onClick={handleExport} disabled={!selectedParadigm || inflectedForms.length === 0} className="flex items-center gap-2 px-4 py-2 bg-subtle text-text-primary font-semibold rounded-md shadow-sm hover:bg-gray-600 transition-colors disabled:opacity-50">
                        <DownloadIcon className="h-5 w-5" />Exportar como CSV
                    </button>
                    <button onClick={onClose} className="px-6 py-2 bg-accent text-white font-semibold rounded-md shadow-lg hover:bg-accent-hover transition-colors">Cerrar</button>
                </footer>
            </div>
        </div>
    );
};

export default memo(InflectionGeneratorModal);
