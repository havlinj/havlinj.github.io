import { test, expect } from '@playwright/test';
import { RGB_INK, RGB_PAGE_BG } from '../src/constants/colors';
import {
  MAX_CONTENT_WIDTH_CH,
  MIN_CONTENT_WIDTH_CH,
  MIN_CONTENT_WIDTH_PX,
} from './constants';

test.describe('Global colors', () => {
  test('body has correct background color', async ({ page }) => {
    await page.goto('/');
    const body = page.locator('body');
    await expect(body).toHaveCSS('background-color', RGB_PAGE_BG);
  });

  test('body has correct text color', async ({ page }) => {
    await page.goto('/');
    const body = page.locator('body');
    await expect(body).toHaveCSS('color', RGB_INK);
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
    const [rootVar, mainMaxWidth] = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement)
        .getPropertyValue('--content-width')
        .trim();
      const main = document.querySelector('main.content');
      const max = main ? getComputedStyle(main).maxWidth : '';
      return [root, max];
    });
    expect(rootVar).toBe(`${MAX_CONTENT_WIDTH_CH}ch`);
    expect(mainMaxWidth).toMatch(/^\d+px$/);
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
