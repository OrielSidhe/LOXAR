/**
 * AppOverlayLayers / AppFloatingLayers — P1: capas superpuestas extraídas de `App.tsx`.
 *
 * Verifica el contrato de las dos capas sin arrastrar los componentes hijo
 * (pesados, con chunks lazy y stores propios):
 *  - `AppOverlayLayers` monta las seis capas en orden y propaga el estado de
 *    carga, el banner offline, los props del `ModalManager` y los de ajustes;
 *  - `AppFloatingLayers` monta la toolbar de lote solo con `table` + selección,
 *    la capa de bootstrap solo fuera de bienvenida/wizard, y propaga toasts y
 *    callbacks del widget.
 *
 * Environment: jsdom (se instancia a mano, igual que `appTabContent.test.tsx`).
 */
import { describe, it, expect, afterEach, vi } from 'vitest';

type MockProps = Record<string, unknown>;

vi.mock('../AppAmbientLightsLayer', () => ({
  __esModule: true,
  default: () => <div data-testid="layer-ambient" />,
}));

vi.mock('../AppLoadingLayer', () => ({
  __esModule: true,
  default: (props: MockProps) => (
    <div
      data-testid="layer-loading"
      data-loading={String(Boolean(props.isLoading))}
      data-message={String(props.loadingMessage ?? '')}
    />
  ),
}));

vi.mock('../AppOfflineBannerLayer', () => ({
  __esModule: true,
  default: (props: MockProps) => (
    <div data-testid="layer-offline" data-show={String(Boolean(props.showOfflineBanner))} />
  ),
}));

vi.mock('../ImportJobBanner', () => ({
  __esModule: true,
  default: () => <div data-testid="layer-import-job" />,
}));

vi.mock('../AppModalLayer', () => ({
  __esModule: true,
  default: (props: MockProps) => (
    <div
      data-testid="layer-modal"
      data-active-modal={String(props.activeModal)}
      data-has-ai-close={String(Boolean(props.onAiSettingsClose))}
      data-has-import-handlers={String(Boolean(props.importHandlers))}
    />
  ),
}));

vi.mock('../AppSettingsModalLayer', () => ({
  __esModule: true,
  default: (props: MockProps) => (
    <div
      data-testid="layer-settings"
      data-show={String(Boolean(props.showSettings))}
      data-formats={String((props.exportFormats as string[] | undefined)?.length ?? 0)}
    />
  ),
}));

vi.mock('../AppBatchToolbar', () => ({
  __esModule: true,
  default: (props: MockProps) => (
    <div data-testid="float-batch" data-count={String(props.selectedCount)} />
  ),
}));

vi.mock('../AppToastLayer', () => ({
  __esModule: true,
  default: (props: MockProps) => (
    <div
      data-testid="float-toast"
      data-count={String((props.notifications as unknown[] | undefined)?.length ?? 0)}
    />
  ),
}));

vi.mock('../FloatingWidget', () => ({
  FloatingWidget: (props: MockProps) => (
    <div
      data-testid="float-widget"
      data-has-add-word={String(Boolean(props.onAddWord))}
      data-has-search={String(Boolean(props.onSearch))}
      data-has-toggle={String(Boolean(props.onToggleCapture))}
    />
  ),
}));

vi.mock('../AppProjectBootstrapLayer', () => ({
  __esModule: true,
  default: (props: MockProps) => (
    <div
      data-testid="float-bootstrap"
      data-show={String(Boolean(props.showProjectBootstrap))}
      data-path={String(props.projectPath ?? '')}
    />
  ),
}));

import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { JSDOM } from 'jsdom';
import type { ReactElement } from 'react';
import type { GenerativeProfile } from '../../types';
import AppOverlayLayers, { type AppOverlayLayersProps } from '../AppOverlayLayers';
import AppFloatingLayers, { type AppFloatingLayersProps } from '../AppFloatingLayers';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'http://localhost' });
globalThis.document = dom.window.document;
globalThis.window = dom.window as unknown as Window;

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

