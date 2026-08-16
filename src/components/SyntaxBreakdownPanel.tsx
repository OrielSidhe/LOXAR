import React, { useState } from 'react';
import { SyntaxNode, GrammarManifest, MorphemeSegment } from '../types';
import { realizeLexeme } from '../services/grammar';

const SEGMENT_COLORS: Record<MorphemeSegment['kind'], string> = {
    stem: '#10b981',     // green (raíz)
    affix: '#6366f1',    // indigo
    mutation: '#f59e0b', // amber
    tone: '#f59e0b',     // amber
    particle: '#14b8a6', // teal
};

export interface SyntaxBreakdownPanelProps {
    node: SyntaxNode;
    grammar?: GrammarManifest;
    onApply: (feats: Record<string, string>) => void;
    onClose: () => void;
}

const SyntaxBreakdownPanel = ({ node, grammar, onApply, onClose }: SyntaxBreakdownPanelProps) => {
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

SyntaxBreakdownPanel.displayName = 'SyntaxBreakdownPanel';

export default SyntaxBreakdownPanel;
