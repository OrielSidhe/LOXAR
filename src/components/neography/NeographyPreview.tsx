
import { useState, useEffect, useRef, memo, ChangeEvent } from 'react';
import { NeographyProfile } from '../../types';
import UploadIcon from '../icons/UploadIcon';
import TrashIcon from '../icons/TrashIcon';

interface NeographyPreviewProps {
    profile: NeographyProfile;
    onUpdateProfile: (updates: Partial<NeographyProfile>) => void;
}

const NeographyPreview = ({ profile, onUpdateProfile }: NeographyPreviewProps) => {
    const [inputText, setInputText] = useState('Texto de prueba para la neografía.');
    const [renderMode, setRenderMode] = useState<'font' | 'svg'>('font');
    const [fontSize, setFontSize] = useState(32);
    const [lineHeight, setLineHeight] = useState(1.5);
    const [letterSpacing, setLetterSpacing] = useState(0);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const styleRef = useRef<HTMLStyleElement | null>(null);

    // Dynamic @font-face management.
    // Use textContent (never innerHTML): the user-supplied font URL is treated
    // as inert CSS text, so a malicious/garbage value cannot break out of the
    // <style> context and inject markup or scripts into the document. We also
    // only accept base64 data: URLs (never remote URLs).
    useEffect(() => {
        if (!styleRef.current) {
            styleRef.current = document.createElement('style');
            document.head.appendChild(styleRef.current);
        }
        const fontUrl = profile.previewFont;
        const isSafeFontUrl = typeof fontUrl === 'string' && fontUrl.startsWith('data:') && /;base64,/.test(fontUrl);
        styleRef.current.textContent = isSafeFontUrl
            ? `@font-face { font-family: 'ConlangPreviewFont'; src: url(${fontUrl}) format('truetype'); font-weight: normal; font-style: normal; }`
            : '';
    }, [profile.previewFont]);

    const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const base64 = event.target?.result as string;
            onUpdateProfile({ previewFont: base64 });
        };
        reader.readAsDataURL(file);
    };

    const handleRemoveFont = () => {
        if (window.confirm("¿Eliminar la fuente de previa?")) {
            onUpdateProfile({ previewFont: undefined });
        }
    };

    const renderSvgText = () => {
        const chars = Array.from(inputText);
        return (
            <div className="flex flex-wrap gap-y-4" style={{ gap: `${letterSpacing}px` }}>
                {chars.map((char, i) => {
                    const glyphId = profile.characterMap[char] || profile.characterMap[char.toLowerCase()];
                    const glyph = profile.glyphs.find(g => g.id === glyphId);

                    if (glyph && glyph.svgPathMain) {
                        return (
                            <svg key={i} width={fontSize * (glyph.width || 250) / 250} height={fontSize} viewBox={`0 0 ${glyph.viewBox.width} ${glyph.viewBox.height}`} className="fill-current">
                                <path d={glyph.svgPathLower || ''} className="text-red-400" />
                                <path d={glyph.svgPathMain || ''} className="text-white" />
                                <path d={glyph.svgPathUpper || ''} className="text-yellow-400" />
                            </svg>
                        );
                    }
                    return (
                        <div key={i} style={{ fontSize: `${fontSize}px`, width: '1em' }} className="flex items-center justify-center text-text-muted opacity-30 border border-white/5 bg-white/2">
                            {char === ' ' ? '\u00A0' : char}
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full bg-background-dark p-6 overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="space-y-4 bg-surface/50 p-4 rounded-xl border border-white/5">
                    <h3 className="text-xs uppercase font-bold text-primary tracking-widest mb-2">Ajustes de Renderizado</h3>
                    
                    <div className="flex bg-background-dark/80 rounded-lg p-1">
                        <button onClick={() => setRenderMode('font')} className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all ${renderMode === 'font' ? 'bg-accent text-white shadow-glow' : 'text-text-secondary'}`}>
                            Usar Fuente (.ttf/.otf)
                        </button>
                        <button onClick={() => setRenderMode('svg')} className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all ${renderMode === 'svg' ? 'bg-accent text-white shadow-glow' : 'text-text-secondary'}`}>
                            Usar Glifos SVG (Interno)
                        </button>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                            <label className="text-[10px] text-text-muted uppercase">Tamaño: {fontSize}px</label>
                            <input type="range" min="12" max="140" value={fontSize} onChange={e => setFontSize(parseInt(e.target.value))} className="w-full accent-primary" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] text-text-muted uppercase">Espacio: {letterSpacing}px</label>
                            <input type="range" min="-10" max="40" value={letterSpacing} onChange={e => setLetterSpacing(parseInt(e.target.value))} className="w-full accent-primary" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] text-text-muted uppercase">Interlínea: {lineHeight}</label>
                            <input type="range" min="0.8" max="3" step="0.1" value={lineHeight} onChange={e => setLineHeight(parseFloat(e.target.value))} className="w-full accent-primary" />
                        </div>
                    </div>

                    {renderMode === 'font' && (
                        <div className="pt-2">
                            {!profile.previewFont ? (
                                <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-center gap-2 py-3 bg-surface-light hover:bg-white/10 text-white rounded-lg border border-white/10 transition-all border-dashed">
                                    <UploadIcon className="w-5 h-5 text-primary" />
                                    <span>Cargar fuente para prueba</span>
                                </button>
                            ) : (
                                <div className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-lg animate-fade-in">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center text-primary font-bold">Aa</div>
                                        <span className="text-xs font-medium text-white italic">Font cargada y persistente</span>
                                    </div>
                                    <button onClick={handleRemoveFont} className="p-2 text-text-muted hover:text-danger">
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".ttf,.otf" className="hidden" />
                            <p className="text-[10px] text-text-muted mt-2 text-center">Permite probar el interletraje (bearings) y ligaduras contextuales.</p>
                        </div>
                    )}
                </div>

                <div className="space-y-1">
                    <label className="text-xs uppercase font-bold text-text-muted tracking-widest">Texto a transcribir</label>
                    <textarea value={inputText} onChange={e => setInputText(e.target.value)}
                        className="w-full h-full min-h-[140px] bg-surface/30 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-primary/50 transition-all resize-none"
                        placeholder="Escribe aquí para ver tu neografía en acción..." />
                </div>
            </div>

            <div className="flex-1 bg-surface/50 border border-white/5 rounded-2xl p-8 shadow-inner min-h-[300px] overflow-auto custom-scrollbar">
                {renderMode === 'font' ? (
                    <div style={{
                        fontFamily: profile.previewFont ? "'ConlangPreviewFont', sans-serif" : 'inherit',
                        fontSize: `${fontSize}px`,
                        lineHeight: lineHeight,
                        letterSpacing: `${letterSpacing}px`,
                        wordBreak: 'break-word',
                        whiteSpace: 'pre-wrap'
                    }} className={profile.previewFont ? 'text-white' : 'text-text-muted italic opacity-30 select-none'}>
                        {profile.previewFont ? inputText : 'Carga una fuente .ttf o .otf para visualizar con ligaduras y bearings reales.'}
                    </div>
                ) : (
                    renderSvgText()
                )}
            </div>
            
            <div className="mt-4 flex items-center gap-4 text-text-muted text-[11px] bg-primary/5 py-2 px-4 rounded-lg border border-primary/10">
                <span className="material-symbols-outlined text-sm">info</span>
                <span>El modo <strong>SVG</strong> usa los glifos dibujados en el editor. El modo <strong>Fuente</strong> requiere que exportes y vuelvas a cargar el archivo .ttf para probar ligaduras de OpenType.</span>
            </div>
        </div>
    );
};

export default memo(NeographyPreview);
