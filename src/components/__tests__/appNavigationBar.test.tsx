/**
 * AppNavigationBar.test.tsx — P1: barra de navegacion del area principal.
 *
 * Verifica que:
 *  - Renderiza los botones "Volver" y "Panel".
 *  - "Volver" invoca onBack y "Panel" invoca onHome.
 *
 * Environment: jsdom (jsdom es dependencia de desarrollo; no requiere RTL).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { JSDOM } from 'jsdom';
import AppNavigationBar from '../AppNavigationBar';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'http://localhost' });
globalThis.document = dom.window.document;
globalThis.window = dom.window as unknown as Window;

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

let containers: HTMLDivElement[] = [];
let roots: Root[] = [];

const mount = async (onBack: () => void, onHome: () => void, activeTab?: string, onQuickNav?: (target: 'table' | 'workbench') => void): Promise<HTMLDivElement> => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  containers.push(container);
  roots.push(root);
  await act(async () => {
    root.render(<AppNavigationBar onBack={onBack} onHome={onHome} activeTab={activeTab} onQuickNav={onQuickNav} />);
    await flush();
  });
  return container;
};

const click = async (button: Element) => {
  await act(async () => {
    button.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    await flush();
  });
};

afterEach(() => {
  while (roots.length > 0) {
    const root = roots.pop();
    if (root) act(() => root.unmount());
  }
  while (containers.length > 0) {
    const container = containers.pop();
    if (container && container.parentNode) container.parentNode.removeChild(container);
  }
});

describe('AppNavigationBar (P1)', () => {
  it('renderiza los botones Volver y Panel', async () => {
    const container = await mount(() => {}, () => {});
    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBe(2);
    expect(buttons[0].textContent).toContain('Volver');
    expect(buttons[1].textContent).toContain('Panel');
  });

  it('invoca onBack al pulsar Volver', async () => {
    let backCalls = 0;
    let homeCalls = 0;
    const container = await mount(
      () => { backCalls += 1; },
      () => { homeCalls += 1; },
    );
    const backButton = container.querySelectorAll('button')[0];
    await act(async () => {
      backButton.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
      await flush();
    });
    expect(backCalls).toBe(1);
    expect(homeCalls).toBe(0);
  });

  it('invoca onHome al pulsar Panel', async () => {
    let backCalls = 0;
    let homeCalls = 0;
    const container = await mount(
      () => { backCalls += 1; },
      () => { homeCalls += 1; },
    );
    const homeButton = container.querySelectorAll('button')[1];
    await act(async () => {
      homeButton.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
      await flush();
    });
    expect(homeCalls).toBe(1);
    expect(backCalls).toBe(0);
  });
});

describe('AppNavigationBar — salto rapido FASE NAV (v3.14)', () => {
  it('en Workbench muestra "Ir al Léxico" y navega a table', async () => {
    let target: string | null = null;
    const container = await mount(
      () => {},
      () => {},
      'workbench',
      t => { target = t; },
    );
    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBe(3);
    expect(buttons[2].textContent).toContain('Ir al Léxico');
    await click(buttons[2]);
    expect(target).toBe('table');
  });

  it('en Léxico muestra "Ir al Workbench" y navega a workbench', async () => {
    let target: string | null = null;
    const container = await mount(
      () => {},
      () => {},
      'table',
      t => { target = t; },
    );
    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBe(3);
    expect(buttons[2].textContent).toContain('Ir al Workbench');
    await click(buttons[2]);
    expect(target).toBe('workbench');
  });

  it('en otros tabs no muestra el salto rapido', async () => {
    const container = await mount(() => {}, () => {}, 'grammar', () => {});
    expect(container.querySelectorAll('button').length).toBe(2);
  });
});
