
import { useState, memo } from 'react';
import { LexiconEntry, GrammarManifest } from '../types';
import { translateToConlang } from '../services/geminiService.ts';
import SparkleIcon from './icons/SparkleIcon';
import ArrowRightIcon from './icons/ArrowRightIcon';

interface TranslationPlaygroundProps {
    lexicon: LexiconEntry[];
    grammar: GrammarManifest | null;
    disabled: boolean;
}

const TranslationPlayground = ({ lexicon, grammar, disabled }: TranslationPlaygroundProps) => {
    const [inputText, setInputText] = useState('');
    const [result, setResult] = useState<{ translation: string; gloss: string; notes: string } | null>(null);
    const [isTranslating, setIsTranslating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleTranslate = async () => {
        if (!inputText.trim()) return;
        setIsTranslating(true);
        setError(null);
        try {
            const response = await translateToConlang({
                text: inputText,
                lexicon,
                grammar,
            });
            setResult(response);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Error al traducir.');
        } finally {
            setIsTranslating(false);
        }
    };

    return (
        <div className="bg-surface p-6 rounded-lg shadow-lg h-full flex flex-col animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-text-primary font-display">La Fragua (Traductor)</h2>
                    <p className="text-sm text-text-secondary">Pon a prueba tu idioma traduciendo frases completas.</p>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-6 flex-grow">
                <div className="flex-1 flex flex-col gap-2">
                    <label className="text-sm font-semibold text-text-secondary">Texto Original</label>
                    <textarea
                        value={inputText}
                        onChange={e => setInputText(e.target.value)}
                        placeholder="Escribe aquí en español..."
                        className="flex-grow w-full bg-background border border-subtle rounded-md p-4 text-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                        disabled={disabled}
                    />
                    <button
                        onClick={handleTranslate}
                        disabled={disabled || isTranslating || !inputText.trim()}
                        className="w-full py-3 bg-accent text-white font-bold rounded-md shadow-lg hover:bg-accent-hover disabled:opacity-50 flex items-center justify-center gap-2 transition-transform active:scale-95"
                    >
                        <SparkleIcon className={`h-5 w-5 ${isTranslating ? 'animate-spin' : ''}`} />
                        {isTranslating ? 'Traduciendo...' : 'Traducir'}
                    </button>
                    {error && <p className="text-danger text-sm text-center mt-2">{error}</p>}
                </div>

                <div className="hidden md:flex items-center justify-center text-subtle">
                    <ArrowRightIcon className="h-8 w-8 opacity-50" />
                </div>

                <div className="flex-1 flex flex-col gap-2">
                    <label className="text-sm font-semibold text-text-secondary">Traducción al Conlang</label>
                    <div className="flex-grow bg-background/50 border border-subtle rounded-md p-4 overflow-y-auto custom-scrollbar">
                        {result ? (
                            <div className="space-y-6">
                                <div>
                                    <p className="text-2xl font-bold text-accent mb-1">{result.translation}</p>
                                </div>
                                <div>
                                    <h4 className="text-xs uppercase tracking-wider text-text-secondary mb-1">Glosa (Palabra por palabra)</h4>
                                    <p className="font-mono text-sm bg-black/20 p-2 rounded text-text-primary">{result.gloss}</p>
                                </div>
                                <div>
                                    <h4 className="text-xs uppercase tracking-wider text-text-secondary mb-1">Notas Gramaticales</h4>
                                    <p className="text-sm text-text-secondary italic">{result.notes}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex items-center justify-center text-text-secondary text-center p-4">
                                <p>El resultado de la traducción aparecerá aquí.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default memo(TranslationPlayground);
