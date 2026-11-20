import { test, expect } from '@playwright/test';
import {
  disableGuidedTour,
  enterDashboard,
  sidebarButton,
  createLexiconFromSelector,
  registerWord,
} from './helpers';

/**
 * E2E del Sound Change Workbench (Bloque C):
 *   crear léxico → registrar lexema → previsualizar reglas → aplicar al léxico
 *   → el lexema transformado aparece en la tabla del léxico.
 *
 * Cubre el hallazgo CLN: el botón "Aplicar al léxico" corría el lote sobre un
 * snapshot interno y lo descartaba, porque `onApplyBatch` era opcional y
 * `ToolsTab` no lo cableaba. El trabajo del usuario se perdía.
 *
 * Reglas preset sobre el texto/lexema "pata": p→ph y t→d ⇒ "phada".
 */
test('sound change: previsualizar y aplicar reglas transforma el lexema del léxico', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));

  await disableGuidedTour(page);
  await enterDashboard(page);
  await createLexiconFromSelector(page, 'Loxar Sound Change E2E', 'Español');

  await registerWord(page, {
    significado: 'caballo',
    raiz: 'pata',
    lexema: 'pata',
    categoria: 'Sustantivo',
  });

  await sidebarButton(page, 'Herramientas').click();
  await page.getByRole('button', { name: /Sound Change Workbench/i }).click();

  // El workbench solo se monta cuando el léxico activo tiene entradas.
  const previewBtn = page.getByRole('button', { name: 'Previsualizar cambios de sonido' });
  await expect(previewBtn).toBeVisible({ timeout: 15000 });

  await previewBtn.click();
  await expect(page.getByText('phada')).toBeVisible({ timeout: 10000 });

  await page.getByRole('button', { name: 'Aplicar reglas al léxico' }).click();
  await expect(
    page.getByText('Cambios de sonido aplicados a 1 entrada.'),
  ).toBeVisible({ timeout: 15000 });

  // El cambio llegó al léxico real: la tabla muestra el lexema transformado.
  await sidebarButton(page, 'Léxico').click();
  const row = page.locator('tbody tr').filter({ hasText: 'phada' });
  await expect(row).toHaveCount(1, { timeout: 15000 });

  expect(
    pageErrors,
    `Errores no capturados en runtime: ${pageErrors.join(' | ')}`,
  ).toEqual([]);
});
