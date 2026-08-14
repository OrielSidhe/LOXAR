import { memo } from 'react';
import BookOpenIcon from './icons/BookOpenIcon';
import WandIcon from './icons/WandIcon';
import WrenchIcon from './icons/WrenchIcon';
import BarChartIcon from './icons/BarChartIcon';

interface DashboardProps {
    stats: {
        total: number;
        needsFunction: number;
        totalIncomplete: number;
        wordsAddedCount: number;
    };
    onOpenReport: () => void;
    onOpenAiAssistant: () => void;
    onNavigateComplete?: () => void;
    onNavigateFunctions?: () => void;
    onGenerateWords: () => void;
    onBackup: () => void;
    onClose?: () => void;
    disabled?: boolean;
}

const StatCard = ({ title, value, subtext, icon, trend, onClick, clickable }: any) => (
    <div
        onClick={onClick}
        className={`bg-surface-dark border border-border-dark p-6 rounded-2xl shadow-lg relative overflow-hidden group hover:border-primary/30 transition-all ${clickable ? 'cursor-pointer hover:bg-surface-light/5' : ''}`}
    >
        <div className="flex justify-between items-start mb-4">
            <div>
                <p className="text-text-secondary text-xs uppercase font-bold tracking-wider mb-1">{title}</p>
                <h3 className="text-3xl font-display font-bold text-white tracking-tight">{value}</h3>
            </div>
            <div className="p-3 bg-surface-light/10 rounded-xl text-primary group-hover:scale-110 transition-transform">
                {icon}
            </div>
        </div>
        {subtext && (
            <p className="text-xs text-text-secondary flex items-center gap-2">
                {trend && <span className="text-emerald-400 font-bold bg-emerald-400/10 px-1.5 py-0.5 rounded text-[10px]">{trend}</span>}
                {subtext}
            </p>
        )}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/0 via-primary/20 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
);

const DistributionBar = ({ label, count, total, color }: { label: string, count: number, total: number, color: string }) => {
    const percentage = Math.min(100, Math.max(0, (count / total) * 100));
    return (
        <div className="space-y-1">
            <div className="flex justify-between text-xs">
                <span className="text-text-secondary font-medium">{label}</span>
                <span className="text-text-primary font-bold">{count} ({percentage.toFixed(1)}%)</span>
            </div>
            <div className="h-2 w-full bg-surface-light/30 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${percentage}%`, backgroundColor: color }} />
            </div>
        </div>
    );
};

