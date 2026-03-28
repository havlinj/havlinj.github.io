import { test, expect } from '@playwright/test';

test.describe('/foundations page', () => {
  test('shows Foundations H1 and markdown body', async ({ page }) => {
    await page.goto('/foundations');
    await expect(
      page.getByRole('heading', { name: 'Foundations', level: 1 }),
    ).toBeVisible();
    await expect(
      page.getByText(/post-socialist|emerging democracy/i).first(),
    ).toBeVisible();
  });

  test('header keeps Profile as active section', async ({ page }) => {
    await page.goto('/foundations');
    await expect(page.getByRole('link', { name: 'Profile' })).toHaveClass(
      /site-nav__link--active/,
    );
  });

  test('article is in main content area', async ({ page }) => {
    await page.goto('/foundations');
    await expect(page.locator('main.content article')).toBeVisible();
    await expect(
      page.locator('main.content article').getByRole('heading', { level: 1 }),
    ).toHaveText('Foundations');
  });
});
