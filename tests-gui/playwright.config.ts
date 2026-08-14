import { defineConfig, devices } from '@playwright/test';

/**
 * Smoke test de GUI para LOXAR (modo web headless).
 * No requiere Rust ni diálogos nativos: levanta `npm run dev` (Vite) y conduce
 * la app con Chromium headless para detectar regresiones visuales / crashes
 * silenciosos tras muchos cambios, sin que el usuario pegue screenshots.
 *
 * NOTA: los diálogos nativos de Tauri (Guardar/Abrir .loxar) NO se automatizan
 * acá (requieren tauri-driver + WebDriver). El flujo de creación de proyecto se
 * cubre con tests de lógica (projectFile / projectDiscovery) y validación manual.
 */
export default defineConfig({
  testDir: './tests-gui',
  timeout: 60000,
  expect: { timeout: 10000 },
  fullyParallel: false,
  retries: 0,
  reporter: [
    ['list'],
    ['json', { outputFile: 'tests-gui/result.json' }],
  ],
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 120000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
