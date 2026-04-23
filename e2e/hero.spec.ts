import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { LAYOUT_TOLERANCE } from './constants';
import { mustBox } from './helpers';

/** Wait for hero section and background image to be in the DOM. */
async function waitForHeroLoaded(page: Page) {
  await page.locator('section.hero').waitFor({ state: 'visible' });
  await page.locator('.hero-bg__image').waitFor({ state: 'visible' });
}

test.describe('Hero page (/)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('has correct page title', async ({ page }) => {
    await expect(page).toHaveTitle('Jan Havlín');
  });

  test('hero-header nav has accessible label', async ({ page }) => {
    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    await expect(nav).toBeVisible();
  });

  test('has hero-header with Profile, Writing, Contact links in one row', async ({
    page,
  }) => {
    const header = page.locator('.hero-header');
    await expect(header).toBeVisible();
    await expect(header.getByRole('link', { name: 'Profile' })).toBeVisible();
    await expect(header.getByRole('link', { name: 'Writing' })).toBeVisible();
    await expect(header.getByRole('link', { name: 'Contact' })).toBeVisible();
  });

  test('does not show global navbar with name (site-header)', async ({
    page,
  }) => {
    await expect(page.locator('.site-header')).not.toBeVisible();
  });

  test('has hero heading "Hi there" and hero section with name Jan Havlín', async ({
    page,
  }) => {
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
    await expect(page.locator('.hero-header a[href="/profile"]')).toBeVisible();
    await expect(page.locator('.hero-header a[href="/writing"]')).toBeVisible();
    await expect(page.locator('.hero-header a[href="/contact"]')).toBeVisible();
  });

  test('hero-header Profile link navigates to /profile', async ({ page }) => {
    await page
      .getByRole('navigation', { name: 'Main navigation' })
      .getByRole('link', { name: 'Profile' })
      .click();
    await expect(page).toHaveURL(/\/profile$/);
  });

  test('hero-header: Profile left, Writing center, Contact right', async ({
    page,
  }) => {
    const inner = page.locator('.hero-header__inner');
    await expect(inner).toBeVisible();
    const profile = inner.getByRole('link', { name: 'Profile' });
    const writing = inner.getByRole('link', { name: 'Writing' });
    const contact = inner.getByRole('link', { name: 'Contact' });
    const box = await mustBox(inner);
    const pBox = await mustBox(profile);
    const wBox = await mustBox(writing);
    const cBox = await mustBox(contact);
    expect(pBox.x).toBeLessThanOrEqual(wBox.x + LAYOUT_TOLERANCE);
    expect(wBox.x).toBeLessThanOrEqual(cBox.x + LAYOUT_TOLERANCE);
    expect(pBox.x).toBeLessThanOrEqual(box.x + LAYOUT_TOLERANCE);
    expect(cBox.x + cBox.width).toBeGreaterThanOrEqual(
      box.x + box.width - LAYOUT_TOLERANCE,
    );
    const mid = box.x + box.width / 2;
    expect(wBox.x + wBox.width / 2).toBeGreaterThanOrEqual(mid - box.width / 3);
    expect(wBox.x + wBox.width / 2).toBeLessThanOrEqual(mid + box.width / 3);
  });

  test('content is in container with class content', async ({ page }) => {
    await expect(page.locator('main.content')).toBeVisible();
  });

  test('hero wrap contains hero section; site footer shows copyright', async ({
    page,
  }) => {
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
    await waitForHeroLoaded(page);
    const figure = page.locator('.hero-figure');
    await expect(figure).toBeVisible();
    await expect(figure.locator('.hero-bg__image')).toBeVisible();
    await expect(figure.locator('img[alt="Hero background"]')).toBeVisible();
  });

  test('preloads hero background image', async ({ page }) => {
    await expect(
      page.locator(
        'link[rel="preload"][as="image"][href="/assets/hero/altumcode-oZ61KFUQsus-unsplash_dichrom.png"]',
      ),
    ).toHaveCount(1);
  });

  test('has hero-top-edge strip and no photo credit caption', async ({
    page,
  }) => {
    await expect(page.locator('.hero-top-edge')).toBeVisible();
    await expect(page.locator('.hero-caption')).toHaveCount(0);
  });

  test('tagline visible text layer present', async ({ page }) => {
    await waitForHeroLoaded(page);
    await expect(page.locator('.tagline__text')).toBeVisible();
    await expect(page.locator('.tagline__text')).toContainText(
      'from the ground up',
    );
  });

  test('hero-role shows two lines (BACKEND ARCHITECTURE, & SYSTEMS)', async ({
    page,
  }) => {
    await waitForHeroLoaded(page);
    const role = page.locator('.hero-role');
    await expect(role).toBeVisible();
    const spans = role.locator('span');
    await expect(spans).toHaveCount(2);
    await expect(spans.nth(0)).toHaveText('BACKEND ARCHITECTURE');
    await expect(spans.nth(1)).toHaveText('& SYSTEMS');
  });

  test('hero section - last screenshot matches', async ({ page }) => {
    await waitForHeroLoaded(page);
    await expect(page).toHaveScreenshot('hero-section.png');
  });

  test('hero content reveals only after hero image is ready', async ({
    page,
  }) => {
    await waitForHeroLoaded(page);

    await expect
      .poll(
        async () =>
          page.evaluate(() => {
            const hero = document.querySelector('.hero');
            const content = document.querySelector('.hero-content');
            if (!(hero instanceof HTMLElement))
              throw new Error('missing .hero');
            if (!(content instanceof HTMLElement))
              throw new Error('missing .hero-content');
            return {
              ready: hero.classList.contains('hero--ready'),
              opacity: getComputedStyle(content).opacity,
            };
          }),
        { timeout: 2500, intervals: [80, 140, 220] },
      )
      .toEqual({ ready: true, opacity: '1' });
  });
});
