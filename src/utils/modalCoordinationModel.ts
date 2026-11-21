/**
 * modalCoordinationModel — logica pura de la coordinacion de modales de `App.tsx`.
 *
 * `App.tsx` mantenia dos estados sueltos (`activeModal` y `showSettings`) y resolvía
 * las transiciones con flechas inline (`() => setActiveModal('functions')`,
 * `() => { setShowSettings(false); handleOpenModal('ai_settings'); }`). Este modelo
 * concentra el estado y las transiciones en un reducer, de modo que:
 *  - la union de modales sigue saliendo de `AppModalId` (`wizardActionsModel`), la
 *    unica fuente de verdad;
 *  - "Configurar IA" desde el modal de ajustes conserva el contrato original:
 *    cierra ajustes Y abre el modal de IA en la misma transicion;
 *  - cada apertura concreta (`functions`, `hyphens`, `profile`, `compare`,
 *    `restore`, `about`) es una accion memoizada del hook, sin flechas inline.
 */

import type { AppModalId } from './wizardActionsModel';

export interface ModalCoordinationState {
  activeModal: AppModalId;
  showSettings: boolean;
}

export const DEFAULT_MODAL_COORDINATION: ModalCoordinationState = {
  activeModal: 'none',
  showSettings: false,
};

export type ModalCoordinationEvent =
  | { type: 'openModal'; modal: AppModalId }
  | { type: 'closeModal' }
  | { type: 'openSettings' }
  | { type: 'closeSettings' }
  | { type: 'openAiSettingsFromSettings' };

/**
 * Reducer puro: no muta el estado recibido y conserva la otra mitad del estado
 * (abrir un modal no toca `showSettings`; abrir ajustes no toca `activeModal`).
 */
export function reduceModalCoordination(
  state: ModalCoordinationState,
  event: ModalCoordinationEvent,
): ModalCoordinationState {
  switch (event.type) {
    case 'openModal':
      return { ...state, activeModal: event.modal };
    case 'closeModal':
      return { ...state, activeModal: 'none' };
    case 'openSettings':
      return { ...state, showSettings: true };
    case 'closeSettings':
      return { ...state, showSettings: false };
    case 'openAiSettingsFromSettings':
      return { ...state, showSettings: false, activeModal: 'ai_settings' };
  }
}
