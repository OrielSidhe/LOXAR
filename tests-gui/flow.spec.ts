import { test, expect } from '@playwright/test';
import {
  disableGuidedTour,
  enterDashboard,
  sidebarButton,
  createLexiconFromSelector,
  registerWord,
} from './helpers';

/**
 * E2E del flujo real de usuario en modo web (fallback localStorage):
 *   crear léxico → registrar palabra → buscarla → glosar un lexema derivado.
 *
 * Cubre el hallazgo CLN: un lexema derivado (raíz "bask" → lexema "boskel")
 * debe glosarse con la categoría de la entrada ("SUSTANTIVO") y no con "?".
 */

test('flujo completo: crear léxico, registrar, buscar y glosar', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));

  await disableGuidedTour(page);
  await enterDashboard(page);
  await createLexiconFromSelector(page, 'Loxar E2E', 'Español');

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
  // `.first()`: la tabla de léxico queda siempre montada (FASE NAV) y puede
  // quedar oculta detrás de otro módulo; el texto lo aporta solo la tabla.
  await expect(page.getByText(/No se encontraron resultados/i).first()).toBeVisible();

  // Glosado interlineal del lexema derivado (raíz "bask" ≠ lexema "boskel").
  await sidebarButton(page, 'Herramientas').click();
  await page.getByRole('button', { name: /Glosado Interlineal/i }).click();
  await page.locator('textarea').fill('boskel');
  // El botón tiene aria-label "Analizar oración" (su nombre accesible).
  await page.getByRole('button', { name: 'Analizar oración' }).click();
  // El resultado es un <pre> con "lexema / CATEGORÍA / significado"; se ancla
  // por CSS + filtro porque "SUSTANTIVO" también aparece en los <option> de
  // los selects de categoría que la FASE NAV mantiene montados (aunque ocultos).
  const gloss = page.locator('pre').filter({ hasText: 'SUSTANTIVO' });
  await expect(gloss).toBeVisible({ timeout: 10000 });
  await expect(gloss).toContainText('caballo');

  expect(
    pageErrors,
    `Errores no capturados en runtime: ${pageErrors.join(' | ')}`,
  ).toEqual([]);
});
