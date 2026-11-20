import { test, expect } from '@playwright/test';
import {
  disableGuidedTour,
  enterDashboard,
  sidebarButton,
  createLexiconFromSelector,
} from './helpers';

/**
 * E2E de la FASE NAV del gauntlet v3.14: salto rapido Workbench -> Léxico ->
 * Workbench sin pérdida de estado.
 *
 * El workbench y la tabla de léxico permanecen montados en `App.tsx` (solo se
 * ocultan con `hidden`), asi que:
 *  - el borrador del editor de entrada sobrevive al salto ida y vuelta;
 *  - los filtros/pagina de la tabla sobreviven al salto ida y vuelta.
 *
 * Antes del fix, `activeTab === 'workbench' && (...)` desmontaba el workbench y
 * el borrador del `EntryEditor` (estado local del componente) se perdia.
 */

test('salto rapido Workbench ↔ Léxico conserva el borrador y los filtros', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));

  await disableGuidedTour(page);
  await enterDashboard(page);
  await createLexiconFromSelector(page, 'Loxar NAV E2E', 'Español');

  // 1. Workbench: escribir un borrador (sin guardar) y comprobar el salto.
  await sidebarButton(page, 'Workbench').click();
  const significado = page.locator('#Significado');
  await expect(significado).toBeVisible({ timeout: 15000 });
  await significado.fill('borrador salto');
  // El borrador se confirma como etiqueta al salir del campo (onBlur -> addTag).
  await page.locator('body').click({ position: { x: 5, y: 5 } });
  await expect(page.getByText('borrador salto')).toBeVisible();

  await page.getByRole('button', { name: 'Ir al Léxico' }).click();

  // 2. Léxico: la tabla es visible y el borrador queda montado pero oculto.
  await expect(page.locator('#lexicon-search')).toBeVisible({ timeout: 15000 });
  await expect(significado).toBeHidden();

  // 3. De vuelta al Workbench: el borrador sobrevive al salto.
  await page.getByRole('button', { name: 'Ir al Workbench' }).click();
  await expect(significado).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('borrador salto')).toBeVisible({ timeout: 15000 });
  await expect(significado).toHaveValue('');

  // 4. Estado de la tabla: un termino de busqueda sobrevive al salto.
  await page.getByRole('button', { name: 'Ir al Léxico' }).click();
  const search = page.locator('#lexicon-search');
  await expect(search).toBeVisible({ timeout: 15000 });
  await search.fill('caballo');
  await page.getByRole('button', { name: 'Ir al Workbench' }).click();
  await expect(significado).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: 'Ir al Léxico' }).click();
  await expect(search).toHaveValue('caballo', { timeout: 15000 });

  expect(
    pageErrors,
    `Errores no capturados en runtime: ${pageErrors.join(' | ')}`,
  ).toEqual([]);
});
