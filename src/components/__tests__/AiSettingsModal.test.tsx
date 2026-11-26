// @vitest-environment jsdom
/**
 * AiSettingsModal.test.tsx — GAUNTLET v3.13 FASE U: real provider form.
 *
 * Covers create/edit form rendering, extraBody + requestTimeoutMs persistence,
 * edit-without-activating, and JSON validation. Uses vitest's jsdom environment:
 * a manually created JSDOM in Node makes react-dom register no onChange handler.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { AISettings, AIProviderConfig } from '../../services/aiProviderRegistry';

const loadAIConfig = vi.fn();
const saveAIConfig = vi.fn();
const discoverModelsMock = vi.fn();

vi.mock('../../services/modelDiscovery', () => ({
  discoverModels: (...args: unknown[]) => discoverModelsMock(...args),
}));

vi.mock('../../services/geminiService', () => ({
  loadAIConfig: (...args: unknown[]) => loadAIConfig(...args),
  saveAIConfig: (...args: unknown[]) => saveAIConfig(...args),
  testAiConnection: vi.fn(),
  DEFAULT_GEMINI_MODEL: 'gemini-2.5-flash',
  DEFAULT_OLLAMA_MODEL: 'llama3',
  APP_NAME: 'Loxar',
  APP_VERSION: '1.0.0',
  getDebugLog: () => [],
  clearDebugLog: () => {},
}));

import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import AiSettingsModal from '../AiSettingsModal';

Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', { value: true, writable: true, configurable: true });

const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

let container: HTMLDivElement;
let root: Root;

const provider = (overrides: Partial<AIProviderConfig>): AIProviderConfig => ({
  id: 'nous',
  name: 'NousResearch',
  baseURL: 'https://api.nousresearch.com/v1',
  apiKey: 'sk-nous',
  authHeader: 'Authorization',
  endpointStyle: 'openai-chat',
  defaultModel: 'stepfun/step-3.7-flash:free',
  models: ['stepfun/step-3.7-flash:free'],
  reasoningEffort: 'off',
  ...overrides,
});

async function renderModal(settings: AISettings): Promise<void> {
  loadAIConfig.mockResolvedValue(settings);
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(<AiSettingsModal onClose={vi.fn()} />);
    await flush();
  });
}

function buttonByText(text: string): HTMLButtonElement {
  const found = Array.from(document.querySelectorAll('button'))
    .find(button => button.textContent?.trim() === text);
  if (!found) throw new Error(`Button not found: ${text}`);
  return found as HTMLButtonElement;
}

function buttonsByText(text: string): HTMLButtonElement[] {
  return Array.from(document.querySelectorAll('button'))
    .filter(button => button.textContent?.trim() === text) as HTMLButtonElement[];
}

async function click(element: Element): Promise<void> {
  await act(async () => {
    element.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await flush();
  });
}

async function setField(selector: string, value: string): Promise<void> {
  const element = document.querySelector(selector);
  if (!element) throw new Error(`Field not found: ${selector}`);
  const proto = element.tagName === 'TEXTAREA'
    ? window.HTMLTextAreaElement.prototype
    : window.HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  await act(async () => {
    setter?.call(element, value);
    element.dispatchEvent(new window.Event('input', { bubbles: true }));
    await flush();
  });
}

function formText(): string {
  return document.querySelector('[data-testid="provider-form"]')?.textContent ?? '';
}

beforeEach(() => {
  loadAIConfig.mockReset();
  saveAIConfig.mockReset();
  saveAIConfig.mockResolvedValue(undefined);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  document.body.innerHTML = '';
});

describe('FASE U: formulario real de proveedor', () => {
  it('muestra el formulario al pulsar "+ Agregar proveedor" y persiste extraBody y timeout', async () => {
    await renderModal({ activeProviderId: 'nous', providers: [provider({})] });

    expect(document.querySelector('[data-testid="provider-form"]')).toBeNull();
    await click(buttonByText('+ Agregar proveedor'));

    expect(formText()).toContain('Nuevo proveedor');
    await setField('#form-provider-name', 'Nous nueva');
    await setField('#form-provider-baseurl', 'https://api.nousresearch.com/v1');
    await setField('#form-provider-apikey', 'sk-nueva');
    await setField('#form-provider-model', 'stepfun/step-3.7-flash:free');
    await setField('#form-provider-extrabody', '{"tags":["user=uid-1"]}');
    await setField('#form-provider-timeout', '45000');

    expect(buttonByText('Guardar proveedor').disabled).toBe(false);
    await click(buttonByText('Guardar proveedor'));
    expect(document.querySelector('[data-testid="provider-form"]')).toBeNull();
    await click(buttonByText('Guardar Configuracion'));

    expect(saveAIConfig).toHaveBeenCalledTimes(1);
    const saved = saveAIConfig.mock.calls[0][0] as AISettings;
    expect(saved.activeProviderId).toBe('nous');
    expect(saved.providers).toHaveLength(2);
    const created = saved.providers.find(p => p.name === 'Nous nueva');
    expect(created?.extraBody).toEqual({ tags: ['user=uid-1'] });
    expect(created?.requestTimeoutMs).toBe(45000);
  });

  it('edita sin perder extraBody ni timeout y sin cambiar el proveedor activo', async () => {
    await renderModal({
      activeProviderId: 'groq',
      providers: [
        provider({ extraBody: { tags: ['user=uid-9'] }, requestTimeoutMs: 9999 }),
        provider({ id: 'groq', name: 'Groq', apiKey: 'sk-groq', extraBody: undefined, requestTimeoutMs: undefined }),
      ],
    });

    await click(buttonsByText('Editar')[0]);

    expect(formText()).toContain('Editar proveedor');
    expect((document.querySelector('#form-provider-extrabody') as HTMLTextAreaElement).value)
      .toContain('user=uid-9');
    expect((document.querySelector('#form-provider-timeout') as HTMLInputElement).value).toBe('9999');

    await click(buttonByText('Guardar proveedor'));
    await click(buttonByText('Guardar Configuracion'));

    const saved = saveAIConfig.mock.calls[0][0] as AISettings;
    expect(saved.activeProviderId).toBe('groq');
    const edited = saved.providers.find(p => p.id === 'nous');
    expect(edited?.extraBody).toEqual({ tags: ['user=uid-9'] });
    expect(edited?.requestTimeoutMs).toBe(9999);
  });

  it('rechaza JSON inválido en extraBody y bloquea el guardado del formulario', async () => {
    await renderModal({ activeProviderId: 'nous', providers: [provider({})] });
    await click(buttonByText('+ Agregar proveedor'));
    await setField('#form-provider-name', 'Inválido');
    await setField('#form-provider-extrabody', '{bad json');

    expect(document.querySelector('[role="alert"]')).not.toBeNull();
    expect(buttonByText('Guardar proveedor').disabled).toBe(true);
  });
});
