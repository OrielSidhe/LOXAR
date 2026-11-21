/**
 * useOfflineBannerStatus — estado del banner "Grammar engine running offline".
 *
 * Restaura el cableado perdido en el revert de P1-2f (`7767f8b`): el efecto de
 * arranque que validaba el motor de gramatica (`validateGrammarEngine`) y
 * consultaba la disponibilidad de IA (`isAiAvailable`) desaparecio, asi que
 * `showOfflineBanner` quedaba siempre en `false` y el banner nunca se mostraba.
 *
 * La decision es pura (`shouldShowOfflineBanner`); este hook solo corre los dos
 * chequeos una vez al montar, con guard de desmontaje, y degrada a `false` si
 * alguna comprobacion lanza.
 */

import { useEffect, useState } from 'react';
import { isAiAvailable } from '../services/geminiService';
import { validateGrammarEngine } from '../validation/runtimeValidation';
import { shouldShowOfflineBanner } from '../utils/offlineBannerModel';

export interface UseOfflineBannerStatusResult {
  /** `true` cuando no hay IA y el motor local no pasa la validacion. */
  showOfflineBanner: boolean;
}

export function useOfflineBannerStatus(): UseOfflineBannerStatusResult {
  const [showOfflineBanner, setShowOfflineBanner] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const evaluate = async (): Promise<void> => {
      const grammarOk = validateGrammarEngine();
      const aiAvailable = await isAiAvailable();
      if (cancelled) return;
      setShowOfflineBanner(shouldShowOfflineBanner({ aiAvailable, grammarOk }));
    };

    evaluate().catch(e => {
      if (cancelled) return;
      console.error('[App] No se pudo evaluar el estado del motor de gramatica.', e);
      setShowOfflineBanner(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return { showOfflineBanner };
}
