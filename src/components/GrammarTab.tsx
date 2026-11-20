import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { GrammarManifest, SyntacticRole, MorphosyntacticStrategy, LexiconEntry, GrammarAffix } from '../types';
const GrammarImporterModal = lazy(() => import('./GrammarImporterModal'));
import { FlexibleGrammar } from '../types/grammar-flexible';
import GrammarWizard from './GrammarWizard';
import { isAiAvailable } from '../services/geminiService';
import { buildClauseAST } from '../services/grammar';
import { validatePostImport } from '../services/grammar/postImportValidator';
import ImportReport from './ImportReport';
import GrammarOverview from './GrammarOverview';
import GrammarPhonologyPanel from './GrammarPhonologyPanel';
import GrammarTypologyPanel from './GrammarTypologyPanel';
import GrammarNotesPanel from './GrammarNotesPanel';
import GrammarStrategiesPanel from './GrammarStrategiesPanel';
import GrammarMorphologyPanel from './GrammarMorphologyPanel';
import GrammarPragmaticPanel from './GrammarPragmaticPanel';
import GrammarRolesPanel from './GrammarRolesPanel';
import GrammarSyntaxPanel from './GrammarSyntaxPanel';
import GrammarModuleSidebar from './GrammarModuleSidebar';
import GrammarTabHeader from './GrammarTabHeader';
import GrammarTabModals from './GrammarTabModals';
import { buildClauseParticipants, buildClausePreview, buildLexiconAffixes, calculateGrammarProgress, createAffix, createStrategy, createSyntacticRole, DEFAULT_GRAMMAR_MODULE, DEFAULT_SYNTAX_SUB_TAB, isFirstRunManifest, mergeFlexibleGrammar, mergePreviewConfig, withLastUpdated, withLexiconAffixes } from '../utils/grammarTabModel';
import type { GrammarModule, SyntaxSubTab } from '../utils/grammarTabModel';

// Re-exported for consumers/tests that imported these symbols from the component.
export type { GrammarModule, SyntaxSubTab } from '../utils/grammarTabModel';

interface GrammarTabProps {
    manifest: GrammarManifest;
    onSave: (newManifest: GrammarManifest) => void;
    lexicon?: LexiconEntry[];
    conlangName?: string;
    onAddLexicalException?: (entryId: string, featureKey: string, surfaceForm: string) => void;
    onExportGrammar?: () => void;
    activeModule?: GrammarModule;
    onModuleChange?: (module: GrammarModule) => void;
    /** Callback para volver al grafo/canvas */
    onBack?: () => void;
    /** J1: abre Ajustes de IA desde el importador sin cerrarlo. */
    onOpenAiSettings?: () => void;
    /** Notificaciones reales para el importador (antes llegaban como no-op). */
    showNotification: (message: string, type?: 'success' | 'error') => void;
}

// Module-level guard so the first-run wizard auto-opens at most ONCE per session
// (not localStorage — keeps it simple and resets on reload, exactly as required).
let wizardAutoOpenedThisSession = false;

