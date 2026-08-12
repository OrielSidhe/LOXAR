
import { FC, useState, useMemo } from 'react';
import { NeographyProfile } from '../../types';
import TrashIcon from '../icons/TrashIcon';
import PlusIcon from '../icons/PlusIcon';
import ArrowRightIcon from '../icons/ArrowRightIcon';

interface NeographyLigatureEditorProps {
    profile: NeographyProfile;
    onUpdateProfile: (updates: Partial<NeographyProfile>) => void;
}

const NeographyLigatureEditor: FC<NeographyLigatureEditorProps> = ({ profile, onUpdateProfile }) => {
    const [inputSeq, setInputSeq] = useState('');
    const [selectedResultGlyph, setSelectedResultGlyph] = useState<string>('');

    const ligatures = useMemo(() => Object.entries(profile.ligatures || {}), [profile.ligatures]);

    const handleAdd = () => {
        if (!inputSeq.trim() || !selectedResultGlyph) return;

        const newLigatures = { ...profile.ligatures, [inputSeq.trim()]: selectedResultGlyph };
        onUpdateProfile({ ligatures: newLigatures });
        setInputSeq('');
        setSelectedResultGlyph('');
    };

    const handleDelete = (seq: string) => {
        const newLigatures = { ...profile.ligatures };
        delete newLigatures[seq];
        onUpdateProfile({ ligatures: newLigatures });
    };

    const getGlyphName = (id: string) => profile.glyphs.find(g => g.id === id)?.name || id;

    return (
        <div className="h-full flex flex-col p-6 animate-fade-in bg-background-dark text-text-primary">
            <h3 className="text-xl font-bold font-display mb-4 flex items-center gap-2">
                <span className="text-accent">⚡</span> Editor de Ligaduras
            </h3>
            <p className="text-sm text-text-secondary mb-6">
                Define reglas de sustitución automática. Por ejemplo, si escribes "ch", reemplázalo por el glifo "ch_ligadura".
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-full overflow-hidden">
                {/* Creator Panel */}
                <div className="bg-surface p-6 rounded-lg border border-subtle flex flex-col gap-4">
                    <h4 className="font-semibold text-white">Nueva Regla</h4>

                    <div className="flex flex-col gap-2">
                        <label className="text-xs text-text-secondary">Secuencia de caracteres (input)</label>
                        <input
                            type="text"
                            value={inputSeq}
                            onChange={(e) => setInputSeq(e.target.value)}
                            placeholder="ej. sh"
                            className="bg-background-dark border border-subtle rounded p-2 text-white focus:border-accent outline-none"
                        />
                    </div>

                    <div className="flex justify-center text-text-secondary">
                        <ArrowRightIcon className="w-6 h-6 rotate-90 md:rotate-0" />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-xs text-text-secondary">Glifo resultante (output)</label>
                        <select
                            value={selectedResultGlyph}
                            onChange={(e) => setSelectedResultGlyph(e.target.value)}
                            className="bg-background-dark border border-subtle rounded p-2 text-white focus:border-accent outline-none"
                        >
                            <option value="">Seleccionar glifo...</option>
                            {profile.glyphs.map(g => (
                                <option key={g.id} value={g.id}>
                                    {g.name} ({g.unicode || '?'})
                                </option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={handleAdd}
                        disabled={!inputSeq || !selectedResultGlyph}
                        className="mt-auto py-2 bg-accent text-white font-bold rounded hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    >
                        <PlusIcon className="w-5 h-5" /> Añadir Regla
                    </button>
                </div>

                {/* List Panel */}
                <div className="bg-surface/50 border border-subtle rounded-lg flex flex-col overflow-hidden">
                    <h4 className="p-4 font-semibold text-text-secondary bg-surface-dark border-b border-subtle">Reglas Activas ({ligatures.length})</h4>
                    <div className="overflow-y-auto p-4 space-y-2">
                        {ligatures.length === 0 ? (
                            <p className="text-text-muted text-center italic mt-10">No hay ligaduras definidas.</p>
                        ) : (
                            ligatures.map(([seq, glyphId]) => (
                                <div key={seq} className="flex items-center justify-between p-3 bg-surface rounded border border-subtle hover:border-accent/50 transition-colors group">
                                    <div className="flex items-center gap-3">
                                        <span className="font-mono bg-black/30 px-2 py-1 rounded text-accent">"{seq}"</span>
                                        <ArrowRightIcon className="w-4 h-4 text-text-muted" />
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-white">{getGlyphName(glyphId)}</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(seq)}
                                        className="p-1.5 text-text-muted hover:text-danger hover:bg-danger/10 rounded transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NeographyLigatureEditor;
