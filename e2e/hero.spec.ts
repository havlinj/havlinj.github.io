import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { LAYOUT_TOLERANCE } from './constants';
import { HERO_TAGLINE_SELECTORS } from '../src/constants/hero-tagline';
import { HERO_BG_FILE_STEM, HERO_BG_STEM } from '../src/constants/hero-layout';
import {
  hasAstroStylesheetBundle,
  mustBox,
  readStylesheetHrefs,
} from './helpers';

async function waitForHeroLoaded(page: Page) {
  await page.locator('section.hero.hero--ready').waitFor({ state: 'visible' });
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

  test('has hero heading "Jan Havlín" and hero section', async ({ page }) => {
    await expect(page.locator('h1.page-title')).toHaveText('Jan Havlín');
    await expect(page.locator('section.hero')).toBeVisible();
    await waitForHeroLoaded(page);
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

  test('hero-header: Profile left, Writing between, Contact right (space-between)', async ({
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
    expect(pBox.x).toBeLessThanOrEqual(box.x + LAYOUT_TOLERANCE);
    expect(pBox.x).toBeLessThanOrEqual(wBox.x + LAYOUT_TOLERANCE);
    expect(wBox.x).toBeLessThanOrEqual(cBox.x + LAYOUT_TOLERANCE);
    expect(cBox.x + cBox.width).toBeGreaterThanOrEqual(
      box.x + box.width - LAYOUT_TOLERANCE,
    );
  });

  test('hero Writing link matches Profile Writing under the same space-between nav', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1024, height: 800 });

    async function writingOffsetInMain(innerSelector: string) {
      return page.evaluate((sel) => {
        const main = document.querySelector('main.content');
        const link = document.querySelector(`${sel} a[href="/writing"]`);
        if (!(main instanceof HTMLElement) || !(link instanceof HTMLElement)) {
          return null;
        }
        const mainRect = main.getBoundingClientRect();
        const linkRect = link.getBoundingClientRect();
        return {
          left: linkRect.left - mainRect.left,
          width: linkRect.width,
        };
      }, innerSelector);
    }

    await page.goto('/');
    const hero = await writingOffsetInMain('.hero-header__inner');
    expect(hero).not.toBeNull();

    await page.goto('/profile');
    const site = await writingOffsetInMain('.site-header__inner');
    expect(site).not.toBeNull();

    expect(
      Math.abs(hero!.left - site!.left),
      `Writing left offset hero=${hero!.left} profile=${site!.left}`,
    ).toBeLessThanOrEqual(LAYOUT_TOLERANCE);
    expect(
      Math.abs(hero!.width - site!.width),
      `Writing width hero=${hero!.width} profile=${site!.width}`,
    ).toBeLessThanOrEqual(LAYOUT_TOLERANCE);
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
    await expect(page.locator('h1.page-title')).toHaveText('Jan Havlín');
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
    await expect(preload).toHaveAttribute('href', `${HERO_BG_STEM}_720.png`);
    await expect(preload).toHaveAttribute(
      'imagesrcset',
      new RegExp(`${HERO_BG_FILE_STEM}_720\\.png 1800w,.*_1080\\.png 2430w`),
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

  test('hero content is two taglines with no name or role', async ({
    page,
  }) => {
    await waitForHeroLoaded(page);
    const content = page.locator('.hero-content');
    const taglines = content.locator('.tagline');
    await expect(taglines).toHaveCount(2);
    await expect(taglines.nth(0)).toHaveClass(/tagline--sub/);
    await expect(taglines.nth(0)).toHaveText('As I build software systems…');
    await expect(taglines.nth(0).locator('br')).toHaveCount(0);
    await expect(taglines.nth(1)).toContainText('Making sense of');
    await expect(taglines.nth(1)).toContainText('the craft');
    await expect(taglines.nth(1).locator('br')).toHaveCount(1);
    await expect(page.locator('.hero-name')).toHaveCount(0);
    await expect(page.locator('.hero-role')).toHaveCount(0);
    await expect(page.locator('h1')).toHaveCount(1);
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

    const sizes = await page.evaluate((selectors) => {
      const lead = document.querySelector(selectors.lead);
      const sub = document.querySelector(selectors.sub);
      if (!(lead instanceof HTMLElement) || !(sub instanceof HTMLElement))
        return { lead: 0, sub: 0 };
      return {
        lead: parseFloat(getComputedStyle(lead).fontSize),
        sub: parseFloat(getComputedStyle(sub).fontSize),
      };
    }, HERO_TAGLINE_SELECTORS);
    expect(sizes.sub).toBeGreaterThan(0);
    expect(sizes.sub).toBeLessThan(sizes.lead);
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
