
import { useState, memo, useRef, useEffect } from 'react';
import { LexiconEntry, GrammarManifest, CorpusEntry } from '../types';
import { conlangAgentChat, isAiAvailable } from '../services/geminiService.ts';
import { realizeLexeme } from '../services/grammar';
import { translateWithLocalEngine } from '../services/localTranslator';
import SparkleIcon from './icons/SparkleIcon';
import XCircleIcon from './icons/XCircleIcon';
import UserIcon from './icons/UserIcon';
import LoaderIcon from './icons/LoaderIcon';
import BarChartIcon from './icons/BarChartIcon';
import BookOpenIcon from './icons/BookOpenIcon';
import PlusIcon from './icons/PlusIcon';

interface TranslationPlaygroundProps {
    lexicon: LexiconEntry[];
    grammar: GrammarManifest;
    corpus: CorpusEntry[];
    onUpdateCorpus: (corpus: CorpusEntry[]) => void;
    onClose: () => void;
}

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

/** Lightweight local realization: for each lexicon entry whose Spanish meaning or
 *  root/lexeme appears (case-insensitive substring) in the input, realize it with the
 *  local engine and collect a short "<spanish> → <conlang form>" gloss line. */
const buildLocalGloss = (input: string, lexicon: LexiconEntry[], grammar: GrammarManifest): string => {
    const needle = input.toLowerCase();
    const lines: string[] = [];
    for (const entry of lexicon) {
        const candidates = [entry.Raíz, ...(entry.Léxema || []), ...(entry.Significado || [])]
            .filter(Boolean)
            .map(s => s.toLowerCase());
        if (candidates.some(c => needle.includes(c))) {
            const form = realizeLexeme(entry, {}, grammar).form;
            const spanish = (entry.Significado && entry.Significado[0]) || entry.Raíz;
            lines.push(`- ${spanish} → ${form}`);
        }
    }
    return lines.join('\n');
};

