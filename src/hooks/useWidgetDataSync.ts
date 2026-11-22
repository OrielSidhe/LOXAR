import { useEffect } from 'react';
import type { InflectionProfile, LexiconEntry, LexiconMetadata } from '../types';
import type { WidgetBridge } from './useWidgetBridge';

export interface UseWidgetDataSyncOptions {
  entries: LexiconEntry[] | null;
  inflectionProfile: InflectionProfile | null;
  metadata: LexiconMetadata | null;
  sendLexiconData: WidgetBridge['sendLexiconData'];
}

/**
 * Empuja el léxico activo al widget cuando hay datos que enviar.
 *
 * Extraído del `useEffect` inline de `App.tsx` (P1 God Component): solo envía si
 * existen entradas, perfil de inflexión y metadatos, y se re-ejecuta cuando cambia
 * cualquiera de ellos o el emisor.
 */
export function useWidgetDataSync({
  entries,
  inflectionProfile,
  metadata,
  sendLexiconData,
}: UseWidgetDataSyncOptions): void {
  useEffect(() => {
    if (entries && inflectionProfile && metadata) {
      sendLexiconData({ entries, inflectionProfile, metadata });
    }
  }, [entries, inflectionProfile, metadata, sendLexiconData]);
}
