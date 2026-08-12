import { useState } from 'react';
import ImageTracer from 'imagetracerjs';
import UploadIcon from '../icons/UploadIcon';
import AutoFixIcon from '../icons/AutoFixIcon';

interface NeographyImageTracerProps {
    onTraceComplete: (svgPath: string) => void;
    onCancel: () => void;
}

const NeographyImageTracer = ({ onTraceComplete, onCancel }: NeographyImageTracerProps) => {
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [previewSvg, setPreviewSvg] = useState<string | null>(null);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            if (event.target?.result) {
                setImageUrl(event.target.result as string);
                setPreviewSvg(null); 
            }
        };
        reader.readAsDataURL(file);
    };

    const handleTrace = () => {
        if (!imageUrl) return;
        setIsProcessing(true);

        const options = {
            ltres: 1,
            qtres: 1,
            pathomit: 8,
            rightangleenhance: false,
            colorsampling: 2,
            numberofcolors: 2, 
            mincolorratio: 0.02,
            colorquantcycles: 3,
            blurradius: 0,
            blurdelta: 10,
            scale: 1, 
        };

        setTimeout(() => {
            (ImageTracer as any).imageToSVG(
                imageUrl,
                (svgstr: string) => {
                    const paths: string[] = [];
                    const regex = /d="([^"]+)"/g;
                    let match;
                    while ((match = regex.exec(svgstr)) !== null) {
                        paths.push(match[1]);
                    }

                    const combinedPath = paths.join(' ');
                    setPreviewSvg(combinedPath);
                    setIsProcessing(false);
                },
                options
            );
        }, 100);
    };

    return (
        <div className="absolute inset-0 bg-surface-dark flex flex-col p-6 z-30 animate-fade-in">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined">image</span> Vectorizar Imagen
            </h3>

            <div className="flex-1 flex gap-6 overflow-hidden">
                <div className="flex-1 flex flex-col gap-4 bg-background-dark/50 p-4 rounded-xl border border-subtle">
                    {!imageUrl ? (
                        <label className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-subtle rounded-lg cursor-pointer hover:bg-white/5 transition-colors">
                            <UploadIcon className="w-12 h-12 text-text-muted mb-2" />
                            <span className="text-text-secondary">Sube una imagen (JPG/PNG)</span>
                            <span className="text-xs text-text-muted mt-1">Preferiblemente tinta oscura sobre fondo blanco</span>
                            <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                        </label>
                    ) : (
                        <div className="relative flex-1 flex items-center justify-center bg-white/5 rounded-lg overflow-hidden">
                            <img src={imageUrl} alt="Source" className="max-w-full max-h-full object-contain opacity-80" />
                            <button
                                onClick={() => { setImageUrl(null); setPreviewSvg(null); }}
                                className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-red-500 transition-colors"
                            >
                                <span className="material-symbols-outlined text-sm">close</span>
                            </button>
                        </div>
                    )}

                    <button
                        onClick={handleTrace}
                        disabled={!imageUrl || isProcessing}
                        className="w-full py-3 bg-accent text-white rounded-lg font-semibold hover:bg-accent-hover disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isProcessing ? (
                            <span className="animate-spin material-symbols-outlined">progress_activity</span>
                        ) : (
                            <AutoFixIcon className="w-5 h-5" />
                        )}
                        {isProcessing ? 'Procesando...' : 'Vectorizar'}
                    </button>
                </div>

                <div className="flex-1 flex flex-col gap-4 bg-background-dark/50 p-4 rounded-xl border border-subtle">
                    <div className="text-sm text-text-secondary mb-2">Previsualización del Vector</div>
                    <div className="flex-1 bg-dots-pattern rounded-lg border border-subtle relative flex items-center justify-center overflow-hidden">
                        {previewSvg ? (
                            <svg viewBox="0 0 1000 1000" className="w-[80%] h-[80%] text-accent fill-current">
                                <path d={previewSvg} />
                            </svg>
                        ) : (
                            <div className="text-text-muted italic">El resultado aparecerá aquí</div>
                        )}
                    </div>

                    <div className="flex gap-4">
                        <button onClick={onCancel} className="flex-1 py-2 text-text-secondary hover:text-white transition-colors">Cancelar</button>
                        <button
                            onClick={() => previewSvg && onTraceComplete(previewSvg)}
                            disabled={!previewSvg}
                            className="flex-1 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 disabled:opacity-30"
                        >
                            Usar este Vector
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NeographyImageTracer;
