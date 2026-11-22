/**
 * AppTabContent.test.tsx — P1: switch de tabs extraído de `App.tsx`.
 *
 * Verifica el contrato de enrutado del área principal sin arrastrar los ocho
 * componentes hijo (pesados y con sus propias dependencias):
 *  - `dashboard`, `collections`, `writing`, `grammar`, `translator` y `tools`
 *    se montan solo cuando `activeTab` coincide;
 *  - `table` y `workbench` quedan SIEMPRE montados (FASE NAV del gauntlet
 *    v3.14): se ocultan con `hidden` + `aria-hidden` para conservar el borrador
 *    del editor y los filtros de la tabla;
 *  - `LexiconTable.active` refleja el tab activo;
 *  - `onSearch` (FTS) se propaga tal cual lo recibe `App.tsx`;
 *  - `WorkbenchTab`/`ToolsTab` reciben `disabled` sin léxico;
 *  - `ToolsTab.lexicon` cae al léxico vacío cuando no hay `lexiconData`.
 *
 * Environment: jsdom (se instancia a mano, igual que `appModalLayer.test.tsx`).
 */
import { describe, it, expect, afterEach, vi } from 'vitest';

type MockProps = Record<string, unknown>;

vi.mock('../DashboardTab', () => ({
  __esModule: true,
  default: (props: MockProps) => (
    <div data-testid="tab-dashboard" data-conlang={String(props.conlangName ?? '')} />
  ),
}));

vi.mock('../LexiconTable', () => ({
  __esModule: true,
  default: (props: MockProps) => (
    <div
      data-testid="tab-table"
      data-active={String(Boolean(props.active))}
      data-has-search={String(Boolean(props.onSearch))}
    />
  ),
}));

vi.mock('../WorkbenchTab', () => ({
  __esModule: true,
  default: (props: MockProps) => (
    <div data-testid="tab-workbench" data-disabled={String(Boolean(props.disabled))} />
  ),
}));

vi.mock('../CollectionsManager', () => ({
  __esModule: true,
  default: () => <div data-testid="tab-collections" />,
}));

vi.mock('../WritingAndNeographyTab', () => ({
  __esModule: true,
  default: () => <div data-testid="tab-writing" />,
}));

vi.mock('../GrammarTab', () => ({
  __esModule: true,
  default: (props: MockProps) => (
    <div data-testid="tab-grammar" data-module={String(props.activeModule)} />
  ),
}));

vi.mock('../TranslationPlayground', () => ({
  __esModule: true,
  default: () => <div data-testid="tab-translator" />,
}));

vi.mock('../ToolsTab', () => ({
  __esModule: true,
  default: (props: MockProps) => (
    <div
      data-testid="tab-tools"
      data-disabled={String(Boolean(props.disabled))}
      data-has-lexicon={String(Boolean(props.lexicon))}
    />
  ),
}));

import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { JSDOM } from 'jsdom';
import type {
  GenerativeProfile,
  GrammarManifest,
  LexiconData,
  NeographyProfile,
} from '../../types';
import { buildDashboardStats } from '../../utils/dashboardStats';
import { DEFAULT_GRAMMAR_MODULE } from '../../utils/grammarTabModel';
import AppTabContent, { type AppTabContentProps } from '../AppTabContent';

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

const EMPTY_NEOGRAPHY: NeographyProfile = { glyphs: [], characterMap: {}, ligatures: {} };

const EMPTY_GRAMMAR = {} as GrammarManifest; // solo se pasa a los hijos mockeados

const EMPTY_LEXICON: LexiconData = {
  entries: [],
  profile: EMPTY_PROFILE,
  neography: EMPTY_NEOGRAPHY,
  inflection: { paradigms: [] },
  grammar: EMPTY_GRAMMAR,
  corpus: [],
  metadata: { conlangName: '', mainLanguage: '' },
  wordsAddedSinceSave: 0,
  customFunctions: [],
  schemaVersion: 1,
};

