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

/**
 * El tour guiado se dispara al crear el primer léxico y su overlay intercepta
 * los clics del dashboard. Los E2E lo desactivan una sola vez por spec.
 */
export async function disableGuidedTour(page: Page): Promise<void> {
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

/** Registra una palabra en el Workbench por el formulario real (modo "añadir"). */
export async function registerWord(
  page: Page,
  word: { significado: string; raiz: string; lexema: string; categoria: string },
): Promise<void> {
  await sidebarButton(page, 'Workbench').click();
  await page.locator('#Significado').fill(word.significado);
  await page.locator('#Raíz').fill(word.raiz);
  await page.locator('#Léxema').fill(word.lexema);
  await page.locator('#Categoría').selectOption({ label: word.categoria });
  await page.getByRole('button', { name: /registrar palabra/i }).click();
}

/**
 * Crea un léxico por la vía real del dashboard: el botón "+" del selector de
 * léxico abre el modal de creación (nombre + idioma). Antes existía un
 * formulario inline encadenado que sólo pedía el nombre y perdía el idioma
 * principal.
 */
export async function createLexiconFromSelector(
  page: Page,
  name: string,
  language: string,
): Promise<void> {
  await page.getByRole('button', { name: 'Crear nuevo léxico', exact: true }).click();
  await expect(page.locator('#lexicon-name')).toBeVisible();
  await page.locator('#lexicon-name').fill(name);
  await page.locator('#main-language').fill(language);
  // El modal es un <form>: Enter en el último campo dispara el submit.
  await page.locator('#main-language').press('Enter');
  await expect(
    page.getByText(`Léxico "${name}" creado exitosamente.`),
  ).toBeVisible({ timeout: 15000 });
}
