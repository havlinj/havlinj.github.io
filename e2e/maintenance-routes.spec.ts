import { expect, test } from '@playwright/test';
import { RGB_PAGE_BG } from '../src/constants/colors';

test.describe('maintenance routes fixture', () => {
  test('writing shows Whoops notice inside the square panel', async ({
    page,
  }) => {
    await page.goto('/writing');

    await expect(page.locator('.site-header')).toBeVisible();
    await expectNavActive(page, 'Writing');
    await expect(page.getByRole('heading', { name: 'Whoops' })).toBeVisible();

    const panel = page.locator('.route-maintenance-panel');
    await expect(panel).toBeVisible();
    await expect(page.locator('.route-maintenance-panel__route')).toHaveText(
      '/writing',
    );
    await expect(page.locator('.route-maintenance-panel__date')).toHaveText(
      'Started on 26.08.07.',
    );
    await expect(page.getByText('Content will return soon.')).toBeVisible();
    await expect(
      page.getByText('Thank you for your understanding.'),
    ).toBeVisible();

    await expect(page.locator('.writing-category-picker')).toHaveCount(0);

    const bg = await panel.evaluate(
      (el) => getComputedStyle(el).backgroundColor,
    );
    expect(bg).toBe(RGB_PAGE_BG);

    const alignment = await page.evaluate(() => {
      const square = document.querySelector('.route-maintenance-panel');
      const tail = document.querySelector(
        '.route-maintenance-panel__headline-tail',
      );
      if (!(square instanceof HTMLElement) || !(tail instanceof HTMLElement)) {
        return null;
      }
      const squareBox = square.getBoundingClientRect();
      const tailBox = tail.getBoundingClientRect();
      return {
        squareCenterX: squareBox.left + squareBox.width / 2,
        tailCenterX: tailBox.left + tailBox.width / 2,
      };
    });
    expect(alignment).not.toBeNull();
    expect(
      Math.abs(alignment!.tailCenterX - alignment!.squareCenterX),
    ).toBeLessThan(2);
  });

  test('exact /contact is unavailable but /contact/form stays live', async ({
    page,
  }) => {
    await page.goto('/contact');
    await expect(page.getByRole('heading', { name: 'Whoops' })).toBeVisible();
    await expect(page.locator('.route-maintenance-panel__route')).toHaveText(
      '/contact',
    );
    await expect(page.locator('.route-maintenance-panel__date')).toHaveText(
      'Started on 26.08.08.',
    );

    await page.goto('/contact/form');
    await expect(page.getByRole('heading', { name: 'Whoops' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Contact' })).toBeVisible();
  });

  test('unlisted profile route stays available', async ({ page }) => {
    await page.goto('/profile');
    await expect(page.getByRole('heading', { name: 'Whoops' })).toHaveCount(0);
    await expect(page.locator('.profile-section')).toBeVisible();
  });
});

async function expectNavActive(
  page: import('@playwright/test').Page,
  label: string,
): Promise<void> {
  const link = page
    .locator('.site-header__inner')
    .getByRole('link', { name: label });
  await expect(link).toHaveClass(/site-nav__link--active/);
}
