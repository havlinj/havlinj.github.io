import { test, expect, type Page } from '@playwright/test';
import { RGB_INK, RGB_PAGE_BG } from '../src/constants/colors';
import {
  LAYOUT_TOLERANCE,
  MAX_CONTENT_WIDTH_CH,
  MIN_CONTENT_WIDTH_CH,
} from './constants';

/** Home page: DOM + stylesheets are enough; default `load` waits on hero image + webfonts. */
async function gotoHomeForGlobals(page: Page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
}

/** Same font context as page: measure `ch` widths used by `min(40ch, 100%)` / `max-width: 70ch`. */
async function readMainLayoutSnapshot(page: Page): Promise<{
  fortyChPx: number;
  seventyChPx: number;
  innerW: number;
  mw: number;
  scrollW: number;
  clientW: number;
}> {
  return page.evaluate(() => {
    const probe = document.createElement('div');
    probe.setAttribute('aria-hidden', 'true');
    probe.style.cssText =
      'position:absolute;left:-9999px;top:0;width:40ch;height:0;overflow:hidden;visibility:hidden;pointer-events:none';
    document.body.appendChild(probe);
    const fortyChPx = probe.getBoundingClientRect().width;
    probe.style.width = '70ch';
    const seventyChPx = probe.getBoundingClientRect().width;
    probe.remove();
    const main = document.querySelector('main.content');
    if (!(main instanceof HTMLElement)) {
      throw new Error('readMainLayoutSnapshot: missing main.content');
    }
    return {
      fortyChPx,
      seventyChPx,
      innerW: window.innerWidth,
      mw: main.getBoundingClientRect().width,
      scrollW: document.documentElement.scrollWidth,
      clientW: document.documentElement.clientWidth,
    };
  });
}

async function readDocumentOverflow(page: Page): Promise<{
  scrollW: number;
  clientW: number;
}> {
  return page.evaluate(() => ({
    scrollW: document.documentElement.scrollWidth,
    clientW: document.documentElement.clientWidth,
  }));
}

test.describe('Global colors', () => {
  test('body has correct background color', async ({ page }) => {
    await gotoHomeForGlobals(page);
    const body = page.locator('body');
    await expect(body).toHaveCSS('background-color', RGB_PAGE_BG);
  });

  test('body has correct text color', async ({ page }) => {
    await gotoHomeForGlobals(page);
    const body = page.locator('body');
    await expect(body).toHaveCSS('color', RGB_INK);
  });
});

test.describe('Global typography', () => {
  test('root font is Inter', async ({ page }) => {
    await gotoHomeForGlobals(page);
    const html = page.locator('html');
    await expect(html).toHaveCSS('font-family', /Inter/);
  });

  test('root font-size is 16px (1rem)', async ({ page }) => {
    await gotoHomeForGlobals(page);
    const html = page.locator('html');
    await expect(html).toHaveCSS('font-size', '16px');
  });
});

test.describe('Content width limits', () => {
  const tol = LAYOUT_TOLERANCE;

  test(':root defines --content-min-width (40ch)', async ({ page }) => {
    await gotoHomeForGlobals(page);
    const value = await page.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue('--content-min-width')
        .trim(),
    );
    expect(value).toBe(`${MIN_CONTENT_WIDTH_CH}ch`);
  });

  test('narrow viewports: main fits; no doc horizontal overflow; 40ch not forced wider than vw', async ({
    page,
  }) => {
    const main = page.locator('main.content');
    for (const width of [300, 360, 390] as const) {
      await page.setViewportSize({ width, height: 700 });
      await gotoHomeForGlobals(page);
      await expect(main).toBeVisible();
      const s = await readMainLayoutSnapshot(page);
      expect(s.mw).toBeLessThanOrEqual(s.innerW + tol);
      expect(s.scrollW).toBeLessThanOrEqual(s.clientW + tol);
      if (s.fortyChPx > s.innerW + tol) {
        expect(s.mw).toBeLessThan(s.fortyChPx - 8);
      }
    }
  });

  test('wide viewport: main width is between min(40ch, vw) and min(70ch, vw)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await gotoHomeForGlobals(page);
    await expect(page.locator('main.content')).toBeVisible();
    const s = await readMainLayoutSnapshot(page);
    const floor = Math.min(s.fortyChPx, s.innerW);
    const cap = Math.min(s.seventyChPx, s.innerW);
    expect(s.mw).toBeGreaterThanOrEqual(floor - tol);
    expect(s.mw).toBeLessThanOrEqual(cap + tol);
  });

  test('writing index: no document horizontal overflow at narrow layout viewport', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto('/writing', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('main.content')).toBeVisible();
    const { scrollW, clientW } = await readDocumentOverflow(page);
    expect(scrollW).toBeLessThanOrEqual(clientW + tol);
    const s = await readMainLayoutSnapshot(page);
    expect(s.mw).toBeLessThanOrEqual(s.innerW + tol);
    if (s.fortyChPx > s.innerW + tol) {
      expect(s.mw).toBeLessThan(s.fortyChPx - 8);
    }
  });

  test('main.content has max-width from --content-width (70ch)', async ({
    page,
  }) => {
    await gotoHomeForGlobals(page);
    const [rootVar, mainMaxWidth] = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement)
        .getPropertyValue('--content-width')
        .trim();
      const main = document.querySelector('main.content');
      const max = main ? getComputedStyle(main).maxWidth : '';
      return [root, max];
    });
    expect(rootVar).toBe(`${MAX_CONTENT_WIDTH_CH}ch`);
    expect(mainMaxWidth).toMatch(/^\d+(\.\d+)?px$/);
  });

  test('content width does not exceed max at wide viewport', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await gotoHomeForGlobals(page);
    const main = page.locator('main.content');
    await expect(main).toBeVisible();
    const [boxWidth, maxWidthPx] = await main.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      const max = getComputedStyle(el).maxWidth;
      return [rect.width, Number.parseInt(max, 10)];
    });
    expect(boxWidth).toBeLessThanOrEqual(maxWidthPx + 1);
  });
});
