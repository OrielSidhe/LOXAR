/**
 * onboarding.ts — First-run wizard state persistence.
 *
 * Manages the "loxar_onboarding_v1_done" flag and the persisted data folder
 * choice. The flag survives app restarts; once set, the wizard never
 * reappears.
 */

const ONBOARDING_FLAG_KEY = 'loxar_onboarding_v1_done';
const DATA_FOLDER_KEY = 'loxar_data_folder_v1';

/** True when running inside the Tauri desktop runtime. */
function isTauri(): boolean {
  return (
    typeof window !== 'undefined' &&
    // @ts-expect-error - injected by Tauri at runtime
    !!window.__TAURI_INTERNALS__
  );
}

/**
 * Check whether the first-run wizard has already been completed.
 * In Tauri, this persists across app restarts via localStorage-equivalent.
 * In browser/test environments, falls back to localStorage.
 */
export function hasCompletedOnboarding(): boolean {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(ONBOARDING_FLAG_KEY) === 'true';
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Mark the first-run wizard as completed so it never reappears.
 */
export function setOnboardingCompleted(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(ONBOARDING_FLAG_KEY, 'true');
    }
  } catch {
    // Best-effort — if localStorage is unavailable, the wizard will
    // technically reappear, but this only happens in restricted environments.
  }
}

/**
 * Get the persisted data folder path.
 * Returns null if not set yet.
 */
export function getDataFolder(): string | null {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(DATA_FOLDER_KEY);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Persist the data folder path for future sessions.
 */
export function setDataFolder(folder: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(DATA_FOLDER_KEY, folder);
    }
  } catch {
    // Best-effort persistence
  }
}

/**
 * Get the default data folder path for the current platform.
 * Uses Tauri's app data dir when available; otherwise returns a platform hint.
 */
export async function getDefaultDataFolder(): Promise<string> {
  if (isTauri()) {
    try {
      const { appDataDir } = await import('@tauri-apps/api/path');
      const dir = await appDataDir();
      return dir || getDefaultDataFolderSync();
    } catch {
      return getDefaultDataFolderSync();
    }
  }
  return `Loxar data (default app data dir)`;
}

/** Synchronous fallback for default data folder when Tauri APIs aren't available. */
function getDefaultDataFolderSync(): string {
  return `Loxar data`;
}
