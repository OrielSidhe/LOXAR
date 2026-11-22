/**
 * useAppNotifications — estado de notificaciones de `App.tsx`.
 *
 * Sustituye al `useState` de notificaciones, al `useCallback` de `showNotification`
 * y al `setNotifications` inline del `onDismissNotification` del `return`.
 *
 * Contrato preservado del bloque original:
 *  - `showNotification(message, type = 'success')` apila una notificación con `id`
 *    basado en `Date.now()`;
 *  - cada notificación se auto-descarta a los `NOTIFICATION_DURATION_MS`;
 *  - `dismissNotification(id)` elimina solo la notificación indicada;
 *  - `showNotification` es memoizada (misma referencia entre renders) porque
 *    `useLexicon` y `useProjectOperations` la reciben como dependencia.
 * El `id` es un contador monótono por montaje en lugar del `Date.now()` original:
 * dos notificaciones creadas en el mismo milisegundo colisionaban, compartían `id`
 * y el auto-dismiss o el descarte manual se llevaba las dos.
 */
import { useCallback, useRef, useState } from 'react';

export type AppNotificationType = 'success' | 'error';

export interface AppNotification {
    id: number;
    message: string;
    type: AppNotificationType;
}

export const NOTIFICATION_DURATION_MS = 5000;

export interface UseAppNotificationsResult {
    notifications: AppNotification[];
    showNotification: (message: string, type?: AppNotificationType) => void;
    dismissNotification: (id: number) => void;
}

export const useAppNotifications = (): UseAppNotificationsResult => {
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const nextIdRef = useRef(0);

    const dismissNotification = useCallback((id: number) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    const showNotification = useCallback(
        (message: string, type: AppNotificationType = 'success') => {
            const id = nextIdRef.current++;
            setNotifications(prev => [...prev, { id, message, type }]);
            setTimeout(() => dismissNotification(id), NOTIFICATION_DURATION_MS);
        },
        [dismissNotification],
    );

    return { notifications, showNotification, dismissNotification };
};