const baseProps = (overrides: Partial<AppTabContentProps> = {}): AppTabContentProps => ({
  activeTab: 'table',
  lexicon: [],
  lexiconName: 'Test',
  lexiconData: EMPTY_LEXICON,
  lexiconNames: ['Test'],
  metadata: null,
  profile: EMPTY_PROFILE,
  grammar: EMPTY_GRAMMAR,
  corpus: [],
  neographyProfile: EMPTY_NEOGRAPHY,
  inflectionProfile: { paradigms: [] },
  customFunctions: [],
  stats: buildDashboardStats({ grammar: EMPTY_GRAMMAR, lexicon: [], incompleteCount: 0 }),
  completionStats: { total: 0, needsFunction: 0, totalIncomplete: 0 },
  searchTerm: '',
  onSearchTermChange: () => {},
  functionFilter: 'all',
  onFunctionFilterChange: () => {},
  viewFilter: 'all',
  onViewFilterChange: () => {},
  showAffixFormatting: false,
  onShowAffixFormattingChange: () => {},
  selectedIds: new Set<string>(),
  onToggleSelection: () => {},
  onToggleSelectAll: () => {},
  queueActive: false,
  workQueue: [],
  queueCursor: 0,
  queuePrev: () => {},
  queueNext: () => {},
  queueTogglePending: () => {},
  queueRemoveCurrent: () => {},
  queueClear: () => {},
  editorMode: 'add',
  onEditorModeChange: () => {},
  entryBeingEdited: null,
  incompleteCount: 0,
  incompleteIndex: 0,
  onNavigateIncomplete: () => {},
  onLookup: () => {},
  generationModes: [],
  onGenerationModesChange: () => {},
  initialDataForAdd: null,
  suggestions: [],
  suggestionListName: '',
  onCloseSuggestions: () => {},
  onAddManually: () => {},
  onGenerateAI: () => {},
  isLoadingAI: false,
  onSelectList: () => {},
  onAnalyzeList: () => {},
  activeToolView: 'dashboard',
  onBackToToolDashboard: () => {},
  onOpenInterlinearGloss: () => {},
  onOpenSoundChangeWorkbench: () => {},
  activeGrammarModule: DEFAULT_GRAMMAR_MODULE,
  onModuleChange: () => {},
  onOpenTab: () => {},
  onOpenGrammarModule: () => {},
  onOpenDashboard: () => {},
  onOpenAiSettings: () => {},
  onStartTour: () => {},
  onSelectConlang: () => {},
  onEditWord: () => {},
  onDeleteWord: () => {},
  onAddWord: () => {},
  onAddBatchWords: () => {},
  onAddCustomFunction: () => {},
  onAddCustomCategory: () => {},
  onUpdateCorpus: () => {},
  onUpdateNeographyProfile: () => {},
  onUpdateGenerativeProfile: () => {},
  onSaveGrammar: () => {},
  onExportGrammar: () => {},
  onAddLexicalException: () => {},
  onGenerateInflections: () => {},
  onSearchLexicon: undefined,
  onAiCompleteEntry: async () => null,
  onAiGenerateRootAndLexeme: async () => null,
  onCorrectSignificado: async () => '',
  onCompleteFunctions: async () => {},
  onFillMissing: async () => {},
  onAnalyzeForSuggestions: () => {},
  onManageFunctions: () => {},
  onManageHyphens: () => {},
  onOpenProfile: () => {},
  onOpenNeography: () => {},
  onOpenInflection: () => {},
  onOpenInflectionModule: () => {},
  onOpenTranslator: () => {},
  onEnqueue: () => {},
  onGenerateBatch: () => {},
  onSyncPhonology: () => {},
  onApplySoundChangeBatch: () => {},
  showNotification: () => {},
  setIsLoading: () => {},
  setLoadingMessage: () => {},
  ...overrides,
});

const mounts: Array<{ root: Root; container: HTMLDivElement }> = [];

