import { useState, useEffect, useCallback, memo } from 'react';
import { NeographyProfile, Glyph, GenerativeProfile } from '../../types';
import DownloadIcon from '../icons/DownloadIcon';
import NeographyGrid from './NeographyGrid';
import NeographyEditor from './NeographyEditor';
import NeographyLigatureEditor from './NeographyLigatureEditor';
import NeographyPreview from './NeographyPreview';
import { ensureUnicodeAssignments, getNextAvailablePUA } from './neographyUtils';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import { buildTtfFont } from '../../services/fontBuilderService';

interface NeographyViewProps {
    profile: NeographyProfile;
    generativeProfile: GenerativeProfile;
    onSave: (profile: NeographyProfile) => void;
}

const DEFAULT_GUIDELINES = { baseline: 180, xHeight: 120, ascender: 60, descender: 200 };
const CANVAS_WIDTH = 250;
const CANVAS_HEIGHT = 250;

const NeographyModal = ({ profile, onSave }: NeographyViewProps) => {
    const [localProfile, setLocalProfile] = useState<NeographyProfile>(profile);
    const [viewMode, setViewMode] = useState<'grid' | 'editor' | 'ligatures' | 'preview'>('grid');
    const [editingGlyphId, setEditingGlyphId] = useState<string | null>(null);

    // Initial Migration & PUA Assignment
    useEffect(() => {
        const migratedProfile = {
            ...profile,
            guideLines: profile.guideLines || DEFAULT_GUIDELINES,
            ligatures: profile.ligatures || {},
            customCharacters: profile.customCharacters || [],
            glyphs: (profile.glyphs || []).map((g: any) => ({
                ...g,
                svgPathMain: g.svgPathMain || g.svgPath || '',
                svgPathUpper: g.svgPathUpper || '',
                svgPathLower: g.svgPathLower || '',
                width: g.width || 250
            })),
        };

        const safeProfile = ensureUnicodeAssignments(migratedProfile);
        setLocalProfile(safeProfile);
    }, [profile]);

    const handleAddGlyph = useCallback(() => {
        const nextPUA = getNextAvailablePUA(localProfile.glyphs);

        const newGlyph: Glyph = {
            id: `glyph_${Date.now()}`,
            name: `glifo-${localProfile.glyphs.length + 1}`,
            unicode: nextPUA, 
            svgPathMain: '', svgPathUpper: '', svgPathLower: '',
            viewBox: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
            width: 250,
        };
        setLocalProfile((p: NeographyProfile) => ({ ...p, glyphs: [...p.glyphs, newGlyph] }));
        setEditingGlyphId(newGlyph.id);
        setViewMode('editor');
    }, [localProfile.glyphs]);

    const handleDeleteGlyph = useCallback((glyphToDelete: Glyph) => {
        if (window.confirm(`¿Eliminar glifo "${glyphToDelete.name}"?`)) {
            setLocalProfile((p: NeographyProfile) => ({
                ...p,
                glyphs: p.glyphs.filter((g: Glyph) => g.id !== glyphToDelete.id),
                characterMap: Object.fromEntries(Object.entries(p.characterMap).filter(([, glyphId]) => glyphId !== glyphToDelete.id)),
            }));
        }
    }, []);

    const handleUpdateGlyph = useCallback((id: string, updates: Partial<Glyph>) => {
        setLocalProfile((prev: NeographyProfile) => ({
            ...prev,
            glyphs: prev.glyphs.map((g: Glyph) => g.id === id ? { ...g, ...updates } : g)
        }));
    }, []);

    const [isExporting, setIsExporting] = useState(false);

    const handleExport = async () => {
        if (localProfile.glyphs.length === 0) {
            alert("No hay glifos para exportar. Crea algunos primero.");
            return;
        }

        try {
            const exportProfile = ensureUnicodeAssignments(localProfile);
            const path = await save({
                filters: [{ name: 'Fuente TrueType', extensions: ['ttf'] }],
                defaultPath: `${(exportProfile.fontFamily || 'MyFont').replace(/\\s+/g, '_')}.ttf`
            });

            if (!path) return; // User cancelled

            setIsExporting(true);
            const ttfBuffer = buildTtfFont(exportProfile);
            await writeFile(path, ttfBuffer);
            alert("Fuente exportada correctamente a: " + path);
        } catch (e: any) {
            console.error("Export error:", e);
            alert("Error al exportar fuente: " + (e.message || e));
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-deep-background animate-fade-in text-text-primary">
            <header className="flex items-center justify-between p-4 border-b border-subtle bg-surface shadow-sm z-10 flex-shrink-0">
                <div className="flex items-center gap-4">
                    <div className="flex bg-subtle/30 rounded-lg p-1">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${viewMode === 'grid' ? 'bg-accent text-white shadow-md' : 'text-text-secondary hover:text-text-primary hover:bg-white/5'}`}
                        >
                            <span className="flex items-center gap-2"><span className="material-symbols-outlined text-lg">grid_view</span> Glifos</span>
                        </button>
                        <button
                            onClick={() => { setEditingGlyphId(null); setViewMode('editor'); }}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${viewMode === 'editor' ? 'bg-accent text-white shadow-md' : 'text-text-secondary hover:text-text-primary hover:bg-white/5'}`}
                        >
                            <span className="flex items-center gap-2"><span className="material-symbols-outlined text-lg">edit_note</span> Editor</span>
                        </button>
                        <button
                            onClick={() => setViewMode('ligatures')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${viewMode === 'ligatures' ? 'bg-accent text-white shadow-md' : 'text-text-secondary hover:text-text-primary hover:bg-white/5'}`}
                        >
                            <span className="flex items-center gap-2"><span className="material-symbols-outlined text-lg">join</span> Ligaduras</span>
                        </button>
                        <button
                            onClick={() => setViewMode('preview')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${viewMode === 'preview' ? 'bg-accent text-white shadow-md' : 'text-text-secondary hover:text-text-primary hover:bg-white/5'}`}
                        >
                            <span className="flex items-center gap-2"><span className="material-symbols-outlined text-lg">visibility</span> Preview</span>
                        </button>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleExport}
                        disabled={isExporting}
                        className="flex items-center gap-2 px-3 py-2 bg-subtle text-text-secondary hover:text-text-primary rounded-md text-sm font-medium transition-colors"
                        title="Exportar como fuente .TTF"
                    >
                        <DownloadIcon className={`h-4 w-4 ${isExporting ? 'animate-bounce' : ''}`} />
                        {isExporting ? 'Exportando...' : 'Exportar TTF'}
                    </button>

                    <button
                        onClick={() => onSave(localProfile)}
                        className="px-6 py-2 bg-accent text-white rounded-md font-semibold hover:bg-accent-hover shadow-lg transition-all flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined text-lg">save</span> Guardar
                    </button>
                </div>
            </header>

            <main className="flex-1 overflow-hidden relative">
                {viewMode === 'grid' && (
                    <NeographyGrid
                        glyphs={localProfile.glyphs}
                        onSelectGlyph={(id) => { setEditingGlyphId(id); setViewMode('editor'); }}
                        onAddGlyph={handleAddGlyph}
                        onDeleteGlyph={handleDeleteGlyph}
                    />
                )}

                {viewMode === 'editor' && (
                    <NeographyEditor
                        glyph={localProfile.glyphs.find((g: Glyph) => g.id === editingGlyphId)!}
                        profile={localProfile}
                        onUpdateGlyph={handleUpdateGlyph}
                        onBack={() => setViewMode('grid')}
                    />
                )}

                {viewMode === 'ligatures' && (
                    <NeographyLigatureEditor
                        profile={localProfile}
                        onUpdateProfile={(updates: Partial<NeographyProfile>) => setLocalProfile((prev: NeographyProfile) => ({ ...prev, ...updates }))}
                    />
                )}
                {viewMode === 'preview' && (
                    <NeographyPreview
                        profile={localProfile}
                        onUpdateProfile={(updates: Partial<NeographyProfile>) => setLocalProfile((prev: NeographyProfile) => ({ ...prev, ...updates }))}
                    />
                )}
            </main>
        </div>
    );
};

export default memo(NeographyModal);
