import { test, expect, type Page } from '@playwright/test';
import {
  enterWelcome,
  dismissProjectBootstrap,
  sidebarButton,
} from './helpers';

/**
 * E2E del flujo real de usuario en modo web (fallback localStorage):
 *   crear léxico → registrar palabra → buscarla → glosar un lexema derivado.
 *
 * Cubre el hallazgo CLN: un lexema derivado (raíz "bask" → lexema "boskel")
 * debe glosarse con la categoría de la entrada ("SUSTANTIVO") y no con "?".
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
 * Crea un léxico desde la pantalla de bienvenida, que abre el modal de
 * creación (nombre + idioma) en lugar del formulario inline del selector.
 */
async function createLexicon(page: Page, name: string, language: string): Promise<void> {
  await page.getByRole('button', { name: 'Crear Nuevo Léxico', exact: true }).click();
  await page.locator('#lexicon-name').fill(name);
  await page.locator('#main-language').fill(language);
  // El modal es un <form>: Enter en el último campo dispara el submit.
  await page.locator('#main-language').press('Enter');
  await expect(
    page.getByText(`Léxico "${name}" creado exitosamente.`),
  ).toBeVisible({ timeout: 15000 });
}

async function registerWord(
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

test('flujo completo: crear léxico, registrar, buscar y glosar', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));

  await disableGuidedTour(page);
  await enterWelcome(page);
  await createLexicon(page, 'Loxar E2E', 'Español');
  await dismissProjectBootstrap(page);

  await registerWord(page, {
    significado: 'caballo',
    raiz: 'bask',
    lexema: 'boskel',
    categoria: 'Sustantivo',
  });

  // La entrada registrada aparece en la tabla del léxico.
  await sidebarButton(page, 'Léxico').click();
  const row = page.locator('tbody tr').filter({ hasText: 'boskel' });
  await expect(row).toHaveCount(1, { timeout: 15000 });

  // Búsqueda por significado: encuentra la entrada y vacía para un término ausente.
  await page.locator('#lexicon-search').fill('caballo');
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await page.locator('#lexicon-search').fill('inexistente');
  await expect(page.getByText(/No se encontraron resultados/i)).toBeVisible();

  // Glosado interlineal del lexema derivado (raíz "bask" ≠ lexema "boskel").
  await sidebarButton(page, 'Herramientas').click();
  await page.getByRole('button', { name: /Glosado Interlineal/i }).click();
  await page.locator('textarea').fill('boskel');
  // El botón tiene aria-label "Analizar oración" (su nombre accesible).
  await page.getByRole('button', { name: 'Analizar oración' }).click();
  await expect(page.getByText('SUSTANTIVO')).toBeVisible({ timeout: 10000 });
  await expect(page.getByText('caballo')).toBeVisible();

  expect(
    pageErrors,
    `Errores no capturados en runtime: ${pageErrors.join(' | ')}`,
  ).toEqual([]);
});
