/**
 * tabNavigationModel.test.ts — transiciones puras del historial de tabs.
 *
 * Cubre los contratos que el `App.tsx` original resolvía con flechas inline:
 * no duplicar el tab activo, no vaciar el historial al volver atras y reiniciar
 * a `dashboard` sin mutar el array de entrada.
 */
import { describe, it, expect } from 'vitest';
import {
  DEFAULT_TAB,
  QUICK_NAV_TARGETS,
  isAtHome,
  isQuickNavTarget,
  popTab,
  pushTab,
  resetTabHistory,
  resolveActiveTab,
  type TabHistory,
} from '../tabNavigationModel';

describe('resolveActiveTab', () => {
  it('devuelve el ultimo tab del historial', () => {
    expect(resolveActiveTab(['dashboard', 'table', 'grammar'])).toBe('grammar');
  });

  it('cae a dashboard con historial vacio o de un solo dashboard', () => {
    expect(resolveActiveTab([])).toBe(DEFAULT_TAB);
    expect(resolveActiveTab(['dashboard'])).toBe(DEFAULT_TAB);
  });
});

describe('pushTab', () => {
  it('apila un tab distinto al activo', () => {
    expect(pushTab(['dashboard'], 'table')).toEqual(['dashboard', 'table']);
    expect(pushTab(['dashboard', 'table'], 'grammar')).toEqual(['dashboard', 'table', 'grammar']);
  });

  it('no duplica el tab activo y devuelve el mismo array (sin re-render)', () => {
    const history: TabHistory = ['dashboard', 'table'];
    const next = pushTab(history, 'table');
    expect(next).toBe(history);
    expect(next).toEqual(['dashboard', 'table']);
  });

  it('no muta el historial de entrada', () => {
    const history: TabHistory = ['dashboard'];
    pushTab(history, 'writing');
    expect(history).toEqual(['dashboard']);
  });
});

describe('popTab', () => {
  it('desapila el ultimo tab', () => {
    expect(popTab(['dashboard', 'table', 'workbench'])).toEqual(['dashboard', 'table']);
  });

  it('nunca deja el historial vacio', () => {
    const history: TabHistory = ['dashboard'];
    expect(popTab(history)).toBe(history);
    expect(popTab(['table'])).toEqual(['table']);
  });
});

describe('resetTabHistory', () => {
  it('vuelve a dashboard y devuelve un array nuevo', () => {
    expect(resetTabHistory()).toEqual(['dashboard']);
    expect(resetTabHistory()).not.toBe(resetTabHistory());
  });
});

describe('isAtHome', () => {
  it('solo es true con el estado inicial', () => {
    expect(isAtHome(['dashboard'])).toBe(true);
    expect(isAtHome(['dashboard', 'dashboard'])).toBe(false);
    expect(isAtHome(['table'])).toBe(false);
    expect(isAtHome([])).toBe(false);
  });
});

describe('isQuickNavTarget', () => {
  it('acepta solo los destinos del salto rapido', () => {
    expect(QUICK_NAV_TARGETS).toEqual(['table', 'workbench']);
    for (const target of QUICK_NAV_TARGETS) {
      expect(isQuickNavTarget(target)).toBe(true);
    }
    for (const value of ['grammar', 'writing', '', 'TABLE']) {
      expect(isQuickNavTarget(value), JSON.stringify(value)).toBe(false);
    }
  });
});
