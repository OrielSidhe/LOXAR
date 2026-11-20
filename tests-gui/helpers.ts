import { type Page, expect } from '@playwright/test';

/**
 * Helper del E2E de LOXAR (modo web, fallback localStorage).
 *
 * Recorre el flujo real de primer arranque y deja la app lista para usarse:
 *   1. wizard de onboarding (solo en contexto nuevo: flag "loxar_onboarding_v1_done")
 *   2. pantalla de bienvenida
 *   3. capa de ubicación de proyecto (no hay archivo .loxar configurado)
 *
 * Selectores de la barra lateral: se anclan a `aside` porque varios módulos
 * comparten `title` (p. ej. "Léxico" existe en la barra y en los sub-módulos
 * de gramática) y Playwright falla con strict-mode si el locator no es único.
 */

/** Botón de un módulo en la barra vertical izquierda. */
export function sidebarButton(page: Page, title: string) {
  return page.locator(`aside button[title="${title}"]`);
}

/**
 * Primer arranque: salta el wizard de onboarding (si aparece) y deja la
 * pantalla de bienvenida visible y utilizable.
 */
export async function enterWelcome(page: Page): Promise<void> {
  await page.goto('/');

  // 1. Wizard de primer arranque: ofrecería configurar la IA.
  const skipWizard = page.getByRole('button', { name: /Saltar por ahora/i });
  if (await skipWizard.isVisible().catch(() => false)) {
    await skipWizard.click();
    await expect(skipWizard).toBeHidden({ timeout: 15000 });
  }

  // 2. Pantalla de bienvenida.
  await expect(
    page.getByRole('button', { name: /Continuar al Dashboard/i }),
  ).toBeVisible({ timeout: 30000 });
}

/** Descarta la capa de ubicación de proyecto y espera el dashboard utilizable. */
export async function dismissProjectBootstrap(page: Page): Promise<void> {
  // 3. Capa de ubicación de proyecto (primer arranque sin .loxar).
  const laterBtn = page.getByRole('button', { name: /Más tarde/i });
  if (await laterBtn.isVisible().catch(() => false)) {
    await laterBtn.click();
    await expect(laterBtn).toBeHidden({ timeout: 15000 });
  }

  // La app queda utilizable: el selector de léxico de la barra superior es interactivo.
  await expect(page.locator('#lexicon-selector')).toBeVisible({ timeout: 30000 });
}

/** Flujo completo de primer arranque hasta el dashboard utilizable. */
export async function enterDashboard(page: Page): Promise<void> {
  await enterWelcome(page);

  const continueBtn = page.getByRole('button', { name: /Continuar al Dashboard/i });
  await continueBtn.click();
  await expect(continueBtn).toBeHidden({ timeout: 30000 });

  await dismissProjectBootstrap(page);
}
