import { expect, test, type Page } from '@playwright/test';
import { CONTENT_PANEL_SELECTORS } from '../src/constants/content-panel';
import { readContentPanelContainment } from './helpers';
import {
  MAINTENANCE_CONTENT_PANEL_CASE,
  applyDocZoom,
  assertContentPanelLayout,
  readZoomGuardSnapshot,
  resetDocZoom,
  simulateVisualViewportScale,
} from './helpers/zoom-guard';

const MAINTENANCE_CASE = MAINTENANCE_CONTENT_PANEL_CASE;

const CONTAINMENT_MATRIX = [
  { viewport: { width: 1440, height: 900 }, zooms: [1, 1.5, 2, 2.3] },
  { viewport: { width: 1024, height: 768 }, zooms: [1, 1.5, 2] },
  { viewport: { width: 390, height: 844 }, zooms: [1, 1.5, 2] },
] as const;

async function applyZoomWithRetry(page: Page, zoom: number): Promise<void> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await page.waitForLoadState('domcontentloaded');
      await page.evaluate((z) => {
        document.documentElement.style.zoom = String(z);
        window.dispatchEvent(new Event('resize'));
      }, zoom);
      return;
    } catch (err) {
      if (attempt === 1) throw err;
      await page.waitForLoadState('domcontentloaded');
    }
  }
}