const EMPTY_PROFILE: GenerativeProfile = {
  consonants: [],
  vowels: [],
  syllableStructures: [],
  consonantClusters: [],
  vowelClusters: [],
  sampleText: '',
  grammarNotes: '',
  derivationalAffixes: [],
};

const baseOverlayProps = (
  overrides: Partial<AppOverlayLayersProps> = {},
): AppOverlayLayersProps => ({
  isLoading: false,
  loadingMessage: '',
  showOfflineBanner: false,
  activeModal: 'none',
  entryToEditInModal: null,
  entryToInflect: null,
  importState: { step: 'idle' },
  activeLexicon: [],
  activeLexiconName: 'Test',
  lexiconNames: ['Test'],
  activeProfile: EMPTY_PROFILE,
  activeMetadata: null,
  activeCustomFunctions: [],
  activeInflectionProfile: { paradigms: [] },
  backups: [],
  appVersion: 'test',
  completionStats: { total: 0, needsFunction: 0, totalIncomplete: 0 },
  onClose: () => {},
  onCloseEditModal: () => {},
  onRestoreBackup: () => {},
  onAiCompleteFunctions: async () => {},
  onAiFillMissing: async () => {},
  onAnalyzeForSuggestions: () => {},
  onManageFunctions: () => {},
  onManageHyphens: () => {},
  onUpdateGenerativeProfile: () => {},
  onGenerateLanguageSample: async () => [],
  onAddWord: () => {},
  onEditWord: () => {},
  onConfirmCreateLexicon: () => {},
  onAddCustomFunction: () => {},
  onOpenFunctions: () => {},
  onOpenHyphens: () => {},
  onOpenProfile: () => {},
  onOpenNeography: () => {},
  onOpenInflection: () => {},
  onOpenCompare: () => {},
  onLoadLexiconEntries: async () => null,
  onMergeLexiconEntries: () => {},
  importHandlers: {
    cancelImport: () => {},
    setImportMapping: () => {},
    resolveConflict: () => {},
    proceedWithValidEntries: () => {},
    resanitizeAndContinue: async () => null,
    applyCharacterRepair: async () => {},
  },
  showNotification: () => {},
  onAiSettingsClose: () => {},
  showSettings: false,
  onCloseSettings: () => {},
  onOpenAiSettings: () => {},
  exportFormats: ['json'],
  onExportFormatsChange: () => {},
  ...overrides,
});

