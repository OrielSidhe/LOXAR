/**
 * appTabs.test.ts — tipo único de tabs de primer nivel.
 *
 * El type guard es la frontera que sustituyó a los casts `as any` de `App.tsx`:
 * debe aceptar exactamente los 8 tabs y rechazar cualquier otro `string`.
 */
import { describe, it, expect } from 'vitest';
import { APP_TAB_IDS, isAppTabId } from '../appTabs';

describe('appTabs', () => {
  it('declara los 8 tabs de primer nivel', () => {
    expect(APP_TAB_IDS).toHaveLength(8);
    expect(APP_TAB_IDS).toEqual([
      'dashboard',
      'table',
      'workbench',
      'collections',
      'writing',
      'grammar',
      'translator',
      'tools',
    ]);
  });

  it('acepta cada tab válido', () => {
    for (const tab of APP_TAB_IDS) {
      expect(isAppTabId(tab), tab).toBe(true);
    }
  });

  it('rechaza ids que no son tabs (antes se castiaban a any)', () => {
    const invalid = [
      '',
      'wordtypes',
      'roots',
      'entries',
      'import',
      'phonology',
      'overview',
      'dashboard ',
      'DASHBOARD',
      'table2',
      'collections ',
    ];
    for (const value of invalid) {
      expect(isAppTabId(value), JSON.stringify(value)).toBe(false);
    }
  });
});
