import { expect, test } from '@playwright/test';

test.describe('List marker geometry on mobile', () => {
  test('unordered marker remains square and visible on mobile viewport', async ({
    page,
  }) => {
    await page.goto('/credits', { waitUntil: 'domcontentloaded' });

    const metrics = await page.evaluate(() => {
      const li = document.querySelector('ul li');
      if (!(li instanceof HTMLElement)) return null;
      const marker = getComputedStyle(li, '::before');
      return {
        widthPx: parseFloat(marker.width),
        heightPx: parseFloat(marker.height),
        color: marker.color,
      };
    });

    expect(metrics).toBeTruthy();
    expect(metrics!.widthPx).toBeGreaterThan(5);
    expect(metrics!.heightPx).toBeGreaterThan(5);
    expect(Math.abs(metrics!.widthPx - metrics!.heightPx)).toBeLessThanOrEqual(
      0.5,
    );
    expect(metrics!.color).toMatch(/^rgb/);
  });
});
