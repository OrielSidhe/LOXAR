/**
 * AppModalLayer — P1 (God Component): capa de modales de `App.tsx`.
 *
 * `App.tsx` montaba inline un `Suspense` con los dos chunks lazy (`ModalManager`
 * y `AiSettingsModal`) y ~40 props cableadas a mano. Esta capa encapsula ese
 * bloque: recibe el mismo `ModalManagerProps` (exportado desde `ModalManager`)
 * más el cierre del modal de IA, y mantiene el fallback de carga intacto.
 *
 * Contrato preservado:
 *  - `ModalManager` es un chunk lazy detrás de `Suspense` (el importador pesa
 *    ~348 kB y no debe bloquear el bundle principal).
 *  - `AiSettingsModal` solo se monta cuando `activeModal === 'ai_settings'`
 *    (decision en `modalLayerModel`).
 *  - El fallback sigue siendo el overlay `z-40` con "Cargando…".
 */
import React, { Suspense, lazy } from 'react';
import type { ModalManagerProps } from './ModalManager';
import { resolveModalLayer } from '../utils/modalLayerModel';

const ModalManager = lazy(() => import('./ModalManager'));
const AiSettingsModal = lazy(() => import('./AiSettingsModal'));

export type AppModalLayerProps = ModalManagerProps & {
  /** Cierre del `AiSettingsModal`; el wizard de primer arranque lo usa para completarse. */
  onAiSettingsClose: () => void;
};

const MODAL_FALLBACK = (
  <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 text-text-secondary text-sm">
    Cargando…
  </div>
);

const AppModalLayer: React.FC<AppModalLayerProps> = ({ onAiSettingsClose, ...managerProps }) => {
  const { mountAiSettingsModal } = resolveModalLayer(managerProps.activeModal);

  return (
    <Suspense fallback={MODAL_FALLBACK}>
      <ModalManager {...managerProps} />
      {mountAiSettingsModal && <AiSettingsModal onClose={onAiSettingsClose} />}
    </Suspense>
  );
};

AppModalLayer.displayName = 'AppModalLayer';

export default AppModalLayer;
