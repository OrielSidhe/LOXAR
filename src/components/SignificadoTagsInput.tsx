import React, { useState, useRef } from 'react';
import XCircleIcon from './icons/XCircleIcon';

export interface SignificadoTagsInputProps {
    values: string[];
    onChange: (vals: string[]) => void;
    placeholder?: string;
    disabled?: boolean;
    hasError?: boolean;
    id: string;
}

const SignificadoTagsInput = ({ values, onChange, placeholder, disabled, hasError, id }: SignificadoTagsInputProps) => {
    const [inputVal, setInputVal] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    const addTag = (raw: string) => {
        const trimmed = raw.trim();
        if (!trimmed) return;
        const parts = trimmed.split(',').map(s => s.trim()).filter(Boolean);
        const newVals = [...values, ...parts.filter(p => !values.includes(p))];
        onChange(newVals);
        setInputVal('');
    };

    const removeTag = (index: number) => {
        onChange(values.filter((_, i) => i !== index));
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if ((e.key === 'Enter' || e.key === ',') && inputVal.trim()) {
            e.preventDefault();
            addTag(inputVal);
        } else if (e.key === 'Backspace' && !inputVal && values.length > 0) {
            removeTag(values.length - 1);
        }
    };

    return (
        <div
            onClick={() => inputRef.current?.focus()}
            className={`flex flex-wrap gap-1.5 min-h-[44px] w-full bg-background border rounded px-2 py-1.5 cursor-text transition-all ${hasError ? 'border-warning ring-1 ring-warning' : 'border-subtle focus-within:border-accent focus-within:ring-1 focus-within:ring-accent'} ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
        >
            {values.map((tag, i) => (
                <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent/15 border border-accent/30 rounded-full text-sm text-accent font-semibold">
                    {tag}
                    <button type="button" onClick={(e) => { e.stopPropagation(); removeTag(i); }} className="hover:text-danger transition-colors ml-0.5">
                        <XCircleIcon className="h-3.5 w-3.5" />
                    </button>
                </span>
            ))}
            <input
                ref={inputRef}
                id={id}
                name={id}
                type="text"
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => { if (inputVal.trim()) addTag(inputVal); }}
                placeholder={values.length === 0 ? (placeholder || 'Escribe y presiona Enter o coma...') : '+ significado'}
                disabled={disabled}
                className="flex-1 min-w-[120px] bg-transparent text-text-primary text-sm focus:outline-none placeholder:text-text-secondary/50"
                tabIndex={1}
            />
        </div>
    );
};

SignificadoTagsInput.displayName = 'SignificadoTagsInput';

export default SignificadoTagsInput;
