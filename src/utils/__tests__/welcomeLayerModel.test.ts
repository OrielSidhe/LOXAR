import { describe, it, expect } from 'vitest';
import { shouldCompleteWizardStep } from '../welcomeLayerModel';

describe('welcomeLayerModel', () => {
  it('completa el wizard solo en el paso de carpeta de datos', () => {
    expect(shouldCompleteWizardStep('data-folder')).toBe(true);
  });

  it('avanza de paso en "ai" y "complete"', () => {
    expect(shouldCompleteWizardStep('ai')).toBe(false);
    expect(shouldCompleteWizardStep('complete')).toBe(false);
  });
});
