import { test, expect } from '@playwright/test';

/**
 * Smoke test de GUI: arranque, modal de ubicación de proyecto, banner de aviso,
 * tabla principal y navegación a Herramientas. Detecta crashes silenciosos
 * capturando excepciones no controladas (pageerror).
 */
test('arranque + modal de ubicación + navegación sin crashes', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));

  await page.goto('/');

  // Pasa el splash/loading y aparece el modal de ubicación (primera corrida, sin proyecto).
  await page
    .getByText('¿Dónde querés guardar tu proyecto LOXAR?', { timeout: 30000 })
    .waitFor();

  // El modal ofrece crear / abrir / importar.
  await expect(page.getByRole('button', { name: /Crear proyecto nuevo/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Abrir otro archivo/i })).toBeVisible();

  // Descartar -> debe aparecer el banner de advertencia de ubicación.
  await page.getByRole('button', { name: /Más tarde/i }).click();
  await expect(
    page.getByText(/No hay un archivo de proyecto configurado/i),
  ).toBeVisible();

  // La tabla principal quedó accesible.
  await expect(page.locator('#lexicon-search')).toBeVisible();

  // Navegar a Herramientas y confirmar que el panel no crashea.
  await page.locator('button[title="Herramientas"]').click();
  await expect(
    page.getByText(/Herramientas|Glosado interlineal|Sound Change/i),
  ).toBeVisible({ timeout: 10000 });

  // Ninguna excepción no controlada en runtime.
  expect(
    pageErrors,
    `Errores no capturados en runtime: ${pageErrors.join(' | ')}`,
  ).toEqual([]);
});
