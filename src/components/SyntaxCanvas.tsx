import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    SyntaxCanvas as SyntaxCanvasType,
    SyntaxNode,
    SyntaxConnection,
    NodeType,
    GrammarException,
    LexiconEntry,
    GrammarManifest,
    MorphemeSegment,
} from '../types';
import { realizeLexeme } from '../services/grammar';
import { inductFromText } from '../services/grammar/inductFromText';
import InfoTooltip from './InfoTooltip';
import AiMapperModal from './AiMapperModal';

// ── Helpers ──────────────────────────────────────────────────────────────────
function uid() { return `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`; }

const updateNodeDeep = (nodes: SyntaxNode[], id: string, patch: Partial<SyntaxNode>): SyntaxNode[] => {
    return nodes.map(n => {
        if (n.id === id) return { ...n, ...patch };
        if (n.children && n.children.length > 0) {
            return { ...n, children: updateNodeDeep(n.children, id, patch) };
        }
        return n;
    });
};

const removeNodeDeep = (nodes: SyntaxNode[], id: string): SyntaxNode[] => {
    return nodes.filter(n => n.id !== id).map(n => ({
        ...n,
        children: n.children ? removeNodeDeep(n.children, id) : []
    }));
};

const addChildToNode = (nodes: SyntaxNode[], parentId: string, child: SyntaxNode): SyntaxNode[] => {
    return nodes.map(n => {
        if (n.id === parentId) return { ...n, children: [...(n.children || []), child] };
        if (n.children) return { ...n, children: addChildToNode(n.children, parentId, child) };
        return n;
    });
};

const findNodeDeep = (nodes: SyntaxNode[], id: string): SyntaxNode | null => {
    for (const n of nodes) {
        if (n.id === id) return n;
        if (n.children) {
            const found = findNodeDeep(n.children, id);
            if (found) return found;
        }
    }
    return null;
};

const findAllNodes = (nodes: SyntaxNode[]): SyntaxNode[] => {
    let all: SyntaxNode[] = [];
    for (const n of nodes) {
        all.push(n);
        if (n.children) all = all.concat(findAllNodes(n.children));
    }
    return all;
};

// ── Components ───────────────────────────────────────────────────────────────

