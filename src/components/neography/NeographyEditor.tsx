import { useState, useRef, useEffect, PointerEvent, memo, FC, ReactNode } from 'react';
import { Glyph, NeographyProfile } from '../../types';
import PencilIcon from '../icons/PencilIcon';
import UndoIcon from '../icons/UndoIcon';
import RedoIcon from '../icons/RedoIcon';
import TrashIcon from '../icons/TrashIcon';
import { getFreehandPath, Point } from './pathUtils';
import NeographyImageTracer from './NeographyImageTracer';
import { flipPathHorizontal, flipPathVertical, rotatePath90 } from './neographyUtils';

interface NeographyEditorProps {
    glyph: Glyph;
    profile: NeographyProfile;
    onUpdateGlyph: (id: string, updates: Partial<Glyph>) => void;
    onBack: () => void;
}

const CANVAS_WIDTH = 250;
const CANVAS_HEIGHT = 250;

type DrawingLayer = 'main' | 'upper' | 'lower';

const Tooltip = ({ text, children }: { text: string, children: ReactNode }) => (
    <div className="group relative flex items-center">
        {children}
        <div className="absolute left-full ml-2 px-2 py-1 bg-black/90 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
            {text}
        </div>
    </div>
);

const NeographyEditor: FC<NeographyEditorProps> = ({ glyph, profile, onUpdateGlyph, onBack }) => {
    const [activeLayer, setActiveLayer] = useState<DrawingLayer>('main');
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
    const [history, setHistory] = useState<{ main: string; upper: string; lower: string; }[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    const [brushSize, setBrushSize] = useState(8);
    const [brushType, setBrushType] = useState<'pen' | 'marker' | 'eraser'>('pen');
    const [lineMode, setLineMode] = useState<'freehand' | 'straight'>('freehand');
    const [autoSerif, setAutoSerif] = useState(false);

    const [smoothing, setSmoothing] = useState(0.5); 
    const [thinning, setThinning] = useState(0.5); 

    const [showTracer, setShowTracer] = useState(false);
    const [editMode, setEditMode] = useState<'drawing' | 'anchors'>('drawing');
    const [anchors, setAnchors] = useState<{ [key: string]: { x: number, y: number } }>(glyph.anchors || {
        top: { x: CANVAS_WIDTH / 2, y: profile.guideLines?.ascender || 60 },
        bottom: { x: CANVAS_WIDTH / 2, y: profile.guideLines?.descender || 200 },
        center: { x: CANVAS_WIDTH / 2, y: profile.guideLines?.xHeight ? profile.guideLines.xHeight / 2 + 60 : 120 }
    });

    const [guides, setGuides] = useState<{ id: string, type: 'horizontal' | 'vertical', pos: number, color: string, label?: string }[]>([
        { id: 'g-asc', type: 'horizontal', pos: profile.guideLines?.ascender || 60, color: 'rgba(251, 191, 36, 0.5)', label: 'Ascendente' },
        { id: 'g-x', type: 'horizontal', pos: profile.guideLines?.xHeight || 120, color: 'rgba(255, 255, 255, 0.3)', label: 'Altura-X' },
        { id: 'g-base', type: 'horizontal', pos: profile.guideLines?.baseline || 180, color: 'rgba(110, 231, 183, 0.6)', label: 'Línea Base' },
        { id: 'g-desc', type: 'horizontal', pos: profile.guideLines?.descender || 200, color: 'rgba(248, 113, 113, 0.5)', label: 'Descendente' },
        { id: 'v-start', type: 'vertical', pos: 40, color: '#ef4444', label: 'Inicio' },
        { id: 'v-end', type: 'vertical', pos: 210, color: '#06b6d4', label: 'Fin' },
    ]);
    const [dragTarget, setDragTarget] = useState<string | null>(null);
    const [showShadows, setShowShadows] = useState(true);
    const [mouseCoords, setMouseCoords] = useState<{ x: number, y: number } | null>(null);

    const prevGlyphPath = "M 20 60 Q 40 120 20 180";
    const nextGlyphPath = "M 230 60 L 230 180";

    useEffect(() => {
        const initial = { main: glyph.svgPathMain || '', upper: glyph.svgPathUpper || '', lower: glyph.svgPathLower || '' };
        if (history.length === 0) {
            setHistory([initial]);
            setHistoryIndex(0);
        }
    }, [glyph.id]);

    const svgCanvasRef = useRef<SVGSVGElement>(null);

    const getPathKeyForLayer = (layer: DrawingLayer) => `svgPath${layer.charAt(0).toUpperCase() + layer.slice(1)}` as 'svgPathMain' | 'svgPathUpper' | 'svgPathLower';

    const addToHistory = (updates: any) => {
        const currentState = history[historyIndex] || { main: glyph.svgPathMain, upper: glyph.svgPathUpper, lower: glyph.svgPathLower };
        const nextState = { ...currentState, ...updates };
        const nextHistory = history.slice(0, historyIndex + 1);
        nextHistory.push(nextState);
        setHistory(nextHistory);
        setHistoryIndex(nextHistory.length - 1);
    };

    const updateGlyphState = (updates: any, saveToHistory = false) => {
        if (updates.anchors) {
            onUpdateGlyph(glyph.id, { ...updates, anchors: updates.anchors });
            return;
        }

        onUpdateGlyph(glyph.id, updates);
        if (saveToHistory) {
            const historyUpdates: any = {};
            if (updates.svgPathMain !== undefined) historyUpdates.main = updates.svgPathMain;
            if (updates.svgPathUpper !== undefined) historyUpdates.upper = updates.svgPathUpper;
            if (updates.svgPathLower !== undefined) historyUpdates.lower = updates.svgPathLower;
            addToHistory(historyUpdates);
        }
    };

    const handleUndo = () => {
        if (historyIndex > 0) {
            const prevIndex = historyIndex - 1;
            const state = history[prevIndex];
            setHistoryIndex(prevIndex);
            onUpdateGlyph(glyph.id, { svgPathMain: state.main, svgPathUpper: state.upper, svgPathLower: state.lower });
        }
    };

    const handleRedo = () => {
        if (historyIndex < history.length - 1) {
            const nextIndex = historyIndex + 1;
            const state = history[nextIndex];
            setHistoryIndex(nextIndex);
            onUpdateGlyph(glyph.id, { svgPathMain: state.main, svgPathUpper: state.upper, svgPathLower: state.lower });
        }
    };

    const getSVGPoint = (e: PointerEvent<SVGSVGElement>): Point | null => {
        const svg = svgCanvasRef.current; if (!svg) return null;
        const pt = svg.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());
        const pressure = e.pressure !== 0.5 ? e.pressure : 0.5;
        return { x: svgP.x, y: svgP.y, pressure };
    };

    const handlePointerDown = (e: PointerEvent<SVGSVGElement>) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        const point = getSVGPoint(e);
        if (!point) return;

        if (editMode === 'anchors') {
            const hitAnchor = Object.entries(anchors).find(([_, pos]) => {
                const dx = pos.x - point.x;
                const dy = pos.y - point.y;
                return Math.sqrt(dx * dx + dy * dy) < 10;
            });

            if (hitAnchor) {
                setDragTarget(`anchor-${hitAnchor[0]}`);
                return;
            }
        }

        const hitGuide = guides.find(g => {
            if (g.type === 'horizontal') return Math.abs(point.y - g.pos) < 8;
            if (g.type === 'vertical') return Math.abs(point.x - g.pos) < 8;
            return false;
        });

        if (hitGuide && brushType !== 'eraser' && editMode !== 'anchors') {
            setDragTarget(hitGuide.id);
            return;
        }

        if (editMode === 'drawing') {
            setIsDrawing(true);
            setCurrentStroke([point]);
        }
    };

    const handlePointerMove = (e: PointerEvent<SVGSVGElement>) => {
        const point = getSVGPoint(e);
        if (!point) {
            setMouseCoords(null);
            return;
        }
        setMouseCoords({ x: Math.round(point.x), y: Math.round(point.y) });

        if (dragTarget) {
            if (dragTarget.startsWith('anchor-')) {
                const anchorKey = dragTarget.replace('anchor-', '');
                const newAnchors = { ...anchors, [anchorKey]: { x: Math.round(point.x), y: Math.round(point.y) } };
                setAnchors(newAnchors);
                return;
            }

            setGuides(prev => prev.map(g => {
                if (g.id === dragTarget) {
                    return { ...g, pos: g.type === 'horizontal' ? Math.round(point.y) : Math.round(point.x) };
                }
                return g;
            }));
            return;
        }

        if (isDrawing) {
            if (lineMode === 'straight') {
                setCurrentStroke(prev => [prev[0], point]);
            } else {
                setCurrentStroke(prev => [...prev, point]);
            }
        }
    };

    const handlePointerUp = (e: PointerEvent<SVGSVGElement>) => {
        if (dragTarget) {
            if (dragTarget.startsWith('anchor-')) {
                updateGlyphState({ anchors }, false);
            }
            setDragTarget(null);
            e.currentTarget.releasePointerCapture(e.pointerId);
            return;
        }

        if (!isDrawing) return;
        setIsDrawing(false);
        e.currentTarget.releasePointerCapture(e.pointerId);

        if (currentStroke.length > 1) {
            let finalPath = '';

            if (lineMode === 'straight') {
                const start = currentStroke[0];
                const end = currentStroke[currentStroke.length - 1];
                finalPath = getFreehandPath([start, end], { size: brushSize, thinning: brushType === 'marker' ? 0.1 : 0.7, smoothing: 0 });
            } else {
                finalPath = getFreehandPath(currentStroke, { size: brushSize, thinning, smoothing });
            }

            if (autoSerif && brushType !== 'eraser') {
                const start = currentStroke[0];
                const end = currentStroke[currentStroke.length - 1];
                const r = brushSize * 0.8;
                const dotStart = `M ${start.x} ${start.y} m -${r}, 0 a ${r},${r} 0 1,0 ${r * 2},0 a ${r},${r} 0 1,0 -${r * 2},0`;
                const dotEnd = `M ${end.x} ${end.y} m -${r}, 0 a ${r},${r} 0 1,0 ${r * 2},0 a ${r},${r} 0 1,0 -${r * 2},0`;
                finalPath += ` ${dotStart} ${dotEnd}`;
            }

            const pathKey = getPathKeyForLayer(activeLayer);
            const currentPath = glyph[pathKey] || '';
            const updatedPath = currentPath ? `${currentPath} ${finalPath}` : finalPath;
            updateGlyphState({ [pathKey]: updatedPath }, true);
        }
        setCurrentStroke([]);
    };

    const handleClearLayer = () => {
        if (window.confirm("¿Limpiar capa activa?")) {
            const pathKey = getPathKeyForLayer(activeLayer);
            updateGlyphState({ [pathKey]: '' }, true);
        }
    };

    const toggleShadows = () => setShowShadows(!showShadows);
    const addNewGuide = (type: 'vertical' | 'horizontal') => {
        const id = `g-${Date.now()}`;
        setGuides(prev => [...prev, { id, type, pos: 125, color: type === 'vertical' ? '#06b6d4' : '#fbbf24', label: 'Nueva Guía' }]);
    };

    const previewPath = currentStroke.length > 0 ? (
        lineMode === 'straight'
            ? getFreehandPath([currentStroke[0], currentStroke[currentStroke.length - 1]], { size: brushSize, thinning: 0, smoothing: 0 })
            : getFreehandPath(currentStroke, { size: brushSize, thinning: brushType === 'marker' ? 0.1 : 0.7, smoothing })
    ) : '';

    const handleApplyTransform = (type: 'flipH' | 'flipV' | 'rotate90') => {
        const pathKey = getPathKeyForLayer(activeLayer);
        const currentPath = glyph[pathKey] || '';
        if (!currentPath) return;

        let newPath = '';
        if (type === 'flipH') newPath = flipPathHorizontal(currentPath);
        if (type === 'flipV') newPath = flipPathVertical(currentPath);
        if (type === 'rotate90') newPath = rotatePath90(currentPath);

        updateGlyphState({ [pathKey]: newPath }, true);
    };

    return (
        <div className="flex flex-col h-full w-full bg-background-dark text-text-primary animate-fade-in relative z-0">
            {showTracer && (
                <NeographyImageTracer
                    onCancel={() => setShowTracer(false)}
                    onTraceComplete={(path) => {
                        const pathKey = getPathKeyForLayer(activeLayer);
                        updateGlyphState({ [pathKey]: path }, true);
                        setShowTracer(false);
                    }}
                />
            )}
            <div className="absolute top-4 left-4 z-20 flex flex-col gap-3">
                <div className="flex flex-col gap-2 bg-surface p-2 rounded-lg shadow-xl border border-subtle">
                    <Tooltip text="Lápiz">
                        <button onClick={() => setBrushType('pen')} className={`p-2 rounded-md transition-colors ${brushType === 'pen' ? 'bg-accent text-white' : 'text-text-secondary hover:bg-subtle'}`}>
                            <PencilIcon className="w-6 h-6" />
                        </button>
                    </Tooltip>
                    <Tooltip text="Deshacer (Borrador)">
                        <button onClick={handleUndo} disabled={historyIndex <= 0} className="p-2 rounded-md text-text-secondary hover:bg-subtle disabled:opacity-30">
                            <UndoIcon className="w-6 h-6" />
                        </button>
                    </Tooltip>
                    <Tooltip text="Rehacer">
                        <button onClick={handleRedo} disabled={historyIndex >= history.length - 1} className="p-2 rounded-md text-text-secondary hover:bg-subtle disabled:opacity-30">
                            <RedoIcon className="w-6 h-6" />
                        </button>
                    </Tooltip>
                    <div className="h-px bg-subtle my-1"></div>
                    <Tooltip text="Borrar Todo">
                        <button onClick={handleClearLayer} className="p-2 rounded-md text-danger hover:bg-danger/20">
                            <TrashIcon className="w-6 h-6" />
                        </button>
                    </Tooltip>

                    <div className="h-px bg-subtle my-1"></div>
                    <Tooltip text="Vectorizar Imagen">
                        <button onClick={() => setShowTracer(true)} className="p-2 rounded-md text-amber-400 hover:bg-amber-400/10">
                            <span className="material-symbols-outlined">auto_fix</span>
                        </button>
                    </Tooltip>

                    <div className="h-px bg-subtle my-1"></div>
                    <span className="text-[10px] uppercase font-bold text-text-muted text-center mb-1">Mirror</span>
                    <div className="flex gap-1 justify-center">
                        <Tooltip text="Espejo Horizontal">
                            <button onClick={() => handleApplyTransform('flipH')} className="p-2 rounded-md text-text-secondary hover:bg-subtle">
                                <span className="material-symbols-outlined text-lg">flip</span>
                            </button>
                        </Tooltip>
                        <Tooltip text="Espejo Vertical">
                            <button onClick={() => handleApplyTransform('flipV')} className="p-2 rounded-md text-text-secondary hover:bg-subtle">
                                <span className="material-symbols-outlined text-lg rotate-90">flip</span>
                            </button>
                        </Tooltip>
                    </div>
                </div>

                <div className="bg-surface p-3 rounded-lg shadow-xl border border-subtle w-40 flex flex-col gap-3">
                    <span className="text-[10px] uppercase font-bold text-text-muted">Pincel</span>
                    <div>
                        <div className="flex justify-between text-xs text-text-secondary mb-1">
                            <span>Grosor</span>
                            <span>{brushSize}px</span>
                        </div>
                        <input
                            type="range" min="1" max="30" value={brushSize}
                            onChange={(e) => setBrushSize(parseInt(e.target.value))}
                            className="w-full h-1.5 bg-background-dark rounded-lg appearance-none cursor-pointer accent-accent"
                        />
                    </div>
                    <div className="flex bg-background-dark rounded p-0.5">
                        <button
                            onClick={() => setLineMode('freehand')}
                            className={`flex-1 text-[10px] py-1 rounded ${lineMode === 'freehand' ? 'bg-accent text-white' : 'text-text-muted hover:text-white'}`}
                        >Libre</button>
                        <button
                            onClick={() => setLineMode('straight')}
                            className={`flex-1 text-[10px] py-1 rounded ${lineMode === 'straight' ? 'bg-accent text-white' : 'text-text-muted hover:text-white'}`}
                        >Recta</button>
                    </div>
                    <button
                        onClick={() => setAutoSerif(!autoSerif)}
                        className={`text-xs flex items-center gap-2 px-2 py-1.5 rounded border transition-colors ${autoSerif ? 'bg-purple-500/20 text-purple-300 border-purple-500/50' : 'bg-transparent border-transparent text-text-muted hover:bg-subtle'}`}
                    >
                        <span className={`w-2 h-2 rounded-full ${autoSerif ? 'bg-purple-400' : 'bg-white/20'}`}></span>
                        Auto-Serif
                    </button>
                    <div>
                        <div className="flex justify-between text-xs text-text-secondary mb-1">
                            <span>Suavizado</span>
                            <span>{Math.round(smoothing * 100)}%</span>
                        </div>
                        <input
                            type="range" min="0" max="1" step="0.1" value={smoothing}
                            onChange={(e) => setSmoothing(parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-background-dark rounded-lg appearance-none cursor-pointer accent-accent"
                        />
                    </div>
                </div>
            </div>

            <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 bg-surface p-2 rounded-lg shadow-xl border border-subtle">
                <div className="text-[10px] uppercase font-bold text-center text-text-secondary mb-1 tracking-wider">Capas</div>
                {(['upper', 'main', 'lower'] as DrawingLayer[]).map(layer => (
                    <button key={layer} onClick={() => setActiveLayer(layer)}
                        className={`px-3 py-1.5 text-xs rounded-md font-semibold transition-all border ${activeLayer === layer ?
                            (layer === 'upper' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/50' :
                                layer === 'lower' ? 'bg-red-500/10 text-red-400 border-red-500/50' :
                                    'bg-green-500/10 text-green-400 border-green-500/50') : 'text-text-secondary border-transparent hover:bg-subtle'}`}
                    >{layer === 'upper' ? 'Superior' : layer === 'main' ? 'Principal' : 'Inferior'}</button>
                ))}
            </div>

            <div className="flex-grow flex items-center justify-center p-8 bg-dots-pattern select-none overflow-hidden touch-none relative">
                <div className="relative w-full max-w-[600px] aspect-square bg-[#1a1b1e]/90 rounded-xl shadow-2xl border border-subtle backdrop-blur-sm overflow-hidden group">
                    <svg ref={svgCanvasRef} className={`w-full h-full touch-none ${dragTarget ? 'cursor-move' : 'cursor-crosshair'}`} viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp}>
                        <defs><pattern id="smallGrid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" /></pattern></defs>
                        <rect width="100%" height="100%" fill="url(#smallGrid)" />

                        {showShadows && (
                            <g className="opacity-10 pointer-events-none">
                                <g transform="translate(-150, 0)"><path d={prevGlyphPath} fill="none" stroke="white" strokeWidth="8" /></g>
                                <g transform="translate(150, 0)"><path d={nextGlyphPath} fill="none" stroke="white" strokeWidth="8" /></g>
                            </g>
                        )}

                        {guides.map(guide => (
                            <g key={guide.id} className="group/guide">
                                {guide.type === 'horizontal' ? (
                                    <>
                                        <line x1="0" y1={guide.pos} x2={CANVAS_WIDTH} y2={guide.pos} stroke={dragTarget === guide.id ? '#fff' : guide.color} strokeWidth={dragTarget === guide.id ? 2 : 1} strokeDasharray="4 4" />
                                        <rect x="0" y={guide.pos - 5} width={CANVAS_WIDTH} height="10" fill="transparent" className="cursor-row-resize" />
                                    </>
                                ) : (
                                    <>
                                        <line x1={guide.pos} y1="0" x2={guide.pos} y2={CANVAS_HEIGHT} stroke={dragTarget === guide.id ? '#fff' : guide.color} strokeWidth={dragTarget === guide.id ? 2 : 1} strokeDasharray="6 2" />
                                        <rect x={guide.pos - 5} y="0" width="10" height={CANVAS_HEIGHT} fill="transparent" className="cursor-col-resize" />
                                    </>
                                )}
                            </g>
                        ))}

                        {editMode === 'anchors' && Object.entries(anchors).map(([key, pos]) => (
                            <g key={key} className="cursor-grab active:cursor-grabbing">
                                <circle cx={pos.x} cy={pos.y} r="6" fill="#f43f5e" stroke="white" strokeWidth="2" />
                                <text x={pos.x} y={pos.y - 10} textAnchor="middle" fill="#f43f5e" fontSize="10" fontWeight="bold">{key.toUpperCase()}</text>
                            </g>
                        ))}

                        <path d={glyph.svgPathLower || ''} fill="#F87171" opacity={activeLayer === 'lower' ? 1 : 0.4} />
                        <path d={glyph.svgPathMain || ''} fill="#6EE7B7" opacity={activeLayer === 'main' ? 1 : 0.4} />
                        <path d={glyph.svgPathUpper || ''} fill="#FBBF24" opacity={activeLayer === 'upper' ? 1 : 0.4} />
                        {previewPath && <path d={previewPath} fill={activeLayer === 'upper' ? '#FBBF24' : activeLayer === 'lower' ? '#F87171' : '#6EE7B7'} opacity="0.8" />}
                    </svg>
                </div>
            </div>

            <div className="flex-shrink-0 p-4 border-t border-subtle bg-surface-dark flex justify-between items-center z-10">
                <button onClick={onBack} className="text-text-secondary hover:text-white transition-colors flex items-center gap-2"><span>&larr;</span> Volver a la Rejilla</button>
                <div className="text-sm text-text-secondary">Editando: <span className="font-bold text-white tracking-wide">{glyph.name}</span></div>
            </div>
        </div>
    );
};

export default memo(NeographyEditor);
