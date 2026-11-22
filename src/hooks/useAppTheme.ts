/**
 * useAppTheme — estado de tema de `App.tsx`.
 *
 * Sustituye al `useState<ThemeId>(getStoredTheme())` y al `useEffect` que
 * aplicaba el tema y lo persistía en `localStorage`.
 *
 * Contrato preservado del bloque original:
 *  - el tema inicial se lee de `getStoredTheme()` (default `midnight`);
 *  - cada cambio aplica `applyTheme(themes[themeId])` y `saveTheme(themeId)`;
 *  - `setThemeId` conserva la firma `Dispatch<SetStateAction<ThemeId>>` que
 *    consume `AppHeaderLayer` a través de `onThemeChange`.
 */
import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { applyTheme, getStoredTheme, saveTheme, themes, type ThemeId } from '../services/themeService';

export interface UseAppThemeResult {
    themeId: ThemeId;
    setThemeId: Dispatch<SetStateAction<ThemeId>>;
}

export const useAppTheme = (): UseAppThemeResult => {
    const [themeId, setThemeId] = useState<ThemeId>(getStoredTheme());

    useEffect(() => {
        applyTheme(themes[themeId]);
        saveTheme(themeId);
    }, [themeId]);

    return { themeId, setThemeId };
};