test.describe('maintenance zoom guard @zoom-guard', () => {
  test.beforeEach(({ browserName }) => {
    test.skip(
      browserName !== 'chromium',
      'Uses documentElement.style.zoom; same scope as content-panel-containment matrix.',
    );
  });

  test('viewport squeeze does not freeze across maintenance → profile → maintenance', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 900 });
    await page.goto('/writing');
    await page.setViewportSize({ width: 360, height: 900 });
    await expect
      .poll(async () => (await readZoomGuardSnapshot(page)).frozen, {
        timeout: 4000,
      })
      .toBe(false);

    for (const path of ['/writing', '/profile', '/writing'] as const) {
      await page.goto(path);
      await expect
        .poll(async () => (await readZoomGuardSnapshot(page)).frozen, {
          timeout: 4000,
        })
        .toBe(false);

      if (path === '/writing') {
        await assertContentPanelLayout(page, MAINTENANCE_CASE, {
          label: 'maintenance (narrow, unfrozen)',
          tolerancePx: 8,
        });
      }
    }

    await page.setViewportSize({ width: 1200, height: 900 });
    await resetDocZoom(page);
  });

  test('reload at narrow viewport: stays unfrozen with valid layout', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 900 });
    await page.goto('/writing');
    await page.setViewportSize({ width: 360, height: 900 });
    await expect
      .poll(async () => (await readZoomGuardSnapshot(page)).frozen, {
        timeout: 4000,
      })
      .toBe(false);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect
      .poll(async () => (await readZoomGuardSnapshot(page)).frozen, {
        timeout: 6000,
      })
      .toBe(false);

    await assertContentPanelLayout(page, MAINTENANCE_CASE, {
      label: 'maintenance after reload narrow',
      tolerancePx: 8,
    });
    await page.setViewportSize({ width: 1200, height: 900 });
    await resetDocZoom(page);
  });

  test('stale persisted freeze at safe zoom clears; squeeze still does not freeze', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 900 });
    await page.goto('/writing');
    await page.evaluate(() => {
      window.sessionStorage.setItem(
        'zoomFreezeBaselineV2',
        JSON.stringify({ dpr: 1, vvScale: 1, innerWidth: 1200 }),
      );
      window.sessionStorage.setItem(
        'zoomFreezeGuardStateV2',
        JSON.stringify({ active: true, freezeScale: 0.52, ts: 0 }),
      );
    });
    await page.reload({ waitUntil: 'domcontentloaded' });

    await expect
      .poll(async () => (await readZoomGuardSnapshot(page)).frozen, {
        timeout: 4000,
      })
      .toBe(false);

    await assertContentPanelLayout(page, MAINTENANCE_CASE, {
      label: 'maintenance after stale-guard clear',
    });

    await page.setViewportSize({ width: 360, height: 900 });
    await expect
      .poll(async () => (await readZoomGuardSnapshot(page)).frozen, {
        timeout: 4000,
      })
      .toBe(false);
    await assertContentPanelLayout(page, MAINTENANCE_CASE, {
      label: 'maintenance narrow after stale clear',
      tolerancePx: 8,
    });
    await page.setViewportSize({ width: 1200, height: 900 });
    await resetDocZoom(page);
  });

  test('document zoom ramp: containment at each step', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 900 });
    await page.goto('/writing');

    for (const z of [1, 1.5, 2, 2.5, 3] as const) {
      await applyDocZoom(page, z);
      await assertContentPanelLayout(page, MAINTENANCE_CASE, {
        label: `maintenance docZoom=${z}`,
        tolerancePx: z >= 2.5 ? 10 : 8,
      });
    }
    await resetDocZoom(page);
  });

  test('pinch-scale freeze hysteresis on maintenance panel', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1024, height: 900 });
    await page.goto('/writing');

    await applyDocZoom(page, 1);
    expect((await readZoomGuardSnapshot(page)).frozen).toBe(false);
    await applyDocZoom(page, 2.5);
    await assertContentPanelLayout(page, MAINTENANCE_CASE, {
      label: 'maintenance docZoom=2.5',
      tolerancePx: 10,
    });
    await resetDocZoom(page);

    await simulateVisualViewportScale(page, 3);
    await expect
      .poll(async () => (await readZoomGuardSnapshot(page)).frozen, {
        timeout: 4000,
      })
      .toBe(true);
    const frozenOnce = await readZoomGuardSnapshot(page);
    const freezeScale = parseFloat(frozenOnce.freezeScale || '0');
    expect(freezeScale).toBeGreaterThan(0);
    expect(freezeScale).toBeLessThanOrEqual(1);
    await assertContentPanelLayout(page, MAINTENANCE_CASE, {
      label: 'maintenance pinch frozen',
      tolerancePx: 10,
    });

    await simulateVisualViewportScale(page, 1);
    await expect
      .poll(async () => (await readZoomGuardSnapshot(page)).frozen, {
        timeout: 4000,
      })
      .toBe(false);

    await simulateVisualViewportScale(page, 3);
    await expect
      .poll(async () => (await readZoomGuardSnapshot(page)).frozen, {
        timeout: 4000,
      })
      .toBe(true);

    await assertContentPanelLayout(page, MAINTENANCE_CASE, {
      label: 'maintenance pinch re-frozen',
      tolerancePx: 10,
    });
    await simulateVisualViewportScale(page, 1);
  });

  test('rapid viewport alternation settles unfrozen', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 900 });
    await page.goto('/writing');
    await expect(page.locator('.route-maintenance-panel')).toBeVisible({
      timeout: 8000,
    });

    for (let i = 0; i < 14; i += 1) {
      await page.setViewportSize({
        width: i % 2 === 0 ? 1100 : 360,
        height: 900,
      });
    }

    await expect
      .poll(async () => (await readZoomGuardSnapshot(page)).frozen, {
        timeout: 6000,
      })
      .toBe(false);

    await page.setViewportSize({ width: 1200, height: 900 });
    await expect
      .poll(async () => (await readZoomGuardSnapshot(page)).frozen, {
        timeout: 6000,
      })
      .toBe(false);
    await resetDocZoom(page);
  });

  test('ctrl+wheel dispatches without error; guard snapshot readable', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1024, height: 900 });
    await page.goto('/writing');
    await page.evaluate(() => {
      window.dispatchEvent(
        new WheelEvent('wheel', {
          deltaY: 1,
          ctrlKey: true,
          bubbles: true,
        }),
      );
    });
    const snap = await readZoomGuardSnapshot(page);
    expect(snap).toMatchObject({ frozen: expect.any(Boolean) });
  });

  test('main content does not explode past viewport width (doc zoom 3)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 900, height: 900 });
    await page.goto('/writing');
    await applyDocZoom(page, 3);
    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      const main = document.querySelector('main.content');
      return {
        innerW: window.innerWidth,
        docScrollW: doc.scrollWidth,
        mainClientW: main instanceof HTMLElement ? main.clientWidth : 0,
      };
    });
    expect(
      overflow.docScrollW,
      'maintenance: document scrollWidth should stay near viewport',
    ).toBeLessThanOrEqual(overflow.innerW + 24);
    await resetDocZoom(page);
  });

  test('viewport squeeze does not activate freeze on maintenance', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 900 });
    await page.goto('/writing');
    await page.setViewportSize({ width: 360, height: 900 });
    await expect
      .poll(async () => (await readZoomGuardSnapshot(page)).frozen, {
        timeout: 4000,
      })
      .toBe(false);
  });

  test('content panel stays aligned inside main.content across viewport/zoom matrix', async ({
    page,
  }) => {
    for (const entry of CONTAINMENT_MATRIX) {
      await page.setViewportSize(entry.viewport);
      await page.goto('/writing');

      for (const zoom of entry.zooms) {
        await applyZoomWithRetry(page, zoom);

        const result = await readContentPanelContainment(page.locator('body'), {
          contentPanelSelector: CONTENT_PANEL_SELECTORS.maintenance,
          containerSelector: 'main.content',
          tolerancePx: 3,
        });
        expect(
          result.ok,
          `maintenance failed at ${entry.viewport.width}x${entry.viewport.height}, zoom ${zoom}: ${JSON.stringify(
            result,
          )}`,
        ).toBe(true);

        await assertContentPanelLayout(page, MAINTENANCE_CASE, {
          label: `maintenance matrix ${entry.viewport.width}x${entry.viewport.height} zoom=${zoom}`,
          tolerancePx: zoom >= 2 ? 10 : 8,
        });
      }

      await resetDocZoom(page);
    }
  });
});
