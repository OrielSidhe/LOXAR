import { invoke } from '@tauri-apps/api/core';

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

const STORE_KEY = 'loxar-session-cache';

// Use a fixed filename within APPDATA scope instead of relative path
const FILENAME = 'session-cache.json';

function isTauri(): boolean {
  return (
    typeof window !== 'undefined' &&
    // @ts-expect-error - injected by Tauri at runtime
    !!window.__TAURI_INTERNALS__
  );
}

/**
 * Get the session cache path within app data directory.
 * Returns a path inside $APPDATA/* which is within the allowed FS scope.
 */
async function getSessionCachePath(): Promise<string> {
  if (!isTauri()) return FILENAME;
  try {
    const { appDataDir } = await import('@tauri-apps/api/path');
    const dir = await appDataDir();
    // Simple path join without dependencies
    return dir.replace(/\/$/, '') + '/' + FILENAME;
  } catch {
    // Fallback if path API fails
    return FILENAME;
  }
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
    if (e.message?.toLowerCase().includes('not found') || e.message?.toLowerCase().includes('forbidden')) {
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

  try {
    const path = await getSessionCachePath();
    await invoke('plugin:fs|write_file', {
      path,
      contents: JSON.stringify(state, null, 2),
    });
  } catch (e: any) {
    // Silently ignore permission errors - session cache is not critical
    if (!e.message?.toLowerCase().includes('forbidden') && !e.message?.toLowerCase().includes('permission')) {
      throw e;
    }
  }
}
