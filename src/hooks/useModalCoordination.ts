/**
 * useModalCoordination — estado y acciones de modales de `App.tsx` (P1 God Component).
 *
 * Sustituye a los dos `useState` sueltos (`activeModal`, `showSettings`) y a las
 * flechas inline del JSX. Toda la decision vive en `reduceModalCoordination`
 * (`src/utils/modalCoordinationModel.ts`); este hook solo despacha y memoiza.
 *
 * Contrato preservado:
 *  - estado inicial `activeModal: 'none'` y `showSettings: false`.
 *  - `openAiSettingsFromSettings` cierra ajustes y abre el modal de IA (el handler
 *    original del `AppSettingsModalLayer` llamaba a `handleOpenModal('ai_settings')`
 *    despues de `setShowSettings(false)`).
 *  - `openModal` es el setter que consumen `useAppHandlers` y
 *    `useFirstRunWizardActions`, con el tipo `AppModalId` (sin `any`).
 */

import { useCallback, useMemo, useReducer } from 'react';
import {
  DEFAULT_MODAL_COORDINATION,
  reduceModalCoordination,
  type ModalCoordinationState,
} from '../utils/modalCoordinationModel';
import type { AppModalId } from '../utils/wizardActionsModel';

export interface UseModalCoordinationResult extends ModalCoordinationState {
  openModal: (modal: AppModalId) => void;
  closeModal: () => void;
  openSettings: () => void;
  closeSettings: () => void;
  openAiSettings: () => void;
  openAiSettingsFromSettings: () => void;
  openFunctions: () => void;
  openHyphens: () => void;
  openProfile: () => void;
  openCompare: () => void;
  openRestore: () => void;
  openAbout: () => void;
}

export function useModalCoordination(): UseModalCoordinationResult {
  const [state, dispatch] = useReducer(reduceModalCoordination, DEFAULT_MODAL_COORDINATION);

  const openModal = useCallback(
    (modal: AppModalId) => dispatch({ type: 'openModal', modal }),
    [],
  );
  const closeModal = useCallback(() => dispatch({ type: 'closeModal' }), []);
  const openSettings = useCallback(() => dispatch({ type: 'openSettings' }), []);
  const closeSettings = useCallback(() => dispatch({ type: 'closeSettings' }), []);
  const openAiSettingsFromSettings = useCallback(
    () => dispatch({ type: 'openAiSettingsFromSettings' }),
    [],
  );

  const openAiSettings = useCallback(() => openModal('ai_settings'), [openModal]);
  const openFunctions = useCallback(() => openModal('functions'), [openModal]);
  const openHyphens = useCallback(() => openModal('hyphens'), [openModal]);
  const openProfile = useCallback(() => openModal('profile'), [openModal]);
  const openCompare = useCallback(() => openModal('lexicon_compare'), [openModal]);
  const openRestore = useCallback(() => openModal('restore'), [openModal]);
  const openAbout = useCallback(() => openModal('about'), [openModal]);

  return useMemo(
    () => ({
      ...state,
      openModal,
      closeModal,
      openSettings,
      closeSettings,
      openAiSettings,
      openAiSettingsFromSettings,
      openFunctions,
      openHyphens,
      openProfile,
      openCompare,
      openRestore,
      openAbout,
    }),
    [
      state,
      openModal,
      closeModal,
      openSettings,
      closeSettings,
      openAiSettings,
      openAiSettingsFromSettings,
      openFunctions,
      openHyphens,
      openProfile,
      openCompare,
      openRestore,
      openAbout,
    ],
  );
}
