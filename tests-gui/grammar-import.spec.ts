import { test, expect, type Page } from '@playwright/test';
import {
  enterDashboard,
  sidebarButton,
  createLexiconFromSelector,
} from './helpers';

/**
 * E2E del importador de gramática (módulo estrella de LOXAR):
 *   crear léxico → módulo Gramática → importador → analizar offline →
 *   estructura detectada (tipología + reglas) → guardar en el manifiesto.
 *
 * Cubre el parser local (sin IA): con el texto de demostración precargado el
 * motor debe inferir el orden SOV y las reglas de inflexión, y el resultado
 * debe persistirse en el manifiesto del léxico.
 */

/** El tour guiado se dispara al crear el primer léxico; este flujo no lo valida. */
async function disableGuidedTour(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    const raw = localStorage.getItem('conlang_session_cache');
    const cache: Record<string, unknown> = raw
      ? (JSON.parse(raw) as Record<string, unknown>)
      : {};
    cache.tourCompleted = true;
    localStorage.setItem('conlang_session_cache', JSON.stringify(cache));
  });
  await page.reload();
}

/**
 * Fuerza el modo offline del importador. El modal arranca con `ai = true` y
 * corrige el estado con `isAiAvailable()`; si hubiera un proveedor configurado
 * el botón diría "Analizar con IA". En el E2E no hay API key, así que se
 * espera el modo local (si el proveedor llegara a estar activo, se desactiva).
 */
async function forceOfflineMode(page: Page): Promise<void> {
  const offlineAnalyze = page.getByRole('button', { name: 'Analizar (offline)', exact: true });
  if (await offlineAnalyze.isVisible().catch(() => false)) return;

  const disableAi = page.getByRole('button', { name: 'Desactivar análisis con IA' });
  if (await disableAi.isVisible().catch(() => false)) {
    await disableAi.click();
  }
  await expect(offlineAnalyze).toBeVisible({ timeout: 15000 });
}

test('gramática: importar texto local, analizar offline y guardar el manifiesto', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));

  await disableGuidedTour(page);
  await enterDashboard(page);
  await createLexiconFromSelector(page, 'Loxar Grammar E2E', 'Español');

  // Módulo Gramática → importador.
  await sidebarButton(page, 'Gramática').click();

  // Un léxico nuevo tiene el manifiesto por defecto: el asistente de gramática
  // se autoabre una vez como onboarding. Este flujo no lo valida, lo descarta.
  const wizard = page.getByRole('dialog', { name: 'Asistente de gramática' });
  if (await wizard.isVisible().catch(() => false)) {
    await wizard.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await expect(wizard).toBeHidden({ timeout: 15000 });
  }

  await page.getByRole('button', { name: 'Importar', exact: true }).click();

  const importer = page.getByRole('dialog', { name: 'Importador de Gramática Inteligente' });
  await expect(importer).toBeVisible();
  await expect(page.locator('#grammar-input')).toBeVisible();

  await forceOfflineMode(page);
  await page.getByRole('button', { name: 'Analizar (offline)', exact: true }).click();

  // El motor local rellena la pestaña "Estructura Detectada".
  await expect(page.getByRole('button', { name: 'Ver estructura detectada de la gramática' })).toBeEnabled({
    timeout: 30000,
  });
  const estructura = page.getByRole('button', { name: 'Ver estructura detectada de la gramática' });
  await estructura.click();

  // Tipología inferida del texto de demostración ("SOV, aglutinante, head-final").
  const orden = page.locator('span.text-accent').filter({ hasText: /^SOV$/ });
  await expect(orden.first()).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('Reglas Computables Detectadas')).toBeVisible();

  // Guardar persiste el manifiesto y cierra el importador.
  await page.getByRole('button', { name: /Guardar Gramática/ }).click();
  await expect(
    page.getByText('Gramática estructurada guardada correctamente.'),
  ).toBeVisible({ timeout: 15000 });
  await expect(importer).toBeHidden({ timeout: 15000 });

  expect(
    pageErrors,
    `Errores no capturados en runtime: ${pageErrors.join(' | ')}`,
  ).toEqual([]);
});
