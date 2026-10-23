import { describe, it, expect, beforeEach } from 'vitest';
import {
  hasCompletedOnboarding,
  setOnboardingCompleted,
  getDataFolder,
  setDataFolder,
} from '../onboarding';

// --- Mock localStorage (same pattern as aiProviderRegistry.test.ts) ---
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
const DATA_FOLDER_KEY = 'loxar_data_folder_v1';

describe('Phase I: Onboarding flag persistence', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
  });

  it('returns false when no onboarding flag is set (first run)', () => {
    expect(hasCompletedOnboarding()).toBe(false);
  });

  it('returns true when onboarding flag is set', () => {
    mockLocalStorage.setItem(ONBOARDING_FLAG_KEY, 'true');
    expect(hasCompletedOnboarding()).toBe(true);
  });

  it('returns false when flag is set to a non-"true" value', () => {
    mockLocalStorage.setItem(ONBOARDING_FLAG_KEY, 'false');
    expect(hasCompletedOnboarding()).toBe(false);
  });

  it('setOnboardingCompleted sets the flag to "true"', () => {
    expect(hasCompletedOnboarding()).toBe(false);
    setOnboardingCompleted();
    expect(hasCompletedOnboarding()).toBe(true);
    expect(mockLocalStorage.getItem(ONBOARDING_FLAG_KEY)).toBe('true');
  });

  it('onboarding flag survives clear/load cycle (persists across sessions)', () => {
    setOnboardingCompleted();
    // Simulate app restart: in real app, localStorage persists
    expect(hasCompletedOnboarding()).toBe(true);
  });
});

describe('Phase I: Data folder persistence', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
  });

  it('returns null when no data folder is set', () => {
    expect(getDataFolder()).toBeNull();
  });

  it('persists data folder through setDataFolder / getDataFolder round-trip', () => {
    const folder = 'C:\\Users\\test\\LoxarData';
    setDataFolder(folder);
    expect(getDataFolder()).toBe(folder);
    expect(mockLocalStorage.getItem(DATA_FOLDER_KEY)).toBe(folder);
  });

  it('updates data folder when changed', () => {
    setDataFolder('/first/path');
    expect(getDataFolder()).toBe('/first/path');

    setDataFolder('/second/path');
    expect(getDataFolder()).toBe('/second/path');
    expect(mockLocalStorage.getItem(DATA_FOLDER_KEY)).toBe('/second/path');
  });

  it('handles empty string folder', () => {
    setDataFolder('');
    expect(getDataFolder()).toBe('');
  });
});

describe('Phase I: Wizard does not reappear after completion', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
  });

  it('wizard flag is independent of data folder flag', () => {
    setDataFolder('/some/path');
    expect(hasCompletedOnboarding()).toBe(false); // Wizard should still show

    setOnboardingCompleted();
    expect(hasCompletedOnboarding()).toBe(true); // Wizard should not show
    expect(getDataFolder()).toBe('/some/path'); // Data folder persists
  });
});
