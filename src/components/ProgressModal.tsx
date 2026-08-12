
import LoaderIcon from './icons/LoaderIcon';

interface ProgressModalProps {
    message: string;
    progress: number;
}

const ProgressModal = ({ message, progress }: ProgressModalProps) => (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4 animate-fade-in" role="dialog" aria-modal="true" aria-live="assertive">
        <div className="bg-surface rounded-lg shadow-2xl p-8 flex flex-col items-center gap-6 text-center border border-subtle max-w-sm w-full">
            <LoaderIcon className="h-12 w-12 text-accent" />
            <p className="text-lg text-text-primary font-semibold whitespace-pre-wrap">{message}</p>
            <div className="w-full bg-background rounded-full h-2.5">
                <div 
                    className="bg-accent h-2.5 rounded-full transition-all duration-300" 
                    style={{ width: `${progress}%` }}
                ></div>
            </div>
            <span className="text-sm font-mono text-text-secondary">{Math.round(progress)}%</span>
        </div>
    </div>
);

export default ProgressModal;
