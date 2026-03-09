import { test, expect } from '@playwright/test';
import { MIN_CONTENT_WIDTH_CH, MIN_CONTENT_WIDTH_PX } from './constants';

test.describe('Global colors', () => {
  test('body has correct background color', async ({ page }) => {
    await page.goto('/');
    const body = page.locator('body');
    await expect(body).toHaveCSS('background-color', 'rgb(224, 247, 250)');
  });

  test('body has correct text color', async ({ page }) => {
    await page.goto('/');
    const body = page.locator('body');
    await expect(body).toHaveCSS('color', 'rgb(17, 17, 17)');
  });
});

test.describe('Global typography', () => {
  test('root font is Inter', async ({ page }) => {
    await page.goto('/');
    const html = page.locator('html');
    await expect(html).toHaveCSS('font-family', /Inter/);
  });

  test('root font-size is 16px (1rem)', async ({ page }) => {
    await page.goto('/');
    const html = page.locator('html');
    await expect(html).toHaveCSS('font-size', '16px');
  });
});

test.describe('Content width limits', () => {
  test(':root defines --content-min-width (40ch)', async ({ page }) => {
    await page.goto('/');
    const value = await page.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue('--content-min-width')
        .trim(),
    );
    expect(value).toBe(`${MIN_CONTENT_WIDTH_CH}ch`);
  });

  test('main.content applies min-width (does not shrink below it at narrow viewport)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 300, height: 600 });
    await page.goto('/');
    const main = page.locator('main.content');
    await expect(main).toBeVisible();
    const [boxWidth, computedMin] = await main.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      const min = getComputedStyle(el).minWidth;
      return [rect.width, Number.parseInt(min, 10)];
    });
    expect(computedMin).toBeGreaterThan(0);
    expect(boxWidth).toBeGreaterThanOrEqual(computedMin - 1);
  });

  test('main.content has max-width from --content-width (70ch)', async ({
    page,
  }) => {
    await page.goto('/');
    const main = page.locator('main.content');
    await expect(main).toBeVisible();
    const maxWidth = await main.evaluate((el) => {
      const v = getComputedStyle(el).maxWidth;
      return v;
    });
    expect(maxWidth).toMatch(/^\d+px$/);
    const maxPx = Number.parseInt(maxWidth, 10);
    // 70ch at 16px is typically ~500–600px depending on font
    expect(maxPx).toBeGreaterThanOrEqual(400);
    expect(maxPx).toBeLessThanOrEqual(900);
  });

  test('content width stays within min at narrow viewport', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 300, height: 600 });
    await page.goto('/');
    const main = page.locator('main.content');
    await expect(main).toBeVisible();
    const box = await main.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.width).toBeGreaterThanOrEqual(MIN_CONTENT_WIDTH_PX - 1);
  });

  test('content width does not exceed max at wide viewport', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('/');
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
