/**
 * AppHeaderLayer.test.tsx — P1: cabecera extraída de `App.tsx`.
 *
 * Verifica el contrato de la capa sin arrastrar `Header` ni `AppToolbar`:
 *  - el orden de render es `Header` → `AppToolbar`;
 *  - `Header` recibe el contador, el tema y los callbacks de widget, tour y
 *    ajustes (estos dos opcionales);
 *  - `AppToolbar` recibe el contrato íntegro (selector, archivo, proyecto,
 *    sesión y los flags `disabled`/`isDirty`).
 *
 * Environment: jsdom (se instancia a mano, igual que `appBodyLayer.test.tsx`).
 */
import { describe, it, expect, afterEach, vi } from 'vitest';

type MockProps = Record<string, unknown>;

vi.mock('../Header', () => ({
  __esModule: true,
  default: (props: MockProps) => (
    <div
      data-testid="header"
      data-words={String(props.wordsAddedCount)}
      data-has-widget={String(Boolean(props.onOpenWidget))}
      data-has-tour={String(Boolean(props.onShowTour))}
      data-has-settings={String(Boolean(props.onOpenSettings))}
      data-theme={String(props.themeId)}
      data-has-theme-change={String(Boolean(props.onThemeChange))}
    />
  ),
}));

vi.mock('../AppToolbar', () => ({
  __esModule: true,
  default: (props: MockProps) => (
    <div
      data-testid="toolbar"
      data-lexicon={String(props.activeLexiconName ?? '')}
      data-names={String((props.lexiconNames as string[]).length)}
      data-has-select={String(Boolean(props.onSelectLexicon))}
      data-has-export={String(Boolean(props.onExport))}
      data-formats={String((props.exportFormats as string[]).length)}
      data-disabled={String(props.disabled)}
      data-dirty={String(props.isDirty)}
      data-has-project-path={String(Boolean(props.projectPath))}
      data-has-about={String(Boolean(props.onOpenAbout))}
    />
  ),
}));

import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { JSDOM } from 'jsdom';
import type { ExportFormat } from '../../utils/lexiconExport';
import type { ThemeId } from '../../services/themeService';
import AppHeaderLayer, { type AppHeaderLayerProps } from '../AppHeaderLayer';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'http://localhost' });
globalThis.document = dom.window.document;
globalThis.window = dom.window as unknown as Window;

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

const baseProps = (overrides: Partial<AppHeaderLayerProps> = {}): AppHeaderLayerProps => ({
  wordsAddedCount: 0,
  onOpenWidget: () => {},
  onShowTour: () => {},
  onOpenSettings: () => {},
  themeId: 'midnight' as ThemeId,
  onThemeChange: () => {},
  lexiconNames: ['A', 'B'],
  activeLexiconName: 'A',
  onSelectLexicon: () => {},
  onCreateLexicon: () => {},
  onDeleteLexicon: () => {},
  onRenameLexicon: () => {},
  onImport: () => {},
  onExport: () => {},
  exportFormats: ['json', 'csv'] as ExportFormat[],
  onSave: () => {},
  onSetExportPath: () => {},
  onRestore: () => {},
  onOpenAbout: () => {},
  onStartTour: () => {},
  onOpenAiSettings: () => {},
  onQuit: () => {},
  onResetApp: () => {},
  onError: () => {},
  disabled: false,
  isDirty: false,
  onNewProject: () => {},
  onOpenProject: () => {},
  onSaveProject: () => {},
  onSaveProjectAs: () => {},
  projectPath: null,
  ...overrides,
});

const mounts: Array<{ root: Root; container: HTMLDivElement }> = [];

const renderHeader = async (props: AppHeaderLayerProps): Promise<HTMLDivElement> => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  mounts.push({ root, container });
  await act(async () => {
    root.render(<AppHeaderLayer {...props} />);
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

describe('AppHeaderLayer (P1)', () => {
  it('monta Header y AppToolbar en orden', async () => {
    const container = await renderHeader(baseProps());
    const order = Array.from(container.querySelectorAll('[data-testid]')).map(el =>
      el.getAttribute('data-testid'),
    );
    expect(order).toEqual(['header', 'toolbar']);
  });

  it('Header recibe contador, tema y callbacks', async () => {
    const container = await renderHeader(
      baseProps({ wordsAddedCount: 7, themeId: 'cyber' as ThemeId }),
    );
    const header = container.querySelector('[data-testid="header"]')!;
    expect(header.getAttribute('data-words')).toBe('7');
    expect(header.getAttribute('data-theme')).toBe('cyber');
    expect(header.getAttribute('data-has-widget')).toBe('true');
    expect(header.getAttribute('data-has-tour')).toBe('true');
    expect(header.getAttribute('data-has-settings')).toBe('true');
    expect(header.getAttribute('data-has-theme-change')).toBe('true');
  });

  it('propaga el contrato completo a AppToolbar', async () => {
    const container = await renderHeader(
      baseProps({
        activeLexiconName: 'B',
        disabled: true,
        isDirty: true,
        projectPath: 'C:/proj/demo.loxar',
      }),
    );
    const toolbar = container.querySelector('[data-testid="toolbar"]')!;
    expect(toolbar.getAttribute('data-lexicon')).toBe('B');
    expect(toolbar.getAttribute('data-names')).toBe('2');
    expect(toolbar.getAttribute('data-has-select')).toBe('true');
    expect(toolbar.getAttribute('data-has-export')).toBe('true');
    expect(toolbar.getAttribute('data-formats')).toBe('2');
    expect(toolbar.getAttribute('data-disabled')).toBe('true');
    expect(toolbar.getAttribute('data-dirty')).toBe('true');
    expect(toolbar.getAttribute('data-has-project-path')).toBe('true');
    expect(toolbar.getAttribute('data-has-about')).toBe('true');
  });

  it('soporta los callbacks opcionales de Header ausentes', async () => {
    const container = await renderHeader(
      baseProps({ onShowTour: undefined, onOpenSettings: undefined }),
    );
    const header = container.querySelector('[data-testid="header"]')!;
    expect(header.getAttribute('data-has-tour')).toBe('false');
    expect(header.getAttribute('data-has-settings')).toBe('false');
    expect(container.querySelector('[data-testid="toolbar"]')).not.toBeNull();
  });
});
