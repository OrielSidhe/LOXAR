/**
 * useModalCoordination.test.tsx — hook de coordinacion de modales de `App.tsx`.
 *
 * Verifica el contrato preservado del `App.tsx` original:
 *  - estado inicial `activeModal: 'none'` / `showSettings: false`;
 *  - `openAiSettingsFromSettings` cierra ajustes y abre el modal de IA;
 *  - las acciones concretas resuelven su modal y quedan memoizadas.
 *
 * Environment: jsdom (jsdom es dependencia de desarrollo; no requiere RTL).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { JSDOM } from 'jsdom';
import {
  useModalCoordination,
  type UseModalCoordinationResult,
} from '../useModalCoordination';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'http://localhost' });
globalThis.document = dom.window.document;
globalThis.window = dom.window as unknown as Window;

let latest: UseModalCoordinationResult | null = null;

const Probe = () => {
  latest = useModalCoordination();
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

describe('useModalCoordination', () => {
  it('arranca con modal none y ajustes cerrados', () => {
    renderProbe();
    expect(latest!.activeModal).toBe('none');
    expect(latest!.showSettings).toBe(false);
  });

  it('openSettings y openFunctions actualizan el estado y memorizan las acciones', () => {
    renderProbe();
    const first = latest!;
    act(() => {
      first.openSettings();
    });
    expect(latest!.showSettings).toBe(true);
    const afterSettings = latest!;
    act(() => {
      afterSettings.openFunctions();
    });
    expect(latest!.activeModal).toBe('functions');
    expect(latest!.showSettings).toBe(true);
    expect(latest!.openSettings).toBe(afterSettings.openSettings);
    expect(latest!.openFunctions).toBe(afterSettings.openFunctions);
  });

  it('openAiSettingsFromSettings cierra ajustes y abre el modal de IA', () => {
    renderProbe();
    act(() => {
      latest!.openSettings();
    });
    act(() => {
      latest!.openAiSettingsFromSettings();
    });
    expect(latest!.showSettings).toBe(false);
    expect(latest!.activeModal).toBe('ai_settings');
  });

  it('closeModal y closeSettings vuelven al estado inicial', () => {
    renderProbe();
    act(() => {
      latest!.openSettings();
    });
    act(() => {
      latest!.openCompare();
    });
    act(() => {
      latest!.closeModal();
    });
    act(() => {
      latest!.closeSettings();
    });
    expect(latest!.activeModal).toBe('none');
    expect(latest!.showSettings).toBe(false);
  });

  it('las acciones concretas resuelven su modal', () => {
    renderProbe();
    act(() => {
      latest!.openRestore();
    });
    expect(latest!.activeModal).toBe('restore');
    act(() => {
      latest!.openAbout();
    });
    expect(latest!.activeModal).toBe('about');
    act(() => {
      latest!.openHyphens();
    });
    expect(latest!.activeModal).toBe('hyphens');
    act(() => {
      latest!.openProfile();
    });
    expect(latest!.activeModal).toBe('profile');
    act(() => {
      latest!.openAiSettings();
    });
    expect(latest!.activeModal).toBe('ai_settings');
  });
});