const GrammarTab = ({ manifest, onSave, lexicon = [], conlangName, onAddLexicalException, onExportGrammar, activeModule: activeModuleProp, onModuleChange, onBack, onOpenAiSettings, showNotification }: GrammarTabProps) => {
    const [internalModule, setInternalModule] = useState<GrammarModule>(DEFAULT_GRAMMAR_MODULE);
    const activeModule = activeModuleProp ?? internalModule;
    const setActiveModule = onModuleChange ?? setInternalModule;
    const [editedManifest, setEditedManifest] = useState<GrammarManifest>(JSON.parse(JSON.stringify(manifest)));
    const [isDirty, setIsDirty] = useState(false);
    const [isImporterOpen, setIsImporterOpen] = useState(false);
    const [syntaxSubTab, setSyntaxSubTab] = useState<SyntaxSubTab>(DEFAULT_SYNTAX_SUB_TAB);
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
    const isFirstRun = isFirstRunManifest(manifest);
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
        onSave(withLastUpdated(editedManifest));
        setIsDirty(false);
    };

    const updateManifest = (updates: Partial<GrammarManifest>) => {
        setEditedManifest(prev => ({ ...prev, ...updates }));
        setIsDirty(true);
    };

    const handleSaveFlexibleGrammar = (grammar: FlexibleGrammar) => {
        const nextManifest = mergeFlexibleGrammar(editedManifest, grammar);
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

    const calculateProgress = useMemo(() => calculateGrammarProgress(editedManifest), [editedManifest]);

    const addRole = () => {
        updateManifest({ roles: [...editedManifest.roles, createSyntacticRole()] });
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
        updateManifest({ strategies: [...editedManifest.strategies, createStrategy()] });
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
        updateManifest({ preview: mergePreviewConfig(editedManifest.preview, updates) });
    };

    const lexiconAffixes = useMemo(() => buildLexiconAffixes(lexicon, editedManifest.preview?.useLexiconAffixes ?? false), [lexicon, editedManifest.preview?.useLexiconAffixes]);

    const effectiveManifest = useMemo(() => withLexiconAffixes(editedManifest, lexiconAffixes), [editedManifest, lexiconAffixes]);

    const preview = useMemo(() => buildClausePreview(lexicon, effectiveManifest), [effectiveManifest, lexicon]);

    // Seed the editable AST from the preview participants (only when the
    // underlying clause actually changes, so user edits aren't clobbered).
    useEffect(() => {
        try {
            setEditableAst(buildClauseAST(buildClauseParticipants(preview.entries)));
        } catch {
            setEditableAst(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [preview.entries.subject?.ID, preview.entries.verb?.ID, preview.entries.object?.ID]);

    const addAffix = () => {
        updateManifest({ affixInventory: [...(editedManifest.affixInventory || []), createAffix()] });
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

    const renderSyntax = () => (
        <GrammarSyntaxPanel
          effectiveManifest={editedManifest}
          lexicon={lexicon}
          syntaxSubTab={syntaxSubTab}
          editableAst={editableAst}
          conlangName={conlangName}
          aiAvailable={aiAvailable}
          preview={preview}
          onSetSyntaxSubTab={setSyntaxSubTab}
          onSetEditableAst={setEditableAst}
          onUpdateManifest={updateManifest}
          onUpdatePreview={updatePreview}
        />
    );

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

    const renderPragmatic = () => (
        <GrammarPragmaticPanel
            manifest={editedManifest}
            lexicon={lexicon}
            onUpdateManifest={(updates) => updateManifest(updates)}
            onBack={onBack}
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
            case 'pragmatic': return renderPragmatic();
            case 'notes': return renderNotes();
            default: return renderOverview();
        }
    };

    return (
        <div className="flex h-full gap-4">
            <GrammarTabModals
                isImporterOpen={isImporterOpen}
                isWizardOpen={isWizardOpen}
                conlangName={conlangName}
                existingNotes={editedManifest.notes?.join('\n') || ''}
                onSaveFlexibleGrammar={handleSaveFlexibleGrammar}
                onCloseImporter={() => setIsImporterOpen(false)}
                showNotification={showNotification}
                onApplyWizard={handleWizardApply}
                onCloseWizard={() => setIsWizardOpen(false)}
                onOpenAiSettings={onOpenAiSettings}
            />
            <GrammarModuleSidebar
                activeModule={activeModule}
                onSelectModule={setActiveModule}
            />

            {/* Contenido Principal */}
            <div className="flex-1 flex flex-col bg-surface-dark rounded-r-xl overflow-hidden relative border border-border-dark">
                <GrammarTabHeader
                  activeModule={activeModule}
                  onOpenWizard={() => setIsWizardOpen(true)}
                  onOpenImporter={() => setIsImporterOpen(true)}
                  onSave={handleSave}
                  isDirty={isDirty}
                  onExportGrammar={onExportGrammar}
                />
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

export default GrammarTab;
