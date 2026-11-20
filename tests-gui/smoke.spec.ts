import { test, expect } from '@playwright/test';
import { enterDashboard, sidebarButton } from './helpers';

/**
 * Smoke test de GUI: arranque real del primer uso (wizard de onboarding →
 * bienvenida → capa de ubicación de proyecto), tabla principal y navegación a
 * Herramientas. Detecta crashes silenciosos capturando excepciones no
 * controladas (pageerror).
 *
 * El flujo esperado es el actual: la app arranca en la bienvenida y la capa de
 * ubicación de proyecto aparece después de "Continuar al Dashboard".
 */
test('arranque + wizard + bootstrap + navegación sin crashes', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));

  await page.goto('/');

  // Wizard de primer arranque: ofrece configurar la IA antes de empezar.
  const skipWizard = page.getByRole('button', { name: /Saltar por ahora/i });
  if (await skipWizard.isVisible().catch(() => false)) {
    await expect(page.getByText(/¿Configurar la IA ahora?/i)).toBeVisible();
    await skipWizard.click();
  }

  // Bienvenida: crear / importar / tour / continuar.
  await expect(
    page.getByRole('button', { name: /Continuar al Dashboard/i }),
  ).toBeVisible({ timeout: 30000 });
  // `exact: true`: el botón de la bienvenida ("Crear Nuevo Léxico") comparte el
  // nombre con el del selector de léxico de la barra superior (aria-label
  // "Crear nuevo léxico"); sin anclar, Playwright falla con strict-mode.
  await expect(
    page.getByRole('button', { name: 'Crear Nuevo Léxico', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Importar Léxico', exact: true }),
  ).toBeVisible();

  await page.getByRole('button', { name: /Continuar al Dashboard/i }).click();

  // Capa de ubicación de proyecto: crear / abrir / más tarde.
  await expect(page.getByRole('button', { name: /Crear proyecto nuevo/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Abrir otro archivo/i })).toBeVisible();
  await page.getByRole('button', { name: /Más tarde/i }).click();

  // La tabla principal queda accesible.
  await expect(page.locator('#lexicon-selector')).toBeVisible({ timeout: 30000 });
  await sidebarButton(page, 'Léxico').click();
  await expect(page.locator('#lexicon-search')).toBeVisible();

  // Navegar a Herramientas y confirmar que el panel no crashea.
  await sidebarButton(page, 'Herramientas').click();
  await expect(page.getByText('Centro de Herramientas')).toBeVisible({ timeout: 10000 });

  // Ninguna excepción no controlada en runtime.
  expect(
    pageErrors,
    `Errores no capturados en runtime: ${pageErrors.join(' | ')}`,
  ).toEqual([]);
});
