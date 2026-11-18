/**
 * AppProjectBootstrapLayer.test.tsx — B0: capa de bootstrap de proyecto.
 *
 * Verifica la puerta de arranque (`isAppLoaded`) y las tres ramas de la capa:
 *  - null mientras la app no terminó el primer load (antes siempre era null:
 *    ningún setter de `isAppLoaded` se invocaba).
 *  - modal de selección de ubicación cuando `showProjectBootstrap`.
 *  - banner de "elegir ubicación" cuando no hay proyecto y el usuario ya descartó.
 *  - null cuando hay proyecto configurado.
 *
 * Environment: jsdom (jsdom es dependencia de desarrollo; no requiere RTL).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import AppProjectBootstrapLayer, { type AppProjectBootstrapLayerProps } from '../AppProjectBootstrapLayer';

// ── jsdom bootstrap for react-dom tests ─────────────────────────────────────
import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'http://localhost' });
globalThis.document = dom.window.document;
globalThis.window = dom.window as unknown as Window;

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

const baseProps = (overrides: Partial<AppProjectBootstrapLayerProps> = {}): AppProjectBootstrapLayerProps => ({
  isAppLoaded: true,
  showProjectBootstrap: false,
  bootstrapDismissed: false,
  projectPath: null,
  availableProjects: [],
  hasLocalData: false,
  onCreate: () => {},
  onOpenOther: () => {},
  onOpenFound: () => {},
  onImportLocal: () => {},
  onDismiss: () => {},
  onChooseLocation: () => {},
  ...overrides,
});

const mounts: Array<{ root: ReturnType<typeof createRoot>; container: HTMLDivElement }> = [];

async function renderLayer(props: AppProjectBootstrapLayerProps): Promise<HTMLDivElement> {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  mounts.push({ root, container });
  await act(async () => {
    root.render(<AppProjectBootstrapLayer {...props} />);
    await flush();
  });
  return container;
}

afterEach(() => {
  while (mounts.length > 0) {
    const { root, container } = mounts.pop()!;
    act(() => {
      root.unmount();
    });
    if (container.parentNode) container.parentNode.removeChild(container);
  }
});

describe('AppProjectBootstrapLayer (B0)', () => {
  it('retorna null mientras la app no terminó el primer load', async () => {
    const container = await renderLayer(baseProps({ isAppLoaded: false, showProjectBootstrap: true }));
    expect(container.textContent ?? '').toBe('');
    expect(container.querySelector('button')).toBeNull();
  });

  it('muestra el modal de ubicación cuando showProjectBootstrap es true', async () => {
    const container = await renderLayer(baseProps({ showProjectBootstrap: true }));
    expect(container.textContent).toContain('¿Dónde querés guardar tu proyecto LOXAR?');
    expect(container.textContent).toContain('Crear proyecto nuevo');
    expect(container.textContent).toContain('Abrir otro archivo .loxar');
  });

  it('lista proyectos encontrados y ofrece importar datos locales', async () => {
    const container = await renderLayer(
      baseProps({
        showProjectBootstrap: true,
        hasLocalData: true,
        availableProjects: ['C:/Users/test/Documents/mi.loxar'],
      }),
    );
    expect(container.textContent).toContain('Proyectos encontrados en este equipo');
    expect(container.textContent).toContain('mi.loxar');
    expect(container.textContent).toContain('Importar mis datos locales existentes a un proyecto nuevo');
  });

  it('muestra el banner cuando no hay proyecto y el usuario ya descartó', async () => {
    const container = await renderLayer(
      baseProps({ projectPath: null, bootstrapDismissed: true, showProjectBootstrap: false }),
    );
    expect(container.querySelector('button')).not.toBeNull();
    expect(container.textContent ?? '').not.toContain('¿Dónde querés guardar tu proyecto LOXAR?');
  });

  it('no muestra nada cuando hay proyecto configurado', async () => {
    const container = await renderLayer(
      baseProps({ projectPath: 'C:/Users/test/Documents/loxar.loxar', bootstrapDismissed: true }),
    );
    expect(container.textContent ?? '').toBe('');
  });
});
