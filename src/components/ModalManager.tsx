import { memo } from 'react';
import RestorBackupModalComponent from './RestoreBackupModal';
import AiAssistantModal from './AiAssistantModal';
import LexiconToolsModal from './LexiconToolsModal';
import GenerativeProfileModal from './GenerativeProfileModal';
import AnalysisReportModal from './AnalysisReportModal';
import FunctionManagerModal from './FunctionManagerModal';
import HyphenManagerModal from './HyphenManagerModal';
import InflectionGeneratorModal from './InflectionGeneratorModal';
import CreateLexiconModal from './CreateLexiconModal';
import AboutModal from './AboutModal';
import EditEntryModal from './EditEntryModal';
import AiSettingsModal from './AiSettingsModal';
import ImportMappingModal from './ImportMappingModal';
import ImportConflictModal from './ImportConflictModal';
import ImportSanitizationModal from './ImportSanitizationModal';
import { LexiconEntry, LexiconMetadata, GenerativeProfile, HyphenOperation, FunctionOperation, InflectionProfile, NewLexiconEntry } from '../types';

const RestoreBackupModal = memo(RestorBackupModalComponent);

type ModalState = 'none' | 'about' | 'restore' | 'ai_assistant' | 'lexicon_tools' | 'profile' | 'report' | 'functions' | 'hyphens' | 'inflection_generator' | 'create_lexicon' | 'ai_settings';

interface ImportState {
    step: 'idle' | 'map_headers' | 'resolve_conflicts' | 'sanitize_file' | 'repair_characters' | 'error';
    headers?: string[];
    warnings?: string[];
    conflicts?: any[];
    errorContent?: string | null;
    parseError?: string | null;
    error?: string;
    rawData?: any[];
    rawContent?: string;
}

interface ModalManagerProps {
    activeModal: ModalState;
    entryToEditInModal: LexiconEntry | null;
    entryToInflect: LexiconEntry | null;
    importState: ImportState;

    activeLexicon: LexiconEntry[];
    activeLexiconName: string | null;
    activeProfile: GenerativeProfile;
    activeMetadata: LexiconMetadata | null;
    activeCustomFunctions: string[];
    activeInflectionProfile: InflectionProfile;
    backups: string[];
    appVersion: string;
    completionStats: any;

    onClose: () => void;
    onCloseEditModal: () => void;

    onRestoreBackup: (fileName: string) => void;
    onAiCompleteFunctions: () => Promise<void>;
    onAiFillMissing: () => Promise<void>;
    onAnalyzeForSuggestions: (listName: string) => void;
    onManageFunctions: (ops: FunctionOperation[]) => void;
    onManageHyphens: (op: HyphenOperation) => void;
    onUpdateGenerativeProfile: (p: GenerativeProfile) => void;
    onGenerateLanguageSample: (p: GenerativeProfile, s: LexiconEntry[]) => Promise<any>;
    onAddWord: (entry: NewLexiconEntry) => void;
    onEditWord: (id: string, entry: LexiconEntry) => void;
    onConfirmCreateLexicon: (name: string, language: string) => void;
    onAddCustomFunction: (f: string) => void;

    onOpenFunctions: () => void;
    onOpenHyphens: () => void;
    onOpenProfile: () => void;
    onOpenNeography: () => void;
    onOpenInflection: () => void;

    importHandlers: {
        cancelImport: () => void;
        setImportMapping: (mapping: any) => void;
        resolveConflict: (res: 'keep' | 'replace') => void;
        proceedWithValidEntries: () => void;
        resanitizeAndContinue: (content: string) => Promise<any>;
        applyCharacterRepair: (repairedData: string, replacements: Map<string, string>) => Promise<void>;
    };

    showNotification: (msg: string, type: 'success' | 'error') => void;
}

