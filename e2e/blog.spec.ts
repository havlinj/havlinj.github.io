import { test, expect } from '@playwright/test';

test.describe('Blog post pages (/blog/...)', () => {
  test('blog post page shows title and navbar with active Writing', async ({
    page,
  }) => {
    await page.goto('/blog/reflection-on-building-systems');
    await expect(
      page.getByRole('heading', {
        name: 'Reflection on Building Systems',
        level: 1,
      }),
    ).toBeVisible();
    await expect(page.locator('.site-header')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Writing' })).toHaveClass(
      /site-nav__link--active/,
    );
  });

  test('navigating from Writing to blog post works', async ({ page }) => {
    await page.goto('/writing');
    const link = page.getByRole('link', {
      name: 'Reflection on Building Systems',
    });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', /\/blog\//);
    await link.click();
    await expect(page).toHaveURL(/\/blog\/reflection-on-building-systems/);
    await expect(
      page.getByRole('heading', {
        name: 'Reflection on Building Systems',
        level: 1,
      }),
    ).toBeVisible();
  });
});
