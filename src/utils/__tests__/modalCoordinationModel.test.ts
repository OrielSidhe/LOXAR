import { describe, it, expect } from 'vitest';
import {
  DEFAULT_MODAL_COORDINATION,
  reduceModalCoordination,
  type ModalCoordinationState,
} from '../modalCoordinationModel';

const state = (overrides: Partial<ModalCoordinationState> = {}): ModalCoordinationState => ({
  ...DEFAULT_MODAL_COORDINATION,
  ...overrides,
});

describe('reduceModalCoordination', () => {
  it('estado inicial: modal none y ajustes cerrados', () => {
    expect(DEFAULT_MODAL_COORDINATION).toEqual({ activeModal: 'none', showSettings: false });
  });

  it('openModal cambia el modal sin tocar los ajustes', () => {
    const next = reduceModalCoordination(state({ showSettings: true }), {
      type: 'openModal',
      modal: 'functions',
    });
    expect(next).toEqual({ activeModal: 'functions', showSettings: true });
  });

  it('closeModal vuelve a none sin tocar los ajustes', () => {
    const next = reduceModalCoordination(state({ activeModal: 'about', showSettings: true }), {
      type: 'closeModal',
    });
    expect(next).toEqual({ activeModal: 'none', showSettings: true });
  });

  it('openSettings/closeSettings no tocan el modal', () => {
    expect(reduceModalCoordination(state({ activeModal: 'profile' }), { type: 'openSettings' })).toEqual({
      activeModal: 'profile',
      showSettings: true,
    });
    expect(
      reduceModalCoordination(state({ activeModal: 'profile', showSettings: true }), {
        type: 'closeSettings',
      }),
    ).toEqual({ activeModal: 'profile', showSettings: false });
  });

  it('openAiSettingsFromSettings cierra ajustes y abre el modal de IA', () => {
    const next = reduceModalCoordination(state({ showSettings: true }), {
      type: 'openAiSettingsFromSettings',
    });
    expect(next).toEqual({ activeModal: 'ai_settings', showSettings: false });
  });

  it('openAiSettingsFromSettings también cierra el modal previo', () => {
    const next = reduceModalCoordination(
      state({ activeModal: 'restore', showSettings: true }),
      { type: 'openAiSettingsFromSettings' },
    );
    expect(next).toEqual({ activeModal: 'ai_settings', showSettings: false });
  });

  it('es puro: no muta el estado de entrada', () => {
    const input = state({ showSettings: true });
    const snapshot = { ...input };
    reduceModalCoordination(input, { type: 'openAiSettingsFromSettings' });
    expect(input).toEqual(snapshot);
  });
});
