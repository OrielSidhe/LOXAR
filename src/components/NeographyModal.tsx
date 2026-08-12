
import { useState, useEffect, useRef, useCallback, useMemo, MouseEvent, TouchEvent, JSX, memo, FC } from 'react';
import { NeographyProfile, Glyph, GenerativeProfile, GrammarManifest, LexiconEntry } from '../types';
import { realizeLexeme } from '../services/grammar';
import PenToolIcon from './icons/PenToolIcon';
import XCircleIcon from './icons/XCircleIcon';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';
import Tooltip from './Tooltip';
import PencilIcon from './icons/PencilIcon';
import LineIcon from './icons/LineIcon';
import UndoIcon from './icons/UndoIcon';
import RedoIcon from './icons/RedoIcon';
import ChevronLeftIcon from './icons/ChevronLeftIcon';
import ChevronRightIcon from './icons/ChevronRightIcon';
import DownloadIcon from './icons/DownloadIcon';
import { smoothPoints, pointsToPath, simplifyPath, polylineToBezier } from '../utils/drawingUtils';

interface NeographyModalProps {
    profile: NeographyProfile;
    generativeProfile: GenerativeProfile;
    onSave: (profile: NeographyProfile) => void;
    onClose: () => void;
    grammar?: GrammarManifest;
    currentEntry?: LexiconEntry;
}

const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 1000;
const DEFAULT_GLYPH_WIDTH = 600;
const DEFAULT_GUIDELINES = { baseline: 800, xHeight: 400, ascender: 200, descender: 900, emSize: 1000 };

type DrawingLayer = 'main' | 'upper' | 'lower';
type DrawingTool = 'pencil' | 'line' | 'bezier';
type PathHistory = { main: string; upper: string; lower: string; advanceWidth: number; leftBearing: number; rightBearing: number; };

const emptyManifest: GrammarManifest = {
    meta: { author: 'local', version: '0', sourceFormat: 'json', lastUpdated: '' },
    typology: { wordOrder: '', alignment: '', morphology: '', headDirection: '' },
    roles: [],
    strategies: [],
    paradigms: [],
    mutationRules: [],
    exceptions: [],
    notes: [],
};

const parseFeatures = (text: string): Record<string, string> => {
    const out: Record<string, string> = {};
    text.split('&').forEach(pair => {
        const eq = pair.indexOf('=');
        if (eq === -1) return;
        const k = pair.slice(0, eq).trim();
        const v = pair.slice(eq + 1).trim();
        if (k && v) out[k] = v;
    });
    return out;
};

const GlyphPaths: FC<{ glyph: Glyph | null; strokeColor?: string; strokeWidth?: number }> = memo(({ glyph, strokeColor = 'currentColor', strokeWidth = 10 }) => {
    if (!glyph) return null;
    return <>
        <path d={glyph.svgPathUpper || ''} stroke={strokeColor} fill="none" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        <path d={glyph.svgPathMain || ''} stroke={strokeColor} fill="none" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        <path d={glyph.svgPathLower || ''} stroke={strokeColor} fill="none" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </>;
});
GlyphPaths.displayName = 'GlyphPaths';

const GlyphIcon: FC<{ glyph: Glyph | null; strokeColor?: string; strokeWidth?: number }> = memo(({ glyph, strokeColor = 'currentColor', strokeWidth = 15 }) => {
    if (!glyph) return null;
    const viewBox = glyph.viewBox || { width: CANVAS_WIDTH, height: CANVAS_HEIGHT };
    return (
        <svg width="100%" height="100%" viewBox={`0 0 ${viewBox.width} ${viewBox.height}`} preserveAspectRatio="xMidYMid meet" className="overflow-visible">
            <GlyphPaths glyph={glyph} strokeColor={strokeColor} strokeWidth={strokeWidth} />
        </svg>
    );
});
GlyphIcon.displayName = 'GlyphIcon';

