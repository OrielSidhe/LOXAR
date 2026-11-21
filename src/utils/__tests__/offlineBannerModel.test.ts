/**
 * offlineBannerModel.test.ts — decision pura del banner offline.
 *
 * Contrato restaurado del efecto de arranque previo al revert `7767f8b`:
 * el banner se muestra solo cuando no hay IA y el motor local no valida.
 */
import { describe, it, expect } from 'vitest';
import { shouldShowOfflineBanner } from '../offlineBannerModel';

describe('shouldShowOfflineBanner', () => {
  it('se muestra sin IA y con el motor local fallando', () => {
    expect(shouldShowOfflineBanner({ aiAvailable: false, grammarOk: false })).toBe(true);
  });

  it('no se muestra si hay IA disponible', () => {
    expect(shouldShowOfflineBanner({ aiAvailable: true, grammarOk: false })).toBe(false);
  });

  it('no se muestra si el motor local valida', () => {
    expect(shouldShowOfflineBanner({ aiAvailable: false, grammarOk: true })).toBe(false);
  });

  it('se muestra cuando la validacion aun no resolvio (null)', () => {
    expect(shouldShowOfflineBanner({ aiAvailable: false, grammarOk: null })).toBe(true);
  });

  it('no se muestra con IA disponible y validacion pendiente', () => {
    expect(shouldShowOfflineBanner({ aiAvailable: true, grammarOk: null })).toBe(false);
  });
});
