import { test, expect } from '@playwright/test';

test.describe('/credits page', () => {
  test('Credits main column matches screenshot', async ({ page }) => {
    await page.goto('/credits', { waitUntil: 'domcontentloaded' });
    await expect(
      page.getByRole('heading', { name: 'Credits', level: 1 }),
    ).toBeVisible();

    await page.evaluate(async () => {
      await document.fonts?.ready;
    });

    const main = page.locator('main.content');
    await expect(main).toBeVisible();
    await expect(main).toHaveScreenshot('credits-content.png', {
      animations: 'disabled',
      // Baseline matches `PW_SERVER_MODE=preview` (integration-tests.sh / CI). Dev
      // (Vite) output differs slightly (~1% pixels) from production build for the same page.
      maxDiffPixelRatio: 0.012,
    });
  });
});
