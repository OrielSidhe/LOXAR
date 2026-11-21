/**
 * GrammarOverview.test.tsx — FASE FLU (gauntlet v3.14).
 *
 * El manifiesto "first run" (sin fonología, paradigmas ni tipología) debe
 * mostrar un banner NO bloqueante que indique que la fonología/morfología se
 * extraen del léxico, y el asistente de gramática queda como acción opcional.
 * Entorno: jsdom montado a mano (mismo patrón que grammarPhonologyPanel).
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { JSDOM } from 'jsdom';
import GrammarOverview, { type GrammarOverviewProps } from '../GrammarOverview';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'http://localhost' });
globalThis.document = dom.window.document;
globalThis.window = dom.window as unknown as Window;

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const mounts: Array<{ root: ReturnType<typeof createRoot>; container: HTMLDivElement }> = [];

const baseMetrics: GrammarOverviewProps['metrics'] = [
  { category: 'Fonología', completed: 0, total: 1, items: ['Inventario definido'] },
  { category: 'Tipología', completed: 0, total: 4, items: [] },
];

function baseProps(over: Partial<GrammarOverviewProps> = {}): GrammarOverviewProps {
  return {
    overallProgress: 0,
    metrics: baseMetrics,
    rolesCount: 0,
    strategiesCount: 0,
    ...over,
  };
}

async function renderOverview(props: GrammarOverviewProps): Promise<HTMLDivElement> {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  mounts.push({ root, container });
  await act(async () => {
    root.render(<GrammarOverview {...props} />);
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

describe('GrammarOverview — FASE FLU', () => {
  it('muestra el banner de primer arranque cuando el manifiesto es "first run"', async () => {
    const container = await renderOverview(baseProps({ isFirstRun: true }));

    const banner = container.querySelector('[data-testid="grammar-first-run-banner"]');
    expect(banner).not.toBeNull();
    expect(banner!.textContent).toContain('Empieza por el léxico');
    expect(banner!.textContent).toContain('se extraen del léxico');
  });

  it('el banner abre el asistente de gramática solo al pulsar el botón', async () => {
    const onOpenWizard = vi.fn();
    const container = await renderOverview(baseProps({ isFirstRun: true, onOpenWizard }));

    const button = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === 'Abrir asistente de gramática',
    ) as HTMLButtonElement | undefined;
    expect(button).toBeDefined();

    await act(async () => {
      button!.click();
      await flush();
    });

    expect(onOpenWizard).toHaveBeenCalledTimes(1);
  });

  it('no muestra el banner cuando el manifiesto ya tiene datos', async () => {
    const container = await renderOverview(baseProps({ isFirstRun: false }));
    expect(container.querySelector('[data-testid="grammar-first-run-banner"]')).toBeNull();
  });

  it('no muestra el banner por defecto (prop opcional)', async () => {
    const container = await renderOverview(baseProps());
    expect(container.querySelector('[data-testid="grammar-first-run-banner"]')).toBeNull();
  });
});
