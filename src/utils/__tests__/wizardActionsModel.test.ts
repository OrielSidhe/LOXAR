import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  buildWizardActions,
  type WizardActionDeps,
} from '../wizardActionsModel';
import type { WizardStep } from '../../hooks/useFirstRunWizard';

function createDeps(overrides: Partial<WizardActionDeps> = {}) {
  return {
    showWizard: true,
    step: 'ai' as WizardStep,
    setActiveModal: vi.fn(),
    completeWizard: vi.fn(),
    skipWizard: vi.fn(),
    updateDataFolder: vi.fn(),
    chooseDataFolder: vi.fn(async () => null),
    ...overrides,
  };
}

describe('buildWizardActions', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('handleWizardConfigureAi abre el modal de IA y no completa el wizard', () => {
    const deps = createDeps();
    const actions = buildWizardActions(deps);

    actions.handleWizardConfigureAi();

    expect(deps.setActiveModal).toHaveBeenCalledTimes(1);
    expect(deps.setActiveModal).toHaveBeenCalledWith('ai_settings');
    expect(deps.completeWizard).not.toHaveBeenCalled();
  });

  it('handleAiSettingsModalClose cierra el modal y completa el wizard en el paso ai', () => {
    const deps = createDeps({ showWizard: true, step: 'ai' });
    const actions = buildWizardActions(deps);

    actions.handleAiSettingsModalClose();

    expect(deps.setActiveModal).toHaveBeenCalledTimes(1);
    expect(deps.setActiveModal).toHaveBeenCalledWith('none');
    expect(deps.completeWizard).toHaveBeenCalledTimes(1);
  });

  it('handleAiSettingsModalClose no completa el wizard fuera del paso ai', () => {
    const deps = createDeps({ showWizard: true, step: 'data-folder' });
    const actions = buildWizardActions(deps);

    actions.handleAiSettingsModalClose();

    expect(deps.setActiveModal).toHaveBeenCalledTimes(1);
    expect(deps.setActiveModal).toHaveBeenCalledWith('none');
    expect(deps.completeWizard).not.toHaveBeenCalled();
  });

  it('handleAiSettingsModalClose no completa el wizard si el wizard ya se cerro', () => {
    const deps = createDeps({ showWizard: false, step: 'ai' });
    const actions = buildWizardActions(deps);

    actions.handleAiSettingsModalClose();

    expect(deps.completeWizard).not.toHaveBeenCalled();
  });

  it('handleWizardSkip delega en skipWizard', () => {
    const deps = createDeps();
    const actions = buildWizardActions(deps);

    actions.handleWizardSkip();

    expect(deps.skipWizard).toHaveBeenCalledTimes(1);
  });

  it('handleWizardComplete delega en completeWizard', () => {
    const deps = createDeps();
    const actions = buildWizardActions(deps);

    actions.handleWizardComplete();

    expect(deps.completeWizard).toHaveBeenCalledTimes(1);
  });

  it('handleChooseDataFolder persiste la carpeta elegida', async () => {
    const deps = createDeps({ chooseDataFolder: vi.fn(async () => '/datos/proyecto') });
    const actions = buildWizardActions(deps);

    actions.handleChooseDataFolder();
    await vi.waitFor(() => {
      expect(deps.updateDataFolder).toHaveBeenCalledTimes(1);
    });
    expect(deps.updateDataFolder).toHaveBeenCalledWith('/datos/proyecto');
  });

  it('handleChooseDataFolder ignora una seleccion nula', async () => {
    const deps = createDeps({ chooseDataFolder: vi.fn(async () => null) });
    const actions = buildWizardActions(deps);

    actions.handleChooseDataFolder();
    await vi.waitFor(() => {
      expect(deps.chooseDataFolder).toHaveBeenCalledTimes(1);
    });
    expect(deps.updateDataFolder).not.toHaveBeenCalled();
  });

  it('handleChooseDataFolder registra el error del dialogo sin lanzar', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const failure = new Error('dialogo cancelado');
    const deps = createDeps({
      chooseDataFolder: vi.fn(async () => Promise.reject(failure)),
    });
    const actions = buildWizardActions(deps);

    actions.handleChooseDataFolder();
    await vi.waitFor(() => {
      expect(consoleError).toHaveBeenCalledTimes(1);
    });
    expect(consoleError.mock.calls[0][0]).toBe('Error choosing data folder:');
    expect(consoleError.mock.calls[0][1]).toBe(failure);
    expect(deps.updateDataFolder).not.toHaveBeenCalled();
  });
});