const CompletionDashboard = ({ stats, onOpenReport, onOpenAiAssistant, onGenerateWords, onBackup, onNavigateComplete, onNavigateFunctions, onClose }: DashboardProps) => {
    const completionRate = stats.total > 0
        ? ((stats.total - stats.totalIncomplete) / stats.total) * 100
        : 0;

    const distribution = [
        { label: 'Sustantivos', count: Math.floor(stats.total * 0.4), color: '#3b82f6' }, 
        { label: 'Verbos', count: Math.floor(stats.total * 0.25), color: '#8b5cf6' }, 
        { label: 'Adjetivos', count: Math.floor(stats.total * 0.15), color: '#ec4899' }, 
        { label: 'Otros', count: stats.total - Math.floor(stats.total * 0.8), color: '#10b981' }, 
    ];

    return (
        <div className="space-y-6 pt-2 pb-6 animate-fade-in overflow-y-auto h-full px-2 custom-scrollbar">
            <div className="flex items-center justify-between mb-2">
                <div>
                    <h2 className="text-2xl font-bold text-white font-display">Resumen del Sistema</h2>
                    <p className="text-sm text-text-secondary">Monitoreo de datos en tiempo real</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={onOpenReport} className="px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-lg text-xs font-bold hover:bg-primary/20 transition-colors uppercase tracking-wider">
                        Ver Reporte Completo
                    </button>
                    <button onClick={onOpenAiAssistant} className="px-4 py-2 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-lg text-xs font-bold hover:bg-purple-500/20 transition-colors uppercase tracking-wider flex items-center gap-2">
                        <WandIcon className="w-4 h-4" /> Asistente IA
                    </button>
                    {onClose && (
                        <button onClick={onClose} className="px-3 py-2 bg-white/5 text-text-secondary border border-white/10 rounded-lg text-xs font-bold hover:bg-white/10 transition-colors uppercase tracking-wider">
                            Cerrar
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Total de Entradas"
                    value={stats.total.toLocaleString()}
                    subtext="Palabras registradas"
                    icon={<BookOpenIcon className="w-6 h-6" />}
                    trend={stats.wordsAddedCount > 0 ? `+${stats.wordsAddedCount}` : undefined}
                />
                <StatCard
                    title="Tasa de Completitud"
                    value={`${completionRate.toFixed(1)}%`}
                    subtext={`${stats.totalIncomplete} entradas incompletas`}
                    icon={<BarChartIcon className="w-6 h-6" />}
                    trend={completionRate > 80 ? 'Bueno' : 'Atención'}
                    onClick={onNavigateComplete}
                    clickable={!!onNavigateComplete}
                />
                <StatCard
                    title="Funciones Faltantes"
                    value={stats.needsFunction}
                    subtext="Requieren clasificación"
                    icon={<WrenchIcon className="w-6 h-6" />}
                    onClick={onNavigateFunctions}
                    clickable={!!onNavigateFunctions}
                />
                <StatCard
                    title="Sesión Actual"
                    value={stats.wordsAddedCount}
                    subtext="Nuevas palabras hoy"
                    icon={<WandIcon className="w-6 h-6" />}
                    trend="Activo"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-surface-dark border border-border-dark p-6 rounded-2xl shadow-lg">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-white font-display">Distribución del Corpus</h3>
                        <span className="text-xs text-text-secondary bg-surface-light/20 px-2 py-1 rounded">Estimado</span>
                    </div>
                    {stats.total === 0 ? (
                        <div className="h-40 flex items-center justify-center text-text-secondary text-sm">Sin datos suficientes</div>
                    ) : (
                        <div className="space-y-4">
                            {distribution.map(d => (
                                <DistributionBar key={d.label} label={d.label} count={d.count} total={stats.total} color={d.color} />
                            ))}
                        </div>
                    )}
                </div>

                <div className="bg-surface-dark border border-border-dark p-6 rounded-2xl shadow-lg flex flex-col">
                    <h3 className="font-bold text-white font-display mb-4">Acciones Rápidas</h3>
                    <div className="flex-grow space-y-3">
                        <button
                            type="button"
                            onClick={onGenerateWords}
                            className="p-3 rounded-lg bg-surface-light/5 border border-white/5 flex items-center gap-3 w-full hover:bg-surface-light/10 transition-colors cursor-pointer group text-left"
                        >
                            <div className="p-2 rounded-full bg-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors"><WandIcon className="w-4 h-4" /></div>
                            <div className="text-sm">
                                <p className="text-white font-semibold">Generar Palabras</p>
                                <p className="text-text-secondary text-xs">Añadir con IA</p>
                            </div>
                        </button>
                        <button
                            type="button"
                            onClick={onBackup}
                            className="p-3 rounded-lg bg-surface-light/5 border border-white/5 flex items-center gap-3 w-full hover:bg-surface-light/10 transition-colors cursor-pointer group text-left"
                        >
                            <div className="p-2 rounded-full bg-blue-500/20 text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors"><BookOpenIcon className="w-4 h-4" /></div>
                            <div className="text-sm">
                                <p className="text-white font-semibold flex items-center gap-2">Guardar Copia {stats.wordsAddedCount > 0 && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>}</p>
                                <p className="text-text-secondary text-xs">Backup local</p>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default memo(CompletionDashboard);
