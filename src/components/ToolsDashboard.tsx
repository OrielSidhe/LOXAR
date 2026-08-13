import { memo } from 'react';
import DnaIcon from './icons/DnaIcon';
import PenToolIcon from './icons/PenToolIcon';

import CombineIcon from './icons/CombineIcon';
import HyphenIcon from './icons/HyphenIcon';
import SparkleIcon from './icons/SparkleIcon';
import AutoFixIcon from './icons/AutoFixIcon';
import WrenchIcon from './icons/WrenchIcon';
import WandIcon from './icons/WandIcon';
import GitMergeIcon from './icons/GitMergeIcon';
import BookOpenIcon from './icons/BookOpenIcon';
import Tooltip from './Tooltip';
import { WORD_LISTS } from '../data/wordLists';

interface ToolsDashboardProps {
    onOpenProfile: () => void;
    onOpenNeography: () => void;
    onOpenInflectionWorkshop: () => void;
    onManageFunctions: () => void;
    onManageHyphens: () => void;
    onCompleteFunctions: () => void;
    onFillMissing: () => void;
    onAnalyzeForSuggestions: (listName: string) => void;
    onOpenGrammar: () => void;
    onOpenTranslator: () => void;
    onOpenInterlinearGloss: () => void;
    onOpenSoundChangeWorkbench: () => void;
    stats: { needsFunction: number; totalIncomplete: number; };
    disabled: boolean;
    onStartTour: () => void;
}

