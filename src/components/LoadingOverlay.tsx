
import React from 'react';
import LoaderIcon from './icons/LoaderIcon';

interface LoadingOverlayProps {
    message: string;
}

const LoadingOverlay = ({ message }: LoadingOverlayProps) => (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4 animate-fade-in" role="dialog" aria-modal="true" aria-live="assertive">
        <div className="bg-surface rounded-lg shadow-2xl p-8 flex flex-col items-center gap-6 text-center border border-subtle max-w-sm">
            <LoaderIcon className="h-12 w-12 text-accent" />
            <p className="text-lg text-text-primary font-semibold whitespace-pre-wrap">{message}</p>
        </div>
    </div>
);

export default LoadingOverlay;
