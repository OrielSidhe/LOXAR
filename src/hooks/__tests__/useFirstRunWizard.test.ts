import { describe, it, expect, beforeEach } from 'vitest';
import { checkIsFirstRun } from '../useFirstRunWizard';
import { setOnboardingCompleted, hasCompletedOnboarding } from '../../services/onboarding';

// --- Mock localStorage ---
const mockLocalStorage = (() => {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
  configurable: true,
});

const ONBOARDING_FLAG_KEY = 'loxar_onboarding_v1_done';

describe('Phase I: checkIsFirstRun', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
  });

  it('returns true when onboarding flag is not set', () => {
    expect(hasCompletedOnboarding()).toBe(false);
    expect(checkIsFirstRun()).toBe(true);
  });

  it('returns false when onboarding flag is set', () => {
    setOnboardingCompleted();
    expect(hasCompletedOnboarding()).toBe(true);
    expect(checkIsFirstRun()).toBe(false);
  });

  it('returns true when flag is set but not to "true"', () => {
    mockLocalStorage.setItem(ONBOARDING_FLAG_KEY, 'false');
    expect(checkIsFirstRun()).toBe(true);
  });

  it('after setOnboardingCompleted, checkIsFirstRun returns false (no reapearance)', () => {
    expect(checkIsFirstRun()).toBe(true);
    setOnboardingCompleted();
    expect(checkIsFirstRun()).toBe(false);
    // Simulate a second app launch
    expect(checkIsFirstRun()).toBe(false);
    expect(hasCompletedOnboarding()).toBe(true);
  });
});
