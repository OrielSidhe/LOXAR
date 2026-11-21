/**
 * modalLayerModel.test.ts — P1: capa de modales extraída de `App.tsx`.
 *
 * Cubre la decision de montaje sin React ni los chunks pesados.
 */
import { describe, it, expect } from 'vitest';
import { resolveModalLayer, shouldMountAiSettingsModal } from '../modalLayerModel';
import type { AppModalId } from '../wizardActionsModel';

const ALL_MODALS: AppModalId[] = [
  'none',
  'about',
  'restore',
  'ai_assistant',
  'lexicon_tools',
  'lexicon_compare',
  'profile',
  'report',
  'functions',
  'hyphens',
  'inflection_generator',
  'create_lexicon',
  'ai_settings',
];

describe('resolveModalLayer', () => {
  it('monta siempre el ModalManager', () => {
    for (const modal of ALL_MODALS) {
      expect(resolveModalLayer(modal).mountModalManager).toBe(true);
    }
  });

  it('monta el AiSettingsModal solo con ai_settings', () => {
    expect(resolveModalLayer('ai_settings').mountAiSettingsModal).toBe(true);
    for (const modal of ALL_MODALS.filter(m => m !== 'ai_settings')) {
      expect(resolveModalLayer(modal).mountAiSettingsModal).toBe(false);
    }
  });

  it('shouldMountAiSettingsModal es la misma condicion', () => {
    for (const modal of ALL_MODALS) {
      expect(shouldMountAiSettingsModal(modal)).toBe(modal === 'ai_settings');
    }
  });
});