const SyntaxNodeRenderer = ({
    node,
    depth = 0,
    isConnecting,
    connectionStartId,
    onPointerDown,
    onConnectStart,
    onConnectEnd,
    onAddChild,
    onRemove,
    onUpdate,
    onInspect
}: {
    node: SyntaxNode;
    depth?: number;
    isConnecting: boolean;
    connectionStartId: string | null;
    onPointerDown: (e: React.PointerEvent, id: string) => void;
    onConnectStart: (id: string) => void;
    onConnectEnd: (id: string) => void;
    onAddChild: (parentId: string) => void;
    onRemove: (id: string) => void;
    onUpdate: (id: string, patch: Partial<SyntaxNode>) => void;
    onInspect: (id: string) => void;
}) => {
    const isTopLevel = depth === 0;

    return (
        <div
            id={`node-${node.id}`}
            onPointerDown={(e) => {
                if (isTopLevel && !isConnecting) onPointerDown(e, node.id);
            }}
            style={{
                left: isTopLevel ? node.x : undefined,
                top: isTopLevel ? node.y : undefined,
                position: isTopLevel ? 'absolute' : 'relative',
                backgroundColor: `${node.color}15`,
                borderColor: `${node.color}50`,
                boxShadow: isTopLevel ? `0 4px 20px ${node.color}10` : 'none',
                minWidth: isTopLevel ? 200 : 'auto',
            }}
            className={`border-2 rounded-xl p-3 flex flex-col gap-2 transition-colors select-none ${isTopLevel ? 'cursor-grab active:cursor-grabbing backdrop-blur-sm' : ''} ${isConnecting && connectionStartId !== node.id ? 'hover:border-white hover:bg-white/10 cursor-crosshair' : ''}`}
            onClick={(e) => {
                if (isConnecting && connectionStartId !== node.id) {
                    e.stopPropagation();
                    onConnectEnd(node.id);
                }
            }}
        >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-2">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-black tracking-wider px-1.5 py-0.5 rounded" style={{ backgroundColor: `${node.color}30`, color: node.color }}>
                        {node.type}
                    </span>
                    <input
                        className="bg-transparent outline-none text-white font-bold w-24 text-sm"
                        value={node.label}
                        onChange={e => onUpdate(node.id, { label: e.target.value })}
                        onPointerDown={e => e.stopPropagation()} // don't drag when typing
                    />
                </div>
                <div className="flex items-center gap-1">
                    {node.type === 'word' && node.lexeme && (
                        <button
                            onPointerDown={e => e.stopPropagation()}
                            onClick={() => onInspect(node.id)}
                            className="w-6 h-6 rounded flex items-center justify-center text-xs bg-white/5 hover:bg-white/20 text-white/50 hover:text-white"
                            title="Ver desglose morfológico"
                        >🔍</button>
                    )}
                    <button 
                        onPointerDown={e => e.stopPropagation()}
                        onClick={() => onConnectStart(node.id)}
                        className={`w-6 h-6 rounded flex items-center justify-center text-xs transition-colors ${connectionStartId === node.id ? 'bg-accent text-white' : 'bg-white/5 hover:bg-white/20 text-white/50'}`}
                        title="Conectar"
                    >🔗</button>
                    <button 
                        onPointerDown={e => e.stopPropagation()}
                        onClick={() => onRemove(node.id)}
                        className="w-6 h-6 rounded flex items-center justify-center text-xs bg-white/5 hover:bg-red-500/20 text-white/50 hover:text-red-400"
                        title="Eliminar"
                    >✕</button>
                </div>
            </div>

            {/* Properties */}
            <div className="flex flex-col gap-1 mt-1">
                <div className="flex items-center gap-2 text-xs">
                    <span className="text-white/40 w-12">Rol:</span>
                    <input className="bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-white outline-none focus:border-white/30 flex-1"
                        value={node.role} onChange={e => onUpdate(node.id, { role: e.target.value })} onPointerDown={e => e.stopPropagation()} />
                </div>
                {(node.type === 'phrase' || node.type === 'word') && (
                    <div className="flex items-center gap-2 text-xs">
                        <span className="text-white/40 w-12">Categoría:</span>
                        <input className="bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-white outline-none focus:border-white/30 flex-1"
                            placeholder="ej: sustantivo" value={node.lexiconCategory || ''} onChange={e => onUpdate(node.id, { lexiconCategory: e.target.value })} onPointerDown={e => e.stopPropagation()} />
                    </div>
                )}
                {node.type === 'morpheme' && (
                    <div className="flex items-center gap-2 text-xs">
                        <span className="text-white/40 w-12">Forma:</span>
                        <input className="bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-white outline-none focus:border-white/30 flex-1"
                            placeholder="literal..." value={node.literalForm || ''} onChange={e => onUpdate(node.id, { literalForm: e.target.value })} onPointerDown={e => e.stopPropagation()} />
                    </div>
                )}
            </div>

            {/* Children Area */}
            {node.type !== 'morpheme' && (
                <div className="mt-2 p-2 bg-black/40 rounded-lg border border-black/50">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] text-white/30 uppercase font-bold tracking-widest">Dimensiones / Hijos</span>
                        <button 
                            onPointerDown={e => e.stopPropagation()}
                            onClick={() => onAddChild(node.id)}
                            className="text-[10px] bg-white/10 hover:bg-white/20 px-1.5 py-0.5 rounded text-white"
                        >+ Añadir</button>
                    </div>
                    {node.children && node.children.length > 0 && (
                        <div className="flex flex-col gap-2">
                            {node.children.map(child => (
                                <SyntaxNodeRenderer
                                    key={child.id}
                                    node={child}
                                    depth={depth + 1}
                                    isConnecting={isConnecting}
                                    connectionStartId={connectionStartId}
                                    onPointerDown={onPointerDown}
                                    onConnectStart={onConnectStart}
                                    onConnectEnd={onConnectEnd}
                                    onAddChild={onAddChild}
                                    onRemove={onRemove}
                                    onUpdate={onUpdate}
                                    onInspect={onInspect}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// ── Morphological Breakdown Panel ("desglose por palabra") ────────────────────

const SEGMENT_COLORS: Record<MorphemeSegment['kind'], string> = {
    stem: '#10b981',     // green (raíz)
    affix: '#6366f1',    // indigo
    mutation: '#f59e0b', // amber
    tone: '#f59e0b',     // amber
    particle: '#14b8a6', // teal
};

const BreakdownPanel = ({
    node,
    grammar,
    onApply,
    onClose,
}: {
    node: SyntaxNode;
    grammar?: GrammarManifest;
    onApply: (feats: Record<string, string>) => void;
    onClose: () => void;
}) => {
    const [feats, setFeats] = useState<Record<string, string>>(node.features || {});

    const paradigm = (grammar?.paradigms ?? []).find(p => p.category === node.lexiconCategory);
    const sf = grammar && node.lexeme ? realizeLexeme(node.lexeme, feats, grammar) : null;
    const segments = sf?.segments ?? [];

    const updateFeat = (feature: string, value: string) => {
        const next = { ...feats };
        if (value === '') delete next[feature];
        else next[feature] = value;
        setFeats(next);
        onApply(next);
    };

    return (
        <div className="absolute bottom-4 right-4 z-20 w-80 max-w-[calc(100%-2rem)] bg-[#111115] border border-border-dark rounded-xl shadow-2xl p-4 pointer-events-auto">
            <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-white">
                    Desglose morfológico — <span className="text-accent">{node.label}</span>
                </h4>
                <button
                    onClick={onClose}
                    className="w-6 h-6 rounded flex items-center justify-center text-xs bg-white/5 hover:bg-red-500/20 text-white/50 hover:text-red-400"
                    title="Cerrar"
                >✕</button>
            </div>

            {/* Surface form */}
            <div className="bg-surface rounded-lg p-3 border border-primary/30 mb-3">
                <div className="text-[10px] uppercase tracking-widest text-text-secondary mb-1">Forma de superficie</div>
                <div className="text-2xl font-bold text-white font-display break-words">{sf ? sf.form : node.label}</div>
            </div>

            {/* Morpheme chain */}
            {segments.length > 0 && (
                <div className="flex flex-wrap items-center gap-1 mb-3">
                    {segments.map((seg, i) => (
                        <React.Fragment key={`${seg.kind}-${i}`}>
                            {i > 0 && <span className="text-white/30 text-xs">→</span>}
                            <span
                                className="inline-flex flex-col items-center px-2 py-1 rounded border text-xs"
                                style={{ backgroundColor: `${SEGMENT_COLORS[seg.kind]}15`, borderColor: `${SEGMENT_COLORS[seg.kind]}50`, color: SEGMENT_COLORS[seg.kind] }}
                                title={seg.feature}
                            >
                                <span className="font-bold leading-none">{seg.form}</span>
                                <span className="text-[9px] uppercase tracking-wide opacity-70 leading-none mt-0.5">{seg.kind}{seg.feature ? `·${seg.feature}` : ''}</span>
                            </span>
                        </React.Fragment>
                    ))}
                </div>
            )}

            {/* Editable feature slots */}
            <div className="space-y-2">
                <div className="text-[10px] uppercase tracking-widest text-text-secondary">Rasgos (paradigma: {node.lexiconCategory})</div>
                {(paradigm?.slots ?? []).length === 0 && (
                    <p className="text-xs text-text-secondary italic">No hay ranuras de paradigma para esta categoría.</p>
                )}
                {(paradigm?.slots ?? []).map(slot => (
                    <div key={slot.feature} className="flex items-center gap-2 text-xs">
                        <span className="text-white/50 w-20 truncate" title={slot.feature}>{slot.label || slot.feature}</span>
                        <input
                            className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-white outline-none focus:border-white/30"
                            placeholder="(no aplicado)"
                            value={feats[slot.feature] || ''}
                            onChange={e => updateFeat(slot.feature, e.target.value)}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

// ── Modals ───────────────────────────────────────────────────────────────────

const AddNodeModal = ({ onAdd, onClose }: { onAdd: (n: SyntaxNode) => void, onClose: () => void }) => {
    const [type, setType] = useState<NodeType>('phrase');
    const [role, setRole] = useState('Sujeto');
    const [label, setLabel] = useState('Sujeto');
    const [cat, setCat] = useState('sustantivo');
    const [color, setColor] = useState('#6366f1');

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="bg-[#111115] border border-border-dark rounded-xl shadow-2xl max-w-sm w-full p-6">
                <h3 className="text-base font-bold text-white mb-4">+ Añadir Nodo Top-Level</h3>
                <div className="space-y-3">
                    <div>
                        <label className="text-xs text-text-secondary block mb-1">Tipo de Estructura</label>
                        <select className="w-full bg-surface border border-border-dark rounded px-3 py-2 text-white text-sm outline-none focus:border-primary"
                            value={type} onChange={e => setType(e.target.value as NodeType)}>
                            <option value="clause">Cláusula / Oración</option>
                            <option value="phrase">Frase / Sintagma</option>
                            <option value="word">Palabra</option>
                            <option value="morpheme">Morfema</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs text-text-secondary block mb-1">Etiqueta visible</label>
                        <input className="w-full bg-surface border border-border-dark rounded px-3 py-2 text-white text-sm outline-none focus:border-primary"
                            value={label} onChange={e => setLabel(e.target.value)} />
                    </div>
                    <div>
                        <label className="text-xs text-text-secondary block mb-1">Rol sintáctico</label>
                        <input className="w-full bg-surface border border-border-dark rounded px-3 py-2 text-white text-sm outline-none focus:border-primary"
                            value={role} onChange={e => setRole(e.target.value)} placeholder="Ej: Objeto Directo" />
                    </div>
                    <div className="flex gap-4 items-center">
                        <div className="flex-1">
                            <label className="text-xs text-text-secondary block mb-1">Categoría Léxica</label>
                            <input className="w-full bg-surface border border-border-dark rounded px-3 py-2 text-white text-sm outline-none focus:border-primary"
                                value={cat} onChange={e => setCat(e.target.value)} placeholder="sustantivo..." />
                        </div>
                        <div>
                            <label className="text-xs text-text-secondary block mb-1">Color</label>
                            <input type="color" className="bg-transparent rounded cursor-pointer border-none h-8 w-12"
                                value={color} onChange={e => setColor(e.target.value)} />
                        </div>
                    </div>
                </div>
                <div className="flex gap-3 mt-5">
                    <button onClick={onClose} className="flex-1 py-2 bg-surface hover:bg-surface-light text-text-secondary rounded-lg text-sm">Cancelar</button>
                    <button onClick={() => {
                        onAdd({ id: uid(), type, role, label, color, x: window.innerWidth / 2 - 200, y: window.innerHeight / 2 - 200, children: [], lexiconCategory: cat });
                        onClose();
                    }} className="flex-1 py-2 bg-primary hover:bg-primary-dark text-white font-bold rounded-lg text-sm">Añadir</button>
                </div>
            </div>
        </div>
    );
};

// ── Help Modal ───────────────────────────────────────────────────────────────

const HelpModal = ({ onClose }: { onClose: () => void }) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-[#111115] border border-border-dark rounded-xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        💡 Cómo usar el Canvas de Sintaxis
                    </h3>
                </div>
                <div className="p-6 flex-1 overflow-auto space-y-6 text-sm text-white/80">
                    <section>
                        <h4 className="text-white font-bold text-base mb-2">1. Lienzo Infinito</h4>
                        <p>Haz clic y arrastra en cualquier parte vacía del fondo para mover la cámara. Usa <strong>CTRL + Scroll</strong> del ratón para acercar o alejar la vista.</p>
                    </section>
                    <section>
                        <h4 className="text-white font-bold text-base mb-2">2. Añadir Estructuras</h4>
                        <p>Haz clic en el botón <strong>+ Añadir Estructura</strong> arriba a la izquierda. Puedes añadir Oraciones, Frases, Palabras o Morfemas, y darles un color. Estos bloques principales se pueden arrastrar libremente por el lienzo.</p>
                    </section>
                    <section>
                        <h4 className="text-white font-bold text-base mb-2">3. Anidamiento (Cajas dentro de cajas)</h4>
                        <p>Dentro de cada bloque (excepto los morfemas), verás una sección llamada <em>Dimensiones / Hijos</em> con un botón <strong>+ Añadir</strong>. Esto sirve para crear estructuras complejas, por ejemplo, meter un Adjetivo dentro de un Sintagma Nominal, o prefijos dentro de un Verbo.</p>
                    </section>
                    <section>
                        <h4 className="text-white font-bold text-base mb-2">4. Conectar con Flechas</h4>
                        <p>Para indicar relaciones (como dependencia o concordancia):</p>
                        <ol className="list-decimal ml-5 mt-1 space-y-1 text-white/60">
                            <li>Haz clic en el icono de enlace <span className="text-white">🔗</span> en el bloque de origen.</li>
                            <li>Verás que el cursor cambia a una cruz y el bloque se resalta.</li>
                            <li>Haz clic en el bloque destino. Se trazará una flecha entre ambos.</li>
                            <li>Para borrar una flecha, haz clic directamente sobre ella.</li>
                        </ol>
                    </section>
                    <section>
                        <h4 className="text-white font-bold text-base mb-2">5. AI Mapper</h4>
                        <p>Usa el botón <strong>✦ AI Mapper</strong> para traducir entre un gráfico visual y reglas escritas en prosa, ¡generando el árbol automáticamente!</p>
                    </section>
                </div>
                <div className="p-4 border-t border-white/10 flex justify-end">
                    <button onClick={onClose} className="px-6 py-2 bg-primary hover:bg-primary-dark text-white font-bold rounded-lg transition-colors">¡Entendido!</button>
                </div>
            </div>
        </div>
    );
};

// ── Main Canvas Component ────────────────────────────────────────────────────

interface SyntaxCanvasProps {
    canvas: SyntaxCanvasType;
    onChange: (canvas: SyntaxCanvasType) => void;
    lexicon: LexiconEntry[];
    conlangName?: string;
    aiAvailable?: boolean;
    grammar?: GrammarManifest;
}

export default function SyntaxCanvas({ canvas, onChange, lexicon, conlangName = 'tu conlang', aiAvailable, grammar }: SyntaxCanvasProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    
    // Drag state
    const [draggingNode, setDraggingNode] = useState<string | null>(null);
    const lastPos = useRef({ x: 0, y: 0 });
    const isDraggingCanvas = useRef(false);

    // Connection state
    const [connectionStartId, setConnectionStartId] = useState<string | null>(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    // Morphological breakdown panel
    const [breakdownId, setBreakdownId] = useState<string | null>(null);

    // Modals
    const [showAddModal, setShowAddModal] = useState(false);
    const [showAiModal, setShowAiModal] = useState(false);
    const [showHelpModal, setShowHelpModal] = useState(false);
    
    // Dynamic node bounds tracking for SVG
    const [nodeBounds, setNodeBounds] = useState<Record<string, {x: number, y: number, w: number, h: number}>>({});

    const update = (patch: Partial<SyntaxCanvasType>) => onChange({ ...canvas, ...patch });

    // ── Track DOM positions of all nodes for precise arrows ──────────────────
    useEffect(() => {
        const updateBounds = () => {
            if (!containerRef.current) return;
            const cRect = containerRef.current.getBoundingClientRect();
            const newBounds: Record<string, {x: number, y: number, w: number, h: number}> = {};
            
            const allNodes = findAllNodes(canvas.nodes);
            allNodes.forEach(n => {
                const el = document.getElementById(`node-${n.id}`);
                if (el) {
                    const rect = el.getBoundingClientRect();
                    // Map to canvas coordinate space!
                    newBounds[n.id] = {
                        x: (rect.left - cRect.left - pan.x) / zoom,
                        y: (rect.top - cRect.top - pan.y) / zoom,
                        w: rect.width / zoom,
                        h: rect.height / zoom,
                    };
                }
            });
            setNodeBounds(newBounds);
        };
        
        updateBounds();
        // Set up mutation observer or intervals if needed, but listening to mouse move is heavy.
        // We'll update on state changes and dragging.
        const raf = requestAnimationFrame(updateBounds);
        return () => cancelAnimationFrame(raf);
    }, [canvas.nodes, pan, zoom]);

    // ── Free Dragging Logic ──────────────────────────────────────────────────
    const handlePointerDown = (e: React.PointerEvent) => {
        if (e.button !== 0) return; // only left click
        isDraggingCanvas.current = true;
        lastPos.current = { x: e.clientX, y: e.clientY };
        e.currentTarget.setPointerCapture(e.pointerId);
    };

    const handleNodePointerDown = (e: React.PointerEvent, id: string) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        setDraggingNode(id);
        lastPos.current = { x: e.clientX, y: e.clientY };
        e.currentTarget.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        // Track mouse for connection drawing
        if (connectionStartId && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            setMousePos({
                x: (e.clientX - rect.left - pan.x) / zoom,
                y: (e.clientY - rect.top - pan.y) / zoom
            });
        }

        if (draggingNode) {
            const dx = (e.clientX - lastPos.current.x) / zoom;
            const dy = (e.clientY - lastPos.current.y) / zoom;
            lastPos.current = { x: e.clientX, y: e.clientY };
            update({ nodes: updateNodeDeep(canvas.nodes, draggingNode, { 
                x: (findNodeDeep(canvas.nodes, draggingNode)?.x || 0) + dx, 
                y: (findNodeDeep(canvas.nodes, draggingNode)?.y || 0) + dy 
            }) });
        } else if (isDraggingCanvas.current) {
            const dx = e.clientX - lastPos.current.x;
            const dy = e.clientY - lastPos.current.y;
            lastPos.current = { x: e.clientX, y: e.clientY };
            setPan(p => ({ x: p.x + dx, y: p.y + dy }));
        }
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        isDraggingCanvas.current = false;
        setDraggingNode(null);
        e.currentTarget.releasePointerCapture(e.pointerId);
    };

    const handleWheel = (e: React.WheelEvent) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            setZoom(z => Math.min(Math.max(0.2, z * delta), 3));
        }
    };

    // ── Node & Connection Ops ────────────────────────────────────────────────
    
    const startConnection = (id: string) => {
        if (connectionStartId === id) setConnectionStartId(null);
        else setConnectionStartId(id);
    };

    const inspectNode = (id: string) => {
        const n = findNodeDeep(canvas.nodes, id);
        if (n && n.type === 'word' && n.lexeme) setBreakdownId(id);
        else setBreakdownId(null);
    };

    const breakdownNode = breakdownId ? findNodeDeep(canvas.nodes, breakdownId) : null;

    const applyBreakdown = (feats: Record<string, string>) => {
        if (!breakdownId || !grammar) return;
        const n = findNodeDeep(canvas.nodes, breakdownId);
        if (!n || !n.lexeme) return;
        const sf = realizeLexeme(n.lexeme, feats, grammar);
        update({ nodes: updateNodeDeep(canvas.nodes, breakdownId, { label: sf.form, features: feats, literalForm: sf.form }) });
    };

    const endConnection = (id: string) => {
        if (connectionStartId && connectionStartId !== id) {
            const newConn: SyntaxConnection = {
                id: uid(),
                fromId: connectionStartId,
                toId: id,
                connectionType: 'dependency'
            };
            update({ connections: [...(canvas.connections || []), newConn] });
        }
        setConnectionStartId(null);
    };

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col h-full overflow-hidden bg-[#0a0a0c] relative rounded-xl border border-white/10">
            {/* Toolbar */}
            <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between pointer-events-none">
                <div className="flex gap-2 pointer-events-auto">
                    <button onClick={() => setShowAddModal(true)} className="px-4 py-2 bg-primary/20 hover:bg-primary/40 text-primary hover:text-white font-bold rounded-lg border border-primary/50 backdrop-blur-md transition-colors shadow-lg">
                        + Añadir Estructura
                    </button>
                    <button onClick={() => setShowAiModal(true)} disabled={aiAvailable === false} className="px-4 py-2 bg-accent/20 hover:bg-accent/40 text-accent hover:text-white font-bold rounded-lg border border-accent/50 backdrop-blur-md transition-colors shadow-lg flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
                        <span>✦</span> AI Mapper
                    </button>
                    <button onClick={() => setShowHelpModal(true)} className="w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white font-bold rounded-full border border-white/20 backdrop-blur-md transition-colors shadow-lg" title="Cómo usar el Canvas">
                        ?
                    </button>
                </div>
                <div className="flex gap-2 pointer-events-auto bg-black/40 backdrop-blur-md p-1 rounded-lg border border-white/10">
                    <button onClick={() => setZoom(z => Math.max(0.2, z - 0.2))} className="w-8 h-8 flex justify-center items-center hover:bg-white/10 text-white rounded">-</button>
                    <span className="flex items-center text-xs font-mono text-white/50 px-2">{Math.round(zoom * 100)}%</span>
                    <button onClick={() => setZoom(z => Math.min(3, z + 0.2))} className="w-8 h-8 flex justify-center items-center hover:bg-white/10 text-white rounded">+</button>
                    <div className="w-[1px] h-4 bg-white/20 self-center mx-1" />
                    <button onClick={() => { setPan({x: 0, y: 0}); setZoom(1); }} className="px-2 text-xs hover:bg-white/10 text-white rounded">Reset</button>
                </div>
            </div>

            {aiAvailable === false && (
                <div className="absolute top-[4.5rem] left-4 z-10 pointer-events-none">
                    <p className="text-xs text-text-secondary bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">Modo offline: la inducción de reglas desde texto requiere IA. Edita las ranuras manualmente.</p>
                </div>
            )}

            {/* Canvas */}
            <div 
                ref={containerRef}
                className="flex-1 w-full h-full cursor-grab active:cursor-grabbing overflow-hidden"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onWheel={handleWheel}
                style={{
                    backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0)',
                    backgroundSize: `${40 * zoom}px ${40 * zoom}px`,
                    backgroundPosition: `${pan.x}px ${pan.y}px`
                }}
            >
                <div style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0', width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}>
                    
                    {/* SVG Connections Overlay */}
                    <svg className="absolute inset-0 pointer-events-none" style={{ width: '10000px', height: '10000px', overflow: 'visible' }}>
                        <defs>
                            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                                <polygon points="0 0, 10 3.5, 0 7" fill="#8b5cf6" />
                            </marker>
                        </defs>
                        
                        {/* Active Drag Connection */}
                        {connectionStartId && nodeBounds[connectionStartId] && (
                            <path 
                                d={`M ${nodeBounds[connectionStartId].x + nodeBounds[connectionStartId].w / 2} ${nodeBounds[connectionStartId].y + nodeBounds[connectionStartId].h / 2} L ${mousePos.x} ${mousePos.y}`}
                                stroke="#8b5cf6" strokeWidth="2" strokeDasharray="5,5" fill="none" markerEnd="url(#arrowhead)"
                            />
                        )}

                        {/* Solid Connections */}
                        {(canvas.connections || []).map(conn => {
                            const b1 = nodeBounds[conn.fromId];
                            const b2 = nodeBounds[conn.toId];
                            if (!b1 || !b2) return null;
                            
                            // Bezier curve math from center to center
                            const startX = b1.x + b1.w / 2;
                            const startY = b1.y + b1.h / 2;
                            const endX = b2.x + b2.w / 2;
                            const endY = b2.y + b2.h / 2;
                            
                            // simple cubic bezier
                            const midX = (startX + endX) / 2;
                            const d = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;

                            return (
                                <g key={conn.id} className="pointer-events-auto">
                                    <path d={d} stroke="#8b5cf6" strokeWidth="3" fill="none" opacity="0.6" markerEnd="url(#arrowhead)" className="hover:stroke-white hover:opacity-100 transition-all cursor-pointer" 
                                        onClick={() => update({ connections: canvas.connections.filter(c => c.id !== conn.id) })}
                                    />
                                    {conn.label && (
                                        <text x={midX} y={(startY + endY) / 2 - 10} fill="#a78bfa" fontSize="10" textAnchor="middle" className="font-bold bg-black/50">{conn.label}</text>
                                    )}
                                </g>
                            );
                        })}
                    </svg>

                    {/* Nodes Layer */}
                    {(canvas.nodes || []).map(node => (
                        <SyntaxNodeRenderer
                            key={node.id}
                            node={node}
                            isConnecting={!!connectionStartId}
                            connectionStartId={connectionStartId}
                            onPointerDown={handleNodePointerDown}
                            onConnectStart={startConnection}
                            onConnectEnd={endConnection}
                            onAddChild={(parentId) => {
                                update({ nodes: addChildToNode(canvas.nodes, parentId, {
                                    id: uid(), type: 'word', role: '...', label: 'Nuevo', color: '#888888', x: 0, y: 0, children: []
                                }) });
                            }}
                            onRemove={(id) => update({ nodes: removeNodeDeep(canvas.nodes, id), connections: (canvas.connections || []).filter(c => c.fromId !== id && c.toId !== id) })}
                            onUpdate={(id, patch) => update({ nodes: updateNodeDeep(canvas.nodes, id, patch) })}
                            onInspect={inspectNode}
                        />
                    ))}
                </div>
            </div>

            {/* Render Modals */}
            {showAddModal && <AddNodeModal onAdd={n => update({ nodes: [...canvas.nodes, n] })} onClose={() => setShowAddModal(false)} />}
            {showAiModal && <AiMapperModal canvas={canvas} conlangName={conlangName} onApply={(n, c) => update({ nodes: n, connections: c })} onClose={() => setShowAiModal(false)} aiAvailable={aiAvailable} />}
            {showHelpModal && <HelpModal onClose={() => setShowHelpModal(false)} />}

            {/* Morphological breakdown (desglose por palabra) */}
            {breakdownNode && breakdownNode.lexeme ? (
                <BreakdownPanel
                    node={breakdownNode}
                    grammar={grammar}
                    onApply={applyBreakdown}
                    onClose={() => setBreakdownId(null)}
                />
            ) : breakdownId ? (
                <div className="absolute bottom-4 right-4 z-20 w-80 max-w-[calc(100%-2rem)] bg-[#111115] border border-border-dark rounded-xl shadow-2xl p-4 pointer-events-auto">
                    <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-bold text-white">Desglose morfológico</h4>
                        <button
                            onClick={() => setBreakdownId(null)}
                            className="w-6 h-6 rounded flex items-center justify-center text-xs bg-white/5 hover:bg-red-500/20 text-white/50 hover:text-red-400"
                            title="Cerrar"
                        >✕</button>
                    </div>
                    <p className="text-xs text-text-secondary">Selecciona una palabra para ver su desglose.</p>
                </div>
            ) : null}
        </div>
    );
}
