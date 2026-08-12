import React, { useState, useEffect } from 'react';
import { GenerativeProfile, LexiconEntry, DerivationalAffix, GrammarManifest } from '../types';
import SparkleIcon from './icons/SparkleIcon';
import Tooltip from './Tooltip';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';
import EditIcon from './icons/EditIcon';
import SaveIcon from './icons/SaveIcon';
import CancelIcon from './icons/CancelIcon';
import { analyzePhonemes } from '../services/geminiService';
import { phonologyFromManifest } from '../services/grammar/phonologySync';
import { lintPhonotactics } from '../services/phonology/linter';
import PhonotacticLinterFeedback from './PhonotacticLinterFeedback';

export type PhonologySyncPayload = {
    consonants: string[];
    vowels: string[];
    syllableStructures: string[];
    consonantClusters: string[];
    vowelClusters: string[];
};

interface GenerativeProfileEditorProps {
    profile: GenerativeProfile;
    lexicon: LexiconEntry[];
    showNotification: (message: string, type: 'success' | 'error') => void;
    onSave: (profile: GenerativeProfile) => void;
    onCancel?: () => void;
    manifest?: GrammarManifest;
    onSyncPhonology?: (p: PhonologySyncPayload) => void;
}

const GenerativeProfileEditor = ({ profile, lexicon, showNotification, onSave, onCancel, manifest, onSyncPhonology }: GenerativeProfileEditorProps) => {
    const [formData, setFormData] = useState<GenerativeProfile>({ ...profile });
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [newAffix, setNewAffix] = useState<DerivationalAffix>({ affix: '', type: 'sufijo', meaning: '' });
    const [editingAffixIndex, setEditingAffixIndex] = useState<number | null>(null);

    const [vowelsInput, setVowelsInput] = useState('');
    const [consonantsInput, setConsonantsInput] = useState('');
    const [syllableStructuresInput, setSyllableStructuresInput] = useState('');

    useEffect(() => {
        const initialProfile = {
            ...profile,
            consonants: profile.consonants || [],
            vowels: profile.vowels || [],
            syllableStructures: profile.syllableStructures || [],
            consonantClusters: profile.consonantClusters || [],
            vowelClusters: profile.vowelClusters || [],
            derivationalAffixes: profile.derivationalAffixes || [],
        };
        setFormData(initialProfile);
        setVowelsInput(initialProfile.vowels.join(', '));
        setConsonantsInput(initialProfile.consonants.join(', '));
        setSyllableStructuresInput(initialProfile.syllableStructures.join(', '));
    }, [profile]);

    const handleRegularChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleListBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const cleanedArray = value.split(',').map(s => s.trim()).filter(Boolean);
        setFormData(prev => ({ ...prev, [name]: cleanedArray }));

        const cleanedString = cleanedArray.join(', ');
        switch (name) {
            case 'vowels': setVowelsInput(cleanedString); break;
            case 'consonants': setConsonantsInput(cleanedString); break;
            case 'syllableStructures': setSyllableStructuresInput(cleanedString); break;
        }
    };

    const handleAnalyzeLexicon = async () => {
        if (lexicon.length === 0) {
            showNotification("El léxico está vacío. Añade algunas palabras antes de analizar.", "error");
            return;
        }
        setIsAnalyzing(true);
        try {
            const results = await analyzePhonemes(lexicon);
            setFormData(prev => ({ ...prev, ...results }));
            showNotification("Se analizaron correctamente los fonemas y estructuras del léxico.", "success");
        } catch (error: any) {
            showNotification(error.message || "No se pudieron analizar los fonemas.", "error");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleSaveAffix = () => {
        if (!newAffix.meaning.trim()) return;

        if (editingAffixIndex !== null) {
            if (newAffix.affix.trim()) {
                const updatedAffixes = [...(formData.derivationalAffixes || [])];
                updatedAffixes[editingAffixIndex] = { ...newAffix, affix: newAffix.affix.trim() };
                setFormData(prev => ({ ...prev, derivationalAffixes: updatedAffixes }));
            }
            handleCancelEdit();
        } else {
            const affixesToAdd = newAffix.affix
                .split(/[\s,]+/)
                .map(a => a.trim())
                .filter(Boolean);

            if (affixesToAdd.length > 0) {
                const newAffixes: DerivationalAffix[] = affixesToAdd.map(affixString => ({
                    affix: affixString,
                    type: newAffix.type,
                    meaning: newAffix.meaning,
                }));

                setFormData(prev => ({
                    ...prev,
                    derivationalAffixes: [...(prev.derivationalAffixes || []), ...newAffixes]
                }));
                setNewAffix({ affix: '', type: 'sufijo', meaning: '' });
            }
        }
    };

    const handleRemoveAffix = (index: number) => {
        setFormData(prev => ({
            ...prev,
            derivationalAffixes: (prev.derivationalAffixes || []).filter((_, i) => i !== index)
        }));
    };

    const handleStartEdit = (index: number) => {
        const affixToEdit = formData.derivationalAffixes[index];
        setEditingAffixIndex(index);
        setNewAffix(affixToEdit);
    };

    const handleCancelEdit = () => {
        setEditingAffixIndex(null);
        setNewAffix({ affix: '', type: 'sufijo', meaning: '' });
    };

    const handleSave = () => {
        onSave(formData);
    };

    const formatAffix = (affix: DerivationalAffix) => {
        switch (affix.type) {
            case 'prefijo': return `${affix.affix}-`;
            case 'sufijo': return `-${affix.affix}`;
            case 'infijo': return `-${affix.affix}-`;
            case 'desinencia': return `-${affix.affix}`;
            default: return affix.affix;
        }
    };

    const renderReadOnlyList = (title: string, items: string[], tooltip: string) => (
        <div>
            <label className="flex items-center text-sm font-medium text-text-secondary mb-1">
                {title}
                <Tooltip text={tooltip} />
            </label>
            <div className="w-full bg-background border border-subtle rounded-md p-2 min-h-[40px] text-text-secondary text-sm">
                {items.length > 0 ? items.join(', ') : 'N/A (analiza el léxico)'}
            </div>
        </div>
    );

    return (
        <div className="flex flex-col h-full">
            <div className="flex-grow overflow-y-auto p-5 space-y-8">
                <section>
                    <h3 className="text-lg font-semibold text-text-primary mb-3">Fonología y Fonotáctica</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="vowels" className="flex items-center text-sm font-medium text-text-secondary mb-1">
                                Vocales Permitidas
                                <Tooltip text="Una lista separada por comas de todos los sonidos vocálicos permitidos en tu idioma. La IA solo usará estos." />
                            </label>
                            <input type="text" id="vowels" name="vowels" value={vowelsInput}
                                onChange={e => setVowelsInput(e.target.value)}
                                onBlur={handleListBlur}
                                className="w-full bg-background border border-subtle rounded-md shadow-sm py-2 px-4 text-text-primary text-base focus:outline-none focus:ring-2 focus:ring-accent"
                                placeholder="a, e, i, o, u" />
                        </div>
                        <div>
                            <label htmlFor="consonants" className="flex items-center text-sm font-medium text-text-secondary mb-1">
                                Consonantes Permitidas
                                <Tooltip text="Una lista separada por comas de todos los sonidos consonánticos permitidos. Los dígrafos (ch, sh) son válidos." />
                            </label>
                            <input type="text" id="consonants" name="consonants" value={consonantsInput}
                                onChange={e => setConsonantsInput(e.target.value)}
                                onBlur={handleListBlur}
                                className="w-full bg-background border border-subtle rounded-md shadow-sm py-2 px-4 text-text-primary text-base focus:outline-none focus:ring-2 focus:ring-accent"
                                placeholder="p, t, k, m, n, s" />
                        </div>
                        <div className="md:col-span-2">
                            <label htmlFor="syllableStructures" className="flex items-center text-sm font-medium text-text-secondary mb-1">
                                Estructuras Silábicas Permitidas
                                <Tooltip text="Define las plantillas de sílabas permitidas (C=Consonante, V=Vocal), separadas por comas. Ej: CV, CVC, VC." />
                            </label>
                            <input type="text" id="syllableStructures" name="syllableStructures" value={syllableStructuresInput}
                                onChange={e => setSyllableStructuresInput(e.target.value)}
                                onBlur={handleListBlur}
                                className="w-full bg-background border border-subtle rounded-md shadow-sm py-2 px-4 text-text-primary text-base focus:outline-none focus:ring-2 focus:ring-accent"
                                placeholder="CV, CVC, VC" />
                        </div>
                        {renderReadOnlyList("Clusters de Consonantes Detectados", formData.consonantClusters, "Grupos de consonantes (CC, CCC) encontrados en tu léxico al analizar.")}
                        {renderReadOnlyList("Clusters de Vocales Detectados", formData.vowelClusters, "Grupos de vocales (VV, VVV) encontrados en tu léxico al analizar.")}
                    </div>
                    <div className="mt-6 flex flex-wrap items-center gap-3">
                        <button onClick={handleAnalyzeLexicon} disabled={isAnalyzing} className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-transparent border-2 border-accent text-accent font-semibold rounded-md shadow-sm hover:bg-accent hover:text-white disabled:opacity-50 transition-colors">
                            <SparkleIcon className={`h-5 w-5 ${isAnalyzing ? 'animate-spin' : ''}`} />
                            {isAnalyzing ? 'Analizando...' : 'Analizar Léxico (con IA)'}
                        </button>
                        {manifest && onSyncPhonology && (
                            <button
                                type="button"
                                onClick={() => onSyncPhonology(phonologyFromManifest(manifest))}
                                disabled={!manifest.phonology}
                                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-transparent border-2 border-subtle text-text-primary font-semibold rounded-md shadow-sm hover:bg-subtle/30 disabled:opacity-50 transition-colors"
                                title={manifest.phonology ? 'Copia consonantes, vocales y estructuras silábicas del manifiesto gramatical al perfil generativo.' : 'El manifiesto gramatical no tiene fonología definida.'}
                            >
                                Copiar fonología al perfil
                            </button>
                        )}
                    </div>
                </section>
                <section>
                    <h3 className="text-lg font-semibold text-text-primary mb-3 flex items-center">
                        Afijos Derivacionales
                        <Tooltip text="Define prefijos y sufijos para crear familias de palabras. La IA los usará en el modo 'Derivacional'." />
                    </h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto bg-background/50 p-2 rounded-md">
                        {(formData.derivationalAffixes || []).map((affix, index) => (
                            <div key={index} className="flex items-center justify-between gap-2 p-2 bg-background rounded">
                                <span className="font-mono text-accent">{formatAffix(affix)}</span>
                                <span className="text-text-primary flex-grow mx-4">({affix.type}) {affix.meaning}</span>
                                <div className="flex items-center gap-3">
                                    <button onClick={() => handleStartEdit(index)} className="text-blue-400 hover:text-accent"><EditIcon className="h-4 w-4" /></button>
                                    <button onClick={() => handleRemoveAffix(index)} className="text-danger hover:text-danger-hover"><TrashIcon className="h-4 w-4" /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex flex-col sm:flex-row items-end gap-2 mt-3 p-3 bg-background/50 rounded-md">
                        <div className="flex-1 w-full sm:w-auto">
                            <label className="flex items-center text-xs font-medium text-text-secondary mb-1">
                                {editingAffixIndex !== null ? 'Afijo' : 'Afijo(s)'}
                                {editingAffixIndex === null && <Tooltip text="Ingrese sus afijos sin guiones, separados por comas o espacios." />}
                            </label>
                            <input type="text" placeholder="Ej: on, ona" value={newAffix.affix} onChange={e => setNewAffix(p => ({ ...p, affix: e.target.value }))} className="w-full bg-background border border-subtle rounded py-1 px-2 text-sm" />
                        </div>
                        <div className="w-full sm:w-auto">
                            <label className="block text-xs font-medium text-text-secondary mb-1">Tipo</label>
                            <select value={newAffix.type} onChange={e => setNewAffix(p => ({ ...p, type: e.target.value as any }))} className="w-full bg-background border border-subtle rounded py-1 px-2 text-sm">
                                <option value="sufijo">Sufijo</option>
                                <option value="prefijo">Prefijo</option>
                                <option value="infijo">Infijo</option>
                                <option value="desinencia">Desinencia</option>
                            </select>
                        </div>
                        <div className="flex-2 w-full sm:w-auto">
                            <label className="block text-xs font-medium text-text-secondary mb-1">Significado</label>
                            <input type="text" placeholder="Ej: aumentativo" value={newAffix.meaning} onChange={e => setNewAffix(p => ({ ...p, meaning: e.target.value }))} className="w-full bg-background border border-subtle rounded py-1 px-2 text-sm" />
                        </div>
                        {editingAffixIndex !== null ? (
                            <div className="flex gap-2">
                                <button onClick={handleSaveAffix} className="p-2 bg-success text-white rounded hover:bg-green-400 flex-shrink-0" title="Guardar cambios"><SaveIcon className="h-4 w-4" /></button>
                                <button onClick={handleCancelEdit} className="p-2 bg-subtle text-white rounded hover:bg-gray-600 flex-shrink-0" title="Cancelar edición"><CancelIcon className="h-4 w-4" /></button>
                            </div>
                        ) : (
                            <button onClick={handleSaveAffix} className="p-2 bg-accent text-white rounded hover:bg-accent-hover flex-shrink-0" title="Añadir afijo"><PlusIcon className="h-4 w-4" /></button>
                        )}
                    </div>
                </section>
                <section>
                    <h3 className="text-lg font-semibold text-text-primary mb-3 flex items-center">
                        Sabor del Lenguaje
                        <Tooltip text="Pega aquí un texto de muestra que represente cómo quieres que suene tu idioma. La IA lo usará como inspiración para la frecuencia de sonidos y la longitud de las palabras." />
                    </h3>
                    <textarea id="sampleText" name="sampleText" value={formData.sampleText} onChange={handleRegularChange} rows={5}
                        className="w-full bg-background border border-subtle rounded-md shadow-sm p-4 font-mono text-base text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                        placeholder="ka vrak tam pa taka da liv kere..." />
                    
                    {/* Phonotactic Linter Feedback */}
                    {formData.sampleText && formData.consonants.length > 0 && formData.vowels.length > 0 && (
                        <PhonotacticLinterFeedback 
                            text={formData.sampleText}
                            consonants={formData.consonants}
                            vowels={formData.vowels}
                            syllableStructures={formData.syllableStructures}
                            consonantClusters={formData.consonantClusters}
                        />
                    )}
                </section>
            </div>
            <footer className="shrink-0 p-4 flex justify-end gap-4 border-t border-subtle bg-surface flex-shrink-0">
                {onCancel && (
                    <button onClick={onCancel} className="px-4 py-2 bg-subtle text-text-primary font-semibold rounded-md shadow-sm hover:bg-gray-600 transition-colors">
                        Cancelar
                    </button>
                )}
                <button onClick={handleSave} className="px-6 py-2 bg-accent text-white font-semibold rounded-md shadow-lg hover:bg-accent-hover transition-colors">
                    Guardar Perfil
                </button>
            </footer>
        </div>
    );
};

export default GenerativeProfileEditor;
