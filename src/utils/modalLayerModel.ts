/**
 * modalLayerModel.ts — logica pura de la capa de modales (`AppModalLayer`).
 *
 * `AppModalLayer` es un envoltorio de `Suspense` sobre dos chunks lazy
 * (`ModalManager` y `AiSettingsModal`). La decision de "que se monta" vive aca,
 * para poder probarse sin React y sin el costo de los ~348 kB del importador:
 *  - `ModalManager` se monta siempre (es quien enruta `activeModal`).
 *  - `AiSettingsModal` solo cuando `activeModal === 'ai_settings'` (contrato
 *    preservado del `App.tsx` original: el wizard de primer arranque abre ese
 *    modal y se completa al cerrarse).
 */

import type { AppModalId } from './wizardActionsModel';

export interface ModalLayerDecision {
  /** Siempre true: `ModalManager` enruta todos los modales de la app. */
  mountModalManager: boolean;
  /** True solo cuando el modal de IA esta activo. */
  mountAiSettingsModal: boolean;
}

/** True cuando la capa debe montar el `AiSettingsModal` lazy. */
export const shouldMountAiSettingsModal = (activeModal: AppModalId): boolean =>
  activeModal === 'ai_settings';

/**
 * Resuelve que chunks monta la capa para un `activeModal` dado.
 * Precondicion: `activeModal` es un `AppModalId` valido (lo garantiza el tipo).
 */
export const resolveModalLayer = (activeModal: AppModalId): ModalLayerDecision => ({
  mountModalManager: true,
  mountAiSettingsModal: shouldMountAiSettingsModal(activeModal),
});
