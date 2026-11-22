/**
 * useEditorCompletion.test.tsx — estado del modo "completar" de `App.tsx`.
 *
 * Verifica el contrato preservado del bloque inline original:
 *  - arranque en modo `add` con las entradas pendientes filtradas;
 *  - `entryToComplete` solo existe en modo `complete`;
 *  - el índice se acota cuando el lote pendiente cambia de tamaño;
 *  - los setters conservan la forma `Dispatch<SetStateAction<T>>`.
 *
 * Environment: jsdom + createRoot (mismo patrón que `useTabNavigation`).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { JSDOM } from 'jsdom';
import { useEditorCompletion, type UseEditorCompletionResult } from '../useEditorCompletion';
import type { LexiconEntry } from '../../types';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'http://localhost' });
globalThis.document = dom.window.document;
globalThis.window = dom.window as unknown as Window;

const entry = (overrides: Partial<LexiconEntry> = {}): LexiconEntry => ({
    ID: 'e1',
    Raíz: 'bask',
    Léxema: ['baskel'],
    Categoría: 'sustantivo',
    Significado: ['caballo'],
    extraData: {},
    ...overrides,
});

const pending = (id: string): LexiconEntry => entry({ ID: id, Significado: [] });

let latest: UseEditorCompletionResult | null = null;

const Probe = ({ activeLexicon }: { activeLexicon: LexiconEntry[] }) => {
    latest = useEditorCompletion(activeLexicon);
    return <div />;
};

const mounts: Array<{ root: Root; container: HTMLDivElement }> = [];

const renderProbe = (activeLexicon: LexiconEntry[]): void => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    mounts.push({ root, container });
    act(() => {
        root.render(<Probe activeLexicon={activeLexicon} />);
    });
};

const rerenderProbe = (activeLexicon: LexiconEntry[]): void => {
    const { root } = mounts[mounts.length - 1];
    act(() => {
        root.render(<Probe activeLexicon={activeLexicon} />);
    });
};

afterEach(() => {
    while (mounts.length > 0) {
        const { root, container } = mounts.pop()!;
        act(() => {
            root.unmount();
        });
        if (container.parentNode) container.parentNode.removeChild(container);
    }
    latest = null;
});

describe('useEditorCompletion', () => {
    it('arranca en modo add con las entradas pendientes filtradas', () => {
        renderProbe([entry(), pending('p1'), pending('p2')]);

        expect(latest!.editorMode).toBe('add');
        expect(latest!.incompleteIndex).toBe(0);
        expect(latest!.incompleteEntries.map(e => e.ID)).toEqual(['p1', 'p2']);
        expect(latest!.entryToComplete).toBeNull();
    });

    it('el modo complete apunta a la primera pendiente', () => {
        renderProbe([pending('p1'), pending('p2')]);

        act(() => {
            latest!.setEditorMode('complete');
        });

        expect(latest!.editorMode).toBe('complete');
        expect(latest!.entryToComplete?.ID).toBe('p1');
    });

    it('cambiar el índice actualiza la entrada objetivo', () => {
        renderProbe([pending('p1'), pending('p2')]);
        act(() => {
            latest!.setEditorMode('complete');
        });

        act(() => {
            latest!.setIncompleteIndex(1);
        });

        expect(latest!.entryToComplete?.ID).toBe('p2');
    });

    it('volver a add limpia la entrada objetivo', () => {
        renderProbe([pending('p1')]);
        act(() => {
            latest!.setEditorMode('complete');
        });

        act(() => {
            latest!.setEditorMode('add');
        });

        expect(latest!.entryToComplete).toBeNull();
    });

    it('el índice se acota cuando el lote pendiente se encoge', () => {
        renderProbe([pending('p1'), pending('p2'), pending('p3')]);
        act(() => {
            latest!.setEditorMode('complete');
        });
        act(() => {
            latest!.setIncompleteIndex(2);
        });
        expect(latest!.entryToComplete?.ID).toBe('p3');

        rerenderProbe([pending('p1')]);

        expect(latest!.incompleteIndex).toBe(0);
        expect(latest!.entryToComplete?.ID).toBe('p1');
    });

    it('los setters aceptan una función sobre el valor previo', () => {
        renderProbe([pending('p1'), pending('p2')]);

        act(() => {
            latest!.setEditorMode(prev => (prev === 'add' ? 'complete' : prev));
        });
        act(() => {
            latest!.setIncompleteIndex(prev => prev + 1);
        });

        expect(latest!.editorMode).toBe('complete');
        expect(latest!.incompleteIndex).toBe(1);
        expect(latest!.entryToComplete?.ID).toBe('p2');
    });

    it('sin pendientes, el modo complete no fija entrada', () => {
        renderProbe([entry()]);

        act(() => {
            latest!.setEditorMode('complete');
        });

        expect(latest!.incompleteEntries).toEqual([]);
        expect(latest!.entryToComplete).toBeNull();
    });
});
