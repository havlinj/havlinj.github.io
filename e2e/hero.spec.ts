import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { LAYOUT_TOLERANCE } from './constants';

/** Wait for hero section and background image to be in the DOM. */
async function waitForHeroLoaded(page: Page) {
  await page.locator('section.hero').waitFor({ state: 'visible' });
  await page.locator('.hero-bg__image').waitFor({ state: 'visible' });
}

test.describe('Hero page (/)', () => {
  test('has correct page title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle('Jan Havlín');
  });

  test('hero-header nav has accessible label', async ({ page }) => {
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    await expect(nav).toBeVisible();
  });

  test('has hero-header with Profile, Writing, Contact links in one row', async ({
    page,
  }) => {
    await page.goto('/');
    const header = page.locator('.hero-header');
    await expect(header).toBeVisible();
    await expect(header.getByRole('link', { name: 'Profile' })).toBeVisible();
    await expect(header.getByRole('link', { name: 'Writing' })).toBeVisible();
    await expect(header.getByRole('link', { name: 'Contact' })).toBeVisible();
  });

  test('does not show global navbar with name (site-header)', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.locator('.site-header')).not.toBeVisible();
  });

  test('has intro heading "Hi there" and hero section with name Jan Havlín', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: 'Hi there', level: 1 }),
    ).toBeVisible();
    await expect(page.locator('section.hero')).toBeVisible();
    await waitForHeroLoaded(page);
    const heroName = page.locator('.hero-name');
    await expect(heroName).toBeVisible();
    await expect(heroName).toContainText('Jan Havlín');
  });

  test('hero-header links point to correct pages', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.hero-header a[href="/profile"]')).toBeVisible();
    await expect(page.locator('.hero-header a[href="/writing"]')).toBeVisible();
    await expect(page.locator('.hero-header a[href="/contact"]')).toBeVisible();
  });

  test('hero-header Profile link navigates to /profile', async ({ page }) => {
    await page.goto('/');
    await page
      .getByRole('navigation', { name: 'Main navigation' })
      .getByRole('link', { name: 'Profile' })
      .click();
    await expect(page).toHaveURL(/\/profile$/);
  });

  test('hero-header: Profile left, Writing center, Contact right', async ({
    page,
  }) => {
    await page.goto('/');
    const inner = page.locator('.hero-header__inner');
    await expect(inner).toBeVisible();
    const profile = inner.getByRole('link', { name: 'Profile' });
    const writing = inner.getByRole('link', { name: 'Writing' });
    const contact = inner.getByRole('link', { name: 'Contact' });
    const box = await inner.boundingBox();
    const pBox = await profile.boundingBox();
    const wBox = await writing.boundingBox();
    const cBox = await contact.boundingBox();
    expect(box).toBeTruthy();
    expect(pBox).toBeTruthy();
    expect(wBox).toBeTruthy();
    expect(cBox).toBeTruthy();
    expect(pBox!.x).toBeLessThanOrEqual(wBox!.x + LAYOUT_TOLERANCE);
    expect(wBox!.x).toBeLessThanOrEqual(cBox!.x + LAYOUT_TOLERANCE);
    expect(pBox!.x).toBeLessThanOrEqual(box!.x + LAYOUT_TOLERANCE);
    expect(cBox!.x + cBox!.width).toBeGreaterThanOrEqual(
      box!.x + box!.width - LAYOUT_TOLERANCE,
    );
    const mid = box!.x + box!.width / 2;
    expect(wBox!.x + wBox!.width / 2).toBeGreaterThanOrEqual(
      mid - box!.width / 3,
    );
    expect(wBox!.x + wBox!.width / 2).toBeLessThanOrEqual(mid + box!.width / 3);
  });

  test('content is in container with class content', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('main.content')).toBeVisible();
  });

  test('hero wrap contains hero section; site footer shows copyright', async ({
    page,
  }) => {
    await page.goto('/');
    await waitForHeroLoaded(page);
    const wrap = page.locator('.hero-wrap');
    await expect(wrap).toBeVisible();
    await expect(wrap.locator('section.hero')).toBeVisible();
    await expect(page.locator('footer.site-footer')).toContainText(
      '© 2026 Jan Havlín',
    );
    await expect(
      page.getByRole('heading', { name: 'Hi there', level: 1 }),
    ).toBeVisible();
    await expect(page.locator('.hero-name')).toBeVisible();
    await expect(page.locator('.hero-role')).toBeVisible();
    await expect(page.locator('.hero-role')).toContainText(
      'BACKEND ARCHITECTURE',
    );
    await expect(page.locator('.hero-role')).toContainText('& SYSTEMS');
    const tagline = page.locator('.tagline');
    await expect(tagline).toBeVisible();
    await expect(tagline).toContainText('Building reliable');
    await expect(tagline).toContainText('from the ground up');
  });

  test('hero has figure with background image', async ({ page }) => {
    await page.goto('/');
    await waitForHeroLoaded(page);
    const figure = page.locator('.hero-figure');
    await expect(figure).toBeVisible();
    await expect(figure.locator('.hero-bg__image')).toBeVisible();
    await expect(figure.locator('img[alt="Intro background"]')).toBeVisible();
  });

  test('site footer shows copyright on home', async ({ page }) => {
    await page.goto('/');
    const footer = page.locator('footer.site-footer');
    await expect(footer).toBeVisible();
    await expect(footer).toContainText('© 2026 Jan Havlín');
  });

  test('preloads hero background image', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.locator(
        'link[rel="preload"][as="image"][href="/assets/hero/altumcode-oZ61KFUQsus-unsplash_dich_better_grid.png"]',
      ),
    ).toHaveCount(1);
  });

  test('has hero-top-edge strip and no photo credit caption', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.locator('.hero-top-edge')).toBeVisible();
    await expect(page.locator('.hero-caption')).toHaveCount(0);
  });

  test('tagline visible text layer present', async ({ page }) => {
    await page.goto('/');
    await waitForHeroLoaded(page);
    await expect(page.locator('.tagline__text')).toBeVisible();
    await expect(page.locator('.tagline__text')).toContainText(
      'from the ground up',
    );
  });

  test('hero-role shows two lines (BACKEND ARCHITECTURE, & SYSTEMS)', async ({
    page,
  }) => {
    await page.goto('/');
    await waitForHeroLoaded(page);
    const role = page.locator('.hero-role');
    await expect(role).toBeVisible();
    const spans = role.locator('span');
    await expect(spans).toHaveCount(2);
    await expect(spans.nth(0)).toHaveText('BACKEND ARCHITECTURE');
    await expect(spans.nth(1)).toHaveText('& SYSTEMS');
  });

  test('hero section - last screenshot matches', async ({ page }) => {
    await page.goto('/');
    await waitForHeroLoaded(page);
    await expect(page).toHaveScreenshot('hero-section.png');
  });
});
