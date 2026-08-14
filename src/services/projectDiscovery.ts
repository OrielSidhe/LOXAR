/**
 * projectDiscovery.ts
 * ----------------------------------------------------------------------------
 * Busca archivos de proyecto LOXAR (`.loxar`) existentes en ubicaciones comunes
 * del equipo para ofrecerlos al usuario al arrancar la app.
 *
 * Esto cubre el requisito de "buscar todos los archivos relacionados": en lugar
 * de confiar solamente en la caché de sesión (que vive en appdata y se pierde
 * si se limpia la carpeta de la app), escaneamos la carpeta del usuario y la
 * carpeta de config de la app para reencontrar proyectos previos.
 *
 * En contexto no-Tauri (navegador / `npm run dev` en web) devuelve [].
 * ----------------------------------------------------------------------------
 */
import { readDir, exists } from '@tauri-apps/plugin-fs';
import { homeDir, documentDir, desktopDir, downloadDir, appConfigDir } from '@tauri-apps/api/path';

function isTauri(): boolean {
  return (
    typeof window !== 'undefined' &&
    // @ts-expect-error - injected by Tauri at runtime
    !!window.__TAURI_INTERNALS__
  );
}

async function scanDir(dir: string | null): Promise<string[]> {
  if (!dir) return [];
  try {
    const entries = await readDir(dir);
    return entries
      .filter((e) => e.isFile && e.name.toLowerCase().endsWith('.loxar'))
      .map((e) => `${dir}/${e.name}`);
  } catch {
    return [];
  }
}

/** Devuelve rutas absolutas a archivos `.loxar` encontrados en el equipo. */
export async function scanForLoxarProjects(): Promise<string[]> {
  if (!isTauri()) return [];
  const roots = await Promise.all([
    homeDir().catch(() => null),
    documentDir().catch(() => null),
    desktopDir().catch(() => null),
    downloadDir().catch(() => null),
    appConfigDir().catch(() => null),
  ]);
  const results = await Promise.all(roots.map((r) => scanDir(r)));
  return Array.from(new Set(results.flat())).sort();
}

/** True si la ruta existe en el sistema de archivos (Tauri). False en navegador. */
export async function projectFileExists(path: string): Promise<boolean> {
  if (!isTauri()) return false;
  try {
    return await exists(path);
  } catch {
    return false;
  }
}
