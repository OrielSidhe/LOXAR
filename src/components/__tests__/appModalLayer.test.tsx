/**
 * AppModalLayer.test.tsx — P1: capa de modales extraída de `App.tsx`.
 *
 * Verifica que:
 *  - Con `activeModal === 'none'` no renderiza ningún modal.
 *  - Con `activeModal === 'about'` delega en `ModalManager`.
 *  - Con `activeModal === 'ai_settings'` monta `AiSettingsModal` y su cierre
 *    invoca `onAiSettingsClose` (contrato del wizard de primer arranque).
 *
 * Los dos hijos de la capa son chunks `lazy`; en jsdom el `import()` dinámico no
 * se resuelve de forma confiable, asi que se mockean los modulos antes de
 * renderizar (patron ya usado con `vi.mock`). La decision de montaje en si se
 * cubre en `modalLayerModel.test.ts`, sin React.
 *
 * Environment: jsdom (jsdom es dependencia de desarrollo; no requiere RTL).
 */
import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';

const onClose = vi.fn();

vi.mock('../ModalManager', () => ({
  __esModule: true,
  default: (props: { activeModal: string }) => (
    <div data-testid="modal-manager" data-active-modal={props.activeModal} />
  ),
}));

vi.mock('../AiSettingsModal', () => ({
  __esModule: true,
  default: () => (
    <div data-testid="ai-settings-modal">
      <button aria-label="Cerrar AI" onClick={onClose}>Cerrar</button>
    </div>
  ),
}));

import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { JSDOM } from 'jsdom';
import AppModalLayer, { type AppModalLayerProps } from '../AppModalLayer';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'http://localhost' });
globalThis.document = dom.window.document;
globalThis.window = dom.window as unknown as Window;

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

const baseProps = (overrides: Partial<AppModalLayerProps> = {}): AppModalLayerProps => ({
  activeModal: 'none',
  entryToEditInModal: null,
  entryToInflect: null,
  importState: { step: 'idle' },
  activeLexicon: [],
  activeLexiconName: null,
  lexiconNames: [],
  activeProfile: {
    consonants: [],
    vowels: [],
    syllableStructures: [],
    consonantClusters: [],
    vowelClusters: [],
    sampleText: '',
    grammarNotes: '',
    derivationalAffixes: [],
  },
  activeMetadata: null,
  activeCustomFunctions: [],
  activeInflectionProfile: { paradigms: [] },
  backups: [],
  appVersion: '2.4.0-pro',
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
  onGenerateLanguageSample: async () => null,
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
  onAiSettingsClose: onClose,
  ...overrides,
});

const mounts: Array<{ root: Root; container: HTMLDivElement }> = [];

const renderLayer = async (props: AppModalLayerProps): Promise<HTMLDivElement> => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  mounts.push({ root, container });
  await act(async () => {
    root.render(<AppModalLayer {...props} />);
    await flush();
  });
  return container;
};

beforeEach(() => {
  onClose.mockClear();
});

afterEach(() => {
  while (mounts.length > 0) {
    const { root, container } = mounts.pop()!;
    act(() => {
      root.unmount();
    });
    if (container.parentNode) container.parentNode.removeChild(container);
  }
});

describe('AppModalLayer (P1)', () => {
  it('monta el ModalManager con el activeModal recibido', async () => {
    const container = await renderLayer(baseProps({ activeModal: 'about' }));
    const manager = container.querySelector('[data-testid="modal-manager"]');
    expect(manager).not.toBeNull();
    expect(manager!.getAttribute('data-active-modal')).toBe('about');
  });

  it('no monta el AiSettingsModal con otro modal activo', async () => {
    const container = await renderLayer(baseProps({ activeModal: 'about' }));
    expect(container.querySelector('[data-testid="ai-settings-modal"]')).toBeNull();
  });

  it('monta el AiSettingsModal con ai_settings y propaga el cierre', async () => {
    const container = await renderLayer(baseProps({ activeModal: 'ai_settings' }));
    const modal = container.querySelector('[data-testid="ai-settings-modal"]');
    expect(modal).not.toBeNull();

    const closeButton = modal!.querySelector('button');
    expect(closeButton).not.toBeNull();
    await act(async () => {
      closeButton!.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
      await flush();
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
