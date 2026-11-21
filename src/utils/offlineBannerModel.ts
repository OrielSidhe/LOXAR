/**
 * offlineBannerModel — decision pura del banner "Grammar engine running offline".
 *
 * El banner solo debe aparecer cuando NO hay IA disponible y el motor de gramatica
 * local falla la validacion de arranque. Con `grammarOk === null` (aun no
 * validado) el banner tambien se muestra: antes de la primera comprobacion no
 * hay nada que sostenga la inferencia local.
 *
 * La decision es pura para poder testearla sin React ni bridge de Tauri.
 */

export interface OfflineBannerStatusInput {
  /** `false` cuando no hay proveedor de IA configurado o el puente falla. */
  aiAvailable: boolean;
  /** `true`/`false` tras `validateGrammarEngine`; `null` si aun no se valido. */
  grammarOk: boolean | null;
}

export function shouldShowOfflineBanner(input: OfflineBannerStatusInput): boolean {
  return !input.aiAvailable && !input.grammarOk;
}
