import { test, expect } from '@playwright/test';
import { LAYOUT_TOLERANCE, MIN_GAP, MAX_GAP } from './constants';

test.describe('Hero page (/)', () => {
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

  test('has hero section with heading Jan Havlín', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: 'Jan Havlín', level: 1 }),
    ).toBeVisible();
    await expect(page.locator('section.hero')).toBeVisible();
  });

  test('hero-header links point to correct pages', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.hero-header a[href="/profile"]')).toBeVisible();
    await expect(page.locator('.hero-header a[href="/writing"]')).toBeVisible();
    await expect(page.locator('.hero-header a[href="/contact"]')).toBeVisible();
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

  test('h1, h2, tagline are visible and spaced with proper gaps', async ({
    page,
  }) => {
    await page.goto('/');
    const header = page.locator('.hero-header');
    const h1 = page.getByRole('heading', { name: 'Jan Havlín', level: 1 });
    const h2 = page.getByRole('heading', {
      name: 'Backend Architecture & Systems',
      level: 2,
    });
    const tagline = page.locator('.tagline');
    await expect(header).toBeVisible();
    await expect(h1).toBeVisible();
    await expect(h2).toBeVisible();
    await expect(tagline).toBeVisible();
    await expect(tagline).toHaveText(
      'Building reliable, fast and high-impact software from the ground up',
    );
    const hBox = await header.boundingBox();
    const h1Box = await h1.boundingBox();
    const h2Box = await h2.boundingBox();
    const tBox = await tagline.boundingBox();
    expect(hBox).toBeTruthy();
    expect(h1Box).toBeTruthy();
    expect(h2Box).toBeTruthy();
    expect(tBox).toBeTruthy();
    const gapHeaderToH1 = h1Box!.y - (hBox!.y + hBox!.height);
    const gapH1ToH2 = h2Box!.y - (h1Box!.y + h1Box!.height);
    const gapH2ToTagline = tBox!.y - (h2Box!.y + h2Box!.height);
    expect(gapHeaderToH1).toBeGreaterThanOrEqual(MIN_GAP);
    expect(gapHeaderToH1).toBeLessThanOrEqual(MAX_GAP);
    expect(gapH1ToH2).toBeGreaterThanOrEqual(MIN_GAP);
    expect(gapH1ToH2).toBeLessThanOrEqual(MAX_GAP);
    expect(gapH2ToTagline).toBeGreaterThanOrEqual(MIN_GAP);
    expect(gapH2ToTagline).toBeLessThanOrEqual(MAX_GAP);
  });

  test('hero section - last screenshot matches', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveScreenshot('hero-section.png');
  });

  test('h2 wraps to two lines at moderate narrow viewport', async ({
    page,
  }) => {
    // 520px: realistic small tablet / large phone, content not overly squeezed
    await page.setViewportSize({ width: 520, height: 800 });
    await page.goto('/');
    const h2 = page.getByRole('heading', {
      name: 'Backend Architecture & Systems',
      level: 2,
    });
    await expect(h2).toBeVisible();
    const lineCount = await h2.evaluate((el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      return range.getClientRects().length;
    });
    expect(lineCount).toBe(2);
  });
});
