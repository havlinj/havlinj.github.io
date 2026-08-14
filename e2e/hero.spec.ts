import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { LAYOUT_TOLERANCE } from './constants';
import { HERO_TAGLINE_SELECTORS } from '../src/constants/hero-tagline';
import {
  hasAstroStylesheetBundle,
  mustBox,
  readStylesheetHrefs,
} from './helpers';

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

  test('does not load writing.css or profile.css bundles', async ({ page }) => {
    const hrefs = await readStylesheetHrefs(page);
    expect(hasAstroStylesheetBundle(hrefs, 'writing')).toBe(false);
    expect(hasAstroStylesheetBundle(hrefs, 'profile')).toBe(false);
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

  test('has hero heading "Collected notes" and hero section with name Jan Havlín', async ({
    page,
  }) => {
    await expect(
      page.getByRole('heading', { name: 'Collected notes', level: 1 }),
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

  test('content panel page contains hero section; site footer shows copyright', async ({
    page,
  }) => {
    await waitForHeroLoaded(page);
    const panelPage = page.locator('article.content-panel-page');
    await expect(panelPage).toBeVisible();
    await expect(panelPage.locator('section.hero.content-panel')).toBeVisible();
    await expect(page.locator('footer.site-footer')).toContainText(
      '© 2026 Jan Havlín',
    );
    await expect(
      page.getByRole('heading', { name: 'Collected notes', level: 1 }),
    ).toBeVisible();
    await expect(page.locator('.hero-name')).toBeVisible();
    await expect(page.locator('.hero-role')).toHaveCount(0);
    const tagline = page.locator('.tagline:not(.tagline--sub)');
    await expect(tagline).toBeVisible();
    await expect(tagline).toContainText('Making sense of');
    await expect(tagline).toContainText('the craft');
    const taglineSub = page.locator('.tagline--sub');
    await expect(taglineSub).toBeVisible();
    await expect(taglineSub).toContainText('As I build software systems…');
  });

  test('hero has figure with background image', async ({ page }) => {
    await waitForHeroLoaded(page);
    const figure = page.locator('.hero-figure');
    await expect(figure).toBeVisible();
    await expect(figure.locator('.hero-bg__image')).toBeVisible();
    await expect(figure.locator('img[alt="Hero background"]')).toBeVisible();
  });

  test('preloads hero background image with mobile-first srcset', async ({
    page,
  }) => {
    const preload = page.locator('link[rel="preload"][as="image"]');
    await expect(preload).toHaveCount(1);
    await expect(preload).toHaveAttribute(
      'href',
      '/assets/hero/altumcode-oZ61KFUQsus-unsplash_dichrom_720.png',
    );
    await expect(preload).toHaveAttribute(
      'imagesrcset',
      /altumcode-oZ61KFUQsus-unsplash_dichrom_720\.png 1620w,.*_1080\.png 2160w/,
    );
    await expect(preload).toHaveAttribute('imagesizes', '100vw');
  });

  /*
   * The hero photo used to be pushed down by a page-coloured strip masking the top of
   * the square. That gap is now the shared --content-panel-title-gap, so the photo must
   * fill the panel from its very top edge.
   */
  test('hero photo fills the panel with no masking strip and no photo credit caption', async ({
    page,
  }) => {
    await waitForHeroLoaded(page);
    await expect(page.locator('.hero-top-edge')).toHaveCount(0);
    await expect(page.locator('.hero-caption')).toHaveCount(0);

    const heroBox = await mustBox(page.locator('section.hero'));
    const figureBox = await mustBox(page.locator('.hero-figure'));
    expect(Math.abs(figureBox.y - heroBox.y)).toBeLessThanOrEqual(
      LAYOUT_TOLERANCE,
    );
    expect(
      Math.abs(figureBox.y + figureBox.height - (heroBox.y + heroBox.height)),
    ).toBeLessThanOrEqual(LAYOUT_TOLERANCE);
  });

  test('tagline visible text layer present', async ({ page }) => {
    await waitForHeroLoaded(page);
    const leadText = page.locator('.tagline:not(.tagline--sub) .tagline__text');
    await expect(leadText).toBeVisible();
    await expect(leadText).toContainText('the craft');
    const subText = page.locator('.tagline--sub .tagline__text');
    await expect(subText).toBeVisible();
    await expect(subText).toContainText(
      'As I build software systems…',
    );
  });

  test('sub tagline band width matches the lead tagline band', async ({
    page,
  }) => {
    await waitForHeroLoaded(page);
    await expect
      .poll(
        async () =>
          page.evaluate((selectors) => {
            const lead = document.querySelector(selectors.lead);
            const sub = document.querySelector(selectors.sub);
            if (!(lead instanceof HTMLElement) || !(sub instanceof HTMLElement))
              return Number.POSITIVE_INFINITY;
            return Math.abs(
              lead.getBoundingClientRect().width -
                sub.getBoundingClientRect().width,
            );
          }, HERO_TAGLINE_SELECTORS),
        { timeout: 2500, intervals: [80, 140, 220] },
      )
      .toBeLessThanOrEqual(2);
  });

  test('hero-role is not present', async ({ page }) => {
    await waitForHeroLoaded(page);
    await expect(page.locator('.hero-role')).toHaveCount(0);
  });

  test('hero section - last screenshot matches', async ({ page }) => {
    await waitForHeroLoaded(page);
    await expect(page).toHaveScreenshot('hero-section.png', {
      animations: 'disabled',
      maxDiffPixels: 2500,
    });
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
