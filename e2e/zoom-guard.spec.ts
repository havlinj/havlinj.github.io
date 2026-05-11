import { test, expect } from '@playwright/test';
import {
  ZOOM_COMPOSITION_CASES,
  applyDocZoom,
  assertCompositionLayout,
  readZoomGuardSnapshot,
  resetDocZoom,
} from './helpers/zoom-guard';

test.describe('ZoomGuard regression @zoom-guard', () => {
  test.beforeEach(({ browserName }) => {
    test.skip(
      browserName !== 'chromium',
      'Uses documentElement.style.zoom; same scope as square-containment matrix.',
    );
  });

  test('viewport squeeze: freeze stays on across hero → profile → writing → contact → hero', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 900 });
    await page.goto('/');
    await page.setViewportSize({ width: 360, height: 900 });
    await expect
      .poll(async () => (await readZoomGuardSnapshot(page)).frozen, {
        timeout: 4000,
      })
      .toBe(true);

    const order = ['/', '/profile', '/writing', '/contact', '/'] as const;
    for (const path of order) {
      await page.goto(path);
      await expect
        .poll(async () => (await readZoomGuardSnapshot(page)).frozen, {
          timeout: 4000,
        })
        .toBe(true);
      const c = ZOOM_COMPOSITION_CASES.find((x) => x.path === path)!;
      await assertCompositionLayout(page, c, {
        label: `${c.name} (narrow nav)`,
        tolerancePx: 8,
      });
      const snap = await readZoomGuardSnapshot(page);
      const scale = parseFloat(snap.freezeScale || '1');
      expect(Number.isFinite(scale), `freezeScale: ${snap.freezeScale}`).toBe(
        true,
      );
      expect(scale).toBeGreaterThan(0);
      expect(scale).toBeLessThanOrEqual(1);
    }

    await page.setViewportSize({ width: 1200, height: 900 });
    await expect
      .poll(async () => (await readZoomGuardSnapshot(page)).frozen, {
        timeout: 4000,
      })
      .toBe(false);
    await resetDocZoom(page);
  });

  test('viewport squeeze: hysteresis — freeze → wide exit → narrow re-entry', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 900 });
    await page.goto('/profile');
    await page.setViewportSize({ width: 360, height: 900 });
    await expect
      .poll(async () => (await readZoomGuardSnapshot(page)).frozen)
      .toBe(true);

    const safeWidth = 900;
    await page.setViewportSize({ width: safeWidth, height: 900 });
    await expect
      .poll(async () => (await readZoomGuardSnapshot(page)).frozen, {
        timeout: 4000,
      })
      .toBe(false);

    await page.setViewportSize({ width: 360, height: 900 });
    await expect
      .poll(async () => (await readZoomGuardSnapshot(page)).frozen, {
        timeout: 4000,
      })
      .toBe(true);

    await assertCompositionLayout(page, ZOOM_COMPOSITION_CASES[1], {
      label: 'profile after re-squeeze',
    });
    await page.setViewportSize({ width: 1200, height: 900 });
    await resetDocZoom(page);
  });

  test('reload at narrow viewport: freeze + composition layout survives', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 900 });
    await page.goto('/contact');
    await page.setViewportSize({ width: 360, height: 900 });
    await expect
      .poll(async () => (await readZoomGuardSnapshot(page)).frozen, {
        timeout: 4000,
      })
      .toBe(true);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect
      .poll(async () => (await readZoomGuardSnapshot(page)).frozen, {
        timeout: 6000,
      })
      .toBe(true);

    await assertCompositionLayout(page, ZOOM_COMPOSITION_CASES[3], {
      label: 'contact after reload narrow',
      tolerancePx: 8,
    });
    await page.setViewportSize({ width: 1200, height: 900 });
    await resetDocZoom(page);
  });

  test('stale persisted freeze at safe zoom (duplicated-tab class): clears and layout is valid', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 900 });
    await page.goto('/profile');
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

    await assertCompositionLayout(page, ZOOM_COMPOSITION_CASES[1], {
      label: 'profile after stale-guard clear',
    });

    // html.style.zoom does not drive the same metrics as ZoomGuard (see getZoomRatio
    // in Layout.astro); assert freeze via viewport squeeze like real pinch/narrow.
    await page.setViewportSize({ width: 360, height: 900 });
    await expect
      .poll(async () => (await readZoomGuardSnapshot(page)).frozen, {
        timeout: 4000,
      })
      .toBe(true);
    await assertCompositionLayout(page, ZOOM_COMPOSITION_CASES[1], {
      label: 'profile narrow after stale clear',
      tolerancePx: 8,
    });
    await page.setViewportSize({ width: 1200, height: 900 });
    await resetDocZoom(page);
  });

  test('document zoom ramp on each composition page: containment at each step', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1024, height: 900 });

    for (const c of ZOOM_COMPOSITION_CASES) {
      await page.goto(c.path);
      for (const z of [1, 1.5, 2, 2.5, 3] as const) {
        await applyDocZoom(page, z);
        await assertCompositionLayout(page, c, {
          label: `${c.name} docZoom=${z}`,
          tolerancePx: z >= 2.5 ? 10 : 8,
        });
      }
      await resetDocZoom(page);
    }
  });

  test('profile: doc zoom layout smoke + viewport-based freeze hysteresis', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1024, height: 900 });
    await page.goto('/profile');

    await applyDocZoom(page, 1);
    expect((await readZoomGuardSnapshot(page)).frozen).toBe(false);
    await applyDocZoom(page, 2.5);
    await assertCompositionLayout(page, ZOOM_COMPOSITION_CASES[1], {
      label: 'profile docZoom=2.5',
      tolerancePx: 10,
    });
    await resetDocZoom(page);

    await page.setViewportSize({ width: 360, height: 900 });
    await expect
      .poll(async () => (await readZoomGuardSnapshot(page)).frozen, {
        timeout: 4000,
      })
      .toBe(true);
    const frozenOnce = await readZoomGuardSnapshot(page);
    const s1 = parseFloat(frozenOnce.freezeScale || '0');
    expect(s1).toBeGreaterThan(0);
    expect(s1).toBeLessThanOrEqual(1);
    await assertCompositionLayout(page, ZOOM_COMPOSITION_CASES[1], {
      label: 'profile narrow frozen',
      tolerancePx: 8,
    });

    await page.setViewportSize({ width: 1200, height: 900 });
    await expect
      .poll(async () => (await readZoomGuardSnapshot(page)).frozen, {
        timeout: 4000,
      })
      .toBe(false);

    await page.setViewportSize({ width: 360, height: 900 });
    await expect
      .poll(async () => (await readZoomGuardSnapshot(page)).frozen, {
        timeout: 4000,
      })
      .toBe(true);

    await assertCompositionLayout(page, ZOOM_COMPOSITION_CASES[1], {
      label: 'profile narrow re-frozen',
      tolerancePx: 8,
    });
    await page.setViewportSize({ width: 1200, height: 900 });
    await resetDocZoom(page);
  });

  test('rapid viewport alternation settles to frozen then unfrozen', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 900 });
    await page.goto('/writing');
    await expect(
      page.locator('.writing-page .writing-groups.writing-groups--visible'),
    ).toBeVisible({ timeout: 8000 });

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
      .toBe(true);

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
    await page.goto('/profile');
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

  test('main content does not explode past viewport width (doc zoom 3, all composition)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 900, height: 900 });

    for (const c of ZOOM_COMPOSITION_CASES) {
      await page.goto(c.path);
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
        `${c.name}: document scrollWidth should stay near viewport`,
      ).toBeLessThanOrEqual(overflow.innerW + 24);
      await resetDocZoom(page);
    }
  });
});
