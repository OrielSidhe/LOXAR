import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';
import { loadSessionCache, saveSessionCache } from '../../services/sessionCache';

const mockInvoke = invoke as ReturnType<typeof vi.fn>;

describe('sessionCache persistence', () => {
  beforeEach(() => {
    mockInvoke.mockClear();
  });

  it('should load default state when file missing', async () => {
    mockInvoke.mockRejectedValueOnce(new Error('File not found'));

    const state = await loadSessionCache();
    expect(state).toEqual({ activeTab: 'lists', activeProfile: null });
  });

  it('should save and round-trip a session object', async () => {
    mockInvoke.mockResolvedValueOnce({ data: JSON.stringify({ activeTab: 'profile' }) });
    mockInvoke.mockResolvedValueOnce(undefined);

    const loaded = await loadSessionCache();
    expect(loaded.activeTab).toBe('profile');

    await saveSessionCache({ activeTab: 'editor', activeProfile: 'test' });
    expect(mockInvoke).toHaveBeenCalledWith('plugin:fs|write_file', {
      path: 'loxar-session-cache',
      contents: JSON.stringify({ activeTab: 'editor', activeProfile: 'test' }, null, 2),
    });
  });
});
