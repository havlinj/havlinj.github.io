import { test, expect } from '@playwright/test';
import {
  ZOOM_FREEZE_BASELINE_STORAGE_KEY,
  ZOOM_FREEZE_GUARD_STATE_STORAGE_KEY,
} from '../src/utils/zoom-guard-storage';
import { ZOOM_FREEZE_PENDING_CLASS } from '../src/utils/zoom-guard-math';
import {
  CONTENT_PANEL_CASES,
  applyDocZoom,
  assertContentPanelLayout,
  readContentWidthChPx,
  readMainVisualWidthPx,
  readZoomGuardSnapshot,
  resetDocZoom,
  simulateDevicePixelRatioOnly,
  simulatePageZoom,
  simulateVisualViewportScale,
} from './helpers/zoom-guard';

test.describe('ZoomGuard regression @zoom-guard', () => {
  test('viewport squeeze does not freeze; profile width matches credits', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/profile');
    await page.setViewportSize({ width: 390, height: 900 });

    await expect
      .poll(async () => (await readZoomGuardSnapshot(page)).frozen, {
        timeout: 4000,
      })
      .toBe(false);

    const profileW = await readMainVisualWidthPx(page);

    await page.goto('/credits');
    const creditsW = await readMainVisualWidthPx(page);

    expect(
      Math.abs(profileW - creditsW),
      `profile ${profileW}px vs credits ${creditsW}px at 390`,
    ).toBeLessThanOrEqual(8);

    await page.setViewportSize({ width: 1280, height: 900 });
  });

  test('viewport squeeze: layout stays valid across panel routes without freeze', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 900 });
    await page.goto('/');
    await page.setViewportSize({ width: 360, height: 900 });

    await expect
      .poll(async () => (await readZoomGuardSnapshot(page)).frozen, {
        timeout: 4000,
      })
      .toBe(false);

    const order = ['/', '/profile', '/writing', '/contact', '/'] as const;
    for (const path of order) {
      await page.goto(path);
      await expect
        .poll(async () => (await readZoomGuardSnapshot(page)).frozen, {
          timeout: 4000,
        })
        .toBe(false);
      const c = CONTENT_PANEL_CASES.find((x) => x.path === path)!;
      await assertContentPanelLayout(page, c, {
        label: `${c.name} (narrow, unfrozen)`,
        tolerancePx: 8,
      });
    }

    await page.setViewportSize({ width: 1200, height: 900 });
    await resetDocZoom(page);
  });

  test('Chrome/Firefox page zoom (DPR tracks) freezes past max safe', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 900 });
    await page.goto('/profile');

    await simulatePageZoom(page, 1.5, { dprTracksZoom: true });
    await expect
      .poll(async () => (await readZoomGuardSnapshot(page)).frozen, {
        timeout: 4000,
      })
      .toBe(false);
    await expect
      .poll(async () => (await readZoomGuardSnapshot(page)).veil, {
        timeout: 2000,
      })
      .toBe(false);

    await simulatePageZoom(page, 3, { dprTracksZoom: true });
    await expect
      .poll(async () => (await readZoomGuardSnapshot(page)).frozen, {
        timeout: 4000,
      })
      .toBe(true);

    await expect
      .poll(
        async () =>
          page.evaluate(
            (pendingClass) =>
              document
                .querySelector('main.content')
                ?.classList.contains(pendingClass) === true,
            ZOOM_FREEZE_PENDING_CLASS,
          ),
        { timeout: 2000 },
      )
      .toBe(false);

    const snap = await readZoomGuardSnapshot(page);
    const scale = parseFloat(snap.freezeScale || '1');
    expect(scale).toBeGreaterThan(0);
    expect(scale).toBeLessThan(1);

    await simulatePageZoom(page, 1, { dprTracksZoom: true });
    await expect
      .poll(async () => (await readZoomGuardSnapshot(page)).frozen, {
        timeout: 4000,
      })
      .toBe(false);
  });

  test('Safari-like page zoom (DPR static) freezes past max safe', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 900 });
    await page.goto('/profile');

    await simulatePageZoom(page, 3, { dprTracksZoom: false });
    await expect
      .poll(async () => (await readZoomGuardSnapshot(page)).frozen, {
        timeout: 4000,
      })
      .toBe(true);

    await simulatePageZoom(page, 1, { dprTracksZoom: false });
    await expect
      .poll(async () => (await readZoomGuardSnapshot(page)).frozen, {
        timeout: 4000,
      })
      .toBe(false);
  });

  test('page zoom 100% and 200% stay visible; 216% enters freeze', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 900 });
    await page.goto('/profile');

    await expect
      .poll(
        async () => {
          const snap = await readZoomGuardSnapshot(page);
          return !snap.frozen && !snap.veil;
        },
        { timeout: 4000 },
      )
      .toBe(true);

    await simulatePageZoom(page, 1.85, { dprTracksZoom: true });
    await expect
      .poll(async () => (await readZoomGuardSnapshot(page)).frozen, {
        timeout: 4000,
      })
      .toBe(false);
    await expect
      .poll(async () => (await readZoomGuardSnapshot(page)).veil, {
        timeout: 4000,
      })
      .toBe(false);

    await simulatePageZoom(page, 2, { dprTracksZoom: true });
    await expect
      .poll(async () => (await readZoomGuardSnapshot(page)).frozen, {
        timeout: 4000,
      })
      .toBe(false);
    await expect
      .poll(async () => (await readZoomGuardSnapshot(page)).veil, {
        timeout: 4000,
      })
      .toBe(false);

    await simulatePageZoom(page, 2.16, { dprTracksZoom: true });
    await expect
      .poll(async () => (await readZoomGuardSnapshot(page)).frozen, {
        timeout: 4000,
      })
      .toBe(true);

    const entered = await readZoomGuardSnapshot(page);
    const enteredScale = parseFloat(entered.freezeScale || '1');
    expect(enteredScale).toBeGreaterThan(0.99);
    expect(enteredScale).toBeLessThanOrEqual(1);

    await simulatePageZoom(page, 3, { dprTracksZoom: true });
    await expect
      .poll(
        async () => {
          const snap = await readZoomGuardSnapshot(page);
          return snap.frozen && parseFloat(snap.freezeScale || '1') < 1;
        },
        { timeout: 4000 },
      )
      .toBe(true);

    await simulatePageZoom(page, 1, { dprTracksZoom: true });
    await expect
      .poll(async () => (await readZoomGuardSnapshot(page)).frozen, {
        timeout: 4000,
      })
      .toBe(false);
    await expect
      .poll(async () => (await readZoomGuardSnapshot(page)).veil, {
        timeout: 4000,
      })
      .toBe(false);
  });

  test('Ctrl/+ does not arm veil below the lookahead band', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 900 });
    await page.goto('/profile');

    await simulatePageZoom(page, 1.5, { dprTracksZoom: true });
    await expect
      .poll(async () => (await readZoomGuardSnapshot(page)).veil, {
        timeout: 4000,
      })
      .toBe(false);

    await page.evaluate(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: '+',
          ctrlKey: true,
          bubbles: true,
        }),
      );
    });

    await expect
      .poll(async () => (await readZoomGuardSnapshot(page)).veil, {
        timeout: 2000,
      })
      .toBe(false);
    expect((await readZoomGuardSnapshot(page)).frozen).toBe(false);

    await simulatePageZoom(page, 1, { dprTracksZoom: true });
  });

  test('DPR-only jump does not recapture freeze baseline', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 900 });
    await page.goto('/profile');

    const before = await page.evaluate((key) => {
      const raw = window.sessionStorage.getItem(key);
      return raw
        ? (JSON.parse(raw) as { dpr: number; innerWidth: number })
        : null;
    }, ZOOM_FREEZE_BASELINE_STORAGE_KEY);
    expect(before).not.toBeNull();
    expect(before!.innerWidth).toBeGreaterThan(400);

    await simulateDevicePixelRatioOnly(page, before!.dpr * 2.5);

    const after = await page.evaluate((key) => {
      const raw = window.sessionStorage.getItem(key);
      return raw
        ? (JSON.parse(raw) as { dpr: number; innerWidth: number })
        : null;
    }, ZOOM_FREEZE_BASELINE_STORAGE_KEY);

    expect(after?.dpr).toBeCloseTo(before!.dpr, 5);
    expect(after?.innerWidth).toBe(before!.innerWidth);
    await expect
      .poll(async () => (await readZoomGuardSnapshot(page)).frozen, {
        timeout: 4000,
      })
      .toBe(false);
  });

  test('pinch-scale mock freezes; freeze CSS keeps visual width ≈ 70ch', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1024, height: 900 });
    await page.goto('/profile');

    await simulateVisualViewportScale(page, 3);
    await expect
      .poll(async () => (await readZoomGuardSnapshot(page)).frozen, {
        timeout: 4000,
      })
      .toBe(true);

    const snap = await readZoomGuardSnapshot(page);
    const scale = parseFloat(snap.freezeScale || '1');
    expect(scale).toBeGreaterThan(0);
    expect(scale).toBeLessThan(1);

    const visualW = await readMainVisualWidthPx(page);
    const { maxChPx } = await readContentWidthChPx(page);
    expect(
      Math.abs(visualW - Math.min(maxChPx, 1024)),
      `frozen visual ${visualW} vs ~70ch ${maxChPx}`,
    ).toBeLessThanOrEqual(24);

    await simulateVisualViewportScale(page, 1);
    await expect
      .poll(async () => (await readZoomGuardSnapshot(page)).frozen, {
        timeout: 4000,
      })
      .toBe(false);
  });

  test('forced freeze DOM: visual width stays near 70ch (not 70ch×scale)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/profile');

    const { visualW, maxChPx } = await page.evaluate(() => {
      const main = document.querySelector('main.content');
      if (!(main instanceof HTMLElement)) {
        return { visualW: 0, maxChPx: 0 };
      }
      const probe = document.createElement('div');
      probe.style.cssText =
        'position:absolute;visibility:hidden;font:inherit;width:1ch';
      document.body.appendChild(probe);
      const ch = probe.getBoundingClientRect().width || 8;
      probe.remove();
      const maxCh =
        parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue(
            '--content-width',
          ),
        ) || 70;
      const maxChPx = maxCh * ch;

      document.body.classList.add('zoom-threshold-exceeded');
      main.classList.add('zoom-freeze-active');
      main.style.setProperty('--zoom-freeze-scale', '0.55');
      const visualW = main.getBoundingClientRect().width;
      return { visualW, maxChPx };
    });

    expect(
      visualW,
      `visual ${visualW} must not collapse to ~70ch×0.55 (${maxChPx * 0.55})`,
    ).toBeGreaterThan(maxChPx * 0.75);
    expect(Math.abs(visualW - maxChPx)).toBeLessThanOrEqual(24);
  });

  test('stale persisted freeze at safe zoom clears; squeeze still does not freeze', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 900 });
    await page.goto('/profile');
    await page.evaluate(
      ({ baselineKey, stateKey }) => {
        window.sessionStorage.setItem(
          baselineKey,
          JSON.stringify({
            dpr: 1,
            vvScale: 1,
            innerWidth: 1200,
            outerWidth: 1200,
          }),
        );
        window.sessionStorage.setItem(
          stateKey,
          JSON.stringify({ active: true, freezeScale: 0.52, ts: 0 }),
        );
      },
      {
        baselineKey: ZOOM_FREEZE_BASELINE_STORAGE_KEY,
        stateKey: ZOOM_FREEZE_GUARD_STATE_STORAGE_KEY,
      },
    );
    await page.reload({ waitUntil: 'domcontentloaded' });

    await expect
      .poll(async () => (await readZoomGuardSnapshot(page)).frozen, {
        timeout: 4000,
      })
      .toBe(false);

    await assertContentPanelLayout(page, CONTENT_PANEL_CASES[1], {
      label: 'profile after stale-guard clear',
    });

    await page.setViewportSize({ width: 360, height: 900 });
    await expect
      .poll(async () => (await readZoomGuardSnapshot(page)).frozen, {
        timeout: 4000,
      })
      .toBe(false);
    await assertContentPanelLayout(page, CONTENT_PANEL_CASES[1], {
      label: 'profile narrow after stale clear',
      tolerancePx: 8,
    });
    await page.setViewportSize({ width: 1200, height: 900 });
    await resetDocZoom(page);
  });

  test('document zoom ramp on each content panel page: containment at each step', async ({
    page,
    browserName,
  }) => {
    test.skip(
      browserName !== 'chromium',
      'documentElement.style.zoom is Chromium-only.',
    );
    await page.setViewportSize({ width: 1024, height: 900 });

    for (const c of CONTENT_PANEL_CASES) {
      await page.goto(c.path);
      for (const z of [1, 1.5, 2, 2.5, 3] as const) {
        await applyDocZoom(page, z);
        await assertContentPanelLayout(page, c, {
          label: `${c.name} docZoom=${z}`,
          tolerancePx: z >= 2.5 ? 10 : 8,
        });
      }
      await resetDocZoom(page);
    }
  });

  test('pinch-scale freeze hysteresis: enter → exit → re-enter', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1024, height: 900 });
    await page.goto('/profile');

    await simulateVisualViewportScale(page, 3);
    await expect
      .poll(async () => (await readZoomGuardSnapshot(page)).frozen, {
        timeout: 4000,
      })
      .toBe(true);
    await assertContentPanelLayout(page, CONTENT_PANEL_CASES[1], {
      label: 'profile pinch frozen',
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

    await assertContentPanelLayout(page, CONTENT_PANEL_CASES[1], {
      label: 'profile pinch re-frozen',
      tolerancePx: 10,
    });
    await simulateVisualViewportScale(page, 1);
  });

  test('rapid viewport alternation settles unfrozen', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 900 });
    await page.goto('/profile');

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
    await page.goto('/profile');
    await page.evaluate(() => {
      window.dispatchEvent(
        new WheelEvent('wheel', {
          deltaY: 1,
          ctrlKey: true,
          metaKey: true,
          bubbles: true,
        }),
      );
    });
    const snap = await readZoomGuardSnapshot(page);
    expect(snap).toMatchObject({ frozen: expect.any(Boolean) });
  });

  test('main content does not explode past viewport width (doc zoom 3, all content panels)', async ({
    page,
    browserName,
  }) => {
    test.skip(
      browserName !== 'chromium',
      'documentElement.style.zoom is Chromium-only.',
    );
    await page.setViewportSize({ width: 900, height: 900 });

    for (const c of CONTENT_PANEL_CASES) {
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
