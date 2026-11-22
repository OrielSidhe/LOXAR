/**
 * editorCompletionModel.test.ts — resolución del modo "completar".
 *
 * Cubre la semántica que el `useEffect` original de `App.tsx` tenía inline:
 * el modo `add` nunca apunta a una entrada y el modo `complete` resuelve la
 * entrada pendiente del índice (con `null` fuera de rango).
 */
import { describe, it, expect } from 'vitest';
import {
    resolveEntryToComplete,
    resolveEntryToCompleteForMode,
} from '../editorCompletionModel';
import type { LexiconEntry } from '../../types';

const entry = (id: string): LexiconEntry => ({
    ID: id,
    Raíz: 'raiz',
    Léxema: [`lex${id}`],
    Categoría: 'sustantivo',
    Significado: ['significado'],
    extraData: {},
});

describe('editorCompletionModel', () => {
    it('resuelve la entrada pendiente del índice', () => {
        const entries = [entry('a'), entry('b')];
        expect(resolveEntryToComplete(entries, 0)).toBe(entries[0]);
        expect(resolveEntryToComplete(entries, 1)).toBe(entries[1]);
    });

    it('devuelve null con índice fuera de rango o lote vacío', () => {
        expect(resolveEntryToComplete([], 0)).toBeNull();
        expect(resolveEntryToComplete([entry('a')], 5)).toBeNull();
        expect(resolveEntryToComplete([entry('a')], -1)).toBeNull();
    });

    it('el modo add nunca tiene entrada objetivo', () => {
        const entries = [entry('a')];
        expect(resolveEntryToCompleteForMode('add', entries, 0)).toBeNull();
    });

    it('el modo complete apunta a la entrada del índice', () => {
        const entries = [entry('a'), entry('b')];
        expect(resolveEntryToCompleteForMode('complete', entries, 1)).toBe(entries[1]);
    });

    it('el modo complete con lote vacío resuelve null', () => {
        expect(resolveEntryToCompleteForMode('complete', [], 0)).toBeNull();
    });
});
