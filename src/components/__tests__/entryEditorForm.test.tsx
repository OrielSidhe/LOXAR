/**
 * EntryEditorForm.test.tsx — contrato tipado del formulario de entrada.
 *
 * Verifica que los tipos canónicos (`LexiconEntry`, `GenerationMode`,
 * `GenerationModeOption`) atraviesan el formulario sin casts `any` y llegan a
 * `EntryDuplicateWarning` y `EntryEditorAiActions`.
 *
 * Environment: jsdom (se instancia a mano, igual que `appHeaderLayer.test.tsx`).
 */
import { describe, it, expect, afterEach, vi } from 'vitest';

type MockProps = Record<string, unknown>;

vi.mock('../Tooltip', () => ({ __esModule: true, default: () => <span /> }));
vi.mock('../icons/SaveIcon', () => ({ __esModule: true, default: () => <svg /> }));
vi.mock('../icons/CancelIcon', () => ({ __esModule: true, default: () => <svg /> }));
vi.mock('../SignificadoTagsInput', () => ({
  __esModule: true,
  default: (props: MockProps) => <div data-testid="tags" data-has-error={String(props.hasError)} />,
}));
vi.mock('../EntryEditorIpaToggle', () => ({
  __esModule: true,
  default: (props: MockProps) => <div data-testid="ipa" data-show={String(props.showIPA)} />,
}));
vi.mock('../EntryDuplicateWarning', () => ({
  __esModule: true,
  default: (props: MockProps) => (
    <div
      data-testid="duplicates"
      data-lexemas={(props.duplicateLexemas as unknown[]).length}
      data-raices={(props.duplicateRaices as unknown[]).length}
      data-significados={(props.duplicateSignificados as unknown[]).length}
    />
  ),
}));
vi.mock('../EntryEditorAiActions', () => ({
  __esModule: true,
  default: (props: MockProps) => (
    <div
      data-testid="ai-actions"
      data-modes={(props.generationModes as string[]).join(',')}
      data-options={(props.generationModeOptions as { id: string }[]).map(o => o.id).join(',')}
      data-has-toggle={String(typeof props.onToggleGenerationMode === 'function')}
    />
  ),
}));

import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { JSDOM } from 'jsdom';
import type { GenerationMode, LexiconEntry } from '../../types';
import { generationModeOptions } from '../../utils/entryEditorModel';
import EntryEditorForm, { type EntryEditorFormProps } from '../EntryEditorForm';

const dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>', { url: 'http://localhost' });
globalThis.document = dom.window.document;
globalThis.window = dom.window as unknown as Window;

let container: HTMLDivElement;
let root: Root;

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const duplicateEntry: LexiconEntry = {
  ID: 'dup-1',
  Raíz: 'BSK',
  Léxema: ['boskel'],
  Categoría: 'sustantivo',
  Significado: ['bosque'],
  extraData: {},
};

function makeProps(overrides: Partial<EntryEditorFormProps> = {}): EntryEditorFormProps {
  const modes: GenerationMode[] = ['generative'];
  return {
    mode: 'add',
    onSubmit: () => {},
    isSubmitting: false,
    isActionDisabled: false,
    submitButtonRef: { current: null },
    onSignificadoKeyDown: () => {},
    onCategoriaKeyDown: () => {},
    onRaizKeyDown: () => {},
    onLexemaKeyDown: () => {},
    activeMetadata: { mainLanguage: 'Español', conlangName: 'Elyr' },
    disabled: false,
    significados: ['bosque'],
    onSignificadosChange: () => {},
    significadoInputRef: { current: null },
    duplicateSignificados: [],
    isAddingCategory: false,
    newCategoryInput: '',
    onNewCategoryInputChange: () => {},
    onConfirmNewCategory: () => {},
    onCancelNewCategory: () => {},
    formData: { Raíz: '', Léxema: '', Categoría: 'sustantivo' },
    onChange: () => {},
    allCategories: ['sustantivo', 'verbo'],
    categoriaSelectRef: { current: null },
    duplicateRaices: [],
    raizInputRef: { current: null },
    duplicateLexemas: [],
    lexemaInputRef: { current: null },
    showIPA: false,
    onToggleIPA: () => {},
    error: null,
    generationModes: modes,
    onToggleGenerationMode: () => {},
    onAiGenerate: () => {},
    onAiComplete: () => {},
    isGenerating: false,
    isCompleting: false,
    isAiButtonDisabled: false,
    activeModeDescription: 'Generativo',
    generationModeOptions,
    ...overrides,
  };
}

function render(props: EntryEditorFormProps): HTMLElement {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(<EntryEditorForm {...props} />));
  return container;
}

describe('EntryEditorForm contrato tipado', () => {
  it('propaga duplicados y modos usando los tipos canónicos', () => {
    const el = render(makeProps({
      duplicateSignificados: [duplicateEntry],
      duplicateRaices: [duplicateEntry, duplicateEntry],
      duplicateLexemas: [duplicateEntry],
    }));

    const duplicates = el.querySelector('[data-testid="duplicates"]')!;
    expect(duplicates.getAttribute('data-significados')).toBe('1');
    expect(duplicates.getAttribute('data-raices')).toBe('2');
    expect(duplicates.getAttribute('data-lexemas')).toBe('1');
    expect(el.querySelector('[data-testid="tags"]')!.getAttribute('data-has-error')).toBe('true');

    const ai = el.querySelector('[data-testid="ai-actions"]')!;
    expect(ai.getAttribute('data-modes')).toBe('generative');
    expect(ai.getAttribute('data-options')).toBe(generationModeOptions.map(o => o.id).join(','));
    expect(ai.getAttribute('data-has-toggle')).toBe('true');
  });

  it('no marca error de significado cuando no hay duplicados', () => {
    const el = render(makeProps());
    expect(el.querySelector('[data-testid="tags"]')!.getAttribute('data-has-error')).toBe('false');
    expect(el.querySelector('[data-testid="duplicates"]')!.getAttribute('data-significados')).toBe('0');
  });
});
