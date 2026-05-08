import { test, expect } from '@playwright/test';
import { applyExtremeZoom } from './helpers';

/*
 * PNG baselines must match CI / integration-tests.sh: render via astro preview, not dev.
 * Regenerate (desktop chromium):
 *   PW_SERVER_MODE=preview npx playwright test e2e/extreme-zoom-visual.spec.ts --project=desktop-chromium --update-snapshots
 * Or run ./scripts/update-playwright-snapshots.sh (defaults PW_SERVER_MODE=preview and updates these among others).
 */
test.describe('Extreme zoom visuals @extreme-zoom-visual', () => {
  test.describe.configure({ mode: 'serial' });

  test('hero square visual snapshot at extreme zoom', async ({
    page,
    browserName,
  }) => {
    test.skip(
      browserName !== 'chromium',
      'Visual baseline is chromium-scoped.',
    );
    await page.setViewportSize({ width: 1200, height: 900 });
    await page.goto('/');
    await applyExtremeZoom(page, { attempts: 3 });
    await page.waitForTimeout(80);
    await expect(page.locator('.hero')).toHaveScreenshot(
      'hero-extreme-zoom.png',
      {
        animations: 'disabled',
        maxDiffPixels: 6000,
      },
    );
  });

  test('writing square visual snapshot at extreme zoom', async ({
    page,
    browserName,
  }) => {
    test.skip(
      browserName !== 'chromium',
      'Visual baseline is chromium-scoped.',
    );
    await page.setViewportSize({ width: 1200, height: 900 });
    await page.goto('/writing');
    await expect(
      page.locator('.writing-groups.writing-groups--visible'),
    ).toBeVisible();
    await applyExtremeZoom(page, { attempts: 3 });
    await page.waitForTimeout(80);
    await expect(
      page.locator('.writing-page .page-buttons-panel'),
    ).toHaveScreenshot('writing-extreme-zoom.png', {
      animations: 'disabled',
      maxDiffPixels: 7000,
    });
  });

  test('contact square visual snapshot at extreme zoom', async ({
    page,
    browserName,
  }) => {
    test.skip(
      browserName !== 'chromium',
      'Visual baseline is chromium-scoped.',
    );
    await page.setViewportSize({ width: 1200, height: 900 });
    await page.goto('/contact');
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const el = document.querySelector(
              '.contact-page .contact-page__fit-content',
            ) as HTMLElement | null;
            if (!el) return false;
            const cs = getComputedStyle(el);
            return (
              el.classList.contains('contact-page__fit-content--visible') &&
              cs.opacity === '1'
            );
          }),
        { timeout: 6000 },
      )
      .toBe(true);
    await applyExtremeZoom(page, { attempts: 3 });
    await page.waitForTimeout(80);
    await expect(
      page.locator('.contact-page .page-buttons-panel'),
    ).toHaveScreenshot('contact-extreme-zoom.png', {
      animations: 'disabled',
      maxDiffPixels: 5000,
    });
  });
});
