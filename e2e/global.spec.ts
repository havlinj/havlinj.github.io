import { test, expect } from '@playwright/test';

test.describe('Global colors', () => {
  test('body has correct background color', async ({ page }) => {
    await page.goto('/');
    const body = page.locator('body');
    await expect(body).toHaveCSS('background-color', 'rgb(224, 247, 250)');
  });

  test('body has correct text color', async ({ page }) => {
    await page.goto('/');
    const body = page.locator('body');
    await expect(body).toHaveCSS('color', 'rgb(17, 17, 17)');
  });
});
