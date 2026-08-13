import { describe, it, expect, vi, beforeEach } from 'vitest';

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

const tauriMock = vi.fn();

vi.mock('@tauri-apps/api/core', () => ({
  invoke: tauriMock,
}));

const mockWindow = () => {
  Object.defineProperty(globalThis, 'window', {
    value: { __TAURI_INTERNALS__: {} },
    writable: true,
    configurable: true,
  });
};

const mockBrowserWindow = () => {
  Object.defineProperty(globalThis, 'window', {
    value: {},
    writable: true,
    configurable: true,
  });
};

mockWindow();

const { loadSessionCache, saveSessionCache } = await import('../../services/sessionCache');

describe('sessionCache persistence', () => {
  beforeEach(() => {
    tauriMock.mockReset();
    mockLocalStorage.clear();
    mockWindow();
  });

  it('should load default state when file missing in Tauri', async () => {
    tauriMock.mockRejectedValueOnce(new Error('not found'));

    const state = await loadSessionCache();
    expect(state).toEqual({ activeTab: 'dashboard' });
  });

  it('should read and write session state in Tauri', async () => {
    tauriMock.mockResolvedValueOnce({ data: JSON.stringify({ activeTab: 'profile' }) });
    tauriMock.mockResolvedValueOnce(undefined);

    const loaded = await loadSessionCache();
    expect(loaded.activeTab).toBe('profile');

    await saveSessionCache({ activeTab: 'editor', activeProfile: 'test' });
    expect(tauriMock).toHaveBeenCalledWith('plugin:fs|write_file', {
      path: 'loxar-session-cache',
      contents: JSON.stringify({ activeTab: 'editor', activeProfile: 'test' }, null, 2),
    });
  });

  it('should fallback to localStorage outside Tauri', async () => {
    mockBrowserWindow();
    tauriMock.mockRejectedValue(new Error('no tauri'));

    const browser = await import('../../services/sessionCache');
    await browser.saveSessionCache({ activeTab: 'table', exportPath: '/tmp' });
    const state = await browser.loadSessionCache();
    expect(state).toEqual({ activeTab: 'table', exportPath: '/tmp' });
  });
});
