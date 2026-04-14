import { test, expect } from '@playwright/test';

/** Must match `special-typography.css` @media (max-width: 640px) for list marker tokens */
const LIST_MARKER_BREAKPOINT_PX = 640;

/** @see src/styles/special-typography.css — ul/ol marker column tokens */
async function readListMarkerTokens(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    return {
      afterGap: root.getPropertyValue('--list-after-marker-gap').trim(),
      markerLeft: root.getPropertyValue('--list-marker-left').trim(),
    };
  });
}

async function readFirstUnorderedMarkerMetrics(
  page: import('@playwright/test').Page,
) {
  return page.evaluate(() => {
    const li = document.querySelector('ul li');
    if (!(li instanceof HTMLElement)) return null;
    const marker = getComputedStyle(li, '::before');
    return {
      widthPx: parseFloat(marker.width),
      heightPx: parseFloat(marker.height),
      left: marker.left,
    };
  });
}

/** Engines may serialize custom props as `.48rem` instead of `0.48rem`; compare numerically. */
function expectRemVar(value: string, expectedRem: number) {
  const v = value.trim();
  expect(v.endsWith('rem')).toBe(true);
  expect(parseFloat(v)).toBeCloseTo(expectedRem, 8);
}

test.describe('List marker spacing (:root tokens)', () => {
  test('just above breakpoint: default gap (0.48rem) and inset (0.15rem)', async ({
    page,
  }) => {
    await page.setViewportSize({
      width: LIST_MARKER_BREAKPOINT_PX + 2,
      height: 800,
    });
    await page.goto('/credits', { waitUntil: 'domcontentloaded' });
    const t = await readListMarkerTokens(page);
    expectRemVar(t.afterGap, 0.48);
    expectRemVar(t.markerLeft, 0.15);
  });

  test('at breakpoint: larger gap and inset (max-width applies)', async ({
    page,
  }) => {
    await page.setViewportSize({
      width: LIST_MARKER_BREAKPOINT_PX,
      height: 667,
    });
    await page.goto('/credits', { waitUntil: 'domcontentloaded' });
    const t = await readListMarkerTokens(page);
    expectRemVar(t.afterGap, 0.85);
    expectRemVar(t.markerLeft, 0.22);
  });

  test('unordered marker uses stable geometric square size', async ({
    page,
  }) => {
    await page.goto('/credits', { waitUntil: 'domcontentloaded' });
    const metrics = await readFirstUnorderedMarkerMetrics(page);
    expect(metrics).toBeTruthy();
    expect(metrics!.widthPx).toBeGreaterThan(6);
    expect(metrics!.heightPx).toBeGreaterThan(6);
    expect(Math.abs(metrics!.widthPx - metrics!.heightPx)).toBeLessThanOrEqual(
      0.5,
    );
  });
});
