import { invoke } from '@tauri-apps/api/core';
import { getErrorMessage } from '../utils/entryEditorModel';

export interface SessionCache {
  activeTab?: string;
  activeProfile?: string | null;
  exportPath?: string | null;
  projectPath?: string | null;
  tourCompleted?: boolean;
  themeId?: string;
  soundsEnabled?: boolean;
  showWelcomeOnStart?: boolean;
  bootstrapDismissed?: boolean;
  exportFormats?: string[];
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
  } catch (e: unknown) {
    const message = getErrorMessage(e).toLowerCase();
    if (message.includes('not found') || message.includes('forbidden')) {
      return { activeTab: 'dashboard' };
    }
    throw e;
  }
}

export async function saveSessionCache(state: SessionCache): Promise<void> {
  // Fusión superficial con el cache previo: varios llamadores pasaban objetos
  // parciales y pisan campos no mencionados (projectPath, activeTab, exportFormats).
  const previous = await loadSessionCache().catch(() => ({} as SessionCache));
  const merged: SessionCache = { ...previous, ...state };

  if (!isTauri()) {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('conlang_session_cache', JSON.stringify(merged));
    }
    return;
  }

  try {
    const path = await getSessionCachePath();
    await invoke('plugin:fs|write_file', {
      path,
      contents: JSON.stringify(merged, null, 2),
    });
  } catch (e: unknown) {
    // Silently ignore permission errors - session cache is not critical
    const message = getErrorMessage(e).toLowerCase();
    if (!message.includes('forbidden') && !message.includes('permission')) {
      throw e;
    }
  }
}
