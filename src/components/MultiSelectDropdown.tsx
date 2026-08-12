import React, { useState, useRef, useMemo } from 'react';
import { useClickOutside } from '../hooks/useClickOutside';
import ChevronDownIcon from './icons/ChevronDownIcon';

export type OptionValue = string;
export interface OptionItem {
    value: OptionValue;
    label: string;
}

interface MultiSelectDropdownProps {
    label: string;
    options: OptionValue[] | OptionItem[];
    selected: OptionValue[];
    onChange: (next: OptionValue[]) => void;
    placeholder?: string;
    emptyHint?: string;
    className?: string;
}

/**
 * Dropdown reutilizable de selección múltiple con checkboxes.
 * Usado para "Aplica a Roles" y "Categorías del léxico" en Estrategias.
 * Acepta `options` como string[] (valor=etiqueta) o {value,label}[] (para
 * seleccionar por ID manteniendo una etiqueta legible, p.ej. roles).
 */
const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
    label, options, selected, onChange, placeholder = 'Selecciona...', emptyHint = 'No hay opciones.', className = ''
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useClickOutside(ref, () => setIsOpen(false));

    // Normalize to {value,label}.
    const normalized = useMemo<OptionItem[]>(
        () => options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o)),
        [options],
    );

    const sortedOptions = useMemo(
        () => [...normalized].sort((a, b) => a.label.localeCompare(b.label, 'es')),
        [normalized],
    );
    const selectedSet = useMemo(() => new Set(selected), [selected]);
    const labelOf = useMemo(() => {
        const m = new Map(normalized.map((o) => [o.value, o.label]));
        return (v: string) => m.get(v) ?? v;
    }, [normalized]);

    const toggle = (opt: OptionItem) => {
        if (selectedSet.has(opt.value)) onChange(selected.filter((s) => s !== opt.value));
        else onChange([...selected, opt.value]);
    };

    return (
        <div className={className}>
            <label className="block text-xs font-semibold text-text-secondary mb-1">{label}</label>
            <div className="relative" ref={ref}>
                <button
                    type="button"
                    onClick={() => setIsOpen((o) => !o)}
                    className="w-full bg-background border border-border-dark rounded px-3 py-2 text-white text-sm focus:border-primary focus:outline-none flex items-center justify-between gap-2"
                >
                    <span className={selected.length ? 'text-white truncate' : 'text-text-secondary truncate'}>
                        {selected.length
                            ? selected.length <= 3
                                ? selected.map(labelOf).join(', ')
                                : `${selected.slice(0, 3).map(labelOf).join(', ')} +${selected.length - 3}`
                            : placeholder}
                    </span>
                    <ChevronDownIcon className={`w-4 h-4 text-text-secondary shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen && (
                    <div className="absolute z-30 mt-1 w-full max-h-56 overflow-auto bg-surface border border-border-dark rounded-md shadow-lg py-1 custom-scrollbar">
                        {sortedOptions.length === 0 && (
                            <div className="px-3 py-2 text-xs text-text-secondary italic">{emptyHint}</div>
                        )}
                        {sortedOptions.map((opt) => (
                            <label
                                key={opt.value}
                                className="flex items-center gap-2 px-3 py-1.5 text-sm text-white hover:bg-subtle/40 cursor-pointer"
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedSet.has(opt.value)}
                                    onChange={() => toggle(opt)}
                                    className="accent-primary"
                                />
                                <span className="truncate">{opt.label}</span>
                            </label>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MultiSelectDropdown;
