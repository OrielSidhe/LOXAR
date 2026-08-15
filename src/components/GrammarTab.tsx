import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { GrammarManifest, SyntacticRole, MorphosyntacticStrategy, StrategyType, LexiconEntry, GrammarAffix } from '../types';
import SaveIcon from './icons/SaveIcon';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';
import SparkleIcon from './icons/SparkleIcon';
import DownloadIcon from './icons/DownloadIcon';
const GrammarImporterModal = lazy(() => import('./GrammarImporterModal'));
import { FlexibleGrammar } from '../types/grammar-flexible';
import InfoHint from './InfoHint';
import GrammarWizard from './GrammarWizard';
import { displayOfRole, STRATEGY_TYPE_LABELS as TAX_STRATEGY_LABELS } from '../data/taxonomy';
import { realizeClause, validatePhonology, buildClauseAST, astToDiagram } from '../services/grammar';
import SyntaxCanvasAST from './SyntaxCanvasAST';
import ASTEditor from './ASTEditor';
import { cloneClauseAST, realizeEditedTree } from '../services/grammar/ast-view';
import { isAiAvailable } from '../services/geminiService';
import { validatePostImport } from '../services/grammar/postImportValidator';
import ImportReport from './ImportReport';
import GrammarOverview from './GrammarOverview';
import GrammarPhonologyPanel from './GrammarPhonologyPanel';
import GrammarTypologyPanel from './GrammarTypologyPanel';
import GrammarNotesPanel from './GrammarNotesPanel';
import GrammarStrategiesPanel from './GrammarStrategiesPanel';
import GrammarMorphologyPanel from './GrammarMorphologyPanel';
import GrammarRolesPanel from './GrammarRolesPanel';
import { normalizeCategory, getEntryLabel, getEntryForm, getDefaultPreviewEntries, buildPreviewSentence, DEFAULT_TYPOLOGY, isMeaningfulTypology } from '../utils/grammarPreview';

interface GrammarTabProps {
    manifest: GrammarManifest;
    onSave: (newManifest: GrammarManifest) => void;
    lexicon?: LexiconEntry[];
    conlangName?: string;
    onAddLexicalException?: (entryId: string, featureKey: string, surfaceForm: string) => void;
    onExportGrammar?: () => void;
}

type GrammarModule = 'overview' | 'phonology' | 'typology' | 'morphology' | 'syntax' | 'semantics' | 'roles' | 'strategies' | 'notes';

interface ProgressMetric {
    category: string;
    completed: number;
    total: number;
    items: string[];
}

// Module-level guard so the first-run wizard auto-opens at most ONCE per session
// (not localStorage — keeps it simple and resets on reload, exactly as required).
let wizardAutoOpenedThisSession = false;

