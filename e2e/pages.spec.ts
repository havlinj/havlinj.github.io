import { test, expect } from '@playwright/test';
import { LAYOUT_TOLERANCE, MIN_GAP, MAX_GAP } from './constants';

// ---------------------------------------------------------------------------
// Profile page (/profile, /intro)
// ---------------------------------------------------------------------------

test.describe('Profile page (/profile, /intro)', () => {
  test('shows navbar with name and active Profile', async ({ page }) => {
    await page.goto('/profile');
    await expect(page.locator('.site-header')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Jan Havlín' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Profile' })).toHaveClass(/site-nav__link--active/);
  });

  test('has placeholder image and Intro, Professional, Personal links', async ({ page }) => {
    await page.goto('/profile');
    await expect(page.getByRole('img', { name: /Profile photo placeholder/i })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Intro' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Professional' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Personal' })).toBeVisible();
  });

  test('site-header: Jan Havlín left, Profile Writing Contact spread across', async ({ page }) => {
    await page.goto('/profile');
    const inner = page.locator('.site-header__inner');
    await expect(inner).toBeVisible();
    const brand = inner.getByRole('link', { name: 'Jan Havlín' });
    const profile = inner.getByRole('link', { name: 'Profile' });
    const writing = inner.getByRole('link', { name: 'Writing' });
    const contact = inner.getByRole('link', { name: 'Contact' });
    const box = await inner.boundingBox();
    const bBox = await brand.boundingBox();
    const pBox = await profile.boundingBox();
    const wBox = await writing.boundingBox();
    const cBox = await contact.boundingBox();
    expect(box).toBeTruthy();
    expect(bBox).toBeTruthy();
    expect(pBox).toBeTruthy();
    expect(wBox).toBeTruthy();
    expect(cBox).toBeTruthy();
    expect(bBox!.x).toBeLessThanOrEqual(box!.x + LAYOUT_TOLERANCE);
    expect(bBox!.x).toBeLessThanOrEqual(pBox!.x + LAYOUT_TOLERANCE);
    expect(pBox!.x).toBeLessThanOrEqual(wBox!.x + LAYOUT_TOLERANCE);
    expect(wBox!.x).toBeLessThanOrEqual(cBox!.x + LAYOUT_TOLERANCE);
    expect(cBox!.x + cBox!.width).toBeGreaterThanOrEqual(box!.x + box!.width - LAYOUT_TOLERANCE);
  });

  test('navbar contains Profile, Writing, Contact links and name links to /', async ({ page }) => {
    await page.goto('/profile');
    await expect(page.locator('.site-header a[href="/"]')).toBeVisible();
    await expect(page.locator('.site-header a[href="/profile"]')).toBeVisible();
    await expect(page.locator('.site-header a[href="/writing"]')).toBeVisible();
    await expect(page.locator('.site-header a[href="/contact"]')).toBeVisible();
  });

  test('Intro, Professional, Personal in one row: Intro left, Professional center, Personal right', async ({
    page,
  }) => {
    await page.goto('/profile');
    const article = page.locator('main.content article');
    await expect(article).toBeVisible();
    const intro = article.getByRole('link', { name: 'Intro' });
    const professional = article.getByRole('link', { name: 'Professional' });
    const personal = article.getByRole('link', { name: 'Personal' });
    await expect(intro).toBeVisible();
    await expect(professional).toBeVisible();
    await expect(personal).toBeVisible();
    const articleBox = await article.boundingBox();
    const iBox = await intro.boundingBox();
    const pBox = await professional.boundingBox();
    const lBox = await personal.boundingBox();
    expect(articleBox).toBeTruthy();
    expect(iBox).toBeTruthy();
    expect(pBox).toBeTruthy();
    expect(lBox).toBeTruthy();
    expect(iBox!.x).toBeLessThanOrEqual(pBox!.x + LAYOUT_TOLERANCE);
    expect(pBox!.x).toBeLessThanOrEqual(lBox!.x + LAYOUT_TOLERANCE);
    expect(iBox!.x).toBeLessThanOrEqual(articleBox!.x + LAYOUT_TOLERANCE);
    expect(lBox!.x + lBox!.width).toBeGreaterThanOrEqual(
      articleBox!.x + articleBox!.width - LAYOUT_TOLERANCE,
    );
    const mid = articleBox!.x + articleBox!.width / 2;
    expect(pBox!.x + pBox!.width / 2).toBeGreaterThanOrEqual(mid - articleBox!.width / 3);
    expect(pBox!.x + pBox!.width / 2).toBeLessThanOrEqual(mid + articleBox!.width / 3);
  });

  test('Intro (/intro) has active Profile in navbar', async ({ page }) => {
    await page.goto('/intro');
    await expect(page.locator('.site-header')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Profile' })).toHaveClass(/site-nav__link--active/);
  });
});

// ---------------------------------------------------------------------------
// Writing page (/writing)
// ---------------------------------------------------------------------------

test.describe('Writing page (/writing)', () => {
  test('shows navbar with active Writing and article list', async ({ page }) => {
    await page.goto('/writing');
    await expect(page.locator('.site-header')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Writing' })).toHaveClass(/site-nav__link--active/);
    await expect(page.getByRole('heading', { name: 'Writing', level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Reflection on Building Systems' })).toBeVisible();
  });

  test('gaps between navbar, title, content', async ({ page }) => {
    await page.goto('/writing');
    const nav = page.locator('.site-header');
    const title = page.getByRole('heading', { name: 'Writing', level: 1 });
    const list = page.locator('.post-list');
    await expect(nav).toBeVisible();
    await expect(title).toBeVisible();
    await expect(list).toBeVisible();
    const nBox = await nav.boundingBox();
    const tBox = await title.boundingBox();
    const lBox = await list.boundingBox();
    expect(nBox).toBeTruthy();
    expect(tBox).toBeTruthy();
    expect(lBox).toBeTruthy();
    const gapNavToTitle = tBox!.y - (nBox!.y + nBox!.height);
    const gapTitleToContent = lBox!.y - (tBox!.y + tBox!.height);
    expect(gapNavToTitle).toBeGreaterThanOrEqual(MIN_GAP);
    expect(gapNavToTitle).toBeLessThanOrEqual(MAX_GAP);
    expect(gapTitleToContent).toBeGreaterThanOrEqual(MIN_GAP);
    expect(gapTitleToContent).toBeLessThanOrEqual(MAX_GAP);
  });
});

// ---------------------------------------------------------------------------
// Contact page (/contact)
// ---------------------------------------------------------------------------

test.describe('Contact page (/contact)', () => {
  test('shows navbar with active Contact', async ({ page }) => {
    await page.goto('/contact');
    await expect(page.locator('.site-header')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Contact' })).toHaveClass(/site-nav__link--active/);
  });

  test('shows Contact as page heading', async ({ page }) => {
    await page.goto('/contact');
    await expect(page.getByRole('heading', { name: 'Contact', level: 1 })).toBeVisible();
  });
});
