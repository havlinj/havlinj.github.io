import { test, expect, type Page } from '@playwright/test';

async function applyExtremeZoom(page: Page): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await page.evaluate(() => {
        document.documentElement.style.zoom = '3';
        window.dispatchEvent(new Event('resize'));
      });
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const retryable =
        message.includes('Execution context was destroyed') ||
        message.includes('Cannot find context with specified id');
      if (!retryable || attempt === 2) throw error;
      await page.waitForLoadState('domcontentloaded');
    }
  }
}

test.describe('Extreme zoom visuals', () => {
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
    await applyExtremeZoom(page);
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
    await applyExtremeZoom(page);
    await page.waitForTimeout(80);
    await expect(
      page.locator('.writing-page .page-buttons-panel'),
    ).toHaveScreenshot('writing-extreme-zoom.png', {
      animations: 'disabled',
      maxDiffPixels: 65000,
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
    await applyExtremeZoom(page);
    await page.waitForTimeout(80);
    await expect(
      page.locator('.contact-page .page-buttons-panel'),
    ).toHaveScreenshot('contact-extreme-zoom.png', {
      animations: 'disabled',
      maxDiffPixels: 60000,
    });
  });
});
