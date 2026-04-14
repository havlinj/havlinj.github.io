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

    await page.addStyleTag({
      content: '.site-footer__settings { display: none !important; }',
    });

    const main = page.locator('main.content');
    await expect(main).toBeVisible();
    await expect(main).toHaveScreenshot('credits-content.png', {
      animations: 'disabled',
    });
  });
});
