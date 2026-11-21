/**
 * useTabNavigation.test.tsx — hook de navegacion por tabs de `App.tsx`.
 *
 * Verifica el contrato preservado del `App.tsx` original:
 *  - estado inicial `dashboard` con historial de un solo elemento;
 *  - `setActiveTab` apila sin duplicar y acepta funcion sobre el tab previo;
 *  - `goBack`/`goHome` y los atajos (`openWriting`/`openGrammar`/...) resuelven
 *    el tab esperado;
 *  - `handleOpenGrammarModule` abre `grammar` y fija el sub-modulo;
 *  - las acciones quedan memoizadas.
 *
 * Environment: jsdom (no requiere RTL).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { JSDOM } from 'jsdom';
import {
  useTabNavigation,
  type UseTabNavigationResult,
} from '../useTabNavigation';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'http://localhost' });
globalThis.document = dom.window.document;
globalThis.window = dom.window as unknown as Window;

let latest: UseTabNavigationResult | null = null;

const Probe = () => {
  latest = useTabNavigation();
  return <div />;
};

const mounts: Array<{ root: Root; container: HTMLDivElement }> = [];

const renderProbe = (): void => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  mounts.push({ root, container });
  act(() => {
    root.render(<Probe />);
  });
};

afterEach(() => {
  while (mounts.length > 0) {
    const { root, container } = mounts.pop()!;
    act(() => {
      root.unmount();
    });
    if (container.parentNode) container.parentNode.removeChild(container);
  }
  latest = null;
});

describe('useTabNavigation', () => {
  it('arranca en dashboard con el sub-modulo por defecto', () => {
    renderProbe();
    expect(latest!.tabHistory).toEqual(['dashboard']);
    expect(latest!.activeTab).toBe('dashboard');
    expect(latest!.activeGrammarModule).toBe('syntax');
  });

  it('setActiveTab apila sin duplicar el tab activo', () => {
    renderProbe();
    act(() => {
      latest!.setActiveTab('table');
    });
    act(() => {
      latest!.setActiveTab('table');
    });
    expect(latest!.tabHistory).toEqual(['dashboard', 'table']);
    expect(latest!.activeTab).toBe('table');
  });

  it('setActiveTab acepta una funcion sobre el tab previo', () => {
    renderProbe();
    act(() => {
      latest!.setActiveTab('grammar');
    });
    act(() => {
      latest!.setActiveTab(prev => (prev === 'grammar' ? 'translator' : prev));
    });
    expect(latest!.activeTab).toBe('translator');
  });

  it('goBack desapila y nunca vacia el historial', () => {
    renderProbe();
    act(() => {
      latest!.setActiveTab('writing');
    });
    act(() => {
      latest!.goBack();
    });
    expect(latest!.activeTab).toBe('dashboard');
    act(() => {
      latest!.goBack();
    });
    expect(latest!.tabHistory).toEqual(['dashboard']);
  });

  it('goHome reinicia el historial', () => {
    renderProbe();
    act(() => {
      latest!.setActiveTab('table');
    });
    act(() => {
      latest!.setActiveTab('tools');
    });
    act(() => {
      latest!.goHome();
    });
    expect(latest!.tabHistory).toEqual(['dashboard']);
    expect(latest!.activeTab).toBe('dashboard');
  });

  it('los atajos resuelven su tab', () => {
    renderProbe();
    for (const [action, tab] of [
      ['openWriting', 'writing'],
      ['openGrammar', 'grammar'],
      ['openTranslator', 'translator'],
      ['openDashboard', 'dashboard'],
    ] as const) {
      act(() => {
        latest![action]();
      });
      expect(latest!.activeTab, action).toBe(tab);
    }
  });

  it('handleQuickNav salta a table/workbench', () => {
    renderProbe();
    act(() => {
      latest!.handleQuickNav('workbench');
    });
    expect(latest!.activeTab).toBe('workbench');
    act(() => {
      latest!.handleQuickNav('table');
    });
    expect(latest!.activeTab).toBe('table');
  });

  it('handleOpenGrammarModule abre grammar y fija el sub-modulo', () => {
    renderProbe();
    act(() => {
      latest!.handleOpenGrammarModule('phonology');
    });
    expect(latest!.activeTab).toBe('grammar');
    expect(latest!.activeGrammarModule).toBe('phonology');
  });

  it('setActiveGrammarModule actualiza solo el sub-modulo', () => {
    renderProbe();
    act(() => {
      latest!.setActiveGrammarModule('morphology');
    });
    expect(latest!.activeGrammarModule).toBe('morphology');
    expect(latest!.activeTab).toBe('dashboard');
  });

  it('las acciones quedan memoizadas entre renders', () => {
    renderProbe();
    const first = latest!;
    expect(latest!.setActiveTab).toBe(first.setActiveTab);
    expect(latest!.goBack).toBe(first.goBack);
    expect(latest!.goHome).toBe(first.goHome);
    expect(latest!.handleQuickNav).toBe(first.handleQuickNav);
    expect(latest!.handleOpenGrammarModule).toBe(first.handleOpenGrammarModule);
  });
});
