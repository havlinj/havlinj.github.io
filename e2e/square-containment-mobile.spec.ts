import { test, expect } from '@playwright/test';
import { readSquareContainment } from './helpers';

test.describe('Square containment (mobile)', () => {
  test('profile square and key tiles stay inside on mobile webkit', async ({
    page,
    browserName,
  }) => {
    await page.goto('/profile');

    const tol = browserName === 'webkit' ? 8 : 3;

    const result = await readSquareContainment(page.locator('body'), {
      squareSelector: '.profile-section',
      containerSelector: 'main.content',
      tolerancePx: tol,
    });
    expect(
      result.ok,
      `profile square containment failed: ${JSON.stringify(result)}`,
    ).toBe(true);

    const inside = await page.evaluate((pixelTol: number) => {
      const square = document.querySelector('.profile-section');
      if (!(square instanceof HTMLElement)) {
        return { ok: false, reason: 'missing square' };
      }
      const s = square.getBoundingClientRect();
      const selectors = [
        'a[href="/why-this"]',
        'a[href="/what-i-do"]',
        '.profile-right-column .profile-photo-frame',
        '.profile-right-column .prof-tile--foundations',
      ];
      const missing: string[] = [];
      const overflowing: string[] = [];
      const tol = pixelTol;
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (!(el instanceof HTMLElement)) {
          missing.push(sel);
          continue;
        }
        const r = el.getBoundingClientRect();
        const within =
          r.left >= s.left - tol &&
          r.right <= s.right + tol &&
          r.top >= s.top - tol &&
          r.bottom <= s.bottom + tol;
        if (!within) overflowing.push(sel);
      }
      return {
        ok: missing.length === 0 && overflowing.length === 0,
        missing,
        overflowing,
      };
    }, tol);

    expect(
      inside.ok,
      `profile inside-elements mobile check failed: ${JSON.stringify(inside)}`,
    ).toBe(true);
  });
});
