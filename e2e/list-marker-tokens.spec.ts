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
    expect(t.afterGap).toBe('0.48rem');
    expect(t.markerLeft).toBe('0.15rem');
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
    expect(t.afterGap).toBe('0.85rem');
    expect(t.markerLeft).toBe('0.22rem');
  });
});