const ModalManager = ({
    activeModal,
    entryToEditInModal,
    entryToInflect,
    importState,
    activeLexicon,
    activeLexiconName,
    activeProfile,
    activeMetadata,
    activeCustomFunctions,
    activeInflectionProfile,
    backups,
    appVersion,
    completionStats,
    onClose,
    onCloseEditModal,
    onRestoreBackup,
    onAiCompleteFunctions,
    onAiFillMissing,
    onAnalyzeForSuggestions,
    onManageFunctions,
    onManageHyphens,
    onUpdateGenerativeProfile,
    onGenerateLanguageSample,
    onAddWord,
    onEditWord,
    onConfirmCreateLexicon,
    onAddCustomFunction,
    onOpenFunctions,
    onOpenHyphens,
    onOpenProfile,
    onOpenNeography,
    onOpenInflection,
    importHandlers,
    showNotification
}: ModalManagerProps) => {

    return (
        <>
            {activeModal === 'about' && <AboutModal isOpen={true} onClose={onClose} version={appVersion} appName="Conlang Lexicon Manager" appDescription="Una aplicación para gestionar y expandir un léxico de un idioma artificial." />}

            {activeModal === 'restore' && <RestoreBackupModal backups={backups} onClose={onClose} onRestore={onRestoreBackup} />}

            {activeModal === 'ai_assistant' && <AiAssistantModal
                disabled={!activeLexiconName}
                onClose={onClose}
                onCompleteCategories={onAiCompleteFunctions}
                onFillMissing={onAiFillMissing}
                stats={{ needsCategory: completionStats.needsFunction, totalIncomplete: completionStats.totalIncomplete }}
            />}

            {activeModal === 'lexicon_tools' && <LexiconToolsModal
                totalEntries={activeLexicon.length}
                disabled={!activeLexiconName}
                onClose={onClose}
                onManageCategories={onOpenFunctions}
                onManageHyphens={onOpenHyphens}
                onGenerateReport={() => onClose()}
                onOpenNeography={onOpenNeography}
                onOpenGrammar={onOpenInflection}
                onOpenTranslation={onClose}
            />}

            {activeModal === 'profile' && <GenerativeProfileModal
                profile={activeProfile}
                lexicon={activeLexicon}
                onSave={onUpdateGenerativeProfile}
                onClose={onClose}
                showNotification={showNotification}
            />}

            {activeModal === 'report' && <AnalysisReportModal lexicon={activeLexicon} metadata={activeMetadata} onClose={onClose} />}

            {activeModal === 'functions' && <FunctionManagerModal lexicon={activeLexicon} customFunctions={activeCustomFunctions} onManage={onManageFunctions} onAdd={onAddCustomFunction} onClose={onClose} />}

            {activeModal === 'hyphens' && <HyphenManagerModal onApply={onManageHyphens} onClose={onClose} />}

            {activeModal === 'inflection_generator' && <InflectionGeneratorModal entry={entryToInflect} profile={activeInflectionProfile} onClose={onClose} />}

            {activeModal === 'create_lexicon' && <CreateLexiconModal onCreate={onConfirmCreateLexicon} onClose={onClose} />}

            {activeModal === 'ai_settings' && <AiSettingsModal onClose={onClose} />}

            {entryToEditInModal && <EditEntryModal
                entry={entryToEditInModal}
                customFunctions={activeCustomFunctions}
                activeMetadata={activeMetadata}
                onClose={onCloseEditModal}
                onSave={onEditWord}
                showNotification={showNotification}
            />}

            {importState.step === 'map_headers' && <ImportMappingModal headers={importState.headers || []} warnings={importState.warnings} onCancel={importHandlers.cancelImport} onConfirm={importHandlers.setImportMapping} />}

            {importState.step === 'resolve_conflicts' && importState.conflicts && importState.conflicts.length > 0 && <ImportConflictModal conflict={importState.conflicts[0]} onResolve={importHandlers.resolveConflict} onCancel={importHandlers.cancelImport} />}

            {importState.step === 'sanitize_file' && <ImportSanitizationModal errorContent={importState.errorContent || ''} errorMessage={importState.parseError || ''} hasValidEntries={(importState.rawData || []).length > 0} onCancel={importHandlers.cancelImport} onProceedWithValid={importHandlers.proceedWithValidEntries} onValidate={importHandlers.resanitizeAndContinue} />}

            {importState.step === 'repair_characters' && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={importHandlers.cancelImport}>
                    <div className="bg-surface border border-border-dark rounded-xl shadow-2xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-white mb-2">Caracteres corruptos detectados</h3>
                        <p className="text-text-secondary text-sm mb-4">El archivo contiene caracteres con codificación incorrecta. Podés corregirlos manualmente abajo y reintentar la importación.</p>
                        <textarea
                            className="flex-1 min-h-[200px] bg-background border border-subtle rounded-lg p-3 text-text-primary font-mono text-sm resize-y custom-scrollbar"
                            defaultValue={importState.rawContent || ''}
                            id="repair-textarea"
                        />
                        <div className="flex justify-end gap-3 mt-4">
                            <button onClick={importHandlers.cancelImport} className="px-4 py-2 rounded-lg text-sm font-bold bg-surface-light text-text-secondary border border-subtle hover:bg-subtle">Cancelar</button>
                            <button onClick={async () => {
                                const textarea = document.getElementById('repair-textarea') as HTMLTextAreaElement;
                                const repaired = textarea?.value || '';
                                await importHandlers.applyCharacterRepair(repaired, new Map());
                            }} className="px-4 py-2 rounded-lg text-sm font-bold bg-accent text-white hover:bg-accent-hover">Reparar e importar</button>
                        </div>
                    </div>
                </div>
            )}

            {importState.step === 'error' && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={importHandlers.cancelImport}>
                    <div className="bg-surface border border-border-dark rounded-xl shadow-2xl p-6 max-w-lg w-full mx-4" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-danger mb-2">Error de importación</h3>
                        <p className="text-text-secondary text-sm mb-4">{importState.error || 'Ocurrió un error desconocido al procesar el archivo.'}</p>
                        <div className="flex justify-end">
                            <button onClick={importHandlers.cancelImport} className="px-4 py-2 rounded-lg text-sm font-bold bg-surface-light text-text-secondary border border-subtle hover:bg-subtle">Cerrar</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default memo(ModalManager);
