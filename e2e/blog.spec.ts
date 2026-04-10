import { test, expect } from '@playwright/test';

test.describe('Blog post pages (/blog/...)', () => {
  test('blog post page shows title and navbar with active Writing', async ({
    page,
  }) => {
    await page.goto('/blog/system-thinking-applied');
    await expect(
      page.getByRole('heading', {
        name: 'System Thinking, Applied',
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
    await expect(
      page.locator('.writing-groups.writing-groups--visible'),
    ).toBeVisible({ timeout: 10000 });
    const link = page
      .locator('a.page-button')
      .filter({ hasText: 'System Thinking, Applied' })
      .first();
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', /\/blog\/system-thinking-applied\/?$/);
    await link.click();
    await expect(page).toHaveURL(/\/blog\/system-thinking-applied/);
    await expect(
      page.getByRole('heading', {
        name: 'System Thinking, Applied',
        level: 1,
      }),
    ).toBeVisible();
  });
});
