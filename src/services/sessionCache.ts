import { invoke } from '@tauri-apps/api/core';

export interface SessionCache {
  activeTab?: string;
  activeProfile?: string | null;
  exportPath?: string | null;
  projectPath?: string | null;
  tourCompleted?: boolean;
  themeId?: string;
  soundsEnabled?: boolean;
}

const STORE_KEY = 'loxar-session-cache';

function isTauri(): boolean {
  return (
    typeof window !== 'undefined' &&
    // @ts-expect-error - injected by Tauri at runtime
    !!window.__TAURI_INTERNALS__
  );
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
    const result = await invoke<{ data: string }>('plugin:fs|read_text_file', {
      path: STORE_KEY,
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

  await invoke('plugin:fs|write_file', {
    path: STORE_KEY,
    contents: JSON.stringify(state, null, 2),
  });
}