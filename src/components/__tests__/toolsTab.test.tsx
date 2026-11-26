/**
 * ToolsTab.test.tsx — contrato tipado del tab de herramientas (P1).
 *
 * Fija que las props antes declaradas como `any` viajan con los tipos canónicos
 * de los componentes hijo: `MissingWord`, `LexiconMetadata` y el shape de
 * `stats` de `ToolsDashboard`. Los hijos se mockean para no arrastrar motores.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

type MockProps = Record<string, unknown>;

vi.mock('../ModulePanel', () => ({
  __esModule: true,
  default: (props: MockProps) => <div data-testid="panel">{props.children}</div>,
}));
vi.mock('../SuggestionsWorkbench', () => ({
  __esModule: true,
  default: (props: MockProps) => (
    <div
      data-testid="suggestions"
      data-count={String((props.suggestions as unknown[]).length)}
      data-language={String((props.activeMetadata as { mainLanguage?: string } | null)?.mainLanguage ?? '')}
    />
  ),
}));
vi.mock('../ToolsDashboard', () => ({
  __esModule: true,
  default: (props: MockProps) => (
    <div
      data-testid="dashboard"
      data-needs-function={String((props.stats as { needsFunction: number }).needsFunction)}
    />
  ),
}));
vi.mock('../InterlinearGlossViewer', () => ({
  __esModule: true,
  default: () => <div data-testid="gloss" />,
}));
vi.mock('../SoundChangeWorkbench', () => ({
  __esModule: true,
  default: () => <div data-testid="sound-change" />,
}));

import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { JSDOM } from 'jsdom';
import type { LexiconData, MissingWord } from '../../types';
import ToolsTab, { type ToolsTabProps } from '../ToolsTab';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'http://localhost' });
globalThis.document = dom.window.document;
globalThis.window = dom.window as unknown as Window;

let container: HTMLDivElement;
let root: Root;

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const EMPTY_LEXICON: LexiconData = {
  entries: [],
  profile: {
    consonants: [],
    vowels: [],
    syllableStructures: [],
    consonantClusters: [],
    vowelClusters: [],
    sampleText: '',
    grammarNotes: '',
    derivationalAffixes: [],
  },
  neography: { glyphs: [], characterMap: {}, ligatures: {} },
  inflection: { paradigms: [] },
  grammar: {} as LexiconData['grammar'],
  corpus: [],
  metadata: { conlangName: '', mainLanguage: '' },
  wordsAddedSinceSave: 0,
  customFunctions: [],
  schemaVersion: 1,
};

const SUGGESTION: MissingWord = { Significado: 'casa', Categoría: 'sustantivo' };

const buildProps = (overrides: Partial<ToolsTabProps> = {}): ToolsTabProps => ({
  activeTab: 'tools',
  suggestions: [],
  suggestionListName: 'Swadesh',
  onCloseSuggestions: () => {},
  onAddManually: () => {},
  onGenerateAI: () => {},
  isLoadingAI: false,
  activeMetadata: null,
  activeToolView: 'dashboard',
  onBackToToolDashboard: () => {},
  onOpenInterlinearGloss: () => {},
  onOpenSoundChangeWorkbench: () => {},
  onApplySoundChangeBatch: () => {},
  onCompleteFunctions: async () => {},
  onFillMissing: async () => {},
  onAnalyzeForSuggestions: () => {},
  onManageFunctions: () => {},
  onManageHyphens: () => {},
  onOpenProfile: () => {},
  onOpenNeography: () => {},
  onOpenInflectionModule: () => {},
  onOpenGrammar: () => {},
  onOpenTranslator: () => {},
  onStartTour: () => {},
  lexicon: EMPTY_LEXICON,
  stats: { needsFunction: 3, totalIncomplete: 7 },
  disabled: false,
  ...overrides,
});

const render = (props: ToolsTabProps): void => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(<ToolsTab {...props} />));
};

describe('ToolsTab', () => {
  it('propaga stats y nombre de lista al dashboard con tipos derivados', () => {
    render(buildProps());
    const dashboard = container.querySelector('[data-testid="dashboard"]');
    expect(dashboard?.getAttribute('data-needs-function')).toBe('3');
  });

  it('entrega sugerencias y metadatos tipados al workbench de sugerencias', () => {
    render(buildProps({
      suggestions: [SUGGESTION],
      activeMetadata: { conlangName: 'Test', mainLanguage: 'Español' },
    }));
    const suggestions = container.querySelector('[data-testid="suggestions"]');
    expect(suggestions?.getAttribute('data-count')).toBe('1');
    expect(suggestions?.getAttribute('data-language')).toBe('Español');
  });
});
