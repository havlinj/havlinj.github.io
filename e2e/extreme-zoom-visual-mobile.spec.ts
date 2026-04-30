import { test, expect, type Page } from '@playwright/test';

async function applyExtremeZoom(page: Page): Promise<void> {
  await page.evaluate(() => {
    document.documentElement.style.zoom = '3';
    window.dispatchEvent(new Event('resize'));
  });
}

test.describe('Extreme zoom visuals (mobile webkit baselines)', () => {
  test.describe.configure({ mode: 'serial' });

  test('hero square visual snapshot on mobile webkit', async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== 'webkit', 'Mobile-webkit baseline only.');
    await page.goto('/');
    await applyExtremeZoom(page);
    await page.waitForTimeout(80);
    await expect(page.locator('.hero')).toHaveScreenshot(
      'hero-mobile-webkit.png',
      {
        animations: 'disabled',
        maxDiffPixels: 12000,
      },
    );
  });

  test('writing square visual snapshot on mobile webkit', async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== 'webkit', 'Mobile-webkit baseline only.');
    await page.goto('/writing');
    await expect(
      page.locator('.writing-groups.writing-groups--visible'),
    ).toBeVisible();
    await applyExtremeZoom(page);
    await page.waitForTimeout(80);
    await expect(
      page.locator('.writing-page .page-buttons-panel'),
    ).toHaveScreenshot('writing-mobile-webkit.png', {
      animations: 'disabled',
      maxDiffPixels: 10000,
    });
  });

  test('contact square visual snapshot on mobile webkit', async ({
    page,
    browserName,
  }) => {
    test.skip(browserName !== 'webkit', 'Mobile-webkit baseline only.');
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
    ).toHaveScreenshot('contact-mobile-webkit.png', {
      animations: 'disabled',
      maxDiffPixels: 12000,
    });
  });
});
