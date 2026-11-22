/**
 * useAppNotifications.test.tsx — estado de notificaciones de `App.tsx`.
 *
 * Verifica el contrato preservado del bloque inline original:
 *  - arranque sin notificaciones;
 *  - `showNotification` apila con tipo `success` por defecto y con `error` explícito;
 *  - cada notificación se auto-descarta a los `NOTIFICATION_DURATION_MS`;
 *  - `dismissNotification` elimina solo la notificación indicada;
 *  - `showNotification` conserva su identidad entre renders.
 *
 * Environment: jsdom + createRoot (mismo patrón que `useEditorCompletion`).
 */
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { JSDOM } from 'jsdom';
import {
    useAppNotifications,
    NOTIFICATION_DURATION_MS,
    type UseAppNotificationsResult,
} from '../useAppNotifications';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'http://localhost' });
globalThis.document = dom.window.document;
globalThis.window = dom.window as unknown as Window;

let latest: UseAppNotificationsResult | null = null;

const Probe = () => {
    latest = useAppNotifications();
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

beforeEach(() => {
    vi.useFakeTimers();
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
    vi.useRealTimers();
});

describe('useAppNotifications', () => {
    it('arranca sin notificaciones', () => {
        renderProbe();

        expect(latest!.notifications).toEqual([]);
    });

    it('apila una notificación con tipo success por defecto', () => {
        renderProbe();

        act(() => {
            latest!.showNotification('Guardado');
        });

        expect(latest!.notifications).toHaveLength(1);
        expect(latest!.notifications[0]).toMatchObject({ message: 'Guardado', type: 'success' });
        expect(typeof latest!.notifications[0].id).toBe('number');
    });

    it('acepta el tipo error explícito', () => {
        renderProbe();

        act(() => {
            latest!.showNotification('Falló el guardado', 'error');
        });

        expect(latest!.notifications[0]).toMatchObject({ message: 'Falló el guardado', type: 'error' });
    });

    it('apila varias notificaciones en orden', () => {
        renderProbe();

        act(() => {
            latest!.showNotification('Uno');
            latest!.showNotification('Dos', 'error');
        });

        expect(latest!.notifications.map(n => n.message)).toEqual(['Uno', 'Dos']);
        expect(latest!.notifications[0].id).not.toBe(latest!.notifications[1].id);
    });

    it('auto-descarta cada notificación a los NOTIFICATION_DURATION_MS', () => {
        renderProbe();

        act(() => {
            latest!.showNotification('Uno');
        });
        act(() => {
            latest!.showNotification('Dos');
        });
        expect(latest!.notifications).toHaveLength(2);

        act(() => {
            vi.advanceTimersByTime(NOTIFICATION_DURATION_MS - 1);
        });
        expect(latest!.notifications).toHaveLength(2);

        act(() => {
            vi.advanceTimersByTime(1);
        });
        expect(latest!.notifications).toEqual([]);
    });

    it('dismissNotification elimina solo la notificación indicada', () => {
        renderProbe();
        act(() => {
            latest!.showNotification('Uno');
            latest!.showNotification('Dos');
        });

        const target = latest!.notifications[0].id;
        act(() => {
            latest!.dismissNotification(target);
        });

        expect(latest!.notifications.map(n => n.message)).toEqual(['Dos']);
    });

    it('dismissNotification con un id inexistente deja la lista intacta', () => {
        renderProbe();
        act(() => {
            latest!.showNotification('Uno');
        });

        act(() => {
            latest!.dismissNotification(-1);
        });

        expect(latest!.notifications).toHaveLength(1);
    });

    it('showNotification conserva su identidad entre renders', () => {
        renderProbe();
        const first = latest!.showNotification;

        rerenderProbe();

        expect(latest!.showNotification).toBe(first);
    });
});
