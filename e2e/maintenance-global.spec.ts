import { expect, test } from '@playwright/test';

test.describe('maintenance global fixture', () => {
  test('home shows website maintenance and profile redirects home', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: 'Website under maintenance' }),
    ).toBeVisible();
    await expect(page.locator('.global-maintenance-page__date')).toHaveText(
      'Started on 26.08.07.',
    );
    await expect(page.locator('.hero-header')).toHaveCount(0);

    await page.goto('/profile');
    await expect(page).toHaveURL(/\/$/);
    await expect(
      page.getByRole('heading', { name: 'Website under maintenance' }),
    ).toBeVisible();
  });
});
