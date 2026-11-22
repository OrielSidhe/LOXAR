/**
 * AppBodyLayer.test.tsx — P1: cuerpo principal extraído de `App.tsx`.
 *
 * Verifica el contrato del cuerpo sin arrastrar los tres componentes hijo
 * (la barra lateral, la barra de navegación y el switch de tabs):
 *  - el orden de render es `VerticalSidebar` → `main` → `AppNavigationBar`
 *    (condicional) → `AppTabContent`;
 *  - `AppNavigationBar` se monta solo cuando `activeTab !== 'dashboard'`;
 *  - la barra lateral recibe el tab activo y los callbacks de widget,
 *    ajustes, tour y "ir al panel";
 *  - `AppTabContent` recibe el contrato completo (léxico, búsqueda FTS, etc.).
 *
 * Environment: jsdom (se instancia a mano, igual que `appTabContent.test.tsx`).
 */
import { describe, it, expect, afterEach, vi } from 'vitest';

type MockProps = Record<string, unknown>;

vi.mock('../VerticalSidebar', () => ({
  __esModule: true,
  default: (props: MockProps) => (
    <div
      data-testid="sidebar"
      data-active={String(props.active)}
      data-has-widget={String(Boolean(props.onOpenWidget))}
      data-has-settings={String(Boolean(props.onOpenSettings))}
      data-has-tour={String(Boolean(props.onShowTour))}
      data-has-home={String(Boolean(props.onGoHome))}
    />
  ),
}));

vi.mock('../AppNavigationBar', () => ({
  __esModule: true,
  default: (props: MockProps) => (
    <div
      data-testid="nav-bar"
      data-active={String(props.activeTab)}
      data-has-back={String(Boolean(props.onBack))}
      data-has-quick={String(Boolean(props.onQuickNav))}
    />
  ),
}));

vi.mock('../AppTabContent', () => ({
  __esModule: true,
  default: (props: MockProps) => (
    <div
      data-testid="tab-content"
      data-active={String(props.activeTab)}
      data-lexicon={String(props.lexiconName ?? '')}
      data-has-search={String(Boolean(props.onSearchLexicon))}
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
import AppBodyLayer, { type AppBodyLayerProps } from '../AppBodyLayer';

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

const baseProps = (overrides: Partial<AppBodyLayerProps> = {}): AppBodyLayerProps => ({
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
  onSidebarTabChange: () => {},
  onOpenWidget: () => {},
  onOpenSettings: () => {},
  onGoHome: () => {},
  onNavBack: () => {},
  onQuickNav: () => {},
  ...overrides,
});

const mounts: Array<{ root: Root; container: HTMLDivElement }> = [];

const renderBody = async (props: AppBodyLayerProps): Promise<HTMLDivElement> => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  mounts.push({ root, container });
  await act(async () => {
    root.render(<AppBodyLayer {...props} />);
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

describe('AppBodyLayer (P1)', () => {
  it('monta barra lateral, barra de navegación y contenido en orden', async () => {
    const container = await renderBody(baseProps({ activeTab: 'grammar' }));
    const order = Array.from(container.querySelectorAll('[data-testid]')).map(el =>
      el.getAttribute('data-testid'),
    );
    expect(order).toEqual(['sidebar', 'nav-bar', 'tab-content']);
  });

  it('omite la barra de navegación en el dashboard', async () => {
    const container = await renderBody(baseProps({ activeTab: 'dashboard' }));
    expect(container.querySelector('[data-testid="nav-bar"]')).toBeNull();
    expect(container.querySelector('[data-testid="tab-content"]')).not.toBeNull();
  });

  it('la barra lateral recibe el tab activo y los callbacks', async () => {
    const container = await renderBody(baseProps({ activeTab: 'writing' }));
    const sidebar = container.querySelector('[data-testid="sidebar"]')!;
    expect(sidebar.getAttribute('data-active')).toBe('writing');
    expect(sidebar.getAttribute('data-has-widget')).toBe('true');
    expect(sidebar.getAttribute('data-has-settings')).toBe('true');
    expect(sidebar.getAttribute('data-has-tour')).toBe('true');
    expect(sidebar.getAttribute('data-has-home')).toBe('true');
  });

  it('la barra de navegación recibe Volver/Panel y el salto rápido', async () => {
    const container = await renderBody(baseProps({ activeTab: 'workbench' }));
    const nav = container.querySelector('[data-testid="nav-bar"]')!;
    expect(nav.getAttribute('data-active')).toBe('workbench');
    expect(nav.getAttribute('data-has-back')).toBe('true');
    expect(nav.getAttribute('data-has-quick')).toBe('true');
  });

  it('propaga el contrato completo a AppTabContent', async () => {
    const withoutSearch = await renderBody(baseProps({ activeTab: 'table' }));
    const content = withoutSearch.querySelector('[data-testid="tab-content"]')!;
    expect(content.getAttribute('data-active')).toBe('table');
    expect(content.getAttribute('data-lexicon')).toBe('Test');
    expect(content.getAttribute('data-has-search')).toBe('false');

    const withSearch = await renderBody(
      baseProps({ activeTab: 'table', onSearchLexicon: async () => [] }),
    );
    expect(
      withSearch.querySelector('[data-testid="tab-content"]')!.getAttribute('data-has-search'),
    ).toBe('true');
  });
});
