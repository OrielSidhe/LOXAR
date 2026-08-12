
import React from 'react';
import { LexiconFilter } from '../types';

interface LexiconFiltersProps {
    activeFilter: LexiconFilter;
    onFilterChange: (filter: LexiconFilter) => void;
    disabled?: boolean;
}

const LexiconFilters = ({ activeFilter, onFilterChange, disabled = false }: LexiconFiltersProps) => {
    return (
        <div className="flex items-center gap-2">
            <label htmlFor="filter-select" className="text-sm font-medium text-text-secondary whitespace-nowrap">
                Ver:
            </label>
            <select
                id="filter-select"
                name="lexiconViewFilter"
                value={activeFilter}
                onChange={(e) => onFilterChange(e.target.value as LexiconFilter)}
                disabled={disabled}
                className="bg-background border border-subtle rounded-md shadow-sm py-2 px-3 text-text-primary focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
            >
                <option value="all">Todas las entradas</option>
                <option value="complete">Entradas completas</option>
                <option value="incomplete">Entradas incompletas</option>
                <option value="ai-generated">Generadas por IA</option>
            </select>
        </div>
    );
};

export default LexiconFilters;
