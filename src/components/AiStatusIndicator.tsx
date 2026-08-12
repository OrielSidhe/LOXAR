import { memo } from 'react';
import WandIcon from './icons/WandIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';

interface AiStatusIndicatorProps {
    status: 'idle' | 'working' | 'complete' | 'error';
    onClick: () => void;
    progress?: { processed: number; total: number } | null;
}

const AiStatusIndicator = ({ status, onClick, progress }: AiStatusIndicatorProps) => {
    if (status === 'idle') return null;

    return (
        <div className="ml-auto flex items-center pr-2">
            {status === 'working' && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/20 border border-primary/40 text-xs font-bold text-primary select-none">
                    <WandIcon className="w-3.5 h-3.5 animate-spin" />
                    <span>IA Trabajando...</span>
                    {progress && progress.total > 0 && (
                        <span className="ml-1 text-primary/80">
                            {Math.round((progress.processed / progress.total) * 100)}%
                        </span>
                    )}
                </div>
            )}

            {status === 'complete' && (
                <button
                    onClick={onClick}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 cursor-pointer transition-all group"
                >
                    <CheckCircleIcon className="w-3.5 h-3.5" />
                    <span>Completado</span>
                    <span className="text-[10px] opacity-70 group-hover:opacity-100 font-normal ml-1 border-l border-emerald-500/30 pl-2">Ver Resultados</span>
                </button>
            )}

            {status === 'error' && (
                <button
                    onClick={onClick} // Click to dismiss/acknowledge
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/30 text-xs font-bold text-red-400 hover:bg-red-500/20 cursor-pointer transition-all"
                >
                    <span className="material-symbols-outlined text-sm">error</span>
                    <span>Error en IA</span>
                </button>
            )}
        </div>
    );
};

export default memo(AiStatusIndicator);
