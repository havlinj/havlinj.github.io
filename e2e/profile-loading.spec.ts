import { test, expect } from '@playwright/test';
import {
  expectProfileLayoutStable,
  expectSharedPageRevealTransition,
  gotoMainPageRevealReady,
  gotoProfileWhenReady,
  PAGE_REVEAL_SELECTORS,
  readProfileLayoutSnapshot,
  holdProfilePortrait,
  waitForProfileTileLabelFit,
} from './helpers';
import {
  expectProfileFrameGuttersSynced,
  readProfileFrameGutterSnapshot,
} from './helpers/profile-frame-gutters';

test.describe('/profile — loading veil, reveal fade, layout stability', () => {
  test.use({
    viewport: { width: 1280, height: 900 },
  });

  test('uses shared page reveal opacity transition on the grid', async ({
    page,
  }) => {
    await gotoMainPageRevealReady(page, 'profile');
    await expectSharedPageRevealTransition(page, PAGE_REVEAL_SELECTORS.profile);
  });

  test('preloads portrait and tile background images in head', async ({
    page,
  }) => {
    await page.goto('/profile', { waitUntil: 'domcontentloaded' });
    const hrefs = await page.evaluate(() =>
      Array.from(
        document.querySelectorAll('link[rel="preload"][as="image"]'),
      ).map((el) => (el as HTMLLinkElement).href),
    );
    expect(
      hrefs.some((h) => h.includes('portrait_bayer16_style')),
      'portrait preload',
    ).toBe(true);
    expect(
      hrefs.some((h) => h.includes('tommy-RCA--h6cmcU-unsplash_dichrom')),
      'Why tile bg preload',
    ).toBe(true);
    expect(
      hrefs.some((h) => h.includes('uve-sanchez-9DRX_cW48RQ-unsplashdichrom')),
      'Foundations tile bg preload',
    ).toBe(true);
    expect(
      hrefs.some((h) => h.includes('what-i-do/fallback_desktop')),
      'What I do fallback poster preload',
    ).toBe(true);
  });

  test('grid geometry and type-fit vars stay stable after reveal', async ({
    page,
  }) => {
    await gotoProfileWhenReady(page);
    const gutters = await readProfileFrameGutterSnapshot(page);
    expectProfileFrameGuttersSynced(gutters);

    const settled = await readProfileLayoutSnapshot(page);
    expect(settled.labelFontPx).toMatch(/px$/);
    expect(settled.frames).toHaveLength(4);

    /* Past deferred ResizeObserver wiring (4 rAF) + reveal fade (~180ms). */
    await page.waitForTimeout(500);

    const after = await readProfileLayoutSnapshot(page);
    expectProfileLayoutStable(settled, after);
  });

  test('keeps loading class until portrait and type-fit are both complete', async ({
    page,
  }) => {
    const portrait = await holdProfilePortrait(page);
    try {
      await page.goto('/profile', { waitUntil: 'domcontentloaded' });
      const section = page.locator('.profile-section');

      await waitForProfileTileLabelFit(page);
      await expect(section).toHaveClass(/profile-section--loading/);

      portrait.allow();
      await gotoProfileWhenReady(page);
      await expect(section).not.toHaveClass(/profile-section--loading/);
    } finally {
      await portrait.dispose();
    }
  });
});
