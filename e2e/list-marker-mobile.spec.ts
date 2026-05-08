import { expect, test } from '@playwright/test';

test.describe('List marker geometry on mobile', () => {
  test('unordered marker remains square and visible on mobile viewport', async ({
    page,
    browserName,
  }) => {
    await page.goto('/credits', { waitUntil: 'domcontentloaded' });

    const metrics = await page.evaluate(() => {
      const li = document.querySelector('ul li');
      if (!(li instanceof HTMLElement)) return null;
      const marker = getComputedStyle(li, '::before');
      const liCs = getComputedStyle(li);
      const fs = parseFloat(liCs.fontSize) || 16;
      let widthPx = parseFloat(marker.width);
      let heightPx = parseFloat(marker.height);
      /*
       * WebKit sometimes omits resolved px on ::before; derive from inherited token.
       * Chromium exposes computed px reliably.
       */
      if (
        !Number.isFinite(widthPx) ||
        widthPx <= 0 ||
        !Number.isFinite(heightPx) ||
        heightPx <= 0
      ) {
        const raw = liCs.getPropertyValue('--list-marker-box-size').trim();
        const n = parseFloat(raw);
        if (Number.isFinite(n)) {
          if (raw.endsWith('em')) {
            widthPx = n * fs;
            heightPx = n * fs;
          } else if (raw.endsWith('px')) {
            widthPx = n;
            heightPx = n;
          }
        }
      }
      return {
        widthPx,
        heightPx,
        color: marker.color,
      };
    });

    expect(metrics).toBeTruthy();
    expect(metrics!.widthPx).toBeGreaterThan(5);
    expect(metrics!.heightPx).toBeGreaterThan(5);
    const squareTol = browserName === 'webkit' ? 1.75 : 0.5;
    expect(Math.abs(metrics!.widthPx - metrics!.heightPx)).toBeLessThanOrEqual(
      squareTol,
    );
    expect(metrics!.color).toMatch(/^rgb/);
  });
});
