import { test, expect, type Page } from '@playwright/test';

async function gotoProfileWhenReady(page: Page) {
  await page.goto('/profile');
  await page
    .locator('.profile-section:not(.profile-section--loading)')
    .waitFor({ state: 'visible', timeout: 10000 });
}

test.describe('/profile — type fit, Foundations tile, reveal', () => {
  test('applies --profile-tile-label-font-size on section after type fit', async ({
    page,
  }) => {
    await gotoProfileWhenReady(page);
    const raw = await page
      .locator('.profile-section')
      .evaluate((el) =>
        getComputedStyle(el).getPropertyValue('--profile-tile-label-font-size'),
      );
    expect(raw.trim()).toMatch(/px$/);
    expect(parseFloat(raw)).toBeGreaterThan(0);
  });

  test('applies --profile-reveal-font-size on Foundations reveal after type fit', async ({
    page,
  }) => {
    await gotoProfileWhenReady(page);
    const raw = await page
      .locator('.profile-tile-button--foundations .profile-tile-button__reveal')
      .evaluate((el) =>
        getComputedStyle(el).getPropertyValue('--profile-reveal-font-size'),
      );
    expect(raw.trim()).toMatch(/px$/);
    expect(parseFloat(raw)).toBeGreaterThan(0);
  });

  test('Foundations tile targets /foundations and uses foundations modifier', async ({
    page,
  }) => {
    await gotoProfileWhenReady(page);
    const tile = page.getByRole('link', { name: 'Foundations' });
    await expect(tile).toHaveAttribute('href', '/foundations');
    await expect(tile).toHaveClass(/profile-tile-button--foundations/);
  });

  test('first click opens reveal and stays on /profile', async ({ page }) => {
    await gotoProfileWhenReady(page);
    const tile = page.getByRole('link', { name: 'Foundations' });
    await tile.click();
    await expect(tile).toHaveClass(/is-revealed/);
    await expect(page).toHaveURL(/\/profile\/?$/);
    await expect(tile.locator('.profile-tile-button__reveal')).toContainText(
      /What shaped me/i,
    );
  });

  test('second click while revealed navigates to /foundations', async ({
    page,
  }) => {
    await gotoProfileWhenReady(page);
    const tile = page.getByRole('link', { name: 'Foundations' });
    await tile.click();
    await expect(tile).toHaveClass(/is-revealed/);
    await tile.click();
    await expect(page).toHaveURL(/\/foundations\/?$/);
  });

  test('portrait lives in photo frame with inset photo box', async ({ page }) => {
    await gotoProfileWhenReady(page);
    const frame = page.locator('.profile-photo-frame');
    const box = page.locator('.profile-photo-frame .profile-photo-box');
    await expect(frame).toBeVisible();
    await expect(box).toBeVisible();
    const inner = await box.boundingBox();
    const outer = await frame.boundingBox();
    expect(inner && outer).toBeTruthy();
    expect(inner!.width).toBeLessThan(outer!.width - 2);
    expect(inner!.height).toBeLessThan(outer!.height - 2);
  });
});
