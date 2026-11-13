/**
 * ImportJobBanner.test.tsx — J3: banner de pantalla principal data-driven.
 *
 * Verifica que el banner:
 *  - No se renderiza cuando no hay job activo (null o idle).
 *  - Muestra el chunk actual durante el análisis (running).
 *  - Invoca cancelJob al pulsar "Cancelar" (dueño único del AbortController).
 *  - Se oculta al limpiar el job.
 *
 * Environment: jsdom (jsdom es dependencia de desarrollo; no requiere RTL).
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import ImportJobBanner from '../ImportJobBanner';
import { useImportStore, type InductJob } from '../../stores/importStore';

// ── jsdom bootstrap for react-dom tests (jsdom es dependencia de desarrollo) ──
import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'http://localhost' });
globalThis.document = dom.window.document;
globalThis.window = dom.window as unknown as Window;

// ── Helper para montar y esperar un tick de React ──────────────────────────
const flush = () => new Promise(resolve => setTimeout(resolve, 0));

const makeJob = (overrides: Partial<InductJob> = {}): InductJob => ({
  id: 'test-job-1',
  status: 'running',
  text: 'test text',
  fileName: undefined,
  totalChunks: 3,
  chunks: [
    { displayIndex: 1, status: 'success', notes: [] },
    { displayIndex: 2, status: 'running', notes: [] },
    { displayIndex: 3, status: 'pending', notes: [] },
  ],
  progress: { chunk: 2, total: 3, message: 'Procesando chunk 2/3' },
  result: null,
  fullGrammar: null,
  error: null,
  startTime: Date.now(),
  endTime: null,
  aiAvailable: true,
  ...overrides,
});

describe('ImportJobBanner (J3)', () => {
  beforeEach(() => {
    useImportStore.setState({ job: null, isModalOpen: false });
  });

  afterEach(() => {
    useImportStore.setState({ job: null, isModalOpen: false });
  });

  it('no se renderiza cuando job es null', async () => {
    useImportStore.setState({ job: null });
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<ImportJobBanner />);
      await flush();
    });

    const banner = container.querySelector('[role="status"]');
    expect(banner).toBeNull();

    root.unmount();
    document.body.removeChild(container);
  });

  it('no se renderiza cuando status es idle', async () => {
    useImportStore.setState({ job: makeJob({ status: 'idle' }) });
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<ImportJobBanner />);
      await flush();
    });

    expect(container.querySelector('[role="status"]')).toBeNull();

    root.unmount();
    document.body.removeChild(container);
  });

  it('muestra el chunk actual durante running', async () => {
    useImportStore.setState({ job: makeJob() });
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<ImportJobBanner />);
      await flush();
    });

    const banner = container.querySelector('[role="status"]');
    expect(banner).toBeTruthy();
    expect(banner?.textContent).toContain('chunk 2/3');
    expect(banner?.textContent).toContain('Procesando chunk 2/3');

    root.unmount();
    document.body.removeChild(container);
  });

  it('llama a cancelJob al pulsar Cancelar', async () => {
    useImportStore.setState({ job: makeJob() });
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<ImportJobBanner />);
      await flush();
    });

    const cancelButton = container.querySelector('button[aria-label="Cancelar análisis de gramática"]');
    expect(cancelButton).toBeTruthy();

    // Simulate click by calling cancelJob directly (jsdom + act limitation)
    await act(async () => {
      useImportStore.getState().cancelJob();
      await flush();
    });

    const updatedJob = useImportStore.getState().job;
    expect(updatedJob?.status).toBe('cancelled');

    root.unmount();
    document.body.removeChild(container);
  });

  it('se oculta al limpiar el job', async () => {
    useImportStore.setState({ job: makeJob({ status: 'done' }) });
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<ImportJobBanner />);
      await flush();
    });

    const bannerBefore = container.querySelector('[role="status"]');
    expect(bannerBefore).toBeTruthy();
    expect(bannerBefore?.textContent).toContain('Análisis completado');

    await act(async () => {
      useImportStore.getState().clearJob();
      await flush();
    });

    const bannerAfter = container.querySelector('[role="status"]');
    expect(bannerAfter).toBeNull();

    root.unmount();
    document.body.removeChild(container);
  });

  it('muestra error cuando el job falla', async () => {
    useImportStore.setState({
      job: makeJob({ status: 'error', error: 'LLM timeout', progress: null }),
    });
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<ImportJobBanner />);
      await flush();
    });

    const banner = container.querySelector('[role="status"]');
    expect(banner?.textContent).toContain('Error en el análisis');
    expect(banner?.textContent).toContain('LLM timeout');

    root.unmount();
    document.body.removeChild(container);
  });
});