const TranslationPlayground = ({ lexicon, grammar, corpus, onUpdateCorpus, onClose }: TranslationPlaygroundProps) => {
    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', content: '¡Hola! Soy tu Agente Conlang y hablante nativo de tu idioma. Puedo ayudarte a traducir frases, analizar la completitud de tu léxico o simplemente platicar sobre la gramática. ¿En qué puedo ayudarte hoy?' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [analysis, setAnalysis] = useState<{ completeness: number, gaps: string[], suggestions: string[] } | null>(null);
    const [activeTab, setActiveTab] = useState<'chat' | 'corpus'>('chat');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(scrollToBottom, [messages, activeTab]);

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMsg = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setIsLoading(true);

        const ai = await isAiAvailable();
        const localTranslation = translateWithLocalEngine(userMsg, lexicon, grammar);

        try {
            if (!ai) {
                const notice = 'Modo offline: usando motor local de traducción.';
                const body = localTranslation ? `${notice}\n${localTranslation}` : `${notice}\n(No se encontraron palabras del diccionario en tu mensaje.)`;
                setMessages(prev => [...prev, { role: 'assistant', content: body }]);
                return;
            }

            const groundedMsg = localTranslation ? `${userMsg}\n\n[Contexto local]\n${localTranslation}` : userMsg;
            const response = await conlangAgentChat(groundedMsg, messages, lexicon, grammar);
            setMessages(prev => [...prev, { role: 'assistant', content: response.reply }]);
            if (response.analysis) setAnalysis(response.analysis);
        } catch (error) {
            setMessages(prev => [...prev, { role: 'assistant', content: 'Lo siento, ocurrió un error al procesar tu solicitud.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    const saveToCorpus = (conlang: string, spanish: string, gloss?: string) => {
        const newEntry: CorpusEntry = { 
            id: `corp_${Date.now()}`,
            title: conlang.substring(0, 20),
            meaning: spanish, 
            transcription: conlang, 
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        onUpdateCorpus([newEntry, ...corpus]);
        alert("Frase guardada en el Corpus Oficial");
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-surface w-full max-w-6xl h-[90vh] rounded-2xl shadow-2xl flex border border-subtle overflow-hidden">
                {/* Main Content Area */}
                <div className="flex-grow flex flex-col min-w-0">
                    <header className="p-4 border-b border-subtle bg-background/30 flex justify-between items-center">
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-accent/20 rounded-lg">
                                    <SparkleIcon className="h-6 w-6 text-accent" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-text-primary">Conlang AI Agent</h2>
                                    <p className="text-xs text-text-secondary italic">Agente Nativo y Analista</p>
                                </div>
                            </div>
                            <nav className="flex gap-2 p-1 bg-black/20 rounded-lg border border-subtle/50">
                                <button
                                    onClick={() => setActiveTab('chat')}
                                    className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'chat' ? 'bg-accent text-white' : 'text-text-secondary hover:text-text-primary'}`}
                                >
                                    CHAT
                                </button>
                                <button
                                    onClick={() => setActiveTab('corpus')}
                                    className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'corpus' ? 'bg-accent text-white' : 'text-text-secondary hover:text-text-primary'}`}
                                >
                                    CORPUS ({corpus.length})
                                </button>
                            </nav>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-subtle rounded-full text-text-secondary transition-colors">
                            <XCircleIcon className="h-6 w-6" />
                        </button>
                    </header>

                    {activeTab === 'chat' ? (
                    <>
                    <div className="flex-grow overflow-y-auto p-6 space-y-6 custom-scrollbar bg-background/10">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                    <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${msg.role === 'user' ? 'bg-accent text-white' : 'bg-surface border border-subtle'}`}>
                                        {msg.role === 'user' ? <UserIcon className="h-5 w-5" /> : <SparkleIcon className="h-5 w-5 text-accent" />}
                                    </div>
                                    <div className={`p-4 rounded-2xl text-sm leading-relaxed relative group/msg ${msg.role === 'user' ? 'bg-accent text-white shadow-lg' : 'bg-surface border border-subtle text-text-primary'}`}>
                                        <p className="whitespace-pre-wrap">{msg.content}</p>
                                        {msg.role === 'assistant' && !isLoading && (
                                            <button
                                                onClick={() => {
                                                    const lines = msg.content.split('\n').filter(l => l.trim());
                                                    const conlang = lines[0] || '...';
                                                    const spanish = lines.find(l => l.toLowerCase().includes('significa') || l.includes('"')) || 'Traducción';
                                                    saveToCorpus(conlang, spanish);
                                                }}
                                                className="absolute -right-12 top-0 p-2 bg-accent/10 text-accent rounded-lg opacity-0 group-hover/msg:opacity-100 transition-all hover:bg-accent hover:text-white"
                                                title="Guardar en Corpus"
                                            >
                                                <PlusIcon className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-surface border border-subtle p-4 rounded-2xl flex items-center gap-3">
                                    <LoaderIcon className="h-5 w-5 text-accent animate-spin" />
                                    <span className="text-xs text-text-secondary font-bold uppercase tracking-widest">El agente está analizando...</span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <form onSubmit={handleSendMessage} className="p-4 bg-background/30 border-t border-subtle flex gap-3">
                        <input
                            type="text"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            placeholder="Habla con tu idioma o pide una traducción..."
                            className="flex-grow bg-surface border border-subtle rounded-xl px-4 py-3 text-text-primary focus:ring-2 focus:ring-accent outline-none shadow-inner"
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || isLoading}
                            className="px-6 py-3 bg-accent text-white font-bold rounded-xl hover:bg-accent-hover transition-all disabled:opacity-50 shadow-lg flex items-center gap-2"
                        >
                            ENVIAR
                        </button>
                    </form>
                    </>
                    ) : (
                        <div className="flex-grow overflow-y-auto p-6 space-y-4 custom-scrollbar bg-background/10">
                            {corpus.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center opacity-30 space-y-4">
                                    <BookOpenIcon className="h-16 w-16" />
                                    <p className="text-sm font-bold uppercase tracking-widest">Tu corpus está vacío.<br/>Traduce frases en el chat y guarda las mejores aquí.</p>
                                </div>
                            ) : (
                                corpus.map((entry, idx) => (
                                    <div key={idx} className="bg-surface border border-subtle p-5 rounded-2xl shadow-sm hover:border-accent/30 transition-all group">
                                        <div className="flex justify-between items-start mb-3">
                                            <span className="text-[10px] font-black text-accent uppercase tracking-widest">Entrada de Corpus #{corpus.length - idx}</span>
                                            <span className="text-[10px] text-text-secondary font-mono">{new Date(entry.createdAt).toLocaleDateString()}</span>
                                        </div>
                                        <div className="space-y-4">
                                            <div>
                                                <p className="text-xl font-bold text-text-primary font-display leading-tight">{entry.transcription}</p>
                                            </div>
                                            <div className="p-3 bg-black/20 rounded-lg border border-subtle/30">
                                                <p className="text-sm text-text-secondary italic">"{entry.meaning}"</p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>

                {/* Analysis Sidebar */}
                <div className="w-80 border-l border-subtle bg-background/20 hidden lg:flex flex-col">
                    <header className="p-4 border-b border-subtle bg-surface/50">
                        <div className="flex items-center gap-2 text-accent">
                            <BarChartIcon className="h-5 w-5" />
                            <h3 className="text-xs font-black uppercase tracking-[0.2em]">Estado del Idioma</h3>
                        </div>
                    </header>
                    <div className="p-6 flex-grow overflow-y-auto custom-scrollbar space-y-8">
                        <div className="space-y-2">
                             <div className="flex justify-between text-[10px] font-bold uppercase text-text-secondary tracking-widest">
                                <span>Completitud</span>
                                <span>{analysis?.completeness || 0}%</span>
                             </div>
                             <div className="h-2 w-full bg-subtle rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-accent transition-all duration-1000 ease-out"
                                    style={{ width: `${analysis?.completeness || 0}%` }}
                                ></div>
                             </div>
                        </div>

                        {analysis?.gaps && analysis.gaps.length > 0 && (
                            <div className="space-y-3">
                                <h4 className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Carencias Detectadas</h4>
                                <ul className="space-y-2">
                                    {analysis.gaps.map((gap, i) => (
                                        <li key={i} className="text-xs text-text-primary bg-danger/10 border border-danger/20 p-2 rounded-lg italic">
                                            {gap}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {analysis?.suggestions && analysis.suggestions.length > 0 && (
                            <div className="space-y-3">
                                <h4 className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Sugerencias AI</h4>
                                <ul className="space-y-2">
                                    {analysis.suggestions.map((sug, i) => (
                                        <li key={i} className="text-xs text-text-secondary bg-accent/5 border border-accent/10 p-2 rounded-lg leading-relaxed">
                                            {sug}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {!analysis && (
                            <div className="h-full flex flex-col items-center justify-center text-center opacity-30 py-10 space-y-4">
                                <SparkleIcon className="h-12 w-12" />
                                <p className="text-[10px] font-bold uppercase tracking-widest leading-relaxed">Pide al agente un análisis<br/>de tu idioma para ver<br/>las métricas aquí.</p>
                            </div>
                        )}
                    </div>
                    <footer className="p-4 text-[10px] text-text-secondary text-center italic border-t border-subtle bg-surface/30">
                        Basado en el léxico actual ({lexicon.length} entradas) y reglas gramaticales.
                    </footer>
                </div>
            </div>
        </div>
    );
};

export default memo(TranslationPlayground);
