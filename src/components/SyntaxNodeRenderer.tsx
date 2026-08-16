import React from 'react';
import { SyntaxNode } from '../types';

export interface SyntaxNodeRendererProps {
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
}

const SyntaxNodeRenderer: React.FC<SyntaxNodeRendererProps> = ({
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

SyntaxNodeRenderer.displayName = 'SyntaxNodeRenderer';

export default SyntaxNodeRenderer;
