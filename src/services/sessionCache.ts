import { invoke } from '@tauri-apps/api/core';

export interface SessionCache {
  activeTab: 'lists' | 'profile' | null;
  activeProfile: string | null;
}

const STORE_KEY = 'loxar-session-cache';

export async function loadSessionCache(): Promise<SessionCache> {
  try {
    const result = await invoke<{ data: string }>('plugin:fs|read_text_file', {
      path: STORE_KEY,
    });
    return JSON.parse(result.data) as SessionCache;
  } catch (e: any) {
    if (e.message?.includes('not found')) {
      return { activeTab: 'lists', activeProfile: null };
    }
    throw e;
  }
}

export async function saveSessionCache(state: SessionCache): Promise<void> {
  await invoke('plugin:fs|write_file', {
    path: STORE_KEY,
    contents: JSON.stringify(state, null, 2),
  });
}