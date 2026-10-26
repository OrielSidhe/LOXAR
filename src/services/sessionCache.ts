import { invoke } from '@tauri-apps/api/core';
import { join } from '@tauri-apps/api/path';

export interface SessionCache {
  activeTab?: string;
  activeProfile?: string | null;
  exportPath?: string | null;
  projectPath?: string | null;
  tourCompleted?: boolean;
  themeId?: string;
  soundsEnabled?: boolean;
  showWelcomeOnStart?: boolean;
}

const FILENAME = 'session-cache.json';

function isTauri(): boolean {
  return (
    typeof window !== 'undefined' &&
    // @ts-expect-error - injected by Tauri at runtime
    !!window.__TAURI_INTERNALS__
  );
}

/**
 * Get the full path for the session cache file within the app data directory.
 * This ensures the path is inside the allowed FS scope ($APPDATA/*, etc.)
 */
async function getSessionCachePath(): Promise<string> {
  if (!isTauri()) return FILENAME;
  const { appDataDir } = await import('@tauri-apps/api/path');
  const dir = await appDataDir();
  return join(dir, FILENAME);
}

export async function loadSessionCache(): Promise<SessionCache> {
  if (!isTauri()) {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('conlang_session_cache') : null;
      return raw ? (JSON.parse(raw) as SessionCache) : { activeTab: 'dashboard' };
    } catch {
      return { activeTab: 'dashboard' };
    }
  }

  try {
    const path = await getSessionCachePath();
    const result = await invoke<{ data: string }>('plugin:fs|read_text_file', {
      path,
    });
    return JSON.parse(result.data) as SessionCache;
  } catch (e: any) {
    if (e.message?.includes('not found')) {
      return { activeTab: 'dashboard' };
    }
    throw e;
  }
}

export async function saveSessionCache(state: SessionCache): Promise<void> {
  if (!isTauri()) {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('conlang_session_cache', JSON.stringify(state));
    }
    return;
  }

  const path = await getSessionCachePath();
  await invoke('plugin:fs|write_file', {
    path,
    contents: JSON.stringify(state, null, 2),
  });
}