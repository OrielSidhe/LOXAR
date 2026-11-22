/**
 * welcomeLayerModel — logica pura de la capa de bienvenida de `App.tsx`.
 *
 * `App.tsx` montaba inline el `AppWelcomeSection` y el `FirstRunWizard` del
 * primer arranque. La unica decision de esa zona era que el boton "Siguiente"
 * del wizard cerrara el asistente recien en el paso de carpeta de datos; en los
 * demas pasos solo avanza. Aca queda esa decision para probarla sin React.
 */

import type { WizardStep } from '../hooks/useFirstRunWizard';

/**
 * En el paso `data-folder` el wizard ya no tiene mas pasos: "Siguiente" lo
 * completa. En `ai` y `complete` el mismo boton solo avanza de paso.
 */
export const shouldCompleteWizardStep = (step: WizardStep): boolean =>
  step === 'data-folder';
