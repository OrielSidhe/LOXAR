import { FC, memo } from 'react';
import { Glyph } from '../../types';
import PlusIcon from '../icons/PlusIcon';
import TrashIcon from '../icons/TrashIcon';
import EditIcon from '../icons/EditIcon';

interface NeographyGridProps {
    glyphs: Glyph[];
    onSelectGlyph: (id: string) => void;
    onAddGlyph: () => void;
    onDeleteGlyph: (glyph: Glyph) => void;
}

const GlyphPreview: FC<{ glyph: Glyph; color?: string }> = memo(({ glyph, color = 'currentColor' }) => {
    const viewBox = glyph.viewBox || { width: 250, height: 250 };
    return (
        <svg width="100%" height="100%" viewBox={`0 0 ${viewBox.width} ${viewBox.height}`} preserveAspectRatio="xMidYMid meet" className="overflow-visible">
            <path d={glyph.svgPathLower || ''} fill={color} opacity="0.6" />
            <path d={glyph.svgPathMain || ''} fill={color} />
            <path d={glyph.svgPathUpper || ''} fill={color} opacity="0.6" />
        </svg>
    );
});

const NeographyGrid: FC<NeographyGridProps> = ({ glyphs, onSelectGlyph, onAddGlyph, onDeleteGlyph }) => {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4 p-4 overflow-y-auto max-h-full">
            <button
                onClick={onAddGlyph}
                className="aspect-square rounded-lg border-2 border-dashed border-primary/30 hover:border-primary/80 bg-surface-light/5 hover:bg-surface-light/10 flex flex-col items-center justify-center gap-2 transition-all group"
            >
                <div className="p-3 rounded-full bg-primary/10 group-hover:scale-110 transition-transform text-primary">
                    <PlusIcon className="w-8 h-8" />
                </div>
                <span className="text-xs font-bold text-primary uppercase tracking-wider">Nuevo Glifo</span>
            </button>

            {glyphs.map(glyph => (
                <div
                    key={glyph.id}
                    onClick={() => onSelectGlyph(glyph.id)}
                    className="aspect-square bg-surface border border-border-dark hover:border-primary rounded-lg relative group cursor-pointer shadow-sm hover:shadow-md transition-all flex flex-col"
                >
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10">
                        <button
                            onClick={(e) => { e.stopPropagation(); onDeleteGlyph(glyph); }}
                            className="p-1.5 bg-background/80 hover:bg-red-500 hover:text-white text-text-secondary rounded-md backdrop-blur-sm"
                            title="Eliminar"
                        >
                            <TrashIcon className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="flex-1 p-4 flex items-center justify-center text-text-primary">
                        <GlyphPreview glyph={glyph} />
                    </div>

                    <div className="px-3 py-2 bg-surface-dark border-t border-border-dark rounded-b-lg flex justify-between items-center text-xs">
                        <span className="font-mono font-bold truncate text-white w-full text-center">{glyph.name}</span>
                    </div>

                    <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg pointer-events-none flex items-center justify-center">
                        <div className="bg-background/80 backdrop-blur px-3 py-1 rounded-full border border-primary/30 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-200">
                            <span className="text-xs font-bold text-primary flex gap-2 items-center">
                                <EditIcon className="w-3 h-3" /> Editar
                            </span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default memo(NeographyGrid);
