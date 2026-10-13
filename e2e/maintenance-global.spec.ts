import { expect, test } from '@playwright/test';
import { readCreditsFloor } from './helpers';
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
    await expect(page.getByText('Let the painters paint…')).toHaveCount(0);
    await expect(page.locator('.reconstruction-panel')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Jan Havlín' })).toHaveCount(
      0,
    );
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
    await expect(page.locator('footer a.site-footer__home')).toHaveCount(0);
    const reservedHome = page.locator('footer .site-footer__home--reserved');
    await expect(reservedHome).toBeAttached();
    await expect(reservedHome).toBeHidden();
    const footerSlots = await page.evaluate(() => {
      const home = document.querySelector('.site-footer__home--reserved');
      const credits = document.querySelector('.site-footer__credits');
      const copyright = document.querySelector('.site-footer__copyright');
      const inner = document.querySelector('.site-footer__inner');
      if (
        !(home instanceof HTMLElement) ||
        !(credits instanceof HTMLElement) ||
        !(copyright instanceof HTMLElement) ||
        !(inner instanceof HTMLElement)
      ) {
        return null;
      }
      const gap = Number.parseFloat(getComputedStyle(inner).columnGap);
      const homeBox = home.getBoundingClientRect();
      const creditsBox = credits.getBoundingClientRect();
      const copyrightBox = copyright.getBoundingClientRect();
      return {
        creditsAfterHome: creditsBox.left - homeBox.right,
        copyrightAfterCredits: copyrightBox.left - creditsBox.right,
        gap,
      };
    });
    expect(footerSlots).not.toBeNull();
    expect(footerSlots!.creditsAfterHome).toBeCloseTo(footerSlots!.gap, 0);
    expect(footerSlots!.copyrightAfterCredits).toBeCloseTo(footerSlots!.gap, 0);
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

    await page.locator('footer .site-footer__credits').click();
    await expect(page).toHaveURL(/\/credits$/);
    await expect(
      page.getByRole('heading', { name: 'Credits', level: 1 }),
    ).toBeVisible();
    await expect(page.getByText('Frankie Cordoba')).toBeVisible();
    await expect(page.getByText('Anastasia Shuraeva')).toHaveCount(0);
    await expect(page.getByText('vackground.com')).toHaveCount(0);
    await expect(page.getByText('Hero image (homepage)')).toHaveCount(0);
    await expect(
      page.getByRole('heading', { name: 'Photos', exact: true, level: 3 }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Photos (Unsplash)', level: 3 }),
    ).toHaveCount(0);
    await expect(
      page.getByRole('heading', { name: 'Photos (Pexels)', level: 3 }),
    ).toHaveCount(0);
    const floor = await readCreditsFloor(page);
    expect(floor).not.toBeNull();
    expect(floor!.floorHeight).toBeCloseTo(floor!.queryWidth, 0);
    expect(floor!.floorBelowWords).toBeCloseTo(floor!.titleGap, 0);
    expect(floor!.footerPastFloor).toBeGreaterThanOrEqual(-1);
    expect(floor!.footerPastFloor).toBeLessThan(2);

    await expect(page.locator('a.site-header__item')).toHaveCount(0);
    await expect(page.locator('.site-header--reserved')).toBeHidden();
    await page.locator('footer a.site-footer__home').click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { name: 'Whoops' })).toBeVisible();

    await page.goto('/profile');
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { name: 'Whoops' })).toBeVisible();
  });
});