const baseFloatingProps = (
  overrides: Partial<AppFloatingLayersProps> = {},
): AppFloatingLayersProps => ({
  activeTab: 'table',
  selectedIds: new Set<string>(),
  customFunctions: [],
  onClearSelection: () => {},
  onBatchDelete: () => {},
  onBatchChangeFunction: () => {},
  notifications: [],
  onDismissNotification: () => {},
  onWidgetAddWord: () => {},
  onWidgetSearch: () => {},
  onWidgetToggleCapture: () => {},
  showWelcome: false,
  showWizard: false,
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

describe('AppOverlayLayers (P1)', () => {
  it('monta las seis capas en el orden original', async () => {
    const container = await render(<AppOverlayLayers {...baseOverlayProps()} />);
    const order = Array.from(container.querySelectorAll('[data-testid]')).map(el =>
      el.getAttribute('data-testid'),
    );
    expect(order).toEqual([
      'layer-ambient',
      'layer-loading',
      'layer-offline',
      'layer-import-job',
      'layer-modal',
      'layer-settings',
    ]);
  });

  it('propaga el estado de carga y el banner offline', async () => {
    const container = await render(
      <AppOverlayLayers
        {...baseOverlayProps({
          isLoading: true,
          loadingMessage: 'Guardando…',
          showOfflineBanner: true,
        })}
      />,
    );
    expect(container.querySelector('[data-testid="layer-loading"]')!.getAttribute('data-loading')).toBe('true');
    expect(container.querySelector('[data-testid="layer-loading"]')!.getAttribute('data-message')).toBe('Guardando…');
    expect(container.querySelector('[data-testid="layer-offline"]')!.getAttribute('data-show')).toBe('true');
  });

  it('propaga los props de la capa de modales', async () => {
    const container = await render(
      <AppOverlayLayers {...baseOverlayProps({ activeModal: 'ai_settings' })} />,
    );
    const modal = container.querySelector('[data-testid="layer-modal"]')!;
    expect(modal.getAttribute('data-active-modal')).toBe('ai_settings');
    expect(modal.getAttribute('data-has-ai-close')).toBe('true');
    expect(modal.getAttribute('data-has-import-handlers')).toBe('true');
  });

  it('propaga los props de la capa de ajustes', async () => {
    const container = await render(
      <AppOverlayLayers
        {...baseOverlayProps({ showSettings: true, exportFormats: ['json', 'csv', 'md'] })}
      />,
    );
    const settings = container.querySelector('[data-testid="layer-settings"]')!;
    expect(settings.getAttribute('data-show')).toBe('true');
    expect(settings.getAttribute('data-formats')).toBe('3');
  });
});

describe('AppFloatingLayers (P1)', () => {
  it('monta la toolbar de lote solo con tab table y selección activa', async () => {
    const withSelection = await render(
      <AppFloatingLayers
        {...baseFloatingProps({ activeTab: 'table', selectedIds: new Set(['a', 'b']) })}
      />,
    );
    expect(withSelection.querySelector('[data-testid="float-batch"]')!.getAttribute('data-count')).toBe('2');

    const otherTab = await render(
      <AppFloatingLayers
        {...baseFloatingProps({ activeTab: 'workbench', selectedIds: new Set(['a']) })}
      />,
    );
    expect(otherTab.querySelector('[data-testid="float-batch"]')).toBeNull();

    const noSelection = await render(
      <AppFloatingLayers {...baseFloatingProps({ activeTab: 'table', selectedIds: new Set() })} />,
    );
    expect(noSelection.querySelector('[data-testid="float-batch"]')).toBeNull();
  });

  it('monta la capa de bootstrap solo fuera de bienvenida y wizard', async () => {
    const mounted = await render(<AppFloatingLayers {...baseFloatingProps()} />);
    expect(mounted.querySelector('[data-testid="float-bootstrap"]')).not.toBeNull();

    const welcome = await render(<AppFloatingLayers {...baseFloatingProps({ showWelcome: true })} />);
    expect(welcome.querySelector('[data-testid="float-bootstrap"]')).toBeNull();

    const wizard = await render(<AppFloatingLayers {...baseFloatingProps({ showWizard: true })} />);
    expect(wizard.querySelector('[data-testid="float-bootstrap"]')).toBeNull();
  });

  it('propaga las notificaciones y los callbacks del widget', async () => {
    const container = await render(
      <AppFloatingLayers
        {...baseFloatingProps({
          notifications: [{ id: 1, message: 'ok', type: 'success' }],
          projectPath: '/tmp/test.loxar',
          showProjectBootstrap: true,
        })}
      />,
    );
    expect(container.querySelector('[data-testid="float-toast"]')!.getAttribute('data-count')).toBe('1');
    const widget = container.querySelector('[data-testid="float-widget"]')!;
    expect(widget.getAttribute('data-has-add-word')).toBe('true');
    expect(widget.getAttribute('data-has-search')).toBe('true');
    expect(widget.getAttribute('data-has-toggle')).toBe('true');
    const bootstrap = container.querySelector('[data-testid="float-bootstrap"]')!;
    expect(bootstrap.getAttribute('data-show')).toBe('true');
    expect(bootstrap.getAttribute('data-path')).toBe('/tmp/test.loxar');
  });
});
