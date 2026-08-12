

import React, { useMemo } from 'react';
import { LexiconEntry, LexiconMetadata } from '../types';
import BarChartIcon from './icons/BarChartIcon';
import XCircleIcon from './icons/XCircleIcon';

interface AnalysisReportModalProps {
    lexicon: LexiconEntry[];
    metadata: LexiconMetadata | null;
    onClose: () => void;
}

const AnalysisReportModal = ({ lexicon, metadata, onClose }: AnalysisReportModalProps) => {

    const report = useMemo(() => {
        if (!lexicon || lexicon.length === 0) {
            return {
                totalEntries: 0,
                uniqueRoots: 0,
                categoryCounts: [],
                synonymPairs: [],
                avgLength: 0,
                longestWord: '',
                shortestWord: ''
            };
        }

        const totalEntries = lexicon.length;
        const uniqueRoots = new Set(lexicon.map(e => e.Raíz).filter(Boolean)).size;

        const categoryMap = new Map<string, number>();
        lexicon.forEach(entry => {
            categoryMap.set(entry.Categoría, (categoryMap.get(entry.Categoría) || 0) + 1);
        });
        const categoryCounts = Array.from(categoryMap.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);

        const meaningMap = new Map<string, string[]>();
        lexicon.forEach(entry => {
            entry.Significado.forEach(s => {
                const lexeme = entry.Léxema[0] || `(ID: ${entry.ID})`;
                if (meaningMap.has(s)) {
                    meaningMap.get(s)!.push(lexeme);
                } else {
                    meaningMap.set(s, [lexeme]);
                }
            });
        });

        const synonymPairs: { meaning: string, words: string[] }[] = [];
        meaningMap.forEach((words, meaning) => {
            if (words.length > 1) {
                synonymPairs.push({ meaning, words });
            }
        });
        synonymPairs.sort((a,b) => a.meaning.localeCompare(b.meaning));

        const allLexemes = lexicon.flatMap(e => e.Léxema).filter(Boolean);
        const totalLength = allLexemes.reduce((sum, lex) => sum + lex.length, 0);
        const avgLength = allLexemes.length > 0 ? (totalLength / allLexemes.length).toFixed(2) : 0;
        
        let longestWord = '';
        let shortestWord = allLexemes[0] || '';
        allLexemes.forEach(lex => {
            if (lex.length > longestWord.length) longestWord = lex;
            if (lex.length < shortestWord.length) shortestWord = lex;
        });

        return {
            totalEntries,
            uniqueRoots,
            categoryCounts,
            synonymPairs,
            avgLength,
            longestWord,
            shortestWord
        };
    }, [lexicon]);

    const StatItem = ({ label, value }: { label: string, value: React.ReactNode }) => (
        <div className="flex justify-between items-baseline bg-background/50 p-3 rounded-md">
            <span className="text-text-secondary">{label}</span>
            <span className="font-bold text-text-primary text-lg">{value}</span>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-surface rounded-lg shadow-2xl w-full max-w-3xl max-h-[95vh] flex flex-col border border-subtle">
                <header className="p-4 flex justify-between items-center border-b border-subtle flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <BarChartIcon className="h-7 w-7 text-accent" />
                        <div>
                            <h2 className="text-2xl font-bold text-text-primary">Reporte del Léxico: {metadata?.conlangName || 'Actual'}</h2>
                            <p className="text-sm text-text-secondary">Un vistazo a la estructura de tu lenguaje.</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-full text-text-secondary hover:bg-subtle" aria-label="Cerrar">
                        <XCircleIcon className="h-7 w-7" />
                    </button>
                </header>
                <main className="p-6 flex-grow overflow-y-auto space-y-6">
                    <section>
                        <h3 className="text-lg font-semibold text-accent mb-2">Resumen General</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <StatItem label="Total de Entradas" value={report.totalEntries} />
                            <StatItem label="Raíces Únicas" value={report.uniqueRoots} />
                            <StatItem label="Longitud Media del Léxema" value={`${report.avgLength} chars`} />
                            <StatItem label="Palabra más Larga" value={report.longestWord || 'N/A'} />
                            <StatItem label="Palabra más Corta" value={report.shortestWord || 'N/A'} />
                        </div>
                    </section>

                    <section>
                        <h3 className="text-lg font-semibold text-accent mb-2">Desglose de Categorías</h3>
                        <div className="max-h-60 overflow-y-auto bg-background/50 p-2 rounded-md">
                            {report.categoryCounts.length > 0 ? (
                                <table className="w-full text-sm">
                                    <tbody>
                                    {report.categoryCounts.map(({ name, count }) => (
                                        <tr key={name} className="border-b border-subtle/50 last:border-none">
                                            <td className="p-2 font-medium text-text-primary capitalize">{name}</td>
                                            <td className="p-2 text-right text-text-secondary">{count} entradas</td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            ) : <p className="text-center text-text-secondary p-4">No hay categorías para mostrar.</p>}
                        </div>
                    </section>
                    
                     <section>
                        <h3 className="text-lg font-semibold text-accent mb-2">Pares de Sinónimos Encontrados</h3>
                        <div className="max-h-60 overflow-y-auto bg-background/50 p-2 rounded-md">
                            {report.synonymPairs.length > 0 ? (
                                <table className="w-full text-sm">
                                    <tbody>
                                    {report.synonymPairs.map(({ meaning, words }) => (
                                        <tr key={meaning} className="border-b border-subtle/50 last:border-none">
                                            <td className="p-2 font-medium text-text-primary capitalize">{meaning}</td>
                                            <td className="p-2 text-right text-text-secondary">{words.join(', ')}</td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            ) : <p className="text-center text-text-secondary p-4">No se encontraron sinónimos.</p>}
                        </div>
                    </section>
                </main>
                 <footer className="p-4 flex justify-end gap-4 border-t border-subtle flex-shrink-0">
                    <button onClick={onClose} className="px-6 py-2 bg-accent text-white font-semibold rounded-md shadow-lg hover:bg-accent-hover transition-colors">
                        Cerrar
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default AnalysisReportModal;