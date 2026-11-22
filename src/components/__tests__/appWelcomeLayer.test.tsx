/**
 * AppWelcomeLayer — P1: bloque de bienvenida + wizard extraído de `App.tsx`.
 *
 * Verifica el contrato sin arrastrar los componentes hijo (splash, pantalla de
 * bienvenida, tour y wizard con diálogos de Tauri):
 *  - monta el `AppWelcomeSection` y el `FirstRunWizard` en orden;
 *  - el wizard se monta solo cuando `showWizard` es verdadero;
 *  - el botón "Siguiente" completa el asistente solo en el paso `data-folder`;
 *  - propaga los callbacks de bienvenida y del wizard.
 *
 * Environment: jsdom (se instancia a mano, igual que `appOverlayLayers.test.tsx`).
 */
import { describe, it, expect, afterEach, vi } from 'vitest';

type MockProps = Record<string, unknown>;

vi.mock('../AppWelcomeSection', () => ({
  __esModule: true,
  default: (props: MockProps) => (
    <div
      data-testid="layer-welcome"
      data-splash={String(Boolean(props.splashFinished))}
      data-show={String(Boolean(props.showWelcome))}
      data-tour={String(Boolean(props.isTourActive))}
      data-steps={String((props.tourSteps as unknown[] | undefined)?.length ?? 0)}
    />
  ),
}));

vi.mock('../FirstRunWizard', () => ({
  __esModule: true,
  default: (props: MockProps) => (
    <div
      data-testid="layer-wizard"
      data-step={String(props.step)}
      data-folder={String(props.dataFolder ?? '')}
      data-complete-is-next={String(props.onComplete === props.onNext)}
    />
  ),
}));

import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { JSDOM } from 'jsdom';
import type { ReactElement } from 'react';
import AppWelcomeLayer, { type AppWelcomeLayerProps } from '../AppWelcomeLayer';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'http://localhost' });
globalThis.document = dom.window.document;
globalThis.window = dom.window as unknown as Window;

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

const baseProps = (overrides: Partial<AppWelcomeLayerProps> = {}): AppWelcomeLayerProps => ({
  splashFinished: false,
  onSplashFinish: () => {},
  showWelcome: true,
  showWizard: false,
  onCreateLexicon: () => {},
  onContinue: () => {},
  onImport: () => {},
  onStartTour: () => {},
  isTourActive: false,
  tourSteps: [],
  onTourEnd: () => {},
  step: 'ai',
  dataFolder: null,
  onWizardNext: () => {},
  onWizardPrev: () => {},
  onWizardSkip: () => {},
  onWizardComplete: () => {},
  onConfigureAi: () => {},
  onChooseDataFolder: () => {},
  onDataFolderChange: () => {},
  ...overrides,
});

const mounts: Array<{ root: Root; container: HTMLDivElement }> = [];

const render = async (node: ReactElement): Promise<HTMLDivElement> => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  mounts.push({ root, container });
  await act(async () => {
    root.render(node);
    await flush();
  });
  return container;
};

afterEach(() => {
  while (mounts.length > 0) {
    const { root, container } = mounts.pop()!;
    act(() => {
      root.unmount();
    });
    if (container.parentNode) container.parentNode.removeChild(container);
  }
});

describe('AppWelcomeLayer (P1)', () => {
  it('monta la bienvenida y el wizard en el orden original', async () => {
    const container = await render(<AppWelcomeLayer {...baseProps({ showWizard: true })} />);
    const order = Array.from(container.querySelectorAll('[data-testid]')).map(el =>
      el.getAttribute('data-testid'),
    );
    expect(order).toEqual(['layer-welcome', 'layer-wizard']);
  });

  it('monta el wizard solo cuando showWizard es verdadero', async () => {
    const hidden = await render(<AppWelcomeLayer {...baseProps({ showWizard: false })} />);
    expect(hidden.querySelector('[data-testid="layer-wizard"]')).toBeNull();

    const shown = await render(<AppWelcomeLayer {...baseProps({ showWizard: true })} />);
    expect(shown.querySelector('[data-testid="layer-wizard"]')).not.toBeNull();
  });

  it('propaga el estado del splash, la bienvenida y el tour', async () => {
    const container = await render(
      <AppWelcomeLayer
        {...baseProps({
          splashFinished: true,
          showWelcome: true,
          isTourActive: true,
          tourSteps: [{ selector: 'main', title: 'T', content: 'C' }],
        })}
      />,
    );
    const welcome = container.querySelector('[data-testid="layer-welcome"]')!;
    expect(welcome.getAttribute('data-splash')).toBe('true');
    expect(welcome.getAttribute('data-show')).toBe('true');
    expect(welcome.getAttribute('data-tour')).toBe('true');
    expect(welcome.getAttribute('data-steps')).toBe('1');
  });

  it('propaga el paso y la carpeta del wizard', async () => {
    const container = await render(
      <AppWelcomeLayer {...baseProps({ showWizard: true, step: 'data-folder', dataFolder: '/tmp' })} />,
    );
    const wizard = container.querySelector('[data-testid="layer-wizard"]')!;
    expect(wizard.getAttribute('data-step')).toBe('data-folder');
    expect(wizard.getAttribute('data-folder')).toBe('/tmp');
  });

  it('el boton Siguiente completa el asistente solo en el paso de carpeta de datos', async () => {
    const dataFolder = await render(
      <AppWelcomeLayer {...baseProps({ showWizard: true, step: 'data-folder' })} />,
    );
    expect(
      dataFolder.querySelector('[data-testid="layer-wizard"]')!.getAttribute('data-complete-is-next'),
    ).toBe('false');

    const aiStep = await render(
      <AppWelcomeLayer {...baseProps({ showWizard: true, step: 'ai' })} />,
    );
    expect(
      aiStep.querySelector('[data-testid="layer-wizard"]')!.getAttribute('data-complete-is-next'),
    ).toBe('true');

    const completeStep = await render(
      <AppWelcomeLayer {...baseProps({ showWizard: true, step: 'complete' })} />,
    );
    expect(
      completeStep.querySelector('[data-testid="layer-wizard"]')!.getAttribute('data-complete-is-next'),
    ).toBe('true');
  });
});
