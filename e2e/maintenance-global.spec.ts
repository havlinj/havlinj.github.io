import { expect, test } from '@playwright/test';
import { MAINTENANCE_PANEL_BG_STEM } from '../src/constants/maintenance-panel';

test.describe('maintenance global fixture', () => {
  test('home shows website maintenance and profile redirects home', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Whoops' })).toBeVisible();
    await expect(page.getByText('The website', { exact: true })).toBeVisible();
    await expect(
      page.getByText('is under maintenance', { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText('Let the mechanics work…', { exact: true }),
    ).toBeVisible();
    const placement = await page.evaluate(() => {
      const copy = document.querySelector('.route-maintenance-panel__copy');
      const panel = document.querySelector('.route-maintenance-panel');
      if (!(copy instanceof HTMLElement) || !(panel instanceof HTMLElement)) {
        return null;
      }
      const copyBox = copy.getBoundingClientRect();
      const panelBox = panel.getBoundingClientRect();
      const center = (copyBox.top + copyBox.bottom) / 2;
      return (center - panelBox.top) / panelBox.height;
    });
    expect(placement).not.toBeNull();
    expect(placement!).toBeGreaterThan(0.49);
    expect(placement!).toBeLessThan(0.51);
    await expect(page.locator('.hero-header, a.site-header__item')).toHaveCount(
      0,
    );
    const reservedHeader = page.locator('.site-header--reserved');
    await expect(reservedHeader).toBeAttached();
    await expect(reservedHeader).toBeHidden();
    const reservedHeight = await reservedHeader.evaluate((el) => {
      const box = el.getBoundingClientRect();
      const marginBottom = Number.parseFloat(getComputedStyle(el).marginBottom);
      return box.height + marginBottom;
    });
    expect(reservedHeight).toBeGreaterThan(30);
    await expect(page.locator('footer .site-footer__home')).toHaveCount(0);
    await expect(page.locator('footer .site-footer__credits')).toBeVisible();
    const mediaImg = page.locator(
      '.global-maintenance-page .route-maintenance-panel__media--visible img',
    );
    await expect(mediaImg).toBeVisible();
    const src = await mediaImg.evaluate((el) => {
      const img = el as HTMLImageElement;
      return img.currentSrc || img.getAttribute('src') || '';
    });
    expect(src).toContain(MAINTENANCE_PANEL_BG_STEM);

    await page.goto('/profile');
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { name: 'Whoops' })).toBeVisible();
  });
});