const ToolCard = ({ icon, title, description, onClick, disabled, accentColor = 'text-accent', tooltip }: any) => (
    <Tooltip text={tooltip || description}>
        <button
            onClick={onClick}
            disabled={disabled}
            className="bg-surface-dark border border-border-dark p-4 rounded-xl flex items-start gap-4 text-left transition-all hover:bg-surface-light/10 hover:border-primary/50 hover:-translate-y-1 hover:shadow-lg group w-full"
            aria-label={`${title}. ${tooltip || description}`}
        >
            <div className={`p-3 rounded-lg bg-background-darker/50 ${accentColor} group-hover:bg-primary/20 group-hover:text-primary transition-colors`}>
                {icon}
            </div>
            <div>
                <h3 className="text-lg font-bold text-white group-hover:text-primary transition-colors">{title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed mt-1">{description}</p>
            </div>
        </button>
    </Tooltip>
);

const ToolsDashboard = ({
    onOpenProfile, onOpenNeography, onOpenInflectionWorkshop, onManageFunctions, onManageHyphens,
    onCompleteFunctions, onFillMissing, onAnalyzeForSuggestions, onOpenGrammar, onOpenTranslator,
    onOpenInterlinearGloss, onOpenSoundChangeWorkbench, stats, disabled, onStartTour
}: ToolsDashboardProps) => {
    return (
        <div className="space-y-8 animate-fade-in p-2 overflow-y-auto h-full custom-scrollbar">

            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-white font-display">Centro de Herramientas</h1>
                <button
                    onClick={onStartTour}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-dark border border-border-dark text-text-secondary hover:text-primary hover:border-primary transition-all text-sm"
                >
                    <span className="font-bold font-mono">?</span> Tour de Ayuda
                </button>
            </div>

            <section>
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-white/10">
                    <WandIcon className="w-5 h-5 text-purple-400" />
                    <h2 className="text-xl font-display font-bold text-white">Herramientas de IA</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <ToolCard
                        icon={<SparkleIcon className="w-6 h-6" />}
                        title={`Completar Funciones (${stats.needsFunction})`}
                        description="Detecta y rellena automáticamente las funciones gramaticales faltantes."
                        onClick={onCompleteFunctions}
                        disabled={disabled || stats.needsFunction === 0}
                        accentColor="text-purple-400"
                        tooltip="Completa automáticamente las funciones gramaticales faltantes del léxico activo."
                    />
                    <ToolCard
                        icon={<AutoFixIcon className="w-6 h-6" />}
                        title="Autocompletado Total"
                        description="Genera raíces, lexemas y definiciones para todas las entradas incompletas."
                        onClick={onFillMissing}
                        disabled={disabled}
                        accentColor="text-pink-400"
                        tooltip="Genera raíces, lexemas y definiciones para todas las entradas incompletas del léxico activo."
                    />
                    <ToolCard
                        icon={<SparkleIcon className="w-6 h-6" />}
                        title="Agente Traductor (Beta)"
                        description="Traduce textos entre tu Conlang y el idioma principal con IA."
                        onClick={onOpenTranslator}
                        disabled={disabled}
                        accentColor="text-indigo-400"
                        tooltip="Traduce textos entre tu conlang y el idioma principal usando IA."
                    />
                </div>
            </section>

            <section>
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-white/10">
                    <WrenchIcon className="w-5 h-5 text-blue-400" />
                    <h2 className="text-xl font-display font-bold text-white">Gestión del Léxico</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <ToolCard
                        icon={<DnaIcon className="w-6 h-6" />}
                        title="Perfil Generativo"
                        description="Configura la fonología (fonemas, sílabas) para la generación de palabras."
                        onClick={onOpenProfile}
                        disabled={disabled}
                        accentColor="text-blue-400"
                        tooltip="Configura fonemas, sílabas y reglas generativas para generar palabras."
                    />
                    <ToolCard
                        icon={<PenToolIcon className="w-6 h-6" />}
                        title="Taller de Escritura"
                        description="Diseña sistemas de escritura, glifos y reglas de romanización."
                        onClick={onOpenNeography}
                        disabled={disabled}
                        accentColor="text-cyan-400"
                        tooltip="Diseña y administra sistemas de escritura, glifos y reglas de romanización."
                    />
                    <ToolCard
                        icon={<GitMergeIcon className="w-6 h-6" />}
                        title="Morfología"
                        description="Define paradigmas de conjugación, declinación y reglas fonológicas."
                        onClick={onOpenInflectionWorkshop}
                        disabled={disabled}
                        accentColor="text-emerald-400"
                        tooltip="Define y edita paradigmas de flexión y reglas fonológicas para el léxico."
                    />
                    <ToolCard
                        icon={<BookOpenIcon className="w-6 h-6" />}
                        title="Estudio de Gramática"
                        description="Define la tipología y roles sintácticos."
                        onClick={onOpenGrammar}
                        disabled={disabled}
                        accentColor="text-purple-400"
                        tooltip="Administra la gramática del conlang: tipología, roles y reglas sintácticas."
                    />
                    <ToolCard
                        icon={<PenToolIcon className="w-6 h-6" />}
                        title="Glosado Interlineal"
                        description="Genera glosas estilo Leipzig a partir de oraciones y el léxico."
                        onClick={onOpenInterlinearGloss}
                        disabled={disabled}
                        accentColor="text-teal-400"
                        tooltip="Genera glosas interlineales estilo Leipzig a partir de oraciones y el léxico activo."
                    />
                    <ToolCard
                        icon={<WandIcon className="w-6 h-6" />}
                        title="Sound Change Workbench"
                        description="Aplica sound changes a lexemas y raíces."
                        onClick={onOpenSoundChangeWorkbench}
                        disabled={disabled}
                        accentColor="text-amber-400"
                        tooltip="Aplica sound changes a lexemas y raíces usando reglas personalizadas."
                    />

                    <ToolCard
                        icon={<CombineIcon className="w-6 h-6" />}
                        title="Gestor de Funciones"
                        description="Organiza, fusiona o elimina categorías gramaticales."
                        onClick={onManageFunctions}
                        disabled={disabled}
                        accentColor="text-yellow-400"
                        tooltip="Organiza, fusiona o elimina categorías gramaticales del léxico."
                    />
                    <ToolCard
                        icon={<HyphenIcon className="w-6 h-6" />}
                        title="Gestor de Guiones"
                        description="Controla el uso de guiones y separadores en tu léxico."
                        onClick={onManageHyphens}
                        disabled={disabled}
                        accentColor="text-orange-400"
                        tooltip="Controla el uso de guiones y separadores en las entradas del léxico."
                    />
                </div>
            </section>

            <section>
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-white/10">
                    <div className="p-2 bg-green-500/10 rounded-lg">
                        <span className="material-symbols-outlined text-green-400">checklist</span>
                    </div>
                    <h2 className="text-xl font-display font-bold text-white">Análisis de Cobertura</h2>
                </div>
                <p className="text-sm text-text-secondary mb-4">Compara tu léxico con listas de frecuencias estándar para encontrar huecos.</p>
                <div className="flex flex-wrap gap-3">
                    {Object.keys(WORD_LISTS).map(listName => (
                        <button
                            key={listName}
                            onClick={() => onAnalyzeForSuggestions(listName)}
                            disabled={disabled}
                            className="px-4 py-2 rounded-lg bg-surface-dark border border-border-dark text-text-primary hover:border-green-500 hover:text-green-400 hover:bg-green-500/10 transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                        >
                            {listName}
                        </button>
                    ))}
                </div>
            </section>
        </div>
    );
};

export default memo(ToolsDashboard);