const GrammarTab = ({ manifest, onSave, lexicon = [], conlangName, onAddLexicalException, onExportGrammar }: GrammarTabProps) => {
    const [activeModule, setActiveModule] = useState<GrammarModule>('syntax');
    const [editedManifest, setEditedManifest] = useState<GrammarManifest>(JSON.parse(JSON.stringify(manifest)));
    const [isDirty, setIsDirty] = useState(false);
    const [isImporterOpen, setIsImporterOpen] = useState(false);
    const [syntaxSubTab, setSyntaxSubTab] = useState<'canvas' | 'ast' | 'preview'>('canvas');
    const [aiAvailable, setAiAvailable] = useState(true);
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    // Editable clause AST for the "Árbol AST" editor (seeded from the preview).
    const [editableAst, setEditableAst] = useState<any>(null);
    const [importReport, setImportReport] = useState<ReturnType<typeof validatePostImport> | null>(null);

    useEffect(() => {
        isAiAvailable().then(setAiAvailable);
    }, []);

    useEffect(() => {
        setEditedManifest(JSON.parse(JSON.stringify(manifest)));
        setIsDirty(false);
    }, [manifest]);

    useEffect(() => {
        const handler = (e: Event) => {
            const detail = (e as CustomEvent).detail as { entryId: string; featureKey: string; surfaceForm: string };
            onAddLexicalException?.(detail.entryId, detail.featureKey, detail.surfaceForm);
        };
        window.addEventListener('loxar:addLexicalException', handler);
        return () => window.removeEventListener('loxar:addLexicalException', handler);
    }, [onAddLexicalException]);

    // First-run detection: empty manifest (no paradigms, no phonology, default
    // typology) → auto-open the wizard exactly once per session.
    const isFirstRun = (manifest.paradigms ?? []).length === 0 && !manifest.phonology && !isMeaningfulTypology(manifest.typology);
    useEffect(() => {
        if (isFirstRun && !wizardAutoOpenedThisSession) {
            wizardAutoOpenedThisSession = true;
            setIsWizardOpen(true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isFirstRun]);

    // Auto-seed the canvas ONCE from the engine when it is effectively empty
    // and the user is on the canvas subtab. Guards against infinite loops by
    // only writing when the canvas is actually empty.
    useEffect(() => {
        if (syntaxSubTab !== 'canvas') return;
        const empty = editedManifest.syntaxCanvas == null || (editedManifest.syntaxCanvas.nodes?.length ?? 0) === 0;
        if (empty) updateManifest({ syntaxCanvas: preview.canvas });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [syntaxSubTab]);

    const handleWizardApply = (newManifest: GrammarManifest) => {
        setEditedManifest(newManifest);
        onSave(newManifest);
        setIsWizardOpen(false);
    };

    const handleSave = () => {
        onSave({
            ...editedManifest,
            meta: {
                ...editedManifest.meta,
                lastUpdated: new Date().toISOString()
            }
        });
        setIsDirty(false);
    };

    const updateManifest = (updates: Partial<GrammarManifest>) => {
        setEditedManifest(prev => ({ ...prev, ...updates }));
        setIsDirty(true);
    };

    const handleSaveFlexibleGrammar = (grammar: FlexibleGrammar) => {
        const importedManifest: GrammarManifest = grammar.structured?.manifest || {
            ...editedManifest,
            notes: grammar.rawText ? [grammar.rawText] : editedManifest.notes,
        };
        const nextManifest: GrammarManifest = {
            ...editedManifest,
            ...importedManifest,
            meta: {
                ...editedManifest.meta,
                ...importedManifest.meta,
                sourceFormat: 'markdown',
                lastUpdated: new Date().toISOString(),
            },
            typology: {
                ...editedManifest.typology,
                ...(importedManifest.typology || {}),
            },
            phonology: importedManifest.phonology || editedManifest.phonology,
            affixInventory: importedManifest.affixInventory || editedManifest.affixInventory,
            strategies: importedManifest.strategies || editedManifest.strategies,
            roles: importedManifest.roles || editedManifest.roles,
            typologicalProfile: importedManifest.typologicalProfile || editedManifest.typologicalProfile,
            notes: importedManifest.notes?.length ? importedManifest.notes : (grammar.rawText ? [grammar.rawText] : editedManifest.notes),
        };

        setEditedManifest(nextManifest);
        setImportReport(validatePostImport(nextManifest));
        onSave(nextManifest);
        setIsDirty(false);
        setIsImporterOpen(false);
    };

    const handleExportGrammar = useCallback(() => {
        if (!onExportGrammar) return;
        onExportGrammar();
    }, [onExportGrammar]);

    const calculateProgress = useMemo(() => {
        const metrics: ProgressMetric[] = [
            {
                category: 'Fonología',
                completed: editedManifest.phonology ? 1 : 0,
                total: 1,
                items: editedManifest.phonology ? ['Inventario definido'] : ['Inventario definido']
            },
            {
                category: 'Tipología',
                completed: Object.values(editedManifest.typology).filter(v => v && v !== '').length,
                total: 4,
                items: ['Orden de palabras', 'Alineamiento', 'Morfología', 'Dirección del núcleo']
            },
            {
                category: 'Roles Sintácticos',
                completed: editedManifest.roles.length,
                total: Math.max(5, editedManifest.roles.length + 2),
                items: editedManifest.roles.map(r => r.name)
            },
            {
                category: 'Estrategias',
                completed: editedManifest.strategies.length,
                total: Math.max(3, editedManifest.strategies.length + 2),
                items: editedManifest.strategies.map(s => s.name)
            }
        ];

        const totalCompleted = metrics.reduce((sum, m) => sum + m.completed, 0);
        const totalItems = metrics.reduce((sum, m) => sum + m.total, 0);
        const overallProgress = totalItems > 0 ? Math.round((totalCompleted / totalItems) * 100) : 0;

        return { metrics, overallProgress };
    }, [editedManifest]);

    const addRole = () => {
        const newRole: SyntacticRole = { id: `role_${Date.now()}`, name: 'Nuevo Rol' };
        updateManifest({ roles: [...editedManifest.roles, newRole] });
    };

    const removeRole = (id: string) => {
        updateManifest({ roles: editedManifest.roles.filter(r => r.id !== id) });
    };

    const updateRole = (id: string, field: keyof SyntacticRole, value: string) => {
        updateManifest({
            roles: editedManifest.roles.map(r => r.id === id ? { ...r, [field]: value } : r)
        });
    };

    const addStrategy = () => {
        const newStrat: MorphosyntacticStrategy = {
            id: `strat_${Date.now()}`,
            name: 'Nueva Estrategia',
            type: 'position',
            appliesTo: []
        };
        updateManifest({ strategies: [...editedManifest.strategies, newStrat] });
    };

    const removeStrategy = (id: string) => {
        updateManifest({ strategies: editedManifest.strategies.filter(s => s.id !== id) });
    };

    const updateStrategy = (id: string, updates: Partial<MorphosyntacticStrategy>) => {
        updateManifest({
            strategies: editedManifest.strategies.map(s => s.id === id ? { ...s, ...updates } : s)
        });
    };

    const updatePreview = (updates: Partial<NonNullable<GrammarManifest['preview']>>) => {
        updateManifest({ preview: { useLexiconAffixes: false, ...(editedManifest.preview || {}), ...updates } });
    };

    const lexiconAffixes = useMemo<GrammarAffix[]>(() => lexicon
        .filter(entry => {
            const category = normalizeCategory(entry.Categoría);
            return category.includes('afijo') || category.includes('prefijo') || category.includes('sufijo') || category.includes('infijo');
        })
        .map(entry => {
            const category = normalizeCategory(entry.Categoría);
            const type: GrammarAffix['type'] = category.includes('prefijo') ? 'prefix' : category.includes('infijo') ? 'infix' : 'suffix';
            return {
                id: `lexicon_${entry.ID}`,
                form: entry.Léxema?.[0] || entry.Raíz,
                type,
                meaning: entry.Significado?.[0] || entry.Categoría || '',
                appliesTo: [],
                source: 'lexicon' as const,
                enabled: editedManifest.preview?.useLexiconAffixes ?? false,
            };
        })
        .filter(affix => affix.form), [lexicon, editedManifest.preview?.useLexiconAffixes]);

    const effectiveManifest = useMemo<GrammarManifest>(() => ({
        ...editedManifest,
        affixInventory: [
            ...(editedManifest.affixInventory || []),
            ...(editedManifest.preview?.useLexiconAffixes ? lexiconAffixes : []),
        ],
    }), [editedManifest, lexiconAffixes]);

    const preview = useMemo(() => {
        const entries = getDefaultPreviewEntries(lexicon, effectiveManifest.preview);
        const participants = [
            { role: 'subject', lexeme: entries.subject, features: {} },
            { role: 'verb', lexeme: entries.verb, features: {} },
            { role: 'object', lexeme: entries.object, features: {} },
        ].filter((p) => p.lexeme) as any;

        // Build a real AST from the flat participants (enables future tree features)
        let ast: any;
        try {
            ast = buildClauseAST(participants);
        } catch {
            ast = { participants } as any; // fallback to legacy flat form
        }
        const result = realizeClause(ast, effectiveManifest);
        const violations = validatePhonology(result.sentence.replace(/ /g, ''), effectiveManifest.phonology);
        // Derive a diagram description from the new AST (for the future canvas)
        const diagram = astToDiagram(ast);
        return { ...result, gloss: (effectiveManifest.typology.wordOrder || 'SVO').toUpperCase(), entries, violations, diagram };
    }, [effectiveManifest, lexicon]);

    // Seed the editable AST from the preview participants (only when the
    // underlying clause actually changes, so user edits aren't clobbered).
    useEffect(() => {
        const participants = [
            { role: 'subject', lexeme: preview.entries.subject, features: {} },
            { role: 'verb', lexeme: preview.entries.verb, features: {} },
            { role: 'object', lexeme: preview.entries.object, features: {} },
        ].filter((p) => p.lexeme) as any;
        try {
            setEditableAst(buildClauseAST(participants));
        } catch {
            setEditableAst(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [preview.entries.subject?.ID, preview.entries.verb?.ID, preview.entries.object?.ID]);

    const addAffix = () => {
        const newAffix: GrammarAffix = {
            id: `affix_${Date.now()}`,
            form: '-',
            type: 'suffix',
            meaning: 'Nuevo afijo',
            appliesTo: [],
            source: 'manual',
            enabled: true,
        };
        updateManifest({ affixInventory: [...(editedManifest.affixInventory || []), newAffix] });
    };

    const updateAffix = (id: string, updates: Partial<GrammarAffix>) => {
        updateManifest({
            affixInventory: (editedManifest.affixInventory || []).map(affix => affix.id === id ? { ...affix, ...updates } : affix)
        });
    };

    const removeAffix = (id: string) => {
        updateManifest({ affixInventory: (editedManifest.affixInventory || []).filter(affix => affix.id !== id) });
    };

    const renderOverview = () => (
        <GrammarOverview
            overallProgress={calculateProgress.overallProgress}
            metrics={calculateProgress.metrics}
            rolesCount={editedManifest.roles.length}
            strategiesCount={editedManifest.strategies.length}
            lastUpdated={editedManifest.meta.lastUpdated}
            importReport={importReport}
        />
    );

    const renderSyntax = () => {
        const entryOptions = lexicon.slice(0, 300);

        return (
            <div className="flex flex-col h-full gap-0">
                <h3 className="text-xl font-bold text-white mb-4">
                    Sintaxis
                    <InfoHint text="La sintaxis es el orden y la estructura de las palabras en una frase (quién hace qué a quién). El Árbol AST muestra la estructura jerárquica de la oración y el 'Preview Rápido' muestra cómo tu idioma ordena Sujeto-Verbo-Objeto." />
                </h3>
                <div className="flex gap-1 mb-4 p-1 bg-surface rounded-xl border border-border-dark w-fit">
                    <button
                        onClick={() => setSyntaxSubTab('ast')}
                        className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-all ${syntaxSubTab === 'ast' ? 'bg-primary text-white shadow' : 'text-text-secondary hover:text-white'}`}
                    >
                        🌳 Árbol AST
                    </button>
                    <button
                        onClick={() => setSyntaxSubTab('preview')}
                        className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-all ${syntaxSubTab === 'preview' ? 'bg-primary text-white shadow' : 'text-text-secondary hover:text-white'}`}
                    >
                        ▶ Preview Rápido
                    </button>
                    <button
                        onClick={() => {
                            updateManifest({
                                clauseTree: buildClauseAST([
                                    { role: 'subject', lexeme: preview.entries.subject, features: {} },
                                    { role: 'verb', lexeme: preview.entries.verb, features: {} },
                                    { role: 'object', lexeme: preview.entries.object, features: {} },
                                ].filter((p) => p.lexeme) as any)
                            });
                        }}
                        title="Reconstruye el árbol AST desde tu gramática (tipología + paradigmas + léxico del preview)"
                        className="px-4 py-1.5 text-sm font-semibold rounded-lg transition-all bg-accent/15 text-accent border border-accent/30 hover:bg-accent/25"
                    >
                        ↻ Regenerar árbol desde gramática
                    </button>
                </div>

                {syntaxSubTab === 'ast' && editableAst && (
                    <div className="flex-1 min-h-0 flex flex-col gap-3">
                        <div className="text-xs uppercase tracking-widest text-text-secondary">
                            Árbol AST editable — arrastra los nodos, selecciona para añadir/hijos/borrar, rueda para zoom
                        </div>
                        <div className="flex-1 min-h-0 bg-surface rounded-lg border border-border-dark p-2" style={{ minHeight: 260, position: 'relative' }}>
                            <ASTEditor
                                ast={editableAst}
                                onChange={setEditableAst}
                                onInspect={(id) => console.log('inspect AST node', id)}
                            />
                        </div>
                        {(() => {
                            const sentence = realizeEditedTree(editableAst, effectiveManifest);
                            const violations = sentence
                                ? validatePhonology(sentence.replace(/ /g, ''), effectiveManifest.phonology)
                                : [];
                            return (
                                <div className="bg-background rounded-lg p-4 border border-primary/30">
                                    <div className="text-xs uppercase tracking-widest text-text-secondary mb-1">Oración del árbol editado</div>
                                    <div className="text-2xl font-bold text-white font-display break-words">{sentence || '(vacío)'}</div>
                                    {violations.length > 0 && (
                                        <div className="mt-2 text-xs text-danger space-y-1">
                                            {violations.map((v: string, i: number) => <div key={i}>⚠ {v}</div>)}
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
                    </div>
                )}

                {syntaxSubTab === 'preview' && (
                    <div className="space-y-4">
                        <div className="bg-background rounded-lg p-6 border border-border-dark space-y-5">
                            <div>
                                <h3 className="text-lg font-bold text-white">Preview Autónomo</h3>
                                <p className="text-sm text-text-secondary mt-1">La vista previa se calcula localmente desde tu léxico y reglas. No llama a IA.</p>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                {[
                                    { key: 'subjectEntryId' as const, label: 'Sujeto', entry: preview.entries.subject },
                                    { key: 'verbEntryId' as const, label: 'Verbo', entry: preview.entries.verb },
                                    { key: 'objectEntryId' as const, label: 'Objeto', entry: preview.entries.object },
                                ].map(({ key, label, entry }) => (
                                    <div key={key}>
                                        <label className="block text-xs font-semibold text-text-secondary mb-1">{label}</label>
                                        <select
                                            value={editedManifest.preview?.[key] || entry?.ID || ''}
                                            onChange={(e) => updatePreview({ [key]: e.target.value || undefined })}
                                            className="w-full bg-surface border border-border-dark rounded px-3 py-2 text-white text-sm focus:border-primary focus:outline-none"
                                        >
                                            <option value="">Auto</option>
                                            {entryOptions.map(option => (
                                                <option key={option.ID} value={option.ID}>{getEntryLabel(option)}</option>
                                            ))}
                                        </select>
                                    </div>
                                ))}
                            </div>

                            <div className="bg-surface rounded-lg p-5 border border-primary/30">
                                <div className="text-xs uppercase tracking-widest text-text-secondary mb-2">Orden {editedManifest.typology.wordOrder || 'SVO'} / Glosa {preview.gloss}</div>
                                <div className="text-3xl font-bold text-white font-display break-words">{preview.sentence}</div>
                            </div>

                            {preview.violations && preview.violations.length > 0 && (
                                <div className="mt-3 text-xs text-danger space-y-1">
                                    {preview.violations.map((v, i) => <div key={i}>⚠ {v}</div>)}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderTypology = () => (
        <GrammarTypologyPanel
            manifest={editedManifest}
            onChange={(updates) => updateManifest(updates)}
        />
    );

    const renderRoles = () => (
        <GrammarRolesPanel
            roles={editedManifest.roles}
            onAddRole={addRole}
            onRemoveRole={removeRole}
            onUpdateRole={updateRole}
        />
    );

    const renderStrategies = () => (
        <GrammarStrategiesPanel
            strategies={editedManifest.strategies}
            roles={editedManifest.roles}
            lexicon={lexicon}
            onAddStrategy={addStrategy}
            onRemoveStrategy={removeStrategy}
            onUpdateStrategy={updateStrategy}
        />
    );

    const renderPhonology = () => (
        <GrammarPhonologyPanel
            manifest={editedManifest}
            onChange={(updates) => updateManifest(updates)}
        />
    );

    const renderMorphology = () => (
        <GrammarMorphologyPanel
            manifest={editedManifest}
            lexicon={lexicon}
            lexiconAffixes={lexiconAffixes}
            onAddAffix={addAffix}
            onRemoveAffix={removeAffix}
            onUpdateAffix={updateAffix}
            onUpdatePreview={updatePreview}
            onChange={(updates) => updateManifest(updates)}
        />
    );

    const renderSemantics = () => (
        <GrammarNotesPanel
            manifest={editedManifest}
            onChange={(updates) => updateManifest(updates)}
            title="Semántica y Uso"
            description="Registra restricciones de significado, registro, pragmática o notas culturales. Estas notas se guardan en el manifiesto y alimentan al traductor/agente como contexto."
            placeholder="Ej: El orden cambia a OVS para énfasis poético. Los sufijos de caso son opcionales en habla informal..."
            textAreaClassName="w-full bg-surface border border-border-dark rounded-lg px-4 py-3 text-white focus:border-primary focus:outline-none resize-none h-72"
        />
    );

    const renderNotes = () => (
        <GrammarNotesPanel
            manifest={editedManifest}
            onChange={(updates) => updateManifest(updates)}
            title="Notas de Gramática"
            placeholder="Escribe notas sobre tu gramática aquí..."
            textAreaClassName="w-full bg-surface border border-border-dark rounded-lg px-4 py-3 text-white focus:border-primary focus:outline-none resize-none h-64"
        />
    );

    const renderContent = () => {
        switch (activeModule) {
            case 'overview': return renderOverview();
            case 'phonology': return renderPhonology();
            case 'typology': return renderTypology();
            case 'morphology': return renderMorphology();
            case 'syntax': return renderSyntax();
            case 'semantics': return renderSemantics();
            case 'roles': return renderRoles();
            case 'strategies': return renderStrategies();
            case 'notes': return renderNotes();
            default: return renderOverview();
        }
    };

    return (
        <div className="flex h-full gap-4">
            {isImporterOpen && (
                <Suspense fallback={<div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"><div className="text-white text-sm">Cargando importador...</div></div>}>
                    <GrammarImporterModal
                        onSaveFlexibleGrammar={handleSaveFlexibleGrammar}
                        onClose={() => setIsImporterOpen(false)}
                        showNotification={() => {}}
                        existingNotes={editedManifest.notes?.join('\n') || ''}
                    />
                </Suspense>
            )}
            <GrammarWizard
                open={isWizardOpen}
                initialName={conlangName}
                onApply={handleWizardApply}
                onClose={() => setIsWizardOpen(false)}
            />
            {/* Sidebar de Módulos */}
            <div className="w-64 bg-[#0a0a0c] border-r border-border-dark flex flex-col p-4 shrink-0">
                <h2 className="text-lg font-bold text-white mb-4 font-display">Gramática</h2>
                <nav className="space-y-1">
                    {[
                        { id: 'syntax' as const, label: 'Sintaxis', icon: '🔗' },
                        { id: 'overview' as const, label: 'Resumen', icon: '📊' },
                        { id: 'phonology' as const, label: 'Fonología', icon: '🔊' },
                        { id: 'typology' as const, label: 'Tipología', icon: '🏛️' },
                        { id: 'morphology' as const, label: 'Morfología', icon: '🧩' },
                        { id: 'semantics' as const, label: 'Semántica', icon: '💭' },
                        { id: 'roles' as const, label: 'Roles', icon: '👥' },
                        { id: 'strategies' as const, label: 'Estrategias', icon: '⚡' },
                        { id: 'notes' as const, label: 'Notas', icon: '📝' }
                    ].map(module => (
                        <button
                            key={module.id}
                            onClick={() => setActiveModule(module.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${activeModule === module.id ? 'bg-primary/20 text-white border border-primary/30' : 'text-text-secondary hover:bg-white/5'}`}
                        >
                            <span className="text-lg">{module.icon}</span>
                            {module.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Contenido Principal */}
            <div className="flex-1 flex flex-col bg-surface-dark rounded-r-xl overflow-hidden relative border border-border-dark">
                <div className="bg-surface border-b border-border-dark p-4 flex justify-between items-center shadow-md z-10">
                    <h2 className="text-xl font-bold text-white">
                        {activeModule === 'overview' && 'Resumen'}
                        {activeModule === 'phonology' && 'Fonología'}
                        {activeModule === 'typology' && 'Tipología'}
                        {activeModule === 'morphology' && 'Morfología'}
                        {activeModule === 'syntax' && 'Sintaxis'}
                        {activeModule === 'semantics' && 'Semántica'}
                        {activeModule === 'roles' && 'Roles Sintácticos'}
                        {activeModule === 'strategies' && 'Estrategias Morfosintácticas'}
                        {activeModule === 'notes' && 'Notas'}
                    </h2>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsWizardOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all bg-accent/15 text-accent border border-accent/30 hover:bg-accent/25"
                        >
                            <SparkleIcon className="w-4 h-4" />
                            Asistente de gramática
                        </button>
                        <button
                            onClick={() => setIsImporterOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25"
                        >
                            <SparkleIcon className="w-4 h-4" />
                            Importar
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!isDirty}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm ${isDirty ? 'bg-accent text-white shadow-accent/20 hover:bg-accent-hover' : 'bg-surface-light text-text-secondary cursor-not-allowed opacity-50'}`}
                        >
                            <SaveIcon className="w-4 h-4" />
                            Guardar
                        </button>
                        {onExportGrammar && (
                            <button
                                onClick={handleExportGrammar}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all bg-surface-light text-text-secondary border border-subtle hover:bg-subtle"
                            >
                                <DownloadIcon className="w-4 h-4" />
                                Exportar Gramática
                            </button>
                        )}
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

export default GrammarTab;
