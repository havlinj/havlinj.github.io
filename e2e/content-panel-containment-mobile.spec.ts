import { test, expect } from '@playwright/test';
import { CONTENT_PANEL_SELECTORS } from '../src/constants/content-panel';
import { readContentPanelContainment } from './helpers';

test.describe('Content panel containment (mobile)', () => {
  test('profile content panel and key tiles stay inside on mobile webkit', async ({
    page,
    browserName,
  }) => {
    await page.goto('/profile');

    const tol = browserName === 'webkit' ? 8 : 3;

    const result = await readContentPanelContainment(page.locator('body'), {
      contentPanelSelector: CONTENT_PANEL_SELECTORS.profile,
      containerSelector: 'main.content',
      tolerancePx: tol,
    });
    expect(
      result.ok,
      `profile content panel containment failed: ${JSON.stringify(result)}`,
    ).toBe(true);

    const inside = await page.evaluate((pixelTol: number) => {
      const contentPanel = document.querySelector('.profile-section');
      if (!(contentPanel instanceof HTMLElement)) {
        return { ok: false, reason: 'missing content panel' };
      }
      const panelRect = contentPanel.getBoundingClientRect();
      const selectors = [
        'a[href="/why-this"]',
        'a[href="/what-i-do"]',
        '.profile-right-column .profile-photo-frame',
        '.profile-right-column .prof-tile--foundations',
      ];
      const missing: string[] = [];
      const overflowing: string[] = [];
      const tolerance = pixelTol;
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (!(el instanceof HTMLElement)) {
          missing.push(sel);
          continue;
        }
        const r = el.getBoundingClientRect();
        const within =
          r.left >= panelRect.left - tolerance &&
          r.right <= panelRect.right + tolerance &&
          r.top >= panelRect.top - tolerance &&
          r.bottom <= panelRect.bottom + tolerance;
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