const renderContent = async (props: AppTabContentProps): Promise<HTMLDivElement> => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  mounts.push({ root, container });
  await act(async () => {
    root.render(<AppTabContent {...props} />);
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

describe('AppTabContent (P1)', () => {
  it('monta el tab condicional correspondiente y no los demás', async () => {
    const container = await renderContent(baseProps({ activeTab: 'dashboard' }));
    expect(container.querySelector('[data-testid="tab-dashboard"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="tab-collections"]')).toBeNull();
    expect(container.querySelector('[data-testid="tab-writing"]')).toBeNull();
    expect(container.querySelector('[data-testid="tab-grammar"]')).toBeNull();
    expect(container.querySelector('[data-testid="tab-translator"]')).toBeNull();
    expect(container.querySelector('[data-testid="tab-tools"]')).toBeNull();
  });

  it('monta cada tab condicional según activeTab', async () => {
    const cases: Array<[AppTabContentProps['activeTab'], string]> = [
      ['collections', 'tab-collections'],
      ['writing', 'tab-writing'],
      ['grammar', 'tab-grammar'],
      ['translator', 'tab-translator'],
      ['tools', 'tab-tools'],
    ];
    for (const [activeTab, testId] of cases) {
      const container = await renderContent(baseProps({ activeTab }));
      expect(container.querySelector(`[data-testid="${testId}"]`)).not.toBeNull();
    }
  });

  it('table y workbench quedan siempre montados (FASE NAV)', async () => {
    const container = await renderContent(baseProps({ activeTab: 'dashboard' }));
    expect(container.querySelector('[data-testid="tab-table"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="tab-workbench"]')).not.toBeNull();
  });

  it('LexiconTable.active refleja el tab activo', async () => {
    const tableContainer = await renderContent(baseProps({ activeTab: 'table' }));
    expect(tableContainer.querySelector('[data-testid="tab-table"]')!.getAttribute('data-active')).toBe('true');

    const dashboardContainer = await renderContent(baseProps({ activeTab: 'dashboard' }));
    expect(dashboardContainer.querySelector('[data-testid="tab-table"]')!.getAttribute('data-active')).toBe('false');
  });

  it('propaga onSearch (FTS) tal cual lo recibe', async () => {
    const withoutSearch = await renderContent(baseProps({ activeTab: 'table' }));
    expect(withoutSearch.querySelector('[data-testid="tab-table"]')!.getAttribute('data-has-search')).toBe('false');

    const withSearch = await renderContent(baseProps({ activeTab: 'table', onSearchLexicon: async () => [] }));
    expect(withSearch.querySelector('[data-testid="tab-table"]')!.getAttribute('data-has-search')).toBe('true');
  });

  it('WorkbenchTab y ToolsTab se deshabilitan sin léxico activo', async () => {
    const enabled = await renderContent(baseProps({ activeTab: 'workbench', lexiconName: 'Test' }));
    expect(enabled.querySelector('[data-testid="tab-workbench"]')!.getAttribute('data-disabled')).toBe('false');

    const disabled = await renderContent(baseProps({ activeTab: 'tools', lexiconName: null }));
    expect(disabled.querySelector('[data-testid="tab-workbench"]')!.getAttribute('data-disabled')).toBe('true');
    expect(disabled.querySelector('[data-testid="tab-tools"]')!.getAttribute('data-disabled')).toBe('true');
  });

  it('ToolsTab recibe lexiconData o el léxico vacío', async () => {
    const withData = await renderContent(baseProps({ activeTab: 'tools', lexiconData: EMPTY_LEXICON }));
    expect(withData.querySelector('[data-testid="tab-tools"]')!.getAttribute('data-has-lexicon')).toBe('true');

    const withoutData = await renderContent(baseProps({ activeTab: 'tools', lexiconData: undefined }));
    expect(withoutData.querySelector('[data-testid="tab-tools"]')!.getAttribute('data-has-lexicon')).toBe('true');
  });

  it('GrammarTab recibe el módulo activo', async () => {
    const container = await renderContent(baseProps({ activeTab: 'grammar', activeGrammarModule: 'morphology' }));
    expect(container.querySelector('[data-testid="tab-grammar"]')!.getAttribute('data-module')).toBe('morphology');
  });
});
