import { test, expect, type Page } from '@playwright/test';

/**
 * A2: E2E test — palette drag & drop onto the React Flow canvas.
 *
 * Flow: web fallback → app shell renders → dismiss welcome/modal →
 * drop a module onto the React Flow viewport → verify a new node appears
 * with both source and target handles.
 *
 * Validates:
 *   - useWidgetBridge guard: no listen()/emit() crashes in browser mode
 *   - A1 (dual-port fix): dynamic nodes get both source + target handles
 *
 * NOTA: el app corre en modo web (vite dev) con fallback localStorage
 * para APIs de Tauri no disponibles.  El drag nativo HTML5 no funciona
 * de forma confiable en Chromium headless, por lo que se despachan eventos
 * drop/draggerover programáticamente con un objeto DataTransfer real.
 */
test.describe('A2: Palette drag → canvas drop (React Flow)', () => {
  let pageErrors: string[];

  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));
  });

  /** Dismiss the project-location modal and welcome screen so the dashboard is live. */
  async function enterDashboard(page: Page) {
    const laterBtn = page.getByRole('button', { name: /Más tarde/i });
    if (await laterBtn.isVisible().catch(() => false)) {
      await laterBtn.click();
    }
    const continueBtn = page.getByRole('button', { name: /CONTINUAR AL DASHBOARD/i });
    if (await continueBtn.isVisible().catch(() => false)) {
      await continueBtn.click();
    }
  }

  /** Keep only Tauri-bridge related errors (filter pre-existing AudioParam noise). */
  function tauriBridgeErrors(): string[] {
    return pageErrors.filter(
      (e) =>
        e.includes('listen') ||
        e.includes('emit') ||
        e.includes('transformCallback') ||
        e.includes('tauri') ||
        e.includes('TAURI')
    );
  }

  /** Programmatically dispatch dragover + drop on the React Flow viewport,
   *  simulating a palette drag of a module type. */
  async function simulateDropOnCanvas(page: Page, moduleType: string): Promise<boolean> {
    return await page.evaluate((modType) => {
      const viewport = document.querySelector('.react-flow__viewport') as HTMLElement;
      if (!viewport) return false;

      // dragover first (prevents default for drop to fire)
      const dragOverEvent = new DragEvent('dragover', {
        bubbles: true,
        cancelable: true,
        clientX: 200,
        clientY: 200,
        dataTransfer: new DataTransfer(),
      });
      viewport.dispatchEvent(dragOverEvent);

      // drop with module type in the dataTransfer
      const dt = new DataTransfer();
      dt.setData('application/loxar-module', modType);
      const dropEvent = new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        clientX: 200,
        clientY: 200,
        dataTransfer: dt,
      });
      viewport.dispatchEvent(dropEvent);
      return true;
    }, moduleType);
  }

  test('app loads and canvas renders without Tauri bridge crashes', async ({ page }) => {
    await page.goto('/');
    await enterDashboard(page);

    // Dashboard shows GraphCanvas → React Flow container
    await expect(page.locator('.react-flow')).toBeVisible({ timeout: 30000 });

    // No Tauri-bridge crashes (validates useWidgetBridge guard fix)
    expect(
      tauriBridgeErrors(),
      `Tauri bridge errors: ${tauriBridgeErrors().join(' | ')}`
    ).toEqual([]);
  });

  test('drop module from palette creates a dynamic node on canvas', async ({ page }) => {
    await page.goto('/');
    await enterDashboard(page);
    await expect(page.locator('.react-flow')).toBeVisible({ timeout: 30000 });

    // Initially only the root node is present
    const initialCount = await page.locator('.react-flow__node').count();
    expect(initialCount).toBeGreaterThanOrEqual(1);

    // Simulate dropping a "Sintaxis" module from the palette onto the canvas
    const dropped = await simulateDropOnCanvas(page, 'syntax');
    expect(dropped).toBe(true);

    // Wait for React Flow to re-render with the new node
    await page.waitForTimeout(500);

    // After drop, a new dynamic node should appear (root + new node >= 2)
    const afterCount = await page.locator('.react-flow__node').count();
    expect(afterCount).toBeGreaterThanOrEqual(2);

    // The new node should have a "dyn_" prefix (created by handleDrop)
    const dynamicNode = page.locator('.react-flow__node[data-id^="dyn_"]');
    expect(await dynamicNode.count()).toBeGreaterThanOrEqual(1);

    // No Tauri-bridge crashes
    expect(
      tauriBridgeErrors(),
      `Tauri bridge errors: ${tauriBridgeErrors().join(' | ')}`
    ).toEqual([]);
  });

  test('nodes have both source and target handles (A1 dual-port fix)', async ({ page }) => {
    await page.goto('/');
    await enterDashboard(page);
    await expect(page.locator('.react-flow')).toBeVisible({ timeout: 30000 });

    // Drop a module to create a dynamic node with DYNAMIC_NODE_PORTS
    await simulateDropOnCanvas(page, 'syntax');
    await page.waitForTimeout(500);

    // A1 fix: DYNAMIC_NODE_PORTS has both left ('in') and right ('out') ports,
    // so ModuleNodeComponent renders BOTH Handle source (right) and Handle target (left).
    // RootNodeComponent always renders both as well.
    // In this React Flow version, handles have class:
    //   source: .react-flow__handle-right
    //   target: .react-flow__handle-left
    const sourceHandles = page.locator('.react-flow__handle-right');
    const targetHandles = page.locator('.react-flow__handle-left');
    const totalHandles = (await sourceHandles.count()) + (await targetHandles.count());

    // root node: 1 source + 1 target = 2
    // dynamic node: 1 source + 1 target = 2  (A1 fix: both ports present)
    // Total >= 4
    expect(totalHandles).toBeGreaterThanOrEqual(4);

    // Verify at least one source AND one target handle exist
    expect(await sourceHandles.count()).toBeGreaterThanOrEqual(1);
    expect(await targetHandles.count()).toBeGreaterThanOrEqual(1);

    // No Tauri-bridge crashes
    expect(
      tauriBridgeErrors(),
      `Tauri bridge errors: ${tauriBridgeErrors().join(' | ')}`
    ).toEqual([]);
  });
});
