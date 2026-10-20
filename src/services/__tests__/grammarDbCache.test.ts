/**
 * B1 (Finding 2.4): dbPromise cache poisoning recovery.
 *
 * Verifies that when getDb()'s dynamic import or load() fails, the cached
 * promise is reset to null so the next call retries instead of returning
 * a permanently-rejected promise for the entire session.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the Tauri SQL plugin — load() will fail first then succeed.
const mockLoad = vi.fn();
vi.mock('@tauri-apps/plugin-sql', () => ({
  default: { load: mockLoad },
}));

// Force isTauri() to return true so the Tauri path is exercised.
const originalWindow = globalThis.window;

import { getGrammaticalFunctions, _resetDbCache } from '../grammarDb';

describe('B1: dbPromise cache poisoning recovery', () => {
  beforeEach(() => {
    _resetDbCache();
    mockLoad.mockReset();
    // Make isTauri() return true
    (globalThis as any).window = { __TAURI_INTERNALS__: {} };
  });

  afterEach(() => {
    if (originalWindow === undefined) {
      delete (globalThis as any).window;
    } else {
      (globalThis as any).window = originalWindow;
    }
  });

  it('resets cache on rejection so next call retries', async () => {
    // First load attempt fails (simulates DB locked / corrupt)
    mockLoad.mockRejectedValueOnce(new Error('DB locked'));
    // Second load attempt succeeds
    mockLoad.mockResolvedValueOnce({
      select: async () => [{ c: 0 }],
      execute: async () => ({}),
    });

    // First call: should reject
    await expect(getGrammaticalFunctions()).rejects.toThrow('DB locked');

    // Second call: should retry (load called again) and succeed
    const result = await getGrammaticalFunctions();
    expect(Array.isArray(result)).toBe(true);

    // load() called exactly twice — once for each attempt (cache was reset)
    expect(mockLoad).toHaveBeenCalledTimes(2);
  });

  it('does not retry when load succeeds on first call', async () => {
    mockLoad.mockResolvedValueOnce({
      select: async () => [{ c: 0 }],
      execute: async () => ({}),
    });

    const result = await getGrammaticalFunctions();
    expect(Array.isArray(result)).toBe(true);
    expect(mockLoad).toHaveBeenCalledTimes(1);
  });
});
