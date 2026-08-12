import { useState, useEffect, useMemo } from 'react';
import { CorpusEntry, NeographyProfile, GenerativeProfile } from '../types';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';
import SaveIcon from './icons/SaveIcon';
import BookOpenIcon from './icons/BookOpenIcon';
import PenToolIcon from './icons/PenToolIcon';
import NeographyView from './neography/NeographyView';

interface WritingAndNeographyTabProps {
    corpus: CorpusEntry[];
    onUpdateCorpus: (newCorpus: CorpusEntry[]) => void;
    neographyProfile: NeographyProfile;
    generativeProfile: GenerativeProfile;
    onUpdateNeographyProfile: (profile: NeographyProfile) => void;
    onStartTour: () => void;
}

const WritingAndNeographyTab = ({ 
    corpus, 
    onUpdateCorpus, 
    neographyProfile,
    generativeProfile,
    onUpdateNeographyProfile,
    onStartTour 
}: WritingAndNeographyTabProps) => {
    const [activeSubTab, setActiveSubTab] = useState<'corpus' | 'neography'>('corpus');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [localTitle, setLocalTitle] = useState('');
    const [localMeaning, setLocalMeaning] = useState('');
    const [localTranscription, setLocalTranscription] = useState('');
    const [fontUrl, setFontUrl] = useState<string | null>(null);
    const [fontName, setFontName] = useState<string>('sans-serif');
    const [isDirty, setIsDirty] = useState(false);
    const [savedFonts, setSavedFonts] = useState<{ name: string; data: string; url: string }[]>([]);

    const activeEntry = useMemo(() => corpus.find(c => c.id === selectedId), [corpus, selectedId]);

    useEffect(() => {
        if (activeEntry) {
            setLocalTitle(activeEntry.title);
            setLocalMeaning(activeEntry.meaning);
            setLocalTranscription(activeEntry.transcription);
            setIsDirty(false);
        } else {
            setLocalTitle('');
            setLocalMeaning('');
            setLocalTranscription('');
            setIsDirty(false);
        }
    }, [activeEntry]);

    const handleCreate = () => {
        const newEntry: CorpusEntry = {
            id: Date.now().toString(),
            title: 'Nueva Nota',
            meaning: '',
            transcription: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        onUpdateCorpus([...corpus, newEntry]);
        setSelectedId(newEntry.id);
    };

    const handleSave = () => {
        if (!selectedId) return;
        const updatedCorpus = corpus.map(c => {
            if (c.id === selectedId) {
                return {
                    ...c,
                    title: localTitle,
                    meaning: localMeaning,
                    transcription: localTranscription,
                    updatedAt: new Date().toISOString(),
                };
            }
            return c;
        });
        onUpdateCorpus(updatedCorpus);
        setIsDirty(false);
    };

    const handleDelete = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm("¿Borrar esta nota?")) {
            const updated = corpus.filter(c => c.id !== id);
            onUpdateCorpus(updated);
            if (selectedId === id) setSelectedId(null);
        }
    };

    const handleFontUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const arrayBuffer = event.target?.result as ArrayBuffer;
                const base64 = btoa(new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));
                
                if (fontUrl) URL.revokeObjectURL(fontUrl);
                const url = URL.createObjectURL(file);
                const newFont = {
                    name: file.name,
                    data: base64,
                    url: url
                };
                
                setFontUrl(url);
                setFontName(`ConlangFont_${Date.now()}`);
                setSavedFonts(prev => [...prev, newFont]);
            };
            reader.readAsArrayBuffer(file);
        }
    };

    const handleLoadSavedFont = (font: { name: string; data: string; url: string }) => {
        if (fontUrl) URL.revokeObjectURL(fontUrl);
        setFontUrl(font.url);
        setFontName(`ConlangFont_${Date.now()}`);
    };

    const handleDeleteSavedFont = (index: number) => {
        const fontToDelete = savedFonts[index];
        if (fontUrl === fontToDelete.url) {
            URL.revokeObjectURL(fontUrl);
            setFontUrl(null);
            setFontName('sans-serif');
        }
        setSavedFonts(prev => prev.filter((_, i) => i !== index));
    };

    const checkIfDirty = (_: 'title' | 'meaning' | 'transcription', __: string) => {
        if (!activeEntry) return;
        setIsDirty(true);
    };

    return (
        <div className="flex h-full gap-4 relative animate-fade-in">
            {fontUrl && (
                <style>{`
                    @font-face {
                        font-family: '${fontName}';
                        src: url('${fontUrl}');
                        font-weight: normal;
                        font-style: normal;
                    }
                `}</style>
            )}

            {/* Sub-tab Navigation */}
            <div className="absolute top-0 left-0 right-0 z-20 bg-surface-dark/95 backdrop-blur-md border-b border-border-dark px-4 py-2 flex gap-2">
                <button
                    onClick={() => setActiveSubTab('corpus')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeSubTab === 'corpus' ? 'bg-primary/20 text-primary border border-primary/30' : 'text-text-secondary hover:text-text-primary hover:bg-white/5'}`}
                >
                    <BookOpenIcon className="w-4 h-4" />
                    Corpus
                </button>
                <button
                    onClick={() => setActiveSubTab('neography')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeSubTab === 'neography' ? 'bg-primary/20 text-primary border border-primary/30' : 'text-text-secondary hover:text-text-primary hover:bg-white/5'}`}
                >
                    <PenToolIcon className="w-4 h-4" />
                    Editor de Glifos
                </button>
            </div>

            {/* Corpus Sub-tab */}
            {activeSubTab === 'corpus' && (
                <div className="flex-1 flex gap-4 pt-14">
                    {/* Sidebar */}
                    <div className="w-64 bg-[#0a0a0c] border-r border-border-dark flex flex-col p-4 shrink-0">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold text-white font-display">Corpus</h2>
                            <div className="flex gap-1">
                                <button onClick={onStartTour} className="p-1 hover:bg-white/10 rounded-full text-text-secondary hover:text-primary" title="Ayuda / Tour">
                                    <span className="font-bold font-mono text-sm px-1">?</span>
                                </button>
                                <button onClick={handleCreate} className="p-1 hover:bg-white/10 rounded-full text-primary" title="Nueva Nota">
                                    <PlusIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Saved Fonts Section */}
                        {savedFonts.length > 0 && (
                            <div className="mb-4 p-3 bg-background-dark rounded-lg border border-border-dark">
                                <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">Fuentes Guardadas</h3>
                                <div className="space-y-1">
                                    {savedFonts.map((font, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-2 bg-surface rounded group">
                                            <button
                                                onClick={() => handleLoadSavedFont(font)}
                                                className="text-xs text-text-primary hover:text-primary truncate flex-1 text-left"
                                            >
                                                {font.name}
                                            </button>
                                            <button
                                                onClick={() => handleDeleteSavedFont(idx)}
                                                className="p-1 text-text-secondary hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <TrashIcon className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-1">
                            {corpus.length === 0 && (
                                <div className="text-center text-text-secondary text-sm py-8 italic opacity-60">
                                    Crea notas, traducciones o fragmentos de texto aquí.
                                </div>
                            )}
                            {corpus.map(note => (
                                <div
                                    key={note.id}
                                    onClick={() => setSelectedId(note.id)}
                                    className={`p-3 rounded-lg cursor-pointer flex justify-between items-center group transition-all ${selectedId === note.id ? 'bg-primary/20 text-white border border-primary/30' : 'hover:bg-white/5 text-text-secondary'}`}
                                >
                                    <div className="truncate">
                                        <div className="font-semibold text-sm truncate">{note.title || 'Sin título'}</div>
                                        <div className="text-xs opacity-70 truncate">{new Date(note.updatedAt).toLocaleDateString()}</div>
                                    </div>
                                    <button
                                        onClick={(e) => handleDelete(note.id, e)}
                                        className={`p-1 rounded hover:bg-red-500/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity ${selectedId === note.id ? 'text-primary-hover' : 'text-text-secondary'}`}
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Main Editor */}
                    <div className="flex-1 flex flex-col bg-surface-dark rounded-r-xl overflow-hidden relative border border-border-dark">
                        {!selectedId ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-text-secondary opacity-50">
                                <BookOpenIcon className="w-16 h-16 mb-4" />
                                <p className="text-lg">Selecciona o crea una nota para empezar a escribir.</p>
                            </div>
                        ) : (
                            <>
                                {/* Toolbar */}
                                <div className="bg-surface border-b border-border-dark p-4 flex justify-between items-center shadow-md z-10">
                                    <input
                                        type="text"
                                        value={localTitle}
                                        onChange={(e) => { setLocalTitle(e.target.value); checkIfDirty('title', e.target.value); }}
                                        className="bg-transparent text-xl font-bold text-white focus:outline-none focus:border-b border-primary/50"
                                        placeholder="Título de la nota..."
                                    />

                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2 bg-background p-1.5 rounded-md border border-border-dark">
                                            <span className="text-xs text-text-secondary pl-2">Fuente:</span>
                                            <label className="cursor-pointer bg-surface-light hover:bg-white/10 px-2 py-1 rounded text-xs font-semibold text-text-primary transition-colors truncate max-w-[150px]">
                                                {fontName === 'sans-serif' ? 'Cargar OTF/TTF...' : 'Fuente Cargada'}
                                                <input type="file" accept=".otf,.ttf,.woff,.woff2" className="hidden" onChange={handleFontUpload} />
                                            </label>
                                        </div>

                                        <button
                                            onClick={handleSave}
                                            disabled={!isDirty}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm ${isDirty ? 'bg-accent text-white shadow-accent/20 hover:bg-accent-hover' : 'bg-surface-light text-text-secondary cursor-not-allowed opacity-50'}`}
                                        >
                                            <SaveIcon className="w-4 h-4" />
                                            Guardar
                                        </button>
                                    </div>
                                </div>

                                <div className="flex-1 grid grid-cols-3 divide-x divide-border-dark overflow-hidden">
                                    <div className="flex flex-col h-full bg-background/50">
                                        <div className="p-2 bg-surface/50 border-b border-border-dark text-xs font-bold text-text-secondary uppercase tracking-wider text-center">Significado (Español)</div>
                                        <textarea
                                            value={localMeaning}
                                            onChange={(e) => { setLocalMeaning(e.target.value); checkIfDirty('meaning', e.target.value); }}
                                            className="flex-1 w-full bg-transparent p-4 resize-none focus:outline-none text-text-primary custom-scrollbar"
                                            placeholder="Escribe el significado aquí..."
                                        />
                                    </div>

                                    <div className="flex flex-col h-full bg-background/30">
                                        <div className="p-2 bg-surface/50 border-b border-border-dark text-xs font-bold text-text-secondary uppercase tracking-wider text-center">Transcripción (Input)</div>
                                        <textarea
                                            value={localTranscription}
                                            onChange={(e) => { setLocalTranscription(e.target.value); checkIfDirty('transcription', e.target.value); }}
                                            className="flex-1 w-full bg-transparent p-4 resize-none focus:outline-none text-text-primary font-mono custom-scrollbar"
                                            placeholder="Escribe usando la transliteración..."
                                        />
                                    </div>

                                    <div className="flex flex-col h-full bg-white/5 relative">
                                        <div className="p-2 bg-surface/50 border-b border-border-dark text-xs font-bold text-accent uppercase tracking-wider text-center">Visualización (Fuente)</div>
                                        <div
                                            className="flex-1 w-full p-6 overflow-y-auto custom-scrollbar text-3xl leading-relaxed text-center break-words"
                                            style={{ fontFamily: fontName, fontFeatureSettings: '"liga" 1, "calt" 1, "dlig" 1' }}
                                        >
                                            {localTranscription || <span className="text-text-secondary/20 text-sm font-sans block mt-10">(Vista previa aquí)</span>}
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Neography Sub-tab */}
            {activeSubTab === 'neography' && (
                <div className="flex-1 pt-14">
                    <NeographyView
                        profile={neographyProfile}
                        generativeProfile={generativeProfile}
                        onSave={onUpdateNeographyProfile}
                    />
                </div>
            )}
        </div>
    );
};

export default WritingAndNeographyTab;
