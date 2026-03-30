import { test, expect } from '@playwright/test';
import { expectNavLinkActive } from './helpers';

test.describe('/foundations page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/foundations');
  });

  test('shows Foundations H1 and markdown body', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: 'Foundations', level: 1 }),
    ).toBeVisible();
    await expect(
      page.getByText(/post-socialist|emerging democracy/i).first(),
    ).toBeVisible();
  });

  test('header keeps Profile as active section', async ({ page }) => {
    await expectNavLinkActive(page, 'Profile');
  });

  test('article is in main content area', async ({ page }) => {
    await expect(page.locator('main.content article')).toBeVisible();
    await expect(
      page.locator('main.content article').getByRole('heading', { level: 1 }),
    ).toHaveText('Foundations');
  });
});
