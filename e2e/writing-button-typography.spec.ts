import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

/**
 * Locks in Writing index row typography: fluid inner font-size (clamp + cqi),
 * title weight 600, date size as em of inner, container query letter-spacing.
 * @see src/styles/writing.css
 */

async function gotoWritingReady(page: import('@playwright/test').Page) {
  await page.goto('/writing', { waitUntil: 'domcontentloaded' });
  await expect(
    page.locator('.writing-groups.writing-groups--visible'),
  ).toBeVisible({ timeout: 10_000 });
}

function readWritingButtonMetrics() {
  const btn = document.querySelector(
    '.writing-groups .post-list a.page-button',
  );
  if (!btn) return null;
  const inner = btn.querySelector('.page-button__inner');
  const text = btn.querySelector('.page-button__text');
  const date = btn.querySelector('.page-button__date');
  if (!inner || !text || !date) return null;

  const csInner = getComputedStyle(inner);
  const csText = getComputedStyle(text);
  const csDate = getComputedStyle(date);

  const innerPx = parseFloat(csInner.fontSize);
  const textPx = parseFloat(csText.fontSize);
  const datePx = parseFloat(csDate.fontSize);
  const textTrackPx = parseFloat(csText.letterSpacing);
  const dateTrackPx = parseFloat(csDate.letterSpacing);

  return {
    innerPx,
    textPx,
    datePx,
    dateOverInner: datePx / innerPx,
    textOverInner: textPx / innerPx,
    textTrackingRatio:
      Number.isFinite(textTrackPx) && textPx > 0 ? textTrackPx / textPx : NaN,
    dateTrackingRatio:
      Number.isFinite(dateTrackPx) && datePx > 0 ? dateTrackPx / datePx : NaN,
    fontWeight: csText.fontWeight,
    fontStyle: csText.fontStyle,
  };
}

async function hasWritingFallbackRuleInSource() {
  const css = await readFile('src/styles/writing.css', 'utf-8');
  const hasDefaultItalic = /\.writing-page\s+\.page-button__text\s*\{[\s\S]*?font-style:\s*italic\s*;/m.test(
    css,
  );
  const hasObliqueEnhancement =
    /@supports\s*\(\s*font-style:\s*oblique\s+7deg\s*\)\s*\{[\s\S]*?\.writing-page\s+\.page-button__text\s*\{[\s\S]*?font-style:\s*oblique\s+7deg\s*;/m.test(
      css,
    );
  return hasDefaultItalic && hasObliqueEnhancement;
}

test.describe('Writing page button typography', () => {
  test('title weight 600; date height tracks inner (~0.78em); title ~0.98em of inner', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await gotoWritingReady(page);
    const m = await page.evaluate(readWritingButtonMetrics);
    expect(m, 'metrics from first list button').not.toBeNull();
    expect(m!.fontWeight).toBe('600');
    expect(m!.dateOverInner).toBeGreaterThan(0.76);
    expect(m!.dateOverInner).toBeLessThan(0.8);
    expect(m!.textOverInner).toBeGreaterThan(0.96);
    expect(m!.textOverInner).toBeLessThan(1.0);
    expect(
      m!.fontStyle.includes('italic') || m!.fontStyle.includes('oblique'),
    ).toBe(true);
  });

  test('inner font-size is smaller on narrow viewport than on wide', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await gotoWritingReady(page);
    const wide = await page.evaluate(readWritingButtonMetrics);
    expect(wide).not.toBeNull();

    await page.setViewportSize({ width: 375, height: 667 });
    await gotoWritingReady(page);
    const narrow = await page.evaluate(readWritingButtonMetrics);
    expect(narrow).not.toBeNull();

    expect(narrow!.innerPx).toBeLessThan(wide!.innerPx);
  });

  test('wide column: title ~0.07em tracking; date ~0.02em', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await gotoWritingReady(page);
    const m = await page.evaluate(readWritingButtonMetrics);
    expect(m).not.toBeNull();
    expect(m!.textTrackingRatio).toBeGreaterThan(0.065);
    expect(m!.textTrackingRatio).toBeLessThan(0.075);
    expect(m!.dateTrackingRatio).toBeGreaterThan(0.015);
    expect(m!.dateTrackingRatio).toBeLessThan(0.025);
  });

  test('fallback + enhancement CSS rules for slanted style are present', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await gotoWritingReady(page);
    const hasFallback = await hasWritingFallbackRuleInSource();
    expect(hasFallback).toBe(true);
  });

  test('narrow column (container ≤34rem): title tighter than wide; date looser than wide', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await gotoWritingReady(page);
    const wide = await page.evaluate(readWritingButtonMetrics);
    expect(wide).not.toBeNull();

    await page.setViewportSize({ width: 375, height: 667 });
    await gotoWritingReady(page);
    const narrow = await page.evaluate(readWritingButtonMetrics);
    expect(narrow).not.toBeNull();

    expect(narrow!.textTrackingRatio).toBeLessThan(wide!.textTrackingRatio);
    expect(narrow!.dateTrackingRatio).toBeGreaterThan(wide!.dateTrackingRatio);
  });
});
