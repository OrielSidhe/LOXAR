/**
 * useAppTheme.test.tsx — estado de tema de `App.tsx`.
 *
 * Verifica el contrato preservado del bloque inline original:
 *  - arranque con el tema por defecto (`midnight`) aplicado al DOM;
 *  - hidratación del tema persistido en `localStorage`;
 *  - `setThemeId` aplica el tema, persiste y acepta un updater;
 *  - `setThemeId` conserva su identidad entre renders.
 *
 * Environment: jsdom manual (mismo patrón que `useAppNotifications`).
 */
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { JSDOM } from 'jsdom';
import { useAppTheme, type UseAppThemeResult } from '../useAppTheme';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'http://localhost' });
globalThis.document = dom.window.document;
globalThis.window = dom.window as unknown as Window;
const storage = dom.window.localStorage;
(globalThis as unknown as { localStorage: Storage }).localStorage = storage;

const THEME_STORAGE_KEY = 'loxar-ui-theme';

let latest: UseAppThemeResult | null = null;

const Probe = () => {
    latest = useAppTheme();
    return <div />;
};

const mounts: Array<{ root: Root; container: HTMLDivElement }> = [];

const renderProbe = (): void => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    mounts.push({ root, container });
    act(() => {
        root.render(<Probe />);
    });
};

const rerenderProbe = (): void => {
    const { root } = mounts[mounts.length - 1];
    act(() => {
        root.render(<Probe />);
    });
};

const dataTheme = (): string | null => document.documentElement.getAttribute('data-theme');

beforeEach(() => {
    storage.clear();
});

afterEach(() => {
    while (mounts.length > 0) {
        const { root, container } = mounts.pop()!;
        act(() => {
            root.unmount();
        });
        if (container.parentNode) container.parentNode.removeChild(container);
    }
    latest = null;
    storage.clear();
});

describe('useAppTheme', () => {
    it('arranca con el tema por defecto y lo aplica al DOM', () => {
        renderProbe();

        expect(latest!.themeId).toBe('midnight');
        expect(dataTheme()).toBe('midnight');
        expect(document.documentElement.style.getPropertyValue('--color-primary')).toBe('#0db9f2');
        expect(storage.getItem(THEME_STORAGE_KEY)).toBe('midnight');
    });

    it('hidrata el tema persistido en localStorage', () => {
        storage.setItem(THEME_STORAGE_KEY, 'cyber');

        renderProbe();

        expect(latest!.themeId).toBe('cyber');
        expect(dataTheme()).toBe('cyber');
        expect(document.documentElement.style.getPropertyValue('--color-primary')).toBe('#7c5cff');
    });

    it('ignora un tema persistido inválido y cae al default', () => {
        storage.setItem(THEME_STORAGE_KEY, 'no-existe');

        renderProbe();

        expect(latest!.themeId).toBe('midnight');
        expect(dataTheme()).toBe('midnight');
    });

    it('setThemeId aplica el tema y lo persiste', () => {
        renderProbe();

        act(() => {
            latest!.setThemeId('amber');
        });

        expect(latest!.themeId).toBe('amber');
        expect(dataTheme()).toBe('amber');
        expect(document.documentElement.style.getPropertyValue('--color-primary')).toBe('#f5a623');
        expect(storage.getItem(THEME_STORAGE_KEY)).toBe('amber');
    });

    it('setThemeId acepta un updater (Dispatch<SetStateAction>)', () => {
        renderProbe();

        act(() => {
            latest!.setThemeId(prev => (prev === 'midnight' ? 'forest' : 'midnight'));
        });

        expect(latest!.themeId).toBe('forest');
        expect(dataTheme()).toBe('forest');
        expect(storage.getItem(THEME_STORAGE_KEY)).toBe('forest');
    });

    it('setThemeId conserva su identidad entre renders', () => {
        renderProbe();
        const first = latest!.setThemeId;

        rerenderProbe();

        expect(latest!.setThemeId).toBe(first);
    });
});
