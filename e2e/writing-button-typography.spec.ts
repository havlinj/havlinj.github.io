import { test, expect } from '@playwright/test';

/**
 * Locks in Writing index row typography: fluid inner font-size (clamp + cqi),
 * title weight 600, date size as em of inner, container query letter-spacing,
 * and date end padding (padding-inline-end only).
 * @see src/styles/pages/writing.css
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
  const datePadEndPx = parseFloat(csDate.paddingInlineEnd);
  const datePadStartPx = parseFloat(csDate.paddingInlineStart);
  const datePadTopPx = parseFloat(csDate.paddingTop);
  const datePadBottomPx = parseFloat(csDate.paddingBottom);

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
    datePadEndOverDate:
      Number.isFinite(datePadEndPx) && datePx > 0 ? datePadEndPx / datePx : NaN,
    datePadStartPx,
    datePadTopPx,
    datePadBottomPx,
    fontWeight: csText.fontWeight,
    fontStyle: csText.fontStyle,
  };
}

test.describe('Writing page button typography', () => {
  test('title weight 600; date height tracks inner (~0.8em); title ~0.98em of inner', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await gotoWritingReady(page);
    const m = await page.evaluate(readWritingButtonMetrics);
    expect(m, 'metrics from first list button').not.toBeNull();
    expect(m!.fontWeight).toBe('600');
    expect(m!.dateOverInner).toBeGreaterThan(0.78);
    expect(m!.dateOverInner).toBeLessThan(0.82);
    expect(m!.textOverInner).toBeGreaterThan(0.96);
    expect(m!.textOverInner).toBeLessThan(1.0);
    expect(m!.fontStyle).toBe('normal');
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

  test('wide column: title ~0.06em tracking; date ~0.035em', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await gotoWritingReady(page);
    const m = await page.evaluate(readWritingButtonMetrics);
    expect(m).not.toBeNull();
    expect(m!.textTrackingRatio).toBeGreaterThan(0.058);
    expect(m!.textTrackingRatio).toBeLessThan(0.062);
    expect(m!.dateTrackingRatio).toBeGreaterThan(0.032);
    expect(m!.dateTrackingRatio).toBeLessThan(0.038);
  });

  test('narrow column (container ≤34rem): title tighter than wide; date tighter than wide', async ({
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
    expect(narrow!.dateTrackingRatio).toBeLessThan(wide!.dateTrackingRatio);
  });

  test('date padding is end-only (~0.2em of date size)', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await gotoWritingReady(page);
    const m = await page.evaluate(readWritingButtonMetrics);
    expect(m).not.toBeNull();
    expect(m!.datePadEndOverDate).toBeGreaterThan(0.18);
    expect(m!.datePadEndOverDate).toBeLessThan(0.22);
    expect(m!.datePadStartPx).toBe(0);
    expect(m!.datePadTopPx).toBe(0);
    expect(m!.datePadBottomPx).toBe(0);
  });
});