const NeographyModal = ({ profile, generativeProfile, onSave, onClose, grammar, currentEntry }: NeographyModalProps) => {
    const [localProfile, setLocalProfile] = useState<NeographyProfile>(profile);
    const [selectedGlyphId, setSelectedGlyphId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'library' | 'map' | 'ligatures' | 'guides'>('library');
    const [activeLayer, setActiveLayer] = useState<DrawingLayer>('main');
    const [activeTool, setActiveTool] = useState<DrawingTool>('pencil');
    const [stabilizationLevel, setStabilizationLevel] = useState(10);
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentPoints, setCurrentPoints] = useState<{x: number, y: number}[]>([]);
    const [lineStart, setLineStart] = useState<{x: number, y: number} | null>(null);
    const [history, setHistory] = useState<PathHistory[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [previewText, setPreviewText] = useState('wey');
    const [editingName, setEditingName] = useState('');
    const [contextLeftInput, setContextLeftInput] = useState('');
    const [contextRightInput, setContextRightInput] = useState('');
    const [grammarView, setGrammarView] = useState(false);
    const [featureText, setFeatureText] = useState('tense=past');

    const svgCanvasRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        const migratedProfile = {
            ...profile,
            guideLines: { ...DEFAULT_GUIDELINES, ...profile.guideLines },
            ligatures: profile.ligatures || {},
            glyphs: (profile.glyphs || []).map((g: any) => ({
                ...g,
                svgPathMain: g.svgPathMain || g.svgPath || '',
                svgPathUpper: g.svgPathUpper || '',
                svgPathLower: g.svgPathLower || '',
                width: g.width || DEFAULT_GLYPH_WIDTH,
                lsb: g.lsb ?? 0,
                rsb: g.rsb ?? 0
            })),
        };
        setLocalProfile(migratedProfile);
        if (!selectedGlyphId && migratedProfile.glyphs.length > 0) setSelectedGlyphId(migratedProfile.glyphs[0].id);
    }, [profile, selectedGlyphId]);

    const selectedGlyph = useMemo(() => localProfile.glyphs.find(g => g.id === selectedGlyphId), [localProfile.glyphs, selectedGlyphId]);

    const leftGlyph = useMemo(() => {
        if (!contextLeftInput) return null;
        const id = localProfile.characterMap[contextLeftInput];
        return localProfile.glyphs.find(g => g.id === id) || null;
    }, [contextLeftInput, localProfile]);

    const rightGlyph = useMemo(() => {
        if (!contextRightInput) return null;
        const id = localProfile.characterMap[contextRightInput];
        return localProfile.glyphs.find(g => g.id === id) || null;
    }, [contextRightInput, localProfile]);

    const surf = useMemo(() => {
        if (!currentEntry) return '';
        return realizeLexeme(currentEntry, parseFeatures(featureText), grammar ?? emptyManifest).form;
    }, [currentEntry, featureText, grammar]);

    const displayText = grammarView && surf ? surf : previewText;

    useEffect(() => {
        if (selectedGlyph) {
            setEditingName(selectedGlyph.name);
            const initialHistory = {
                main: selectedGlyph.svgPathMain,
                upper: selectedGlyph.svgPathUpper || '',
                lower: selectedGlyph.svgPathLower || '',
                advanceWidth: selectedGlyph.width || 0,
                leftBearing: selectedGlyph.lsb || 0,
                rightBearing: selectedGlyph.rsb || 0
            };
            setHistory([initialHistory]);
            setHistoryIndex(0);
        } else {
            setEditingName(''); setHistory([]); setHistoryIndex(-1);
        }
    }, [selectedGlyphId]); // Re-initialize history ONLY when glyph changes

    const getPathKeyForLayer = (layer: DrawingLayer) => `svgPath${layer.charAt(0).toUpperCase() + layer.slice(1)}` as 'svgPathMain' | 'svgPathUpper' | 'svgPathLower';

    const updateGlyph = useCallback((id: string, updates: Partial<Glyph>, addToHistory: boolean = false) => {
        setLocalProfile(prev => {
            const newGlyphs = prev.glyphs.map(g => {
                if (g.id === id) {
                    const updated = { ...g, ...updates };
                    if (addToHistory) {
                        const newHistoryEntry = {
                            main: updated.svgPathMain,
                            upper: updated.svgPathUpper || '',
                            lower: updated.svgPathLower || '',
                            advanceWidth: updated.width || 0,
                            leftBearing: updated.lsb || 0,
                            rightBearing: updated.rsb || 0
                        };
                        setHistory(h => {
                             const trimmed = h.slice(0, historyIndex + 1);
                             setHistoryIndex(trimmed.length);
                             return [...trimmed, newHistoryEntry];
                        });
                    }
                    return updated;
                }
                return g;
            });
            return { ...prev, glyphs: newGlyphs };
        });
    }, [historyIndex]);
    
    const canUndo = historyIndex > 0;
    const canRedo = historyIndex < history.length - 1;

    const handleUndo = useCallback(() => {
        if (!canUndo || !selectedGlyph) return;
        const newIndex = historyIndex - 1;
        const prevState = history[newIndex];
        updateGlyph(selectedGlyph.id, { svgPathMain: prevState.main, svgPathUpper: prevState.upper, svgPathLower: prevState.lower }, false);
        setHistoryIndex(newIndex);
    }, [canUndo, selectedGlyph, historyIndex, history, updateGlyph]);

    const handleRedo = useCallback(() => {
        if (!canRedo || !selectedGlyph) return;
        const newIndex = historyIndex + 1;
        const nextState = history[newIndex];
        updateGlyph(selectedGlyph.id, { svgPathMain: nextState.main, svgPathUpper: nextState.upper, svgPathLower: nextState.lower }, false);
        setHistoryIndex(newIndex);
    }, [canRedo, selectedGlyph, historyIndex, history, updateGlyph]);

    const getSVGPoint = (e: MouseEvent<SVGSVGElement> | TouchEvent<SVGSVGElement>): { x: number, y: number } | null => {
        const svg = svgCanvasRef.current; if (!svg) return null;
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        const pt = svg.createSVGPoint();
        pt.x = clientX;
        pt.y = clientY;
        const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());
        return { x: svgP.x, y: svgP.y };
    };

    const handleMouseDown = (e: MouseEvent<SVGSVGElement> | TouchEvent<SVGSVGElement>) => {
        if (!selectedGlyph) return;
        const point = getSVGPoint(e); if (!point) return;
        setIsDrawing(true);
        if (activeTool === 'pencil') setCurrentPoints([point]);
        else if (activeTool === 'line') setLineStart(point);
    };
    
    const handleMouseMove = (e: MouseEvent<SVGSVGElement> | TouchEvent<SVGSVGElement>) => {
        if (!isDrawing || !selectedGlyph || activeTool !== 'pencil') return;
        const point = getSVGPoint(e); if (!point) return;
        setCurrentPoints(prev => [...prev, point]);
    };

    const handleMouseUp = (e: MouseEvent<SVGSVGElement> | TouchEvent<SVGSVGElement>) => {
        if (!isDrawing || !selectedGlyph) return;
        setIsDrawing(false);
        const pathKey = getPathKeyForLayer(activeLayer);
        
        if (activeTool === 'line' && lineStart) {
            const point = getSVGPoint(e); if (!point) return;
            const currentPath = selectedGlyph[pathKey] || '';
            updateGlyph(selectedGlyph.id, { [pathKey]: `${currentPath} M ${lineStart.x} ${lineStart.y} L ${point.x} ${point.y}` }, true);
            setLineStart(null);
        } else if (activeTool === 'pencil') {
            const smoothed = simplifyPath(smoothPoints(currentPoints, stabilizationLevel), 0.5);
            const pathString = pointsToPath(smoothed);
            const currentPath = selectedGlyph[pathKey] || '';
            const newPath = currentPath ? `${currentPath} ${pathString}` : pathString;
            updateGlyph(selectedGlyph.id, { [pathKey]: newPath }, true);
            setCurrentPoints([]);
        } else if (activeTool === 'bezier') {
            const smoothed = smoothPoints(currentPoints, stabilizationLevel);
            const pathString = polylineToBezier(smoothed);
            const currentPath = selectedGlyph[pathKey] || '';
            const newPath = currentPath ? `${currentPath} ${pathString}` : pathString;

            updateGlyph(selectedGlyph.id, { [pathKey]: newPath }, true);
            setCurrentPoints([]);
        }
    };
    
    const handleAddGlyph = () => {
        const name = prompt("Nombre para el nuevo glifo:", "glifo-" + (localProfile.glyphs.length + 1));
        if (name) {
            const newGlyph: Glyph = {
                id: `glyph_${Date.now()}`, name,
                svgPathMain: '', svgPathUpper: '', svgPathLower: '',
                viewBox: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
                width: DEFAULT_GLYPH_WIDTH, lsb: 0, rsb: 0
            };
            setLocalProfile(p => ({ ...p, glyphs: [...p.glyphs, newGlyph] }));
            setSelectedGlyphId(newGlyph.id);
        }
    };

    const handleExportTechnical = () => {
        const data = JSON.stringify(localProfile, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `font-specification-${Date.now()}.json`;
        a.click();
    };

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl flex items-center justify-center z-50 p-4 animate-fade-in" role="dialog" aria-modal="true">
            <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-7xl h-[95vh] flex flex-col border border-subtle overflow-hidden">
                <header className="p-6 flex justify-between items-center border-b border-subtle flex-shrink-0 bg-background/20">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-accent/20 rounded-xl"><PenToolIcon className="h-7 w-7 text-accent" /></div>
                        <div>
                            <h2 className="text-2xl font-bold text-text-primary font-display tracking-tight">Taller de Escritura & Neografía</h2>
                            <p className="text-sm text-text-secondary">Diseño de glifos con curvas de Bezier y métricas avanzadas.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={handleExportTechnical} className="flex items-center gap-2 px-4 py-2 bg-subtle text-text-primary rounded-lg hover:bg-gray-600 transition-all font-bold text-sm">
                            <DownloadIcon className="h-4 w-4" /> EXPORTAR JSON
                        </button>
                        <button onClick={onClose} className="p-2 rounded-full text-text-secondary hover:bg-subtle transition-colors"><XCircleIcon className="h-7 w-7" /></button>
                    </div>
                </header>

                <main className="flex-grow overflow-hidden grid grid-cols-12">
                    {/* Left Panel: Library */}
                    <div className="col-span-2 border-r border-subtle flex flex-col bg-background/10">
                        <div className="p-4 border-b border-subtle">
                            <h3 className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em]">Biblioteca de Glifos</h3>
                        </div>
                        <div className="flex-grow overflow-y-auto p-2 space-y-1 custom-scrollbar">
                           {localProfile.glyphs.map(glyph => (
                                <button
                                    key={glyph.id}
                                    onClick={() => setSelectedGlyphId(glyph.id)}
                                    className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-all ${selectedGlyphId === glyph.id ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'text-text-primary hover:bg-subtle/50'}`}
                                >
                                    <div className={`w-10 h-10 rounded-lg p-1 ${selectedGlyphId === glyph.id ? 'bg-white/20' : 'bg-surface'}`}><GlyphIcon glyph={glyph} /></div>
                                    <span className="truncate font-bold text-xs">{glyph.name}</span>
                                </button>
                           ))}
                        </div>
                        <div className="p-4 border-t border-subtle">
                            <button onClick={handleAddGlyph} className="w-full flex items-center justify-center gap-2 py-3 bg-accent/10 text-accent font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-accent hover:text-white transition-all border border-accent/20">
                                <PlusIcon className="h-4 w-4"/> Añadir Glifo
                            </button>
                        </div>
                    </div>
                    
                    {/* Center: Canvas */}
                    <div className="col-span-7 flex flex-col bg-mesh relative">
                         <div className="absolute top-6 left-6 flex flex-col gap-2 z-10">
                            {(['upper', 'main', 'lower'] as DrawingLayer[]).map(layer => (
                                <button
                                    key={layer}
                                    onClick={() => setActiveLayer(layer)}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all ${activeLayer === layer ? 'bg-accent border-accent text-white shadow-lg' : 'bg-surface/50 border-subtle text-text-secondary hover:border-accent'}`}
                                >
                                    {layer === 'main' ? 'Cuerpo' : layer === 'upper' ? 'Ascendente' : 'Descendente'}
                                </button>
                            ))}
                         </div>

                         <div className="flex-grow flex items-center justify-center p-8">
                            <div className="relative w-full max-w-[600px] aspect-square bg-surface/30 rounded-3xl border-2 border-dashed border-subtle/50 backdrop-blur-sm shadow-inner group overflow-hidden">
                                <svg
                                    ref={svgCanvasRef}
                                    width="100%" height="100%"
                                    viewBox={`-100 -50 ${CANVAS_WIDTH + 200} ${CANVAS_HEIGHT + 100}`}
                                    className="overflow-visible cursor-crosshair"
                                    onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
                                    onTouchStart={handleMouseDown} onTouchMove={handleMouseMove} onTouchEnd={handleMouseUp}
                                >
                                    {/* Ghost Context */}
                                    {leftGlyph && <g transform={`translate(-${(selectedGlyph?.lsb || 0) + (leftGlyph.width || 250) + (leftGlyph.rsb || 0)}, 0)`} opacity="0.1"><GlyphPaths glyph={leftGlyph} strokeColor="#FFF" /></g>}
                                    {rightGlyph && <g transform={`translate(${(selectedGlyph?.width || 250) + (selectedGlyph?.rsb || 0) + (rightGlyph.lsb || 0)}, 0)`} opacity="0.1"><GlyphPaths glyph={rightGlyph} strokeColor="#FFF" /></g>}

                                    {/* Dynamic Guidelines */}
                                    <line x1="0" y1={-50} x2="0" y2={CANVAS_HEIGHT + 50} stroke="#6EE7B7" strokeWidth="1" strokeDasharray="4" opacity="0.3" />
                                    <line x1={selectedGlyph?.width || DEFAULT_GLYPH_WIDTH} y1={-50} x2={selectedGlyph?.width || DEFAULT_GLYPH_WIDTH} y2={CANVAS_HEIGHT + 50} stroke="#6EE7B7" strokeWidth="1" strokeDasharray="4" opacity="0.3" />

                                    <line x1="-100" y1={localProfile.guideLines?.baseline || 0} x2={CANVAS_WIDTH + 100} y2={localProfile.guideLines?.baseline || 0} stroke="#FFF" strokeWidth="1" opacity="0.1" />

                                    <GlyphPaths glyph={selectedGlyph || null} strokeColor="#6EE7B7" strokeWidth={10} />

                                    {currentPoints.length > 1 && (
                                        <polyline
                                            points={currentPoints.map(p => `${p.x},${p.y}`).join(' ')}
                                            fill="none" stroke="#6EE7B7" strokeWidth="2" strokeOpacity="0.5"
                                        />
                                    )}
                                </svg>
                            </div>
                         </div>

                         {/* Tools Floating Bar */}
                         <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-6 bg-surface/80 backdrop-blur-md px-6 py-3 rounded-2xl border border-subtle shadow-2xl">
                             <div className="flex items-center gap-2">
                                <button onClick={() => setActiveTool('pencil')} className={`p-2 rounded-lg transition-all ${activeTool === 'pencil' ? 'bg-accent text-white' : 'text-text-secondary hover:bg-subtle'}`}><PencilIcon className="h-5 w-5"/></button>
                                <button onClick={() => setActiveTool('line')} className={`p-2 rounded-lg transition-all ${activeTool === 'line' ? 'bg-accent text-white' : 'text-text-secondary hover:bg-subtle'}`}><LineIcon className="h-5 w-5"/></button>
                             </div>
                             <div className="h-8 w-px bg-subtle"></div>
                             <div className="flex items-center gap-3">
                                <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Estabilización</span>
                                <input type="range" min="0" max="20" value={stabilizationLevel} onChange={e => setStabilizationLevel(Number(e.target.value))} className="w-24 accent-accent" />
                             </div>
                             <div className="h-8 w-px bg-subtle"></div>
                             <div className="flex items-center gap-2">
                                <button onClick={handleUndo} disabled={!canUndo} className="p-2 text-text-secondary hover:text-white disabled:opacity-20"><UndoIcon className="h-5 w-5"/></button>
                                <button onClick={handleRedo} disabled={!canRedo} className="p-2 text-text-secondary hover:text-white disabled:opacity-20"><RedoIcon className="h-5 w-5"/></button>
                                <button onClick={() => updateGlyph(selectedGlyph!.id, { svgPathMain: '', svgPathUpper: '', svgPathLower: '' }, true)} className="p-2 text-danger/60 hover:text-danger"><TrashIcon className="h-5 w-5"/></button>
                             </div>
                         </div>
                    </div>

                    {/* Right Panel: Metrics */}
                    <div className="col-span-3 border-l border-subtle flex flex-col bg-background/10 p-6 space-y-8 overflow-y-auto custom-scrollbar">
                        <section className="space-y-4">
                             <h3 className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em]">Métricas del Glifo</h3>
                             {selectedGlyph ? (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="p-4 bg-surface rounded-xl border border-subtle">
                                            <label className="text-[10px] font-bold text-text-secondary uppercase mb-2 block tracking-widest">Avance (Width)</label>
                                            <div className="flex items-center gap-3">
                                                <input type="number" value={selectedGlyph.width} onChange={e => updateGlyph(selectedGlyph.id, { width: Number(e.target.value) })} className="bg-background border border-subtle rounded-lg px-3 py-2 w-full font-mono text-accent" />
                                                <span className="text-xs font-bold text-text-secondary">px</span>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-4 bg-surface rounded-xl border border-subtle">
                                                <label className="text-[10px] font-bold text-text-secondary uppercase mb-2 block tracking-widest">LSB</label>
                                                <input type="number" value={selectedGlyph.lsb || 0} onChange={e => updateGlyph(selectedGlyph.id, { lsb: Number(e.target.value) })} className="bg-background border border-subtle rounded-lg px-3 py-2 w-full font-mono text-xs" />
                                            </div>
                                            <div className="p-4 bg-surface rounded-xl border border-subtle">
                                                <label className="text-[10px] font-bold text-text-secondary uppercase mb-2 block tracking-widest">RSB</label>
                                                <input type="number" value={selectedGlyph.rsb || 0} onChange={e => updateGlyph(selectedGlyph.id, { rsb: Number(e.target.value) })} className="bg-background border border-subtle rounded-lg px-3 py-2 w-full font-mono text-xs" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="pt-4 border-t border-subtle">
                                        <h4 className="text-[10px] font-black text-accent uppercase tracking-widest mb-4">Contexto Visual</h4>
                                        <div className="flex gap-2">
                                            <input type="text" maxLength={1} value={contextLeftInput} onChange={e => setContextLeftInput(e.target.value)} placeholder="IZQ" className="w-full bg-background border border-subtle rounded-lg p-2 text-center font-bold text-sm" />
                                            <input type="text" maxLength={1} value={contextRightInput} onChange={e => setContextRightInput(e.target.value)} placeholder="DER" className="w-full bg-background border border-subtle rounded-lg p-2 text-center font-bold text-sm" />
                                        </div>
                                    </div>
                                </div>
                             ) : <p className="text-xs text-text-secondary italic">Selecciona un glifo para ajustar su tipometría.</p>}
                        </section>

                        <section className="space-y-4 pt-6 border-t border-subtle">
                            <h3 className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em]">Preview del Sistema</h3>
                            <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-text-secondary cursor-pointer select-none">
                                <input type="checkbox" checked={grammarView} onChange={e => setGrammarView(e.target.checked)} className="accent-accent" />
                                Vista gramatical (motor)
                            </label>
                            {grammarView && (
                                <input type="text" value={featureText} onChange={e => setFeatureText(e.target.value)} placeholder="tense=past&number=sg" className="w-full bg-surface border border-subtle rounded-xl px-3 py-2 text-xs font-mono" />
                            )}
                            <div className="bg-background/40 p-4 rounded-2xl border border-subtle min-h-[100px] flex flex-wrap items-baseline gap-1">
                                {displayText.split('').map((char, i) => {
                                    const glyphId = localProfile.characterMap[char];
                                    const glyph = localProfile.glyphs.find(g => g.id === glyphId);
                                    return glyph ? <div key={i} className="h-10 w-auto" style={{ width: `${(glyph.width || DEFAULT_GLYPH_WIDTH) / 8}px` }}><GlyphIcon glyph={glyph} /></div> : <span key={i} className="text-danger font-bold opacity-30">{char}</span>;
                                })}
                            </div>
                            <input type="text" value={previewText} onChange={e => setPreviewText(e.target.value)} placeholder="Escribe aquí para previsualizar..." className="w-full bg-surface border border-subtle rounded-xl px-4 py-2 text-sm" />
                        </section>
                    </div>
                </main>

                <footer className="p-6 flex justify-end gap-4 border-t border-subtle flex-shrink-0 bg-background/20">
                    <button onClick={onClose} className="px-6 py-2 bg-subtle text-text-primary font-bold rounded-xl hover:bg-gray-600 transition-all">DESCARTAR</button>
                    <button onClick={() => onSave(localProfile)} className="px-10 py-2 bg-accent text-white font-bold rounded-xl shadow-xl shadow-accent/20 hover:bg-accent-hover transition-all tracking-widest text-sm uppercase">GUARDAR FUENTE</button>
                </footer>
            </div>
        </div>
    );
};

export default memo(NeographyModal);